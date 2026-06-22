'use strict';
// ================================================================
// CAPYBARA SHOOTING — 2P Deathmatch Platformer
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 900; canvas.height = 600;
const W = 900, H = 600;

function resize() {
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width = Math.floor(W*s)+'px';
  canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
const mouse = {x:0,y:0};
let clickFrame = false;
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX-r.left)*(W/r.width);
  mouse.y = (e.clientY-r.top)*(H/r.height);
});
canvas.addEventListener('mousedown', () => { clickFrame = true; });
function hov(x,y,w,h){ return mouse.x>x&&mouse.x<x+w&&mouse.y>y&&mouse.y<y+h; }
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

// ---------------------------------------------------------------- Audio
let audioCtx = null, musicOn = true, musicTimer = null;
function getAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}
function tone(freq,dur,st,type='square',vol=0.06) {
  try {
    const ac=getAC(), o=ac.createOscillator(), g=ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,st);
    g.gain.exponentialRampToValueAtTime(0.001,st+dur);
    o.start(st); o.stop(st+dur+0.01);
  } catch(e) {}
}
function sfxShoot(gun) {
  if(!musicOn) return;
  try {
    const ac=getAC(),t=ac.currentTime;
    if(gun==='rocket') tone(60,0.35,t,'sawtooth',0.12);
    else if(gun==='smg') tone(280+Math.random()*80,0.03,t,'square',0.05);
    else if(gun==='ak47') tone(190+Math.random()*60,0.07,t,'sawtooth',0.08);
    else tone(380+Math.random()*80,0.05,t,'square',0.06);
  } catch(e) {}
}
function sfxKill() {
  if(!musicOn) return;
  try {
    const ac=getAC(),t=ac.currentTime;
    tone(800,0.05,t,'square',0.1); tone(600,0.05,t+0.06,'square',0.1); tone(400,0.1,t+0.12,'square',0.08);
  } catch(e) {}
}
function sfxPad() {
  if(!musicOn) return;
  try {
    const ac=getAC(),t=ac.currentTime;
    tone(500,0.04,t,'square',0.09); tone(800,0.05,t+0.05,'square',0.09); tone(1100,0.04,t+0.1,'square',0.07);
  } catch(e) {}
}
const MELODY=[
  [330,0.2],[0,0.1],[294,0.15],[0,0.05],[262,0.3],[0,0.1],
  [294,0.15],[0,0.05],[330,0.2],[0,0.05],[330,0.2],[0,0.05],[330,0.35],[0,0.15],
  [294,0.15],[0,0.05],[294,0.15],[0,0.05],[294,0.3],[0,0.1],
  [330,0.15],[0,0.05],[392,0.2],[0,0.1],[392,0.4],[0,0.2],
  [330,0.15],[0,0.05],[294,0.15],[0,0.05],[262,0.3],[0,0.1],
  [294,0.2],[0,0.05],[330,0.15],[0,0.05],[330,0.15],[0,0.05],[330,0.15],[0,0.05],
  [294,0.15],[0,0.05],[294,0.15],[0,0.05],[330,0.15],[0,0.05],[294,0.2],[0,0.05],[262,0.6],[0,0.3],
];
function startMusic() {
  if(!musicOn) return;
  try {
    const ac=getAC(); let t=ac.currentTime+0.2;
    function loop() {
      MELODY.forEach(([f,d])=>{ if(f>0) tone(f,d*0.7,t,'triangle',0.04); t+=d; });
      const tot=MELODY.reduce((s,[,d])=>s+d,0);
      musicTimer=setTimeout(()=>{ t=getAC().currentTime+0.1; loop(); },(tot-0.8)*1000);
    }
    loop();
  } catch(e) {}
}
function stopMusic() { clearTimeout(musicTimer); }
function toggleMusic() { musicOn=!musicOn; musicOn?startMusic():stopMusic(); }

// ---------------------------------------------------------------- Constants
const GRAVITY=0.55, JUMP_VY=-13, MOVE_SPD=4.5;
const PW=26, PH=36;
const WIN_KILLS=10, RESPAWN_F=150;

