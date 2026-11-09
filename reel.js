/* Reel para Instagram: dibuja la historia en un canvas vertical (9:16),
   la graba con MediaRecorder y la deja lista para compartir. */
const RW=720,RH=1280,RDUR=16;
const C={pink:'#ff8fab',peach:'#ffb997',yellow:'#ffd166',mint:'#7bdcb5',sky:'#7ec8ff',lilac:'#c3a6ff',ink:'#3d2c4f',card:'#fffaf5',muted:'#6e5a7c'};
const FONT="'Trebuchet MS','Segoe UI',Arial,sans-serif";
const RAINBOW=['#e0437a','#e8643a','#c98a00','#0f9e7a','#2a6fd6','#7a4fe0'];
const SCENES=[[0,2.6],[2.6,5.2],[5.2,7.8],[7.8,10.2],[10.2,13],[13,RDUR]];
const reelImg={};
let reelBlob=null,reelBusy=false,reelUrl=null;

function loadReelImages(){
  return Promise.all([['gatito','png'],['tren','png'],['cafe','png'],['paris','jpg']].map(([k,ext])=>reelImg[k]||new Promise((res,rej)=>{
    const i=new Image();i.onload=()=>{reelImg[k]=i;res(i)};i.onerror=rej;i.src='img/'+k+'.'+ext;
  })));
}

/* ---------- utilidades de dibujo ---------- */
const clamp=x=>Math.min(1,Math.max(0,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
const back=x=>{x=clamp(x);const k=1.7;return 1+(k+1)*Math.pow(x-1,3)+k*Math.pow(x-1,2);};

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}

function spacing(c,px){if('letterSpacing' in c)c.letterSpacing=px+'px';}

function txt(c,s,x,y,size,o={}){
  c.font=`${o.italic?'italic ':''}${o.weight||800} ${size}px ${o.font||FONT}`;
  c.textAlign=o.align||'center';c.textBaseline='middle';
  spacing(c,o.spacing||0);
  if(o.grad){
    const w=c.measureText(s).width;const g=c.createLinearGradient(x-w/2,0,x+w/2,0);
    o.grad.forEach((col,i)=>g.addColorStop(i/(o.grad.length-1),col));c.fillStyle=g;
  }else c.fillStyle=o.color||C.ink;
  c.fillText(s,x,y);
  spacing(c,0);
}

function para(c,s,x,y,size,maxW,lh){
  c.font=`600 ${size}px ${FONT}`;
  const lines=[];let line='';
  for(const w of s.split(' ')){const t=line?line+' '+w:w;if(c.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t}
  lines.push(line);
  lines.forEach((l,i)=>txt(c,l,x,y+i*lh,size,{weight:600,color:C.muted}));
}

function pill(c,s,x,y){
  c.font='700 20px Arial,sans-serif';spacing(c,3);
  const w=c.measureText(s).width+48;spacing(c,0);
  const g=c.createLinearGradient(x-w/2,0,x+w/2,0);g.addColorStop(0,C.lilac);g.addColorStop(1,C.sky);
  rr(c,x-w/2,y-22,w,44,22);c.fillStyle=g;c.fill();
  txt(c,s,x,y+1,20,{weight:700,color:'#fff',font:'Arial,sans-serif',spacing:3});
}

function photo(c,img,x,y,w,h,cover,zoom=1){
  c.save();c.shadowColor='#b26bb033';c.shadowBlur=30;c.shadowOffsetY=12;
  rr(c,x-8,y-8,w+16,h+16,34);c.fillStyle='#fff';c.fill();c.restore();
  c.save();rr(c,x,y,w,h,28);c.clip();
  const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#ffe3ec');g.addColorStop(1,'#d9ccff');
  c.fillStyle=g;c.fillRect(x,y,w,h);
  const s=(cover?Math.max(w/img.width,h/img.height):Math.min(w/img.width,h/img.height))*zoom;
  const iw=img.width*s,ih=img.height*s;
  c.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
  c.restore();
}

function footer(c,s){txt(c,s,360,1176,18,{weight:700,color:'#b58fc0',font:'Arial,sans-serif',spacing:3});}

function bg(c,t){
  const g=c.createLinearGradient(0,0,RW,RH);const sh=(Math.sin(t*.6)+1)/2;
  g.addColorStop(0,'#ffd6e0');g.addColorStop(.25+sh*.2,'#ffe9c9');g.addColorStop(.7,'#d4f5e9');g.addColorStop(1,'#d9ccff');
  c.fillStyle=g;c.fillRect(0,0,RW,RH);
  [[C.pink,80+Math.sin(t)*30,120,300],[C.sky,RW-60,RH-120+Math.cos(t)*30,340],[C.yellow,RW-40+Math.sin(t*.8)*20,RH*.42,220]].forEach(([col,x,y,r])=>{
    const rg=c.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,col+'aa');rg.addColorStop(1,col+'00');
    c.fillStyle=rg;c.fillRect(x-r,y-r,r*2,r*2);
  });
}

function frame(c,t,idx){
  c.save();c.shadowColor='#7a4f8a40';c.shadowBlur=50;c.shadowOffsetY=20;
  rr(c,36,60,648,1160,44);c.fillStyle=C.card;c.fill();c.restore();
  c.lineWidth=8;c.strokeStyle='#ffffffaa';rr(c,32,56,656,1168,48);c.stroke();
  txt(c,'✈️ SOMEWHERE, SOMETIME...',76,108,18,{weight:700,color:'#9a6b8f',align:'left',font:'Arial,sans-serif',spacing:2});
  txt(c,`0${idx+1} / 06`,644,108,18,{weight:700,color:'#9a6b8f',align:'right',font:'Arial,sans-serif',spacing:2});
  rr(c,76,134,568,10,5);c.fillStyle='#f1e3ec';c.fill();
  const g=c.createLinearGradient(76,0,644,0);[C.pink,C.peach,C.yellow,C.mint,C.sky].forEach((col,i)=>g.addColorStop(i/4,col));
  rr(c,76,134,Math.max(10,568*clamp(t/RDUR)),10,5);c.fillStyle=g;c.fill();
}

const confetti=Array.from({length:70},(_,i)=>({x:Math.random()*RW,v:260+Math.random()*320,d:Math.random()*1.2,r:Math.random()*6,s:2+Math.random()*4,c:[C.pink,C.yellow,C.mint,C.sky,C.lilac,C.peach][i%6]}));
function drawConfetti(c,lt){
  confetti.forEach(p=>{
    if(lt<p.d)return;
    const y=((lt-p.d)*p.v)%(RH+60)-30;
    c.save();c.translate(p.x+Math.sin(lt*2+p.r)*20,y);c.rotate(p.r+lt*p.s);
    c.fillStyle=p.c;c.fillRect(-6,-9,12,18);c.restore();
  });
}

/* ---------- escenas ---------- */
const SCENE_DRAW=[
  (c,lt,el)=>{
    el(0,()=>pill(c,'🎂 UN REGALITO · 2027',360,200));
    el(1,()=>{c.translate(360,470);c.rotate(Math.sin(lt*3)*.03);c.translate(-360,-470);photo(c,reelImg.gatito,76,250,568,440);});
    el(2,()=>txt(c,'Hola, Yaira!',360,790,82,{grad:RAINBOW}));
    el(3,()=>txt(c,'Tengo algo para ti 💌',360,880,44,{weight:700}));
    el(4,()=>footer(c,'MADE FOR YOUR BIRTHDAY'));
  },
  (c,lt,el)=>{
    el(0,()=>pill(c,'🗺️ DIARIO PERSONAL · 002',360,200));
    el(1,()=>photo(c,reelImg.tren,76,250,568,440,false,1+lt*.02));
    el(2,()=>txt(c,'A little escape...',360,790,68,{italic:true,weight:700,grad:RAINBOW}));
    el(3,()=>para(c,'¿Qué tal si dejamos la rutina en pausa unos días?',360,880,36,520,50));
    el(4,()=>footer(c,'SOME THINGS ARE BETTER UNPLANNED'));
  },
  (c,lt,el)=>{
    el(0,()=>pill(c,'🧳 NOTAS DE VIAJE · 003',360,200));
    el(1,()=>txt(c,"Well then, it's a date.",360,295,54,{italic:true,weight:700,grad:RAINBOW}));
    el(2,()=>{
      c.save();c.shadowColor='#ffd16688';c.shadowBlur=30;c.shadowOffsetY=10;
      const g=c.createLinearGradient(76,380,644,770);g.addColorStop(0,'#fff');g.addColorStop(1,'#fff4e8');
      rr(c,76,380,568,390,34);c.fillStyle=g;c.fill();c.restore();
      c.lineWidth=5;c.strokeStyle=C.yellow;rr(c,76,380,568,390,34);c.stroke();
      txt(c,'📅 SAVE THESE DAYS',360,440,22,{color:'#ff7a59',font:'Arial,sans-serif',spacing:3});
      const s=back((lt-.4)/.6);c.save();c.translate(360,560);c.scale(s,s);
      txt(c,'04 — 07',0,0,120,{grad:['#ff6f91','#4fb6ff']});c.restore();
      txt(c,'MARZO · 2027',360,650,28,{font:'Arial,sans-serif',spacing:5});
      ['JUE 04','VIE 05','SÁB 06','DOM 07'].forEach((d,i)=>{
        const x=76+568*(i+.5)/4,y=720-Math.abs(Math.sin(lt*4+i*.6))*10;
        rr(c,x-58,y-24,116,48,16);c.fillStyle=i%2?'#dcf7ee':'#ffe3ec';c.fill();
        txt(c,d,x,y+1,20,{font:'Arial,sans-serif',spacing:1});
      });
    });
    el(3,()=>txt(c,'No hagas otros planes. 🚫📆',360,860,42,{weight:700}));
    el(4,()=>para(c,'Solo necesitas esos días libres y una maleta medio preparada.',360,940,30,520,44));
    el(5,()=>footer(c,'LOCATION: TOP SECRET'));
  },
  (c,lt,el)=>{
    el(0,()=>pill(c,'💌 POSTALES · 004',360,200));
    el(1,()=>photo(c,reelImg.cafe,76,250,568,440));
    el(2,()=>txt(c,'A little hint...',360,780,60,{italic:true,weight:700,grad:RAINBOW}));
    el(3,()=>{const s=back((lt-.5)/.6);c.translate(360,890);c.scale(s,s);txt(c,'Bonjour! 🥐',0,0,100,{grad:RAINBOW});});
    el(4,()=>txt(c,'¿Te va sonando la cosa?',360,1000,34,{weight:600,color:C.muted}));
    el(5,()=>footer(c,'UN PETIT SECRET'));
  },
  (c,lt,el)=>{
    el(0,()=>photo(c,reelImg.paris,76,190,568,580,true,1.12-lt*.03));
    el(1,()=>['🗼','🥖','🌷','💖'].forEach((e,i)=>txt(c,e,360+(i-1.5)*96,840-Math.abs(Math.sin(lt*4+i*.5))*16,56)));
    el(2,()=>txt(c,"We're going to...",360,930,52,{italic:true,weight:700,grad:RAINBOW}));
    el(3,()=>{const s=back((lt-.6)/.6);c.translate(360,1040);c.scale(s,s);txt(c,'PARIS, BABY! 🇫🇷',0,0,74,{grad:RAINBOW,spacing:2});});
    el(4,()=>footer(c,'BON VOYAGE, YAIRA.'));
  },
  (c,lt,el)=>{
    el(0,()=>pill(c,'🎫 JUST FOR YOU',360,200));
    el(1,()=>txt(c,'See you in Paris.',360,285,64,{italic:true,weight:700,grad:RAINBOW}));
    el(2,()=>{
      const g=c.createLinearGradient(76,350,644,900);g.addColorStop(0,'#fff7e6');g.addColorStop(1,'#ffe6f0');
      rr(c,76,350,568,550,34);c.fillStyle=g;c.fill();
      c.save();c.setLineDash([16,10]);c.lineWidth=5;c.strokeStyle=C.pink;rr(c,76,350,568,550,34);c.stroke();c.restore();
      [76,644].forEach(x=>{c.beginPath();c.arc(x,625,24,0,Math.PI*2);c.fillStyle=C.card;c.fill();});
      txt(c,'BIRTHDAY GIFT · NOT A BOARDING PASS',360,400,17,{weight:700,color:'#9a7fa8',font:'Arial,sans-serif',spacing:2});
      txt(c,'PARIS',360,478,92,{grad:['#ff6f91','#7ec8ff'],spacing:6});
      [['PASSENGER','YAIRA'],['DEPARTURE','04 MAR 2027'],['RETURN','07 MAR 2027'],['DESTINATION','PARIS, FRANCE']].forEach(([k,v],i)=>{
        const y=570+i*58;
        c.fillStyle='#ffffffcc';c.fillRect(110,y-29,500,3);
        txt(c,k,112,y,19,{weight:700,color:'#8a6f98',align:'left',font:'Arial,sans-serif',spacing:1});
        txt(c,v,608,y,24,{align:'right',font:'Arial,sans-serif',spacing:1});
      });
      for(let x=160;x<560;x+=8){c.fillStyle=C.ink;c.fillRect(x,800,2,50);c.fillStyle='#ff6f91';c.fillRect(x+4,800,1,50);}
    });
    el(3,()=>{c.translate(540,880);c.rotate(-.1+Math.sin(lt*2.5)*.05);
      rr(c,-95,-26,190,52,14);c.fillStyle=C.yellow;c.fill();
      txt(c,'✈️ APPROVED',0,1,20,{font:'Arial,sans-serif',spacing:2});});
    el(4,()=>txt(c,'Feliz cumpleaños, Yaira! 🥳',360,990,46,{grad:RAINBOW}));
    el(5,()=>para(c,'Nos vemos entre cafés, calles bonitas y alguna que otra vuelta sin mapa.',360,1060,29,540,42));
    el(6,()=>footer(c,'FIN · OR JUST THE BEGINNING 💫'));
  },
];

function drawReel(c,t){
  const idx=Math.max(0,SCENES.findIndex(([a,b])=>t>=a&&t<b));
  const [from,to]=SCENES[t>=RDUR?5:idx];
  const i=t>=RDUR?5:idx,lt=t-from;
  bg(c,t);frame(c,t,i);
  const out=i<5?1-ease((lt-(to-from-.3))/.3):1;
  const el=(k,fn)=>{const v=ease((lt-k*.12)/.5);if(v<=0)return;c.save();c.globalAlpha=v*out;c.translate(0,(1-v)*40);fn();c.restore();};
  SCENE_DRAW[i](c,lt,el);
  if(t>=10.6)drawConfetti(c,t-10.6);
}

/* ---------- grabar, compartir y guardar ---------- */
function pickMime(){
  if(!window.MediaRecorder)return null;
  return ['video/mp4;codecs=avc1.42E01E','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
    .find(m=>MediaRecorder.isTypeSupported(m))||null;
}
const $=id=>document.getElementById(id);
function reelName(){const t=reelBlob.type;return 'reel_yaira_paris.'+(t.includes('mp4')?'mp4':t.includes('webm')?'webm':'png');}
function canShareFiles(){
  try{return !!(navigator.canShare&&navigator.canShare({files:[new File([reelBlob],reelName(),{type:reelBlob.type})]}));}catch(e){return false}
}

function setReelUI(state){
  const isVideo=reelBlob&&reelBlob.type.startsWith('video');
  $('reel-make').hidden=state!=='idle';
  $('reel-close').hidden=state==='rec';
  $('reel-again').hidden=state!=='done';
  $('reel-share').hidden=!(state==='done'&&canShareFiles());
  $('reel-save').hidden=state!=='done';
  $('reel-canvas').hidden=state==='done'&&isVideo;
  $('reel-video').hidden=!(state==='done'&&isVideo);
  if(state==='idle'){
    $('reel-msg').textContent='Un video vertical de 16 segundos, listo para subir a Instagram.';
    $('reel-tip').textContent='';
  }else if(state==='rec'){
    $('reel-tip').textContent='No salgas de esta pantalla mientras se graba 🎥';
  }else{
    if(reelUrl)URL.revokeObjectURL(reelUrl);
    reelUrl=URL.createObjectURL(reelBlob);
    $('reel-save').textContent=isVideo?'Guardar video ⬇️':'Guardar imagen ⬇️';
    if(isVideo){const v=$('reel-video');v.src=reelUrl;v.play().catch(()=>{});}
    $('reel-msg').textContent=isVideo?'¡Tu reel está listo! 🎉':'Tu móvil no permite grabar video aquí, así que te preparé una imagen.';
    $('reel-tip').textContent=reelBlob.type.includes('webm')
      ?'Se guardó en formato .webm. Si Instagram no lo acepta, abre esta página en Chrome actualizado o Safari.'
      :'En Instagram toca ➕ → Reel (o Historia) y elige el archivo de tu galería. ¡Ponle tu canción favorita! 🎶';
  }
}

function openMemory(){
  $('memory').hidden=false;
  if(reelBusy)return;
  setReelUI(reelBlob?'done':'idle');
  loadReelImages().then(()=>{if(!reelBusy&&!reelBlob)drawReel($('reel-canvas').getContext('2d'),1.4);}).catch(()=>{});
}
function closeMemory(){if(!reelBusy)$('memory').hidden=true;}
function reelAgain(){reelBlob=null;setReelUI('idle');makeReel();}

async function makeReel(){
  if(reelBusy)return;
  const canvas=$('reel-canvas'),mime=pickMime();
  if(!mime||!canvas.captureStream)return reelImageFallback();
  reelBusy=true;setReelUI('rec');
  try{
    await loadReelImages();
    const stream=canvas.captureStream(30);
    const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6e6});
    const chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const done=new Promise((res,rej)=>{rec.onstop=res;rec.onerror=e=>rej(e.error||e)});
    const ctx=canvas.getContext('2d');
    drawReel(ctx,0);rec.start(250);
    const t0=performance.now();
    await new Promise(res=>{(function loop(){
      const t=(performance.now()-t0)/1000;
      drawReel(ctx,Math.min(t,RDUR));
      $('reel-msg').textContent=`Creando tu reel… ${Math.min(99,Math.round(t/RDUR*100))}%`;
      if(t<RDUR+.2)requestAnimationFrame(loop);else res();
    })();});
    rec.stop();await done;
    stream.getTracks().forEach(tr=>tr.stop());
    if(!chunks.length)throw new Error('vacío');
    reelBlob=new Blob(chunks,{type:mime.split(';')[0]});
    reelBusy=false;setReelUI('done');
  }catch(e){
    console.error(e);reelBusy=false;reelImageFallback();
  }
}

async function reelImageFallback(){
  await loadReelImages().catch(()=>{});
  const canvas=$('reel-canvas');drawReel(canvas.getContext('2d'),RDUR);
  canvas.toBlob(b=>{reelBlob=b;setReelUI('done');},'image/png');
}

async function shareReel(){
  if(!reelBlob)return;
  const file=new File([reelBlob],reelName(),{type:reelBlob.type});
  try{await navigator.share({files:[file]});}catch(e){if(e&&e.name!=='AbortError')saveReel();}
}
function saveReel(){
  const a=document.createElement('a');a.href=reelUrl;a.download=reelName();
  document.body.appendChild(a);a.click();a.remove();
}