// ---------------------------------------------------------------- Hats (20)
const HATS=[
  {name:'None',draw:()=>{}},
  {name:'Cowboy',draw:(x,y)=>{
    ctx.fillStyle='#8b5e3c';
    ctx.beginPath(); ctx.ellipse(x,y,22,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#6b3e1c'; ctx.fillRect(x-9,y-18,18,18);
    ctx.fillStyle='#5a2e10'; ctx.fillRect(x-7,y-20,14,4);
  }},
  {name:'TopHat',draw:(x,y)=>{
    ctx.fillStyle='#111'; ctx.fillRect(x-14,y-2,28,5); ctx.fillRect(x-10,y-24,20,22);
    ctx.fillStyle='#444'; ctx.fillRect(x-8,y-5,16,3);
  }},
  {name:'Fedora',draw:(x,y)=>{
    ctx.fillStyle='#cc2233';
    ctx.beginPath(); ctx.ellipse(x,y,18,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillRect(x-9,y-16,18,16);
    ctx.fillStyle='#881122'; ctx.fillRect(x-7,y-5,14,3);
  }},
  {name:'BlueCap',draw:(x,y)=>{
    ctx.fillStyle='#1a5fb4';
    ctx.beginPath(); ctx.arc(x,y-10,14,Math.PI,2*Math.PI); ctx.fill();
    ctx.fillRect(x-14,y-12,28,8);
    ctx.fillStyle='#0d3d7a'; ctx.fillRect(x+8,y-5,16,5);
  }},
  {name:'Wizard',draw:(x,y)=>{
    ctx.fillStyle='#7b2d8b';
    ctx.beginPath(); ctx.moveTo(x,y-36); ctx.lineTo(x-13,y); ctx.lineTo(x+13,y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x,y,16,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f5c518'; ctx.beginPath(); ctx.arc(x+3,y-22,4,0,Math.PI*2); ctx.fill();
  }},
  {name:'Party',draw:(x,y)=>{
    ctx.fillStyle='#ff6622';
    ctx.beginPath(); ctx.moveTo(x,y-30); ctx.lineTo(x-12,y); ctx.lineTo(x+12,y); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#ffdd00'; ctx.fillRect(x-10,y-16,7,4);
    ctx.fillStyle='#ff3399'; ctx.fillRect(x-3,y-10,7,4);
    ctx.fillStyle='#ffdd00'; ctx.fillRect(x+3,y-4,7,4);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y-30,3,0,Math.PI*2); ctx.fill();
  }},
  {name:'Crown',draw:(x,y)=>{
    ctx.fillStyle='#f5c518'; ctx.fillRect(x-14,y-10,28,10);
    [x-12,x-4,x+4,x+12].forEach(px=>{
      ctx.beginPath(); ctx.moveTo(px-4,y-10); ctx.lineTo(px,y-22); ctx.lineTo(px+4,y-10); ctx.fill();
    });
    ctx.fillStyle='#e63946'; ctx.beginPath(); ctx.arc(x-8,y-5,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a5fb4'; ctx.beginPath(); ctx.arc(x,y-5,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#e63946'; ctx.beginPath(); ctx.arc(x+8,y-5,3,0,Math.PI*2); ctx.fill();
  }},
  {name:'Propeller',draw:(x,y)=>{
    ctx.fillStyle='#22cc66'; ctx.beginPath(); ctx.arc(x,y-10,12,0,Math.PI*2); ctx.fill();
    ctx.fillRect(x-12,y-12,24,6);
    ctx.fillStyle='#ff4422'; ctx.save(); ctx.translate(x,y-22); ctx.rotate(Date.now()/80);
    ctx.fillRect(-14,-3,28,6); ctx.rotate(Math.PI/2); ctx.fillRect(-12,-3,24,6); ctx.restore();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y-22,3,0,Math.PI*2); ctx.fill();
  }},
  {name:'Helmet',draw:(x,y)=>{
    ctx.fillStyle='#556b2f'; ctx.beginPath(); ctx.arc(x,y-10,14,Math.PI,0); ctx.fill();
    ctx.fillRect(x-14,y-12,28,8);
    ctx.fillStyle='#3d4f20'; ctx.fillRect(x-14,y-4,28,6);
    ctx.fillStyle='rgba(180,200,255,0.5)'; ctx.fillRect(x-6,y-10,12,6);
  }},
  {name:'Chef',draw:(x,y)=>{
    ctx.fillStyle='#eee'; ctx.fillRect(x-12,y-4,24,6);
    ctx.beginPath(); ctx.arc(x,y-16,12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ddd';
    ctx.beginPath(); ctx.arc(x-6,y-18,7,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+6,y-18,7,0,Math.PI*2); ctx.fill();
  }},
  {name:'Pirate',draw:(x,y)=>{
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.moveTo(x-20,y); ctx.lineTo(x,y-22); ctx.lineTo(x+20,y); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y-8,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.fillRect(x-4,y-12,8,3); ctx.fillRect(x-1,y-9,2,6);
  }},
  {name:'Viking',draw:(x,y)=>{
    ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(x,y-12,14,Math.PI,0); ctx.fill();
    ctx.fillRect(x-14,y-14,28,8);
    ctx.fillStyle='#ccc'; ctx.fillRect(x-16,y-20,5,14); ctx.fillRect(x+11,y-20,5,14);
    ctx.fillStyle='#eee';
    [-20,-14].forEach(ox=>{ ctx.beginPath(); ctx.moveTo(x+ox,y-14); ctx.bezierCurveTo(x+ox-12,y-4,x+ox-10,y+8,x+ox,y+6); ctx.bezierCurveTo(x+ox+4,y+8,x+ox+4,y-4,x+ox,y-14); ctx.fill(); });
    [14,20].forEach(ox=>{ ctx.beginPath(); ctx.moveTo(x+ox,y-14); ctx.bezierCurveTo(x+ox+12,y-4,x+ox+10,y+8,x+ox,y+6); ctx.bezierCurveTo(x+ox-4,y+8,x+ox-4,y-4,x+ox,y-14); ctx.fill(); });
  }},
  {name:'Santa',draw:(x,y)=>{
    ctx.fillStyle='#dd1111'; ctx.beginPath(); ctx.arc(x,y-12,14,Math.PI,0); ctx.fill();
    ctx.fillRect(x-14,y-14,28,10);
    ctx.fillStyle='#fff'; ctx.fillRect(x-14,y-6,28,7);
    ctx.fillStyle='#dd1111'; ctx.fillRect(x+4,y-30,6,24);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x+7,y-30,5,0,Math.PI*2); ctx.fill();
  }},
  {name:'Sombrero',draw:(x,y)=>{
    ctx.fillStyle='#d4831a';
    ctx.beginPath(); ctx.ellipse(x,y,28,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#c86e10'; ctx.fillRect(x-9,y-22,18,22);
    ctx.fillStyle='#d4831a'; ctx.beginPath(); ctx.ellipse(x,y-22,11,6,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#ffdd44'; ctx.lineWidth=2;
    for(let i=0;i<7;i++){ ctx.beginPath(); ctx.arc(x-22+i*8,y+3,2,0,Math.PI*2); ctx.stroke(); }
  }},
  {name:'Beanie',draw:(x,y)=>{
    ctx.fillStyle='#4477dd'; ctx.beginPath(); ctx.arc(x,y-12,14,Math.PI,0); ctx.fill();
    ctx.fillRect(x-14,y-14,28,10);
    ctx.fillStyle='#3366cc'; ctx.fillRect(x-14,y-4,28,7);
    ctx.fillStyle='#2255bb'; ctx.fillRect(x-14,y+3,28,4);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y-26,5,0,Math.PI*2); ctx.fill();
  }},
  {name:'BunnyEars',draw:(x,y)=>{
    ctx.fillStyle='#f0c0d0';
    ctx.beginPath(); ctx.ellipse(x-8,y-28,5,18,-.25,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+8,y-28,5,18,.25,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffaacc';
    ctx.beginPath(); ctx.ellipse(x-8,y-30,2.5,12,-.25,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+8,y-30,2.5,12,.25,0,Math.PI*2); ctx.fill();
  }},
  {name:'DevilHorns',draw:(x,y)=>{
    ctx.fillStyle='#cc1122';
    ctx.beginPath(); ctx.moveTo(x-14,y-4); ctx.lineTo(x-6,y-26); ctx.lineTo(x-2,y-8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+14,y-4); ctx.lineTo(x+6,y-26); ctx.lineTo(x+2,y-8); ctx.fill();
    ctx.fillStyle='#aa0011';
    ctx.beginPath(); ctx.moveTo(x-14,y-4); ctx.lineTo(x-10,y-18); ctx.lineTo(x-6,y-26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+14,y-4); ctx.lineTo(x+10,y-18); ctx.lineTo(x+6,y-26); ctx.fill();
  }},
  {name:'CatEars',draw:(x,y)=>{
    ctx.fillStyle='#e8b4c8';
    ctx.beginPath(); ctx.moveTo(x-14,y-4); ctx.lineTo(x-10,y-24); ctx.lineTo(x-2,y-8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+14,y-4); ctx.lineTo(x+10,y-24); ctx.lineTo(x+2,y-8); ctx.fill();
    ctx.fillStyle='#ff99bb';
    ctx.beginPath(); ctx.moveTo(x-12,y-6); ctx.lineTo(x-10,y-20); ctx.lineTo(x-4,y-9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+12,y-6); ctx.lineTo(x+10,y-20); ctx.lineTo(x+4,y-9); ctx.fill();
  }},
];

// ---------------------------------------------------------------- Guns
const GUNS={
  pistol:{name:'Pistol',ammo:-1,cd:20,spd:13,col:'#aaa',spread:0.04,isRocket:false},
  smg:   {name:'SMG',   ammo:30, cd:4, spd:16,col:'#4af',spread:0.20,isRocket:false},
  ak47:  {name:'AK-47', ammo:25, cd:10,spd:15,col:'#c84',spread:0.07,isRocket:false},
  rocket:{name:'RPG',   ammo:5,  cd:55,spd:7, col:'#f84',spread:0.01,isRocket:true},
};
function drawGunIcon(x,y,type) {
  ctx.save(); ctx.translate(x,y);
  if(type==='smg'){
    ctx.fillStyle='#4af'; ctx.fillRect(-14,-3,28,5); ctx.fillStyle='#222'; ctx.fillRect(-6,2,8,7); ctx.fillStyle='#4af'; ctx.fillRect(8,-7,4,5);
  } else if(type==='ak47'){
    ctx.fillStyle='#c84'; ctx.fillRect(-16,-3,32,6); ctx.fillStyle='#876'; ctx.fillRect(-8,2,10,9); ctx.fillStyle='#c84'; ctx.fillRect(-2,-9,5,7); ctx.fillRect(6,-6,14,3);
  } else if(type==='rocket'){
    ctx.fillStyle='#888'; ctx.fillRect(-18,-5,36,10); ctx.fillStyle='#f84'; ctx.beginPath(); ctx.arc(18,0,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#a33'; ctx.beginPath(); ctx.arc(-18,0,4,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle='#aaa'; ctx.fillRect(-10,-3,20,6); ctx.fillStyle='#666'; ctx.fillRect(-4,2,8,7);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Maps (10)
// pads.y = exact platform y that this pad sits on
const MAPS=[
  {name:'Forest',    bg:'forest', w:1400,h:680,
   plats:[
     {x:100, y:440,w:420,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:880, y:440,w:420,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:490, y:355,w:180,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:575, y:270,w:250,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:640, y:190,w:120,h:18,col:'#4a7a1e',bot:'#8a9a70'},
   ],
   pads:[{x:340,y:440},{x:1040,y:440}],
   guns:[{x:280,t:'smg'},{x:1120,t:'ak47'},{x:700,t:'rocket'}],
   spawn:[[170,395],[1230,395]]},

  {name:'Candy Land', bg:'candy', w:1400,h:680,
   plats:[
     {x:0,   y:455,w:1400,h:18,col:'#f8a4d8',bot:'#d46040'},
     {x:360, y:370,w:180, h:14,col:'#f8a4d8',bot:'#d46040'},
     {x:860, y:370,w:180, h:14,col:'#f8a4d8',bot:'#d46040'},
     {x:380, y:278,w:160, h:14,col:'#f8a4d8',bot:'#d46040'},
     {x:860, y:278,w:160, h:14,col:'#f8a4d8',bot:'#d46040'},
     {x:490, y:198,w:420, h:14,col:'#f8a4d8',bot:'#d46040'},
     {x:560, y:318,w:280, h:14,col:'#f8a4d8',bot:'#d46040'},
   ],
   pads:[{x:600,y:455},{x:760,y:455}],
   guns:[{x:200,t:'smg'},{x:1200,t:'ak47'},{x:700,t:'rocket'},{x:460,t:'ak47'}],
   spawn:[[150,410],[1250,410]]},

  {name:'Tree Tower', bg:'forest', w:1400,h:760,
   plats:[
     {x:40,   y:510,w:260,h:18,col:'#4a7a1e',bot:'#7a6030'},
     {x:1100, y:510,w:260,h:18,col:'#4a7a1e',bot:'#7a6030'},
     {x:370,  y:560,w:660,h:18,col:'#4a7a1e',bot:'#7a6030'},
     {x:440,  y:450,w:140,h:14,col:'#b87a40',bot:'#7a5020'},
     {x:820,  y:450,w:140,h:14,col:'#b87a40',bot:'#7a5020'},
     {x:550,  y:350,w:110,h:14,col:'#b87a40',bot:'#7a5020'},
     {x:740,  y:350,w:110,h:14,col:'#b87a40',bot:'#7a5020'},
     {x:490,  y:250,w:90, h:14,col:'#b87a40',bot:'#7a5020'},
     {x:820,  y:250,w:90, h:14,col:'#b87a40',bot:'#7a5020'},
     {x:640,  y:155,w:120,h:14,col:'#b87a40',bot:'#7a5020'},
   ],
   pads:[{x:470,y:560},{x:895,y:560}],
   guns:[{x:480,t:'pistol'},{x:850,t:'pistol'},{x:680,t:'rocket'}],
   spawn:[[150,465],[1250,465]]},

  {name:'Terraced',  bg:'forest', w:1600,h:680,
   plats:[
     {x:0,    y:375,w:310,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:290,  y:430,w:280,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:550,  y:490,w:200,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:730,  y:510,w:140,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:850,  y:490,w:200,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:1030, y:430,w:280,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:1290, y:375,w:310,h:18,col:'#4a7a1e',bot:'#8a9a70'},
     {x:290,  y:320,w:180,h:14,col:'#4a7a1e',bot:'#8a9a70'},
     {x:590,  y:395,w:220,h:14,col:'#4a7a1e',bot:'#8a9a70'},
     {x:1130, y:320,w:180,h:14,col:'#4a7a1e',bot:'#8a9a70'},
   ],
   pads:[{x:630,y:395},{x:785,y:510}],
   guns:[{x:400,t:'smg'},{x:1200,t:'ak47'},{x:800,t:'rocket'}],
   spawn:[[80,330],[1520,330]]},

  {name:'Egypt',     bg:'egypt', w:1400,h:680,
   plats:[
     {x:0,    y:520,w:1400,h:18,col:'#d4aa70',bot:'#b09050'},
     {x:170,  y:440,w:260, h:18,col:'#c8a060',bot:'#a08040'},
     {x:970,  y:440,w:260, h:18,col:'#c8a060',bot:'#a08040'},
     {x:360,  y:390,w:230, h:18,col:'#c8a060',bot:'#a08040'},
     {x:810,  y:390,w:230, h:18,col:'#c8a060',bot:'#a08040'},
     {x:470,  y:300,w:460, h:18,col:'#c8a060',bot:'#a08040'},
     {x:90,   y:350,w:200, h:18,col:'#c8a060',bot:'#a08040'},
     {x:1110, y:350,w:200, h:18,col:'#c8a060',bot:'#a08040'},
   ],
   pads:[{x:350,y:520},{x:1000,y:520},{x:200,y:520},{x:1150,y:520}],
   guns:[{x:290,t:'ak47'},{x:1110,t:'ak47'},{x:700,t:'rocket'}],
   spawn:[[120,475],[1280,475]]},

  {name:'Fire/Hell',  bg:'fire', w:1400,h:680,
   plats:[
     {x:0,    y:430,w:400,h:18,col:'#555',bot:'#333'},
     {x:0,    y:375,w:200,h:18,col:'#555',bot:'#333'},
     {x:500,  y:405,w:400,h:18,col:'#555',bot:'#333'},
     {x:540,  y:325,w:140,h:14,col:'#555',bot:'#333'},
     {x:720,  y:305,w:140,h:14,col:'#555',bot:'#333'},
     {x:1000, y:430,w:400,h:18,col:'#555',bot:'#333'},
     {x:1200, y:375,w:200,h:18,col:'#555',bot:'#333'},
     {x:600,  y:230,w:200,h:14,col:'#555',bot:'#333'},
   ],
   pads:[{x:555,y:405},{x:810,y:405}],
   guns:[{x:200,t:'smg'},{x:1200,t:'smg'},{x:700,t:'rocket'},{x:650,t:'ak47'}],
   spawn:[[120,385],[1280,385]]},

  {name:'Space',     bg:'space', w:1400,h:680,
   plats:[
     {x:50,   y:480,w:200,h:16,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:1150, y:480,w:200,h:16,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:250,  y:390,w:180,h:14,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:970,  y:390,w:180,h:14,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:450,  y:300,w:200,h:14,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:750,  y:300,w:200,h:14,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:590,  y:195,w:220,h:14,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:400,  y:470,w:140,h:14,col:'#5a4a8a',bot:'#3a2a6a'},
     {x:860,  y:470,w:140,h:14,col:'#5a4a8a',bot:'#3a2a6a'},
   ],
   pads:[{x:450,y:470},{x:910,y:470}],
   guns:[{x:320,t:'smg'},{x:1080,t:'smg'},{x:700,t:'rocket'}],
   spawn:[[120,435],[1280,435]]},

  {name:'Ice Cave',  bg:'ice', w:1400,h:680,
   plats:[
     {x:0,    y:470,w:350,h:18,col:'#a0c8e8',bot:'#6090b8'},
     {x:1050, y:470,w:350,h:18,col:'#a0c8e8',bot:'#6090b8'},
     {x:340,  y:530,w:720,h:18,col:'#a0c8e8',bot:'#6090b8'},
     {x:220,  y:390,w:200,h:14,col:'#a0c8e8',bot:'#6090b8'},
     {x:980,  y:390,w:200,h:14,col:'#a0c8e8',bot:'#6090b8'},
     {x:520,  y:430,w:180,h:14,col:'#a0c8e8',bot:'#6090b8'},
     {x:700,  y:430,w:180,h:14,col:'#a0c8e8',bot:'#6090b8'},
     {x:580,  y:320,w:240,h:14,col:'#a0c8e8',bot:'#6090b8'},
     {x:400,  y:250,w:180,h:14,col:'#a0c8e8',bot:'#6090b8'},
     {x:820,  y:250,w:180,h:14,col:'#a0c8e8',bot:'#6090b8'},
   ],
   pads:[{x:550,y:530},{x:800,y:530}],
   guns:[{x:290,t:'smg'},{x:1110,t:'ak47'},{x:700,t:'rocket'}],
   spawn:[[120,425],[1280,425]]},

  {name:'Ruins',     bg:'ruins', w:1500,h:680,
   plats:[
     {x:0,    y:480,w:1500,h:18,col:'#8a8070',bot:'#5a5048'},
     {x:100,  y:400,w:220, h:18,col:'#8a8070',bot:'#5a5048'},
     {x:400,  y:340,w:200, h:18,col:'#8a8070',bot:'#5a5048'},
     {x:650,  y:390,w:200, h:18,col:'#8a8070',bot:'#5a5048'},
     {x:900,  y:340,w:200, h:18,col:'#8a8070',bot:'#5a5048'},
     {x:1180, y:400,w:220, h:18,col:'#8a8070',bot:'#5a5048'},
     {x:300,  y:270,w:180, h:14,col:'#8a8070',bot:'#5a5048'},
     {x:1020, y:270,w:180, h:14,col:'#8a8070',bot:'#5a5048'},
     {x:640,  y:220,w:220, h:14,col:'#8a8070',bot:'#5a5048'},
   ],
   pads:[{x:390,y:480},{x:1080,y:480}],
   guns:[{x:250,t:'ak47'},{x:1250,t:'ak47'},{x:750,t:'rocket'}],
   spawn:[[130,435],[1370,435]]},

  {name:'City',      bg:'city', w:1400,h:680,
   plats:[
     {x:0,    y:500,w:240,h:18,col:'#556',bot:'#334'},
     {x:260,  y:450,w:200,h:18,col:'#556',bot:'#334'},
     {x:480,  y:500,w:200,h:18,col:'#556',bot:'#334'},
     {x:700,  y:420,w:200,h:18,col:'#556',bot:'#334'},
     {x:720,  y:500,w:200,h:18,col:'#556',bot:'#334'},
     {x:940,  y:450,w:200,h:18,col:'#556',bot:'#334'},
     {x:1160, y:500,w:240,h:18,col:'#556',bot:'#334'},
     {x:100,  y:380,w:180,h:14,col:'#556',bot:'#334'},
     {x:1120, y:380,w:180,h:14,col:'#556',bot:'#334'},
     {x:580,  y:340,w:240,h:14,col:'#556',bot:'#334'},
     {x:450,  y:270,w:180,h:14,col:'#556',bot:'#334'},
     {x:770,  y:270,w:180,h:14,col:'#556',bot:'#334'},
   ],
   pads:[{x:500,y:500},{x:890,y:500}],
   guns:[{x:180,t:'smg'},{x:1220,t:'smg'},{x:700,t:'rocket'},{x:630,t:'ak47'}],
   spawn:[[120,455],[1280,455]]},
];

// ---------------------------------------------------------------- State
let STATE='TITLE', curMap=0, savedHats=[0,0];
let players, pickups, particles, explosions, floatTexts;
let winner='', gTimer=0;
let cam={x:0,y:0,zoom:1};

// ---------------------------------------------------------------- Player factory
function mkP(id) {
  const p1=id===0, sp=MAPS[curMap].spawn[id];
  return {
    id, name:p1?'CAPY 1':'CAPY 2',
    x:sp[0], y:sp[1], vx:0, vy:0,
    facing:p1?1:-1,
    onGround:false,
    gun:'pistol', ammo:-1,
    shootCD:0, shootFlash:0,
    bullets:[],
    alive:true, kills:0,
    hatIdx:savedHats[id],
    col:p1?'#c8873a':'#a05c2a',
    LEFT: p1?'KeyA':'ArrowLeft',
    RIGHT:p1?'KeyD':'ArrowRight',
    JUMP: p1?'KeyW':'ArrowUp',
    SHOOT:p1?'KeyR':'KeyK',
    iframes:0, respawn:0,
  };
}

function initRound() {
  players=[mkP(0),mkP(1)]; particles=[]; explosions=[]; floatTexts=[];
  const map=MAPS[curMap];
  pickups=map.guns.map(g=>{
    let py=MAPS[curMap].spawn[0][1]-50;
    for(const pl of map.plats) if(g.x>=pl.x&&g.x<=pl.x+pl.w){ py=pl.y-16; break; }
    return {x:g.x, y:py, t:g.t, active:true, respawn:0};
  });
  cam={x:0,y:0,zoom:1}; gTimer=0;
}

// ---------------------------------------------------------------- Camera
function updateCam() {
  const map=MAPS[curMap];
  const sp0=map.spawn[0], sp1=map.spawn[1];
  const p1x=players[0].alive?players[0].x:sp0[0], p1y=players[0].alive?players[0].y:sp0[1];
  const p2x=players[1].alive?players[1].x:sp1[0], p2y=players[1].alive?players[1].y:sp1[1];
  const cx=(p1x+p2x)/2, cy=(p1y+p2y)/2;
  let tz=Math.min(W/(Math.abs(p1x-p2x)+420),H/(Math.abs(p1y-p2y)+320));
  tz=Math.max(0.32,Math.min(1.2,tz));
  cam.zoom+=(tz-cam.zoom)*0.05;
  let tx=cx-(W/2)/cam.zoom, ty=cy-(H/2)/cam.zoom;
  tx=Math.max(0,Math.min(tx,map.w-W/cam.zoom));
  ty=Math.max(0,Math.min(ty,map.h-H/cam.zoom));
  cam.x+=(tx-cam.x)*0.1; cam.y+=(ty-cam.y)*0.1;
}

// ---------------------------------------------------------------- Physics
function platCollide(p) {
  p.onGround=false;
  const map=MAPS[curMap];
  for(const pl of map.plats) {
    const overX=p.x+PW/2>pl.x&&p.x-PW/2<pl.x+pl.w;
    if(!overX) continue;
    const foot=p.y+PH/2, prevFoot=foot-p.vy;
    if(p.vy>=0&&prevFoot<=pl.y+2&&foot>=pl.y) {
      p.y=pl.y-PH/2; p.vy=0; p.onGround=true;
      for(const jp of map.pads) {
        if(jp.y===pl.y&&p.x+PW/2>jp.x&&p.x-PW/2<jp.x+56) {
          p.vy=-22; p.onGround=false; p.y-=2;
          sfxPad(); spawnPfx(p.x,p.y+PH/2,'#ff3333',8);
          break;
        }
      }
    }
    const head=p.y-PH/2, prevHead=head-p.vy;
    if(p.vy<0&&prevHead>=pl.y+pl.h-2&&head<pl.y+pl.h){ p.y=pl.y+pl.h+PH/2; p.vy=0; }
  }
}

// ---------------------------------------------------------------- Particles & Floats
function spawnPfx(x,y,col,n) {
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=1+Math.random()*5;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,life:30,col,sz:2+Math.random()*3});
  }
}
function addFloat(x,y,txt,col) { floatTexts.push({x,y,txt,col,life:70}); }

// ---------------------------------------------------------------- Kill & Respawn
function killP(victim, killer) {
  if(!victim.alive||victim.iframes>0) return;
  victim.alive=false; victim.respawn=RESPAWN_F;
  killer.kills++;
  spawnPfx(victim.x,victim.y,'#ffdd00',20); spawnPfx(victim.x,victim.y,'#ff4444',12);
  addFloat(killer.x,killer.y-50,'+1','#ffd700');
  sfxKill();
  if(killer.kills>=WIN_KILLS){ winner=killer.name; STATE='GAME_OVER'; stopMusic(); }
}
function doRespawn(p) {
  const sp=MAPS[curMap].spawn[p.id];
  p.x=sp[0]; p.y=sp[1]; p.vx=0; p.vy=0;
  p.alive=true; p.iframes=150; p.gun='pistol'; p.ammo=-1; p.bullets=[];
}

// ---------------------------------------------------------------- Update
function updateGame() {
  gTimer++;
  pickups.forEach(pk=>{ if(!pk.active&&--pk.respawn<=0) pk.active=true; });

  players.forEach((p,idx)=>{
    if(!p.alive){ if(--p.respawn<=0) doRespawn(p); return; }
    const opp=players[1-idx];
    let moved=false;
    if(keys[p.LEFT]) { p.vx=-MOVE_SPD; moved=true; p.facing=-1; }
    else if(keys[p.RIGHT]){ p.vx=MOVE_SPD; moved=true; p.facing=1; }
    else p.vx*=0.78;
    if(keys[p.JUMP]&&p.onGround){ p.vy=JUMP_VY; p.onGround=false; }
    p.vy=Math.min(p.vy+GRAVITY,18);
    p.x+=p.vx; p.y+=p.vy;
    const map=MAPS[curMap];
    p.x=Math.max(PW/2,Math.min(map.w-PW/2,p.x));
    if(p.y>map.h+60){
      p.alive=false; p.respawn=RESPAWN_F;
      opp.kills++; sfxKill(); addFloat(opp.x,opp.y-50,'+1','#ffd700');
      if(opp.kills>=WIN_KILLS){ winner=opp.name; STATE='GAME_OVER'; stopMusic(); }
      return;
    }
    platCollide(p);
    pickups.forEach(pk=>{
      if(!pk.active) return;
      if(Math.abs(p.x-pk.x)<30&&Math.abs(p.y-pk.y)<30){ p.gun=pk.t; p.ammo=GUNS[pk.t].ammo; pk.active=false; pk.respawn=600; }
    });
    if(!moved&&opp.alive) p.facing=opp.x>p.x?1:-1;

    const gd=GUNS[p.gun];
    if(p.shootCD>0) p.shootCD--;
    if(keys[p.SHOOT]&&p.shootCD===0&&(p.ammo>0||p.ammo===-1)){
      if(p.ammo>0){ p.ammo--; if(p.ammo===0){ p.gun='pistol'; p.ammo=-1; } }
      const sp=(Math.random()-0.5)*gd.spread;
      p.bullets.push({x:p.x+p.facing*(PW/2+5),y:p.y-6,vx:p.facing*gd.spd*Math.cos(sp),vy:Math.sin(sp)*gd.spd,life:90,type:p.gun,isRocket:!!gd.isRocket});
      p.shootCD=gd.cd; p.shootFlash=gd.isRocket?12:5;
      p.vx-=p.facing*(gd.isRocket?3:0.6);
      sfxShoot(p.gun);
    }
    if(p.shootFlash>0) p.shootFlash--;

    p.bullets=p.bullets.filter(b=>{
      b.x+=b.vx; b.y+=b.vy;
      if(b.isRocket) b.vy+=0.1;
      b.life--;
      if(opp.alive&&opp.iframes<=0){
        const hit=Math.abs(b.x-opp.x)<PW&&Math.abs(b.y-opp.y)<PH;
        const splash=b.isRocket&&Math.sqrt((b.x-opp.x)**2+(b.y-opp.y)**2)<55;
        if(hit||splash){
          if(b.isRocket){ explosions.push({x:b.x,y:b.y,r:0,life:25}); spawnPfx(b.x,b.y,'#ff8822',18); }
          killP(opp,p); return false;
        }
      }
      if(b.isRocket){
        for(const pl of MAPS[curMap].plats){
          if(b.x>pl.x&&b.x<pl.x+pl.w&&b.y>pl.y&&b.y<pl.y+pl.h){ explosions.push({x:b.x,y:b.y,r:0,life:25}); spawnPfx(b.x,b.y,'#ff8822',12); return false; }
        }
      }
      return b.life>0&&b.x>-60&&b.x<MAPS[curMap].w+60&&b.y<MAPS[curMap].h;
    });
    if(p.iframes>0) p.iframes--;
  });

  explosions=explosions.filter(e=>{ e.r+=5; return --e.life>0; });
  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; return --p.life>0; });
  floatTexts=floatTexts.filter(f=>{ f.y-=0.8; return --f.life>0; });
  updateCam();
}

// ---------------------------------------------------------------- Backgrounds
function bgForest(map) {
  const g=ctx.createLinearGradient(0,0,0,map.h);
  g.addColorStop(0,'#90c8f0'); g.addColorStop(1,'#c8e8d4');
  ctx.fillStyle=g; ctx.fillRect(0,0,map.w,map.h);
  [[0.4,'rgba(130,170,130,0.4)',45,120,42,map.h-200],
   [1,'rgba(55,115,70,0.7)',34,155,30,map.h-95],
   [2,'rgba(30,75,40,0.9)',26,110,22,map.h-32]].forEach(([,col,gap,h,hw,gy])=>{
    ctx.fillStyle=col;
    for(let x=0;x<map.w;x+=gap){ const fh=h+Math.sin(x*0.12)*28; ctx.beginPath(); ctx.moveTo(x,gy); ctx.lineTo(x+hw/2,gy-fh); ctx.lineTo(x+hw,gy); ctx.fill(); }
  });
  ctx.fillStyle='#4a8aaa'; ctx.fillRect(0,map.h-26,map.w,26);
  ctx.fillStyle='#6a9aaa';
  [100,350,700,1000,1300].forEach(rx=>{ ctx.beginPath(); ctx.ellipse(rx,map.h-24,26,11,0,0,Math.PI*2); ctx.fill(); });
}
function bgCandy(map) {
  ctx.fillStyle='#aad8f4'; ctx.fillRect(0,0,map.w,map.h);
  const wf='#d4961e', wfD='#b8800a';
  [[0,0,360,map.h],[310,60,310,map.h-60],[1090,0,310,map.h],[780,60,310,map.h-60]].forEach(([bx,by,bw,bh])=>{
    ctx.fillStyle=wf; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle=wfD; ctx.lineWidth=2;
    for(let x=bx;x<bx+bw;x+=18){ ctx.beginPath(); ctx.moveTo(x,by); ctx.lineTo(x,by+bh); ctx.stroke(); }
    for(let y=by;y<by+bh;y+=18){ ctx.beginPath(); ctx.moveTo(bx,y); ctx.lineTo(bx+bw,y); ctx.stroke(); }
    ctx.fillStyle='#5c3010';
    for(let dx=bx+8;dx<bx+bw;dx+=28){ ctx.fillRect(dx,by,12,14+Math.sin(dx)*4); }
  });
  ctx.fillStyle='#5c3010'; ctx.fillRect(0,map.h-30,map.w,30);
  [[680,map.h-195],[720,map.h-175]].forEach(([lx,ly])=>{
    ctx.fillStyle='#888'; ctx.fillRect(lx,ly,4,88);
    ctx.fillStyle='#ff6699'; ctx.beginPath(); ctx.arc(lx+2,ly,26,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(lx+2,ly,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff6699'; ctx.beginPath(); ctx.arc(lx+2,ly,7,0,Math.PI*2); ctx.fill();
  });
}
function bgEgypt(map) {
  const g=ctx.createLinearGradient(0,0,0,map.h);
  g.addColorStop(0,'#87ceeb'); g.addColorStop(0.6,'#f0e0a0'); g.addColorStop(1,'#d4aa60');
  ctx.fillStyle=g; ctx.fillRect(0,0,map.w,map.h);
  ctx.fillStyle='#c8a050';
  [[80,map.h-185,270],[480,map.h-165,230],[880,map.h-270,360],[1180,map.h-185,240]].forEach(([px,py,pw])=>{
    ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+pw/2,py-pw*0.68); ctx.lineTo(px+pw,py); ctx.fill();
    ctx.fillStyle='#a08038'; ctx.beginPath(); ctx.moveTo(px+pw/2,py-pw*0.68); ctx.lineTo(px+pw,py); ctx.lineTo(px+pw/2,py); ctx.fill();
    ctx.fillStyle='#c8a050';
  });
  ctx.fillStyle='#d4aa60'; ctx.fillRect(0,map.h-32,map.w,32);
}
function bgFire(map) {
  ctx.fillStyle='#080404'; ctx.fillRect(0,0,map.w,map.h);
  for(let i=0;i<50;i++){
    const fx=(i*39+gTimer*0.6)%map.w, fh=80+Math.sin(i*3.7+gTimer*0.07)*55;
    const al=0.22+Math.sin(i*1.3+gTimer*0.09)*0.14;
    const gr=ctx.createLinearGradient(fx,map.h-fh,fx,map.h);
    gr.addColorStop(0,'rgba(255,140,0,0)'); gr.addColorStop(0.6,`rgba(255,60,0,${al})`); gr.addColorStop(1,`rgba(180,20,0,${al+0.15})`);
    ctx.fillStyle=gr; ctx.fillRect(fx,map.h-fh-30,6+Math.sin(i)*3,fh+30);
  }
  const gw=ctx.createLinearGradient(0,map.h-70,0,map.h);
  gw.addColorStop(0,'rgba(255,80,0,0)'); gw.addColorStop(1,'rgba(255,50,0,0.65)');
  ctx.fillStyle=gw; ctx.fillRect(0,map.h-70,map.w,70);
}
function bgSpace(map) {
  const g=ctx.createLinearGradient(0,0,0,map.h);
  g.addColorStop(0,'#020308'); g.addColorStop(1,'#0a0520');
  ctx.fillStyle=g; ctx.fillRect(0,0,map.w,map.h);
  for(let i=0;i<180;i++){
    const sx=(i*97+13)%map.w, sy=(i*61+7)%map.h, br=0.4+Math.sin(i*0.8+gTimer*0.04)*0.4;
    ctx.globalAlpha=br; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx,sy,i%4===0?1.5:0.8,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
  const nb=ctx.createRadialGradient(700,200,10,700,200,250);
  nb.addColorStop(0,'rgba(100,50,200,0.14)'); nb.addColorStop(1,'rgba(100,50,200,0)');
  ctx.fillStyle=nb; ctx.fillRect(0,0,map.w,map.h);
}
function bgIce(map) {
  const g=ctx.createLinearGradient(0,0,0,map.h);
  g.addColorStop(0,'#1a2840'); g.addColorStop(1,'#0e1c2a');
  ctx.fillStyle=g; ctx.fillRect(0,0,map.w,map.h);
  ctx.fillStyle='#4a7098';
  for(let i=0;i<20;i++){ const sx=70*i+35, sh=38+Math.sin(i*1.3)*18; ctx.beginPath(); ctx.moveTo(sx-11,0); ctx.lineTo(sx,sh); ctx.lineTo(sx+11,0); ctx.fill(); }
  ctx.fillStyle='rgba(160,210,240,0.12)'; ctx.fillRect(0,0,map.w,map.h);
  const ig=ctx.createLinearGradient(0,map.h-55,0,map.h);
  ig.addColorStop(0,'rgba(100,180,240,0)'); ig.addColorStop(1,'rgba(80,150,220,0.28)');
  ctx.fillStyle=ig; ctx.fillRect(0,map.h-55,map.w,55);
}
function bgRuins(map) {
  const g=ctx.createLinearGradient(0,0,0,map.h);
  g.addColorStop(0,'#d4b890'); g.addColorStop(1,'#a89060');
  ctx.fillStyle=g; ctx.fillRect(0,0,map.w,map.h);
  for(let i=0;i<8;i++){
    const cx2=i*200+80, ch=115+Math.sin(i)*45;
    ctx.fillStyle='#9a8870'; ctx.fillRect(cx2,map.h-ch-28,38,ch);
    ctx.fillStyle='#b09878'; ctx.fillRect(cx2-8,map.h-ch-28,54,14);
  }
  ctx.fillStyle='#c8b090'; ctx.fillRect(0,map.h-28,map.w,28);
}
function bgCity(map) {
  const g=ctx.createLinearGradient(0,0,0,map.h);
  g.addColorStop(0,'#18182a'); g.addColorStop(1,'#262636');
  ctx.fillStyle=g; ctx.fillRect(0,0,map.w,map.h);
  for(let i=0;i<16;i++){
    const bx=i*95, bw=68+Math.sin(i)*14, bh=110+Math.sin(i*1.7)*75;
    ctx.fillStyle='#202030'; ctx.fillRect(bx,map.h-bh-28,bw,bh);
    for(let wy=map.h-bh-18;wy<map.h-50;wy+=18){
      for(let wx=bx+6;wx<bx+bw-6;wx+=14){
        if(Math.sin(wx*0.3+wy*0.2)>0.2){ ctx.fillStyle='rgba(255,210,80,0.4)'; ctx.fillRect(wx,wy,8,10); }
      }
    }
  }
  ctx.fillStyle='#111120'; ctx.fillRect(0,map.h-26,map.w,26);
}
function drawBg() {
  const m=MAPS[curMap], f={forest:bgForest,candy:bgCandy,egypt:bgEgypt,fire:bgFire,space:bgSpace,ice:bgIce,ruins:bgRuins,city:bgCity};
  (f[m.bg]||bgForest)(m);
}

// ---------------------------------------------------------------- Draw World
function drawPlats() {
  const map=MAPS[curMap];
  map.plats.forEach(pl=>{
    ctx.fillStyle=pl.bot; ctx.fillRect(pl.x,pl.y+pl.h/2,pl.w,pl.h/2);
    ctx.fillStyle=pl.col; ctx.fillRect(pl.x,pl.y,pl.w,pl.h/2+2);
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(pl.x,pl.y,pl.w,3);
    if(map.bg==='forest'||map.bg==='ruins'){
      ctx.fillStyle='rgba(0,0,0,0.18)'; for(let px=pl.x+8;px<pl.x+pl.w;px+=16) ctx.fillRect(px,pl.y+4,8,3);
      ctx.fillStyle='rgba(212,168,60,0.45)'; for(let px=pl.x;px<pl.x+pl.w;px+=16) ctx.fillRect(px,pl.y+4,8,3);
    } else if(map.bg==='candy'){
      ctx.fillStyle='#ff88cc'; for(let px=pl.x+8;px<pl.x+pl.w;px+=20){ ctx.beginPath(); ctx.arc(px,pl.y+5,4,0,Math.PI); ctx.fill(); }
      // sprinkles
      ctx.fillStyle='#ff4499'; for(let px=pl.x+4;px<pl.x+pl.w;px+=14) ctx.fillRect(px,pl.y+1,5,2);
    }
  });
}
function drawPads() {
  MAPS[curMap].pads.forEach(jp=>{
    ctx.fillStyle='#bb1111'; ctx.fillRect(jp.x,jp.y-5,56,7);
    ctx.fillStyle='#ff3333'; ctx.fillRect(jp.x,jp.y-5,56,3);
    ctx.fillStyle='#ffaaaa'; ctx.font='bold 11px monospace'; ctx.textAlign='center';
    ctx.fillText('▲',jp.x+28,jp.y-7);
  });
  ctx.textAlign='left';
}
function drawPickups() {
  pickups.forEach(pk=>{
    if(!pk.active) return;
    const bob=Math.sin(gTimer*0.07)*3;
    ctx.fillStyle='rgba(255,200,50,0.16)'; ctx.beginPath(); ctx.arc(pk.x,pk.y+bob,18,0,Math.PI*2); ctx.fill();
    drawGunIcon(pk.x,pk.y+bob,pk.t);
    ctx.fillStyle='#fff'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.fillText(GUNS[pk.t].name,pk.x,pk.y+bob+22);
  });
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Draw Capybara
function drawCapy(p) {
  if(!p.alive){
    const sp=MAPS[curMap].spawn[p.id];
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
    ctx.fillText(`${p.name}: ${Math.ceil(p.respawn/60)}s`,sp[0],sp[1]-20);
    ctx.textAlign='left';
    return;
  }
  if(p.iframes>0&&Math.floor(p.iframes/4)%2===0) return;
  const {x,y,facing,col,hatIdx,shootFlash,gun}=p;
  const gd=GUNS[gun];
  ctx.save(); ctx.translate(x,y); ctx.scale(facing,1);
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0,PH/2+3,14,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#9a5f1a'; ctx.fillRect(-11,11,9,12); ctx.fillRect(3,11,9,12);
  ctx.fillStyle='#7a4510'; ctx.fillRect(-13,21,12,7); ctx.fillRect(2,21,12,7);
  ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(0,4,16,13,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#9a5f1a'; ctx.fillRect(10,-2,7,9);
  // Gun
  ctx.fillStyle=gd.col;
  if(gun==='smg'){ ctx.fillRect(14,-4,24,6); ctx.fillStyle='#222'; ctx.fillRect(14,2,9,7); ctx.fillStyle=gd.col; ctx.fillRect(32,-8,4,4); }
  else if(gun==='ak47'){ ctx.fillRect(14,-4,26,6); ctx.fillStyle='#876'; ctx.fillRect(14,2,9,8); ctx.fillStyle=gd.col; ctx.fillRect(22,-9,5,6); ctx.fillRect(28,-6,12,3); }
  else if(gun==='rocket'){ ctx.fillStyle='#666'; ctx.fillRect(8,-6,30,10); ctx.fillStyle='#f84'; ctx.beginPath(); ctx.arc(38,-1,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(8,-1,3,0,Math.PI*2); ctx.fill(); }
  else { ctx.fillRect(14,-4,18,6); ctx.fillStyle='#555'; ctx.fillRect(14,2,9,7); }
  if(shootFlash>0){
    const mx=gun==='rocket'?42:32;
    ctx.fillStyle=`rgba(255,220,50,${shootFlash/10})`; ctx.beginPath(); ctx.arc(mx,-1,4+shootFlash,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(4,-16,13,11,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8a5018'; ctx.fillRect(6,-18,17,11);
  ctx.beginPath(); ctx.arc(23,-13,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#3a1a04'; ctx.fillRect(10,-14,4,4); ctx.fillRect(16,-14,4,4);
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(-4,-20,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-3,-21,1.8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8a5018'; ctx.beginPath(); ctx.ellipse(-8,-27,5,4,-0.3,0,Math.PI*2); ctx.fill();
  if(hatIdx>0&&HATS[hatIdx]) HATS[hatIdx].draw(2,-29);
  ctx.restore();
  if(gun!=='pistol'){
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(x-22,y-PH/2-20,44,10);
    ctx.fillStyle=gd.col; ctx.font='7px monospace'; ctx.textAlign='center';
    ctx.fillText(`${gd.name} ${p.ammo}`,x,y-PH/2-12);
    ctx.textAlign='left';
  }
}

function drawBullets() {
  players.forEach(p=>{
    p.bullets.forEach(b=>{
      if(b.isRocket){
        ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Math.atan2(b.vy,b.vx));
        ctx.fillStyle='#888'; ctx.fillRect(-12,-4,24,8);
        ctx.fillStyle='#f84'; ctx.beginPath(); ctx.arc(12,0,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,150,0,0.7)'; ctx.fillRect(-22,-3,12,6);
        ctx.restore();
      } else {
        const col=b.type==='ak47'?'#fa8':b.type==='smg'?'#4ef':'#ffdd44';
        ctx.fillStyle=col; ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(b.x,b.y,2,0,Math.PI*2); ctx.fill();
      }
    });
  });
}

function drawFX() {
  explosions.forEach(e=>{
    const a=e.life/25;
    ctx.fillStyle=`rgba(255,140,0,${a*0.35})`; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(255,220,50,${a*0.6})`; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*0.5,0,Math.PI*2); ctx.fill();
  });
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(0,p.life/28); ctx.fillStyle=p.col;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
}

function drawFloats() {
  floatTexts.forEach(f=>{
    ctx.globalAlpha=Math.min(1,f.life/30);
    ctx.fillStyle=f.col; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.fillText(f.txt,f.x,f.y);
  });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

// ---------------------------------------------------------------- HUD
function drawCapyFace(x,y,r,col) {
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8a5018'; ctx.fillRect(x+r*0.15,y-r*0.15,r*0.7,r*0.5);
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(x-r*0.35,y-r*0.2,r*0.13,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8a5018'; ctx.beginPath(); ctx.ellipse(x-r*0.35,y-r*0.55,r*0.18,r*0.13,0,0,Math.PI*2); ctx.fill();
}
function drawHUD() {
  const p1=players[0], p2=players[1];
  ctx.fillStyle='rgba(0,0,0,0.55)'; rr(6,6,114,54,8); ctx.fill();
  drawCapyFace(33,33,22,'#c8873a');
  ctx.fillStyle='#fff'; ctx.font='bold 24px "Press Start 2P",monospace'; ctx.textAlign='left'; ctx.fillText(p1.kills,64,46);
  ctx.fillStyle='rgba(0,0,0,0.55)'; rr(W-120,6,114,54,8); ctx.fill();
  drawCapyFace(W-36,33,22,'#a05c2a');
  ctx.textAlign='right'; ctx.fillText(p2.kills,W-66,46);
  ctx.fillStyle='rgba(0,0,0,0.38)'; rr(W/2-52,6,104,16,5); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
  ctx.fillText(`FIRST TO ${WIN_KILLS} KILLS`,W/2,19);
  ctx.fillStyle='rgba(0,0,0,0.28)'; rr(W/2-52,26,104,14,5); ctx.fill();
  ctx.fillStyle='#ccc'; ctx.font='7px monospace'; ctx.fillText(MAPS[curMap].name,W/2,37);
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.font='7px monospace'; ctx.textAlign='right';
  ctx.fillText('[ESC] Menu',W-6,H-5);
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Title
let titleT=0;
function drawHatGrid(gx,gy,pIdx) {
  const COLS=5,ROWS=4,CELL=38;
  ctx.fillStyle='#2a2a36'; rr(gx,gy,COLS*CELL+6,ROWS*CELL+6,6); ctx.fill();
  ctx.strokeStyle='#555'; ctx.lineWidth=1.5; ctx.stroke();
  for(let i=0;i<Math.min(HATS.length,COLS*ROWS);i++){
    const c=i%COLS, r=Math.floor(i/COLS);
    const cx2=gx+3+c*CELL+CELL/2, cy2=gy+3+r*CELL+CELL/2, sel=i===savedHats[pIdx];
    ctx.fillStyle=sel?'#3a4820':'#30303e'; ctx.fillRect(gx+3+c*CELL,gy+3+r*CELL,CELL-2,CELL-2);
    if(sel){ ctx.strokeStyle='#88bb22'; ctx.lineWidth=2; ctx.strokeRect(gx+3+c*CELL,gy+3+r*CELL,CELL-2,CELL-2); }
    if(i===0){ ctx.fillStyle='#777'; ctx.font='16px monospace'; ctx.textAlign='center'; ctx.fillText('∅',cx2,cy2+6); }
    else if(i<HATS.length){ ctx.save(); ctx.beginPath(); ctx.rect(gx+3+c*CELL,gy+3+r*CELL,CELL-2,CELL-2); ctx.clip(); HATS[i].draw(cx2,cy2+10); ctx.restore(); }
    ctx.textAlign='left';
  }
}
function doHatClick(gx,gy,pIdx) {
  const COLS=5,ROWS=4,CELL=38;
  for(let i=0;i<Math.min(HATS.length,COLS*ROWS);i++){
    const c=i%COLS, r=Math.floor(i/COLS);
    if(hov(gx+3+c*CELL,gy+3+r*CELL,CELL-2,CELL-2)) savedHats[pIdx]=i;
  }
}
function drawCtrlPanel(gx,gy,isP1) {
  ctx.fillStyle='#222230'; rr(gx,gy,160,208,8); ctx.fill();
  ctx.strokeStyle='#555'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#1a1a26'; rr(gx+4,gy+4,152,200,6); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText(isP1?'PLAYER 1':'PLAYER 2',gx+80,gy+20);
  const ctrls=isP1?[['JUMP','W'],['DOWN','S'],['LEFT','A'],['RIGHT','D'],['USE','E'],['SHOT','R']]
                  :[['JUMP','↑'],['DOWN','↓'],['LEFT','←'],['RIGHT','→'],['USE','L'],['SHOT','K']];
  ctrls.forEach(([lbl,k],i)=>{
    const ry=gy+30+i*28;
    ctx.fillStyle='#888'; ctx.font='bold 8px monospace'; ctx.textAlign='left'; ctx.fillText(lbl,gx+10,ry+13);
    ctx.fillStyle='#33334a'; ctx.fillRect(gx+116,ry,36,20);
    ctx.strokeStyle='#666'; ctx.lineWidth=1; ctx.strokeRect(gx+116,ry,36,20);
    ctx.fillStyle='#eee'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.fillText(k,gx+134,ry+14);
  });
  ctx.textAlign='left';
}

function drawTitle() {
  titleT++;
  // Sepia bg
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#d4a53a'); g.addColorStop(1,'#a06018');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  [[0,288,88],[112,253,73],[197,278,63],[268,243,83],[362,273,63],[436,213,93],[541,263,73],[626,233,68],[706,283,78],[796,263,68],[876,243,78],[966,278,58]].forEach(([bx,by,bw])=>{
    ctx.fillStyle='rgba(88,48,12,0.72)'; ctx.fillRect(bx,by,bw,H-by);
  });
  [[0,368,88],[113,393,58],[700,378,63],[778,360,78],[873,393,43]].forEach(([bx,by,bw])=>{
    ctx.fillStyle='rgba(36,16,2,0.9)'; ctx.fillRect(bx,by,bw,H-by);
  });
  // Red pole
  ctx.fillStyle='#8b1515'; ctx.fillRect(430,0,40,H);
  ctx.fillStyle='#aa2020'; ctx.fillRect(430,0,8,H);
  ctx.fillStyle='#6a0e0e'; ctx.fillRect(462,0,8,H);
  [72,188,302].forEach(y=>{ ctx.fillStyle='#8b1515'; ctx.fillRect(390,y,120,14); ctx.fillStyle='#aa2020'; ctx.fillRect(390,y,120,5); });
  // Panels
  drawCtrlPanel(6,28,true); drawCtrlPanel(734,28,false);
  // Title
  ctx.fillStyle='#28283a'; rr(202,5,496,46,8); ctx.fill(); ctx.strokeStyle='#555'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#ffd700'; ctx.font='bold 15px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText('CAPYBARA SHOOTING',450,36);
  // Sound button
  const sndHov=hov(230,56,122,26); ctx.fillStyle=sndHov?'#333348':'#262636'; rr(230,56,122,26,6); ctx.fill(); ctx.strokeStyle='#555'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#bbb'; ctx.font='bold 7px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText(`SOUND [M] ${musicOn?'ON':'OFF'}`,291,74);
  // Hat grids — 5×4 = 20 hats each
  ctx.fillStyle='#ccc'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
  ctx.fillText('P1 HAT',300,90); ctx.fillText('P2 HAT',600,90);
  drawHatGrid(197,94,0); drawHatGrid(497,94,1);
  // Map select
  ctx.fillStyle='#bbb'; ctx.font='bold 7px monospace'; ctx.textAlign='center'; ctx.fillText('SELECT MAP:',450,256);
  const mw=56,mh=24,gap=4,tot=MAPS.length*(mw+gap)-gap, mx0=Math.round(450-tot/2);
  MAPS.forEach((m,i)=>{
    const mx=mx0+i*(mw+gap), my=260, sel=curMap===i, hv=hov(mx,my,mw,mh);
    ctx.fillStyle=sel?'#384020':hv?'#2e2e3e':'#242432'; rr(mx,my,mw,mh,5); ctx.fill();
    ctx.strokeStyle=sel?'#88bb22':hv?'#5555aa':'#3a3a4a'; ctx.lineWidth=sel?2:1.5; ctx.stroke();
    ctx.fillStyle='#ccc'; ctx.font='6px monospace'; ctx.fillText(m.name,mx+mw/2,my+mh/2+3);
  });
  // Play button
  const playHov=hov(350,298,200,46);
  ctx.fillStyle=playHov?'#5dd450':'#4bc942'; rr(350,298,200,46,8); ctx.fill();
  ctx.strokeStyle='#2a8a28'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 15px "Press Start 2P",monospace'; ctx.fillText('PLAY!',450,329);
  ctx.fillStyle='#cfc'; ctx.font='7px monospace'; ctx.fillText('[ENTER]',450,342);
  // Booths
  [130,770].forEach((bx,i)=>{
    ctx.fillStyle='#3a1a05'; ctx.fillRect(bx-54,512,108,74); ctx.fillStyle='#2a1005'; ctx.fillRect(bx-60,502,120,14);
    ctx.fillStyle='#6a3a12'; ctx.fillRect(bx-52,512,104,4);
    ctx.fillStyle='#8a7a50'; ctx.fillRect(bx-62,577,50,15); ctx.fillRect(bx+12,577,50,15);
    ctx.save(); ctx.translate(bx,552); ctx.scale(i===0?1:-1,1);
    ctx.fillStyle='#c8873a'; ctx.beginPath(); ctx.ellipse(0,-8,16,12,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4,-25,13,11,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#8a5018'; ctx.fillRect(6,-27,14,10); ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(-4,-29,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-3,-30,1.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#555'; ctx.fillRect(14,-18,20,6);
    if(savedHats[i]>0&&HATS[savedHats[i]]) HATS[savedHats[i]].draw(4,-37);
    ctx.restore();
  });
  // Ground
  ctx.fillStyle='#3e1f08'; ctx.fillRect(0,566,W,34);
  ctx.fillStyle='#f5d800'; for(let sx=0;sx<W;sx+=20) ctx.fillRect(sx,566,10,4);
  ctx.fillStyle='#1a0a00'; for(let sx=10;sx<W;sx+=20) ctx.fillRect(sx,566,10,4);
  // E/L labels
  [118,758].forEach((lx,i)=>{ ctx.fillStyle='#28283a'; ctx.fillRect(lx,577,28,22); ctx.strokeStyle='#666'; ctx.lineWidth=1.5; ctx.strokeRect(lx,577,28,22); ctx.fillStyle='#eee'; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText(i===0?'E':'L',lx+14,593); });
  ctx.textAlign='left';
  canvas.style.cursor=playHov?'pointer':'default';
  if(clickFrame){
    doHatClick(197,94,0); doHatClick(497,94,1);
    if(sndHov) toggleMusic();
    MAPS.forEach((m,i)=>{ if(hov(mx0+i*(mw+gap),260,mw,mh)) curMap=i; });
    if(playHov){ initRound(); STATE='GAME'; startMusic(); }
  }
  if(keys['Enter']||keys['Tab']){ initRound(); STATE='GAME'; startMusic(); }
}

// ---------------------------------------------------------------- Game Over
function drawGameOver() {
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle='#ffd700'; ctx.font='bold 22px "Press Start 2P",monospace'; ctx.fillText(winner,W/2,H/2-65);
  ctx.fillStyle='#fff'; ctx.font='bold 16px "Press Start 2P",monospace'; ctx.fillText('WINS!',W/2,H/2-30);
  ctx.fillStyle='#aaa'; ctx.font='9px monospace'; ctx.fillText(`SCORE:  ${players[0].kills}  —  ${players[1].kills}`,W/2,H/2-6);
  const ag=hov(W/2-125,H/2+18,250,44);
  ctx.fillStyle=ag?'#5dd450':'#4bc942'; rr(W/2-125,H/2+18,250,44,8); ctx.fill();
  ctx.strokeStyle='#2a8a28'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 11px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,H/2+47);
  const bt=hov(W/2-125,H/2+76,250,38);
  ctx.fillStyle=bt?'#333348':'#262636'; rr(W/2-125,H/2+76,250,38,8); ctx.fill();
  ctx.strokeStyle='#555'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#ccc'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,H/2+101);
  ctx.textAlign='left';
  canvas.style.cursor=(ag||bt)?'pointer':'default';
  if((clickFrame&&ag)||keys['Enter']){ initRound(); STATE='GAME'; startMusic(); }
  if(clickFrame&&bt){ STATE='TITLE'; }
}

// ---------------------------------------------------------------- Main Loop
function loop() {
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){
    drawTitle();
  } else if(STATE==='GAME'){
    updateGame();
    ctx.save();
    ctx.scale(cam.zoom,cam.zoom);
    ctx.translate(-cam.x,-cam.y);
    drawBg(); drawPlats(); drawPads(); drawPickups(); drawFX();
    players.forEach(drawCapy);
    drawBullets(); drawFloats();
    ctx.restore();
    drawHUD();
    if(keys['Escape']){ stopMusic(); STATE='TITLE'; }
  } else if(STATE==='GAME_OVER'){
    ctx.save();
    ctx.scale(cam.zoom,cam.zoom);
    ctx.translate(-cam.x,-cam.y);
    drawBg(); drawPlats(); drawPads(); drawFX();
    players.forEach(drawCapy);
    ctx.restore();
    drawGameOver();
  }
  clickFrame=false;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
