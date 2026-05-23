'use strict';
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let CW, CH, GY;
function resize(){ CW=canvas.width=window.innerWidth; CH=canvas.height=window.innerHeight; GY=Math.floor(CH*0.74); }
resize(); window.addEventListener('resize',resize);

// ── Slow-motion / vignette state ──────────────────────────────────────
let timeScale=1, vigAlpha=0, fadeAlpha=0, deathPhase=0, deathTimer=0;

// ── Audio ─────────────────────────────────────────────────────────────
let _ac=null;
function AC(){if(!_ac)_ac=new(window.AudioContext||window.webkitAudioContext)();return _ac;}
function osc(f,d,type='sine',vol=0.12,delay=0,f2=null){
  try{const ac=AC(),o=ac.createOscillator(),g=ac.createGain();
  o.connect(g);g.connect(ac.destination);o.type=type;o.frequency.value=f;
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,ac.currentTime+delay+d);
  g.gain.setValueAtTime(vol,ac.currentTime+delay);
  g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+delay+d);
  o.start(ac.currentTime+delay);o.stop(ac.currentTime+delay+d+0.05);}catch(e){}
}
function noise(d,vol=0.2,hp=1000,delay=0){
  try{const ac=AC(),b=ac.createBuffer(1,ac.sampleRate*d,ac.sampleRate),data=b.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i*8/data.length);
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  f.type='highpass';f.frequency.value=hp;s.buffer=b;s.connect(f);f.connect(g);g.connect(ac.destination);
  g.gain.value=vol;s.start(ac.currentTime+delay);}catch(e){}
}
const sfx={
  jump:    ()=>{osc(200,0.05,'sine',0.1);osc(520,0.25,'sine',0.13,0.02,900);noise(0.08,0.06,2800);},
  whoosh:  ()=>{osc(140,1.1,'sawtooth',0.06,0,38);osc(90,1.2,'sine',0.05,0.05,32);noise(0.9,0.04,800);},
  winNote: ()=>{osc(523,0.1,'sine',0.1);osc(784,0.1,'sine',0.09,0.09);osc(1047,0.15,'sine',0.1,0.18);},
  superJump:()=>{osc(180,0.05,'square',0.14);osc(440,0.12,'sine',0.1,0.04);osc(720,0.18,'sine',0.09,0.1);noise(0.15,0.1,1500);},
  land:    ()=>{osc(95,0.06,'square',0.12);noise(0.06,0.12,300);},
  slide:   ()=>{osc(210,0.22,'sawtooth',0.09,0,38);noise(0.12,0.06,1500);},
  brake:   ()=>{osc(620,0.04,'sawtooth',0.1);noise(0.2,0.12,1900);},
  coin:    ()=>{osc(880,0.07,'sine',0.09);osc(1100,0.07,'sine',0.07,0.07);},
  crash:   ()=>{osc(290,0.04,'square',0.2);osc(145,0.35,'sawtooth',0.14,0.05);osc(75,0.6,'square',0.1,0.1);noise(0.4,0.26,100,0.05);osc(420,0.15,'square',0.1,0.1,75);},
  spike:   ()=>{osc(300,0.04,'square',0.18);osc(150,0.5,'sawtooth',0.15,0.04);noise(0.5,0.24,80,0.03);osc(600,0.08,'square',0.09,0.08,190);},
  step:    ()=>{osc(100+Math.random()*20,0.035,'square',0.03);},
  explode: ()=>{osc(180,0.08,'square',0.24);osc(70,0.5,'sawtooth',0.2,0.06);noise(0.45,0.32,60);},
  win:     ()=>{[523,659,784,1046,1318].forEach((f,i)=>osc(f,0.18,'sine',0.12,i*0.1));},
  respawn: ()=>{osc(440,0.1,'sine',0.08);osc(660,0.12,'sine',0.09,0.1);osc(880,0.15,'sine',0.1,0.2);},
  checkpoint:()=>{osc(660,0.08,'sine',0.1);osc(880,0.1,'sine',0.09,0.09);},
  loopEnter:()=>{osc(440,0.05,'sine',0.08);osc(660,0.05,'sine',0.06,0.04);},
  truck:   ()=>{osc(78+Math.random()*18,0.04,'sawtooth',0.025);},
};

// ── Music ─────────────────────────────────────────────────────────────
let musicOn=false,airG=null,musicAC=null;
function startMusic(){
  if(musicOn)return; musicOn=true;
  try{
    const ac=AC(); ac.resume(); musicAC=ac;

    // Master chain: compressor → limiter → out
    const lim=ac.createDynamicsCompressor();
    lim.threshold.value=-4; lim.knee.value=2; lim.ratio.value=12; lim.attack.value=0.001; lim.release.value=0.08;
    lim.connect(ac.destination);
    const M=ac.createGain(); M.gain.value=0.55; M.connect(lim);

    // Plate reverb (short, airy)
    function mkRev(dur=1.0,dec=2.8){
      const len=Math.ceil(ac.sampleRate*dur), buf=ac.createBuffer(2,len,ac.sampleRate);
      for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,dec);}
      const cv=ac.createConvolver(); cv.buffer=buf; return cv;
    }
    const rev=mkRev(); rev.connect(M);
    const revSend=ac.createGain(); revSend.gain.value=0.22; revSend.connect(rev);

    const BPM=126, B=60/BPM, S=B*0.5;

    // ── Kick — punchy, short pitch sweep ────────────────────────────
    function kick(t,v=1){
      const o=ac.createOscillator(),g=ac.createGain();
      o.type='sine'; o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(42,t+0.1);
      o.connect(g); g.connect(M);
      g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
      o.start(t); o.stop(t+0.3);
    }

    // ── Snare — layered noise + body tone ───────────────────────────
    function snare(t,v=0.6){
      const sr=ac.sampleRate, len=Math.ceil(sr*0.18);
      const buf=ac.createBuffer(1,len,sr), d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8);
      const s=ac.createBufferSource(),hpf=ac.createBiquadFilter(),g=ac.createGain();
      hpf.type='highpass'; hpf.frequency.value=1800;
      s.buffer=buf; s.connect(hpf); hpf.connect(g); g.connect(M); g.connect(revSend);
      g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.16);
      s.start(t);
      // Body tone
      const o=ac.createOscillator(),g2=ac.createGain();
      o.type='triangle'; o.frequency.value=195;
      o.connect(g2); g2.connect(M);
      g2.gain.setValueAtTime(v*0.35,t); g2.gain.exponentialRampToValueAtTime(0.001,t+0.06);
      o.start(t); o.stop(t+0.08);
    }

    // ── Hi-hat ──────────────────────────────────────────────────────
    function hat(t,v=0.16,open=false){
      const dur=open?0.18:0.038, sr=ac.sampleRate, len=Math.ceil(sr*dur);
      const buf=ac.createBuffer(1,len,sr), d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,open?1.2:2.5);
      const s=ac.createBufferSource(),hpf=ac.createBiquadFilter(),g=ac.createGain();
      hpf.type='highpass'; hpf.frequency.value=10000;
      s.buffer=buf; s.connect(hpf); hpf.connect(g); g.connect(M);
      g.gain.value=v; s.start(t);
    }

    // ── Bass — filtered sawtooth, warm attack ───────────────────────
    function bass(t,f,dur){
      const o=ac.createOscillator(),lpf=ac.createBiquadFilter(),g=ac.createGain();
      o.type='sawtooth'; o.frequency.value=f;
      lpf.type='lowpass'; lpf.frequency.value=320; lpf.Q.value=1.2;
      o.connect(lpf); lpf.connect(g); g.connect(M);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.42,t+0.012);
      g.gain.setValueAtTime(0.42,t+dur*0.55); g.gain.exponentialRampToValueAtTime(0.001,t+dur*0.92);
      o.start(t); o.stop(t+dur);
    }

    // ── Lead melody — detuned dual square for chiptune warmth ───────
    function lead(t,f,dur,v=0.14){
      [f, f*1.008].forEach(freq=>{
        const o=ac.createOscillator(),lpf=ac.createBiquadFilter(),g=ac.createGain();
        o.type='square'; o.frequency.value=freq;
        lpf.type='lowpass'; lpf.frequency.value=900;
        o.connect(lpf); lpf.connect(g);
        g.connect(M); g.connect(revSend);
        g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+0.006);
        g.gain.setValueAtTime(v,t+dur*0.72); g.gain.exponentialRampToValueAtTime(0.001,t+dur*0.96);
        o.start(t); o.stop(t+dur+0.02);
      });
    }

    // ── Pad — sine stack, soft attack/release ───────────────────────
    function pad(t,freqs,dur){
      freqs.forEach(f=>{
        const o=ac.createOscillator(),g=ac.createGain();
        o.type='sine'; o.frequency.value=f;
        o.connect(g); g.connect(M); g.connect(revSend);
        g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.055,t+0.12);
        g.gain.setValueAtTime(0.055,t+dur-0.14); g.gain.linearRampToValueAtTime(0,t+dur);
        o.start(t); o.stop(t+dur+0.05);
      });
    }

    // ── Notes (C major, A minor) ─────────────────────────────────────
    const n={
      C3:130.8,D3:146.8,E3:164.8,F3:174.6,G3:196,A3:220,B3:246.9,
      C4:261.6,D4:293.7,E4:329.6,F4:349.2,G4:392,A4:440,B4:493.9,
      C5:523.3,D5:587.3,E5:659.3,F5:698.5,G5:784,A5:880
    };

    // Chord progression: C – Am – F – G  (one chord per bar)
    const chords=[
      [n.C3,n.E4,n.G4],
      [n.A3,n.C4,n.E4],
      [n.F3,n.A3,n.C4],
      [n.G3,n.B3,n.D4]
    ];

    // Bass line (one pattern per chord)
    const bassLines=[
      [{f:n.C3,d:S*1.5},{f:n.G3,d:S*.5},{f:n.E3,d:S},{f:n.G3,d:S*1},{f:n.C3,d:S*.5},{f:n.E3,d:S*.5}],
      [{f:n.A3*.5,d:S*1.5},{f:n.E3,d:S*.5},{f:n.C3,d:S},{f:n.E3,d:S*1},{f:n.A3*.5,d:S*.5},{f:n.C3,d:S*.5}],
      [{f:n.F3*.5,d:S*1.5},{f:n.C3,d:S*.5},{f:n.A3*.5,d:S},{f:n.C3,d:S*1},{f:n.F3*.5,d:S*.5},{f:n.A3*.5,d:S*.5}],
      [{f:n.G3*.5,d:S*1.5},{f:n.D3,d:S*.5},{f:n.B3*.5,d:S},{f:n.D3,d:S*1},{f:n.G3*.5,d:S*.5},{f:n.B3*.5,d:S*.5}]
    ];

    // Melody — two-bar phrases cycling through 4 variations
    const melodies=[
      [n.E5,0,n.G5,n.E5,n.D5,0,n.C5,0,   n.D5,n.E5,n.G5,0,n.A5,0,n.G5,0],
      [n.C5,n.E5,n.G5,0,n.E5,n.D5,n.C5,0, n.A4,n.C5,n.E5,0,n.D5,0,n.E5,0],
      [n.F5,0,n.E5,n.D5,n.C5,n.D5,n.E5,0, n.G4,n.A4,n.C5,0,n.B4,0,n.C5,0],
      [n.G5,n.E5,n.D5,n.C5,n.D5,0,n.E5,0, n.C5,n.B4,n.A4,n.G4,n.A4,0,n.C5,0]
    ];

    let barIdx=0;
    function bar(t){
      const ci=barIdx%4;      // chord index
      const mi=Math.floor(barIdx/2)%4; // melody phrase index (2 bars per phrase)
      const barDur=S*8;

      // Drums
      kick(t);
      if(barIdx%2===0) kick(t+S*2.5, 0.4); // syncopated kick
      kick(t+S*4);
      snare(t+S*2); snare(t+S*6);
      // 8th-note hi-hats with slight velocity groove
      for(let i=0;i<8;i++) hat(t+i*S, i%2===0?0.2:0.12);
      // Open hat on beat 3.5
      hat(t+S*7, 0.1, true);

      // Bass line
      let bt=t;
      bassLines[ci].forEach(({f,d})=>{ if(f>0) bass(bt,f,d*0.9); bt+=d; });

      // Melody (every 8th note over 2 bars; play 16 notes starting on even bars)
      const mel=melodies[mi];
      const noteIdx=(barIdx%2)*8;
      for(let i=0;i<8;i++){
        const f=mel[noteIdx+i];
        if(f>0) lead(t+i*S, f, S*0.84);
      }

      // Pad chord (whole bar, soft)
      pad(t, chords[ci], barDur*0.98);

      barIdx++;
      setTimeout(()=>bar(ac.currentTime+0.05),(barDur-0.18)*1000);
    }
    bar(ac.currentTime+0.15);

    // Air whoosh node (used by jump sfx)
    airG=ac.createGain(); airG.gain.value=0; airG.connect(M);
    const airO=ac.createOscillator(); airO.type='sine'; airO.frequency.value=440;
    airO.connect(airG); airO.start();

  }catch(e){}
}
function setAir(v){if(airG&&musicAC)try{airG.gain.linearRampToValueAtTime(v*0.09,musicAC.currentTime+0.2);}catch(e){}}

// ── Constants ─────────────────────────────────────────────────────────
const PX0=180, GRAV=0.64, GRAV_UP=0.32, JV=-17, SJV=-23, SLIDE_WIN=500;

// ── Level configs ──────────────────────────────────────────────────────
const LVLS=[
  {name:'Mountain City',  theme:'mountain',goal:6000, spdMult:1.0, obsGap:[280,480], icon:'🏃'},
  {name:'Snow Storm',     theme:'snow',    goal:6500, spdMult:1.1, obsGap:[260,440], icon:'❄️'},
  {name:'Rainy City',     theme:'rain',    goal:7000, spdMult:1.15,obsGap:[250,420], icon:'🌧'},
  {name:'Mud Swamp',      theme:'mud',     goal:7000, spdMult:1.1, obsGap:[240,400], icon:'🌿'},
  {name:'Dark Cave',      theme:'cave',    goal:7500, spdMult:1.2, obsGap:[220,380], icon:'🦇'},
  {name:'Dino Forest',    theme:'dino',    goal:8000, spdMult:1.25,obsGap:[210,360], icon:'🦕'},
  {name:'Future Tech',    theme:'future',  goal:8000, spdMult:1.3, obsGap:[195,340], icon:'🤖'},
  {name:'Apocalypse',     theme:'apoc',    goal:8500, spdMult:1.35,obsGap:[180,320], icon:'💥'},
  {name:'Deep Space',     theme:'space',   goal:9000, spdMult:1.4, obsGap:[170,300], icon:'🚀'},
  {name:'The Final Run',  theme:'final',   goal:9500, spdMult:1.5, obsGap:[160,280], icon:'💀'},
];
function LV(){return LVLS[Math.min(level-1,9)];}

// ── Player ────────────────────────────────────────────────────────────
let worldX=0,spd=5.5,score=0,coins=0,level=1,dist=0,nextSpawn=500;
let active=false,paused=false,goalReached=false,finishWX=6000;
let lastCpWX=0, truckSndT=0, jumpSlowT=0, slidedustT=0;
const weatherParts=[];
const P={x:PX0,y:0,vy:0,vx:0,onG:true,state:'run',legT:0,hairY:0,hairVy:0,crashT:0,slideT:0,slideEnd:0,inv:0,lives:3,stepT:0,onPlat:null,prevLeft:false,flipAngle:0,flipSpd:0};

function resetP(checkpoint=false){
  if(checkpoint&&lastCpWX>0){
    const diff=lastCpWX-PX0; worldX=Math.max(0,diff);
    [obs,plats,bombs,spins,coins_,trucks,narrows,pits,pads].forEach(a=>{for(let i=a.length-1;i>=0;i--)if((a[i].wx||0)<worldX-500)a.splice(i,1);});
  } else { worldX=0; }
  Object.assign(P,{x:PX0,y:GY,vy:0,vx:0,onG:true,state:'run',legT:0,hairY:0,hairVy:0,crashT:0,slideT:0,slideEnd:0,inv:1.5,stepT:0,onPlat:null,prevLeft:false,flipAngle:0,flipSpd:0});
}

// ── Entity arrays ─────────────────────────────────────────────────────
const obs=[],plats=[],bombs=[],spins=[],coins_=[],dust=[],exps=[],bgProps=[],cps=[],trucks=[],narrows=[],pits=[],pads=[];

// ── Input ─────────────────────────────────────────────────────────────
const K={},T={up:false,down:false,left:false,right:false};
document.addEventListener('keydown',e=>{K[e.code]=true;e.preventDefault();});
document.addEventListener('keyup',e=>K[e.code]=false);
['b-left','b-right','b-up','b-down'].forEach(id=>{
  const el=document.getElementById(id),dir=id.split('-')[1];if(!el)return;
  el.addEventListener('pointerdown',e=>{T[dir]=true;e.preventDefault();},{passive:false});
  el.addEventListener('pointerup',()=>T[dir]=false);
  el.addEventListener('pointercancel',()=>T[dir]=false);
});
const jB=document.getElementById('b-jump'),sB=document.getElementById('b-slide');
if(jB){jB.addEventListener('pointerdown',e=>{T.up=true;e.preventDefault();},{passive:false});jB.addEventListener('pointerup',()=>T.up=false);}
if(sB){sB.addEventListener('pointerdown',e=>{T.down=true;e.preventDefault();},{passive:false});sB.addEventListener('pointerup',()=>T.down=false);}

// ── Spawn ─────────────────────────────────────────────────────────────
function spawnAt(wx){
  if(wx>=finishWX-400)return; // clear runway to finish
  if(wx-lastCpWX>1700){cps.push({wx:wx-60,reached:false});lastCpWX=wx;}
  const r=Math.random();
  if(r<0.14)      obs.push({wx,type:'wall',w:50+Math.random()*20,h:68+Math.random()*30});
  else if(r<0.26) obs.push({wx,type:'low',w:90,barH:12,clearH:44});
  else if(r<0.38) obs.push({wx,type:'spikes',w:54+Math.random()*30});
  else if(r<0.48) pits.push({wx:wx+20,w:140+Math.random()*120});
  else if(r<0.50){
    // Spike pit + rolling truck
    const pw=170+Math.random()*80;
    obs.push({wx:wx+8,type:'spikes',w:pw});
    trucks.push({wx:wx+pw-10,y:GY-40,w:82,h:40,vx:-(55+Math.random()*35),onP:false,alive:true});
  }
  else if(r<0.60) narrows.push({wx,w:180+Math.random()*110,ceilY:GY-50});
  else if(r<0.70) spins.push({wx,y:GY-56-Math.random()*28,r:14,spikeLen:22,blades:6,angle:0,rotSpd:2.5+Math.random()*2});
  else if(r<0.82) plats.push({wx,y:GY-85,vy:0,w:115+Math.random()*70,rising:false,onP:false,startY:GY-85,maxRise:140});
  else if(r<0.90) bombs.push({wx,y:GY-14,vx:0,vy:0,exploded:false,pushed:false});
  else            pads.push({wx:wx+10,w:74});
  for(let cx=wx+60;cx<wx+240;cx+=65+Math.random()*50)
    coins_.push({wx:cx,y:GY-42-(Math.random()<0.3?72:0),col:false,bobT:Math.random()*6.28});
}
function genBg(from,to){
  let wx=from;
  while(wx<to){
    const t=Math.random(),type=t<0.11?'tree':t<0.32?'lamp':t<0.54?'fence':t<0.76?'pole':'bush';
    bgProps.push({wx,type,extra:type==='fence'?80+Math.random()*60:0});
    wx+=90+Math.random()*170;
  }
}

const sx=wx=>wx-worldX;

// ── Pre-generated silhouettes ─────────────────────────────────────────
const farB=[],midB=[],mtns=[];
for(let i=0;i<55;i++)farB.push({x:i*88+Math.random()*35,w:45+Math.random()*75,h:80+Math.random()*200,gray:Math.random()<.5});
for(let i=0;i<40;i++)midB.push({x:i*120+Math.random()*45,w:65+Math.random()*95,h:100+Math.random()*230,warm:Math.random()});
for(let i=0;i<14;i++)mtns.push({x:i*320+Math.random()*100,w:220+Math.random()*260,h:160+Math.random()*190,snow:0.32+Math.random()*0.28});

// ── Draw: Background ──────────────────────────────────────────────────
function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,GY);
  g.addColorStop(0,'#1a5fa8');g.addColorStop(0.45,'#3d84d4');g.addColorStop(0.85,'#6db3e8');g.addColorStop(1,'#a8d4f0');
  ctx.fillStyle=g;ctx.fillRect(0,0,CW,GY);
}
function drawMountains(){
  const p=worldX*0.055;
  mtns.forEach(m=>{
    let mx=(m.x-p)%(CW+640);if(mx<-380)mx+=CW+640;
    const base=GY-2,top=base-m.h;
    ctx.fillStyle='#8fafc6';ctx.beginPath();ctx.moveTo(mx-m.w*.5,base);ctx.lineTo(mx,top);ctx.lineTo(mx+m.w*.5,base);ctx.closePath();ctx.fill();
    // shadow side
    ctx.fillStyle='#738fa6';ctx.beginPath();ctx.moveTo(mx,top);ctx.lineTo(mx+m.w*.5,base);ctx.lineTo(mx+m.w*.12,base);ctx.closePath();ctx.fill();
    // snow
    const sl=top+m.h*m.snow;
    ctx.fillStyle='#ddeef5';ctx.beginPath();ctx.moveTo(mx-m.w*m.snow*.6,sl);ctx.lineTo(mx,top-10);ctx.lineTo(mx+m.w*m.snow*.6,sl);ctx.closePath();ctx.fill();
    ctx.fillStyle='#eef5fa';ctx.beginPath();ctx.moveTo(mx-m.w*m.snow*.22,sl+10);ctx.lineTo(mx,top-10);ctx.lineTo(mx+m.w*m.snow*.14,sl+16);ctx.closePath();ctx.fill();
  });
}
function drawForest(){
  const p=worldX*0.18;
  ctx.fillStyle='#1a4a28';
  for(let i=0;i<28;i++){
    const tx=((i*162+36-p)%(CW+400)+CW+400)%(CW+400)-100;
    const th=48+(i%7)*11;
    ctx.beginPath();ctx.moveTo(tx-20,GY-2);ctx.lineTo(tx,GY-2-th);ctx.lineTo(tx+20,GY-2);ctx.closePath();ctx.fill();
  }
}
function drawClouds(){
  const t=worldX*0.032;
  [[0.14,-58,92,28],[0.46,-42,70,21],[0.74,-76,55,18]].forEach(([fx,off,w,h])=>{
    const x=((fx*CW+off-t)%(CW+280)+CW+280)%(CW+280)-140;
    ctx.fillStyle='rgba(255,255,255,.92)';
    ctx.beginPath();ctx.ellipse(x,GY*.08+h,w,h,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x-w*.38,GY*.08+h*1.1,w*.62,h*.72,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+w*.42,GY*.08+h*1.15,w*.52,h*.65,0,0,Math.PI*2);ctx.fill();
  });
  const sx2=CW*.86,sy2=GY*.08;
  ctx.fillStyle='rgba(255,255,200,.18)';ctx.beginPath();ctx.arc(sx2,sy2,76,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,225,.88)';ctx.beginPath();ctx.arc(sx2,sy2,35,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fffde0';ctx.beginPath();ctx.arc(sx2,sy2,20,0,Math.PI*2);ctx.fill();
}
function drawGround(){
  const g=ctx.createLinearGradient(0,GY,0,CH);
  g.addColorStop(0,'#6b3412');g.addColorStop(0.07,'#5a2c0e');g.addColorStop(1,'#311608');
  ctx.fillStyle=g;ctx.fillRect(0,GY,CW,CH-GY);
  ctx.fillStyle='#8a9090';ctx.fillRect(0,GY,CW,4);
  ctx.fillStyle='rgba(0,0,0,.12)';
  for(let i=0;i<34;i++){const dx=((i*72-worldX*.6)%(CW+90)+CW+90)%(CW+90);ctx.beginPath();ctx.ellipse(dx,GY+10+(i%5)*17,4,2,0,0,Math.PI*2);ctx.fill();}
}

// ── Draw: Props ───────────────────────────────────────────────────────
function drawTree(wx){
  const x=sx(wx);if(x<-130||x>CW+130)return;
  const tc=GY-108;
  ctx.fillStyle='#5a3010';ctx.beginPath();ctx.moveTo(x-12,GY);ctx.lineTo(x+12,GY);ctx.lineTo(x+7,tc);ctx.lineTo(x-7,tc);ctx.closePath();ctx.fill();
  [[0,tc-20,54,46,'#2a9028'],[-22,tc-5,36,34,'#34b030'],[24,tc-3,34,32,'#38b436'],[0,tc-44,44,38,'#258226'],[-16,tc-28,30,28,'#36be32']].forEach(([ox,oy,rw,rh,col])=>{ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x+ox,oy,rw,rh,0,0,Math.PI*2);ctx.fill();});
}
function drawLamp(wx){
  const x=sx(wx);if(x<-50||x>CW+50)return;
  ctx.fillStyle='#222';ctx.fillRect(x-3,GY-135,6,135);
  ctx.strokeStyle='#222';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,GY-135);ctx.bezierCurveTo(x,GY-160,x+36,GY-158,x+36,GY-140);ctx.stroke();
  ctx.fillStyle='#fffce0';ctx.beginPath();ctx.ellipse(x+36,GY-132,11,15,0,0,Math.PI*2);ctx.fill();
}
function drawFence(wx,w){
  const x=sx(wx);if(x+w<-10||x>CW+10)return;
  const fH=78;ctx.fillStyle='#2a2a2a';ctx.fillRect(x,GY-fH,w,3);ctx.fillRect(x,GY-fH*.42,w,3);ctx.fillRect(x,GY-3,w,3);
  for(let bx=x+6;bx<x+w;bx+=11){ctx.fillRect(bx-2,GY-fH-4,3,fH+4);ctx.beginPath();ctx.moveTo(bx,GY-fH-14);ctx.lineTo(bx+3,GY-fH-5);ctx.lineTo(bx-3,GY-fH-5);ctx.closePath();ctx.fill();}
}
function drawPole(wx){
  const x=sx(wx);if(x<-60||x>CW+60)return;
  ctx.fillStyle='#5a3618';ctx.fillRect(x-4,GY-192,8,192);ctx.fillRect(x-33,GY-170,66,7);
  ctx.strokeStyle='#1a1a1a';ctx.lineWidth=1.5;
  [[-27,-162],[-8,-162],[8,-162],[22,-162]].forEach(([dx,dy])=>{ctx.beginPath();ctx.moveTo(x+dx,GY+dy);ctx.bezierCurveTo(x+dx-66,GY+dy+28,x+dx-126,GY+dy+22,x+dx-192,GY+dy+12);ctx.stroke();});
}
function drawBush(wx){
  const x=sx(wx);if(x<-60||x>CW+60)return;
  [[0,-18,28,20,'#2a7a2a'],[15,-26,20,17,'#38a034'],[-14,-24,18,15,'#30962e'],[0,-8,32,14,'#1e6020']].forEach(([ox,oy,rw,rh,c])=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x+ox,GY+oy,rw,rh,0,0,Math.PI*2);ctx.fill();});
}

// ── Draw: Launch pad ──────────────────────────────────────────────────
function drawPad(p){
  const x=sx(p.wx);if(x+p.w<-10||x>CW+10)return;
  const t=Date.now()/600;
  const pulse=0.55+Math.sin(t*3)*0.45;
  // Base — white with thick black border
  ctx.fillStyle='#fff';ctx.fillRect(x-2,GY-18,p.w+4,18);
  ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeRect(x-2,GY-18,p.w+4,18);
  // Black checkerboard on surface
  const sq=9;
  for(let col=0;col<Math.floor(p.w/sq);col++){
    if(col%2===0){ctx.fillStyle='#111';ctx.fillRect(x+col*sq,GY-18,sq,9);}
    else{ctx.fillStyle='#fff';ctx.fillRect(x+col*sq,GY-18,sq,9);}
  }
  // Bottom half — white
  ctx.fillStyle='#fff';ctx.fillRect(x,GY-9,p.w,9);
  // Glowing animated border
  ctx.shadowColor=`rgba(255,230,0,${pulse})`;ctx.shadowBlur=16*pulse;
  ctx.strokeStyle=`rgba(255,215,0,${0.7+pulse*0.3})`;ctx.lineWidth=3;
  ctx.strokeRect(x-2,GY-18,p.w+4,18);
  ctx.shadowBlur=0;
  // Animated bounce arrows above pad
  const off=Math.sin(t*5)*4;
  ctx.fillStyle=`rgba(255,220,0,${0.6+pulse*0.4})`;
  ctx.font='bold 13px monospace';ctx.textAlign='center';
  ctx.fillText('▲▲▲',x+p.w/2,GY-26+off);
}

// ── Draw: Checkpoint flag ─────────────────────────────────────────────
function drawCP(cp){
  const x=sx(cp.wx);if(x<-70||x>CW+70)return;
  ctx.fillStyle='#5a3618';ctx.fillRect(x-3,GY-105,5,105);
  ctx.fillStyle=cp.reached?'#FFD700':'#FF4444';
  ctx.beginPath();ctx.moveTo(x+2,GY-105);ctx.lineTo(x+40,GY-88);ctx.lineTo(x+2,GY-70);ctx.closePath();ctx.fill();
}

// ── Draw: Obstacles ───────────────────────────────────────────────────
function drawWall(o){
  const x=sx(o.wx);if(x+o.w<0||x>CW)return;
  ctx.fillStyle='#7a5030';ctx.fillRect(x,GY-o.h,o.w,o.h);
  for(let py=0;py<o.h;py+=15){ctx.fillStyle=py%30===0?'#8a6038':'#966840';ctx.fillRect(x+2,GY-o.h+py+2,o.w-4,12);}
  ctx.fillStyle='#666';[[8,8],[o.w-8,8],[8,o.h-8],[o.w-8,o.h-8]].forEach(([bx,by])=>{ctx.beginPath();ctx.arc(x+bx,GY-o.h+by,3.5,0,Math.PI*2);ctx.fill();});
}
function drawLow(o){
  const x=sx(o.wx);if(x+o.w<0||x>CW)return;
  const by=GY-o.clearH-o.barH;
  ctx.fillStyle='#686868';ctx.fillRect(x,by,o.w,o.barH);
  ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(x,by,o.w,3);
  ctx.fillStyle='#505050';ctx.fillRect(x+12,GY-o.clearH,7,o.clearH);ctx.fillRect(x+o.w-19,GY-o.clearH,7,o.clearH);
}
function drawSpikes(o){
  const x=sx(o.wx);if(x+o.w<0||x>CW)return;
  ctx.fillStyle='#3d3d3d';ctx.fillRect(x,GY-8,o.w,8);
  const sw=16,n=Math.ceil(o.w/sw);
  for(let i=0;i<n;i++){
    const grd=ctx.createLinearGradient(x+i*sw,GY-8,x+i*sw+sw/2,GY-38);
    grd.addColorStop(0,'#909090');grd.addColorStop(1,'#d0d0d0');
    ctx.fillStyle=grd;ctx.beginPath();ctx.moveTo(x+i*sw+1,GY-8);ctx.lineTo(x+i*sw+sw/2,GY-38);ctx.lineTo(x+i*sw+sw-1,GY-8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#555';ctx.lineWidth=0.8;ctx.stroke();
  }
}
function drawSpin(sp){
  const x=sx(sp.wx);if(x<-90||x>CW+90)return;
  ctx.save();ctx.translate(x,sp.y);ctx.rotate(sp.angle);
  ctx.fillStyle='#484848';ctx.beginPath();ctx.arc(0,0,sp.r,0,Math.PI*2);ctx.fill();
  for(let i=0;i<sp.blades;i++){
    ctx.save();ctx.rotate((i/sp.blades)*Math.PI*2);
    ctx.fillStyle='#aaa';ctx.beginPath();ctx.moveTo(-4,-sp.r);ctx.lineTo(0,-(sp.r+sp.spikeLen));ctx.lineTo(4,-sp.r);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#444';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
  }
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(-3,-3,4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawBomb(bm){
  if(bm.exploded)return;
  const x=sx(bm.wx);if(x+22<0||x>CW+22)return;
  ctx.fillStyle='#181818';ctx.beginPath();ctx.arc(x,bm.y,14,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.13)';ctx.beginPath();ctx.arc(x-4,bm.y-5,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#7a5030';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,bm.y-14);ctx.bezierCurveTo(x+8,bm.y-26,x+14,bm.y-20,x+10,bm.y-34);ctx.stroke();
  const ft=Date.now()/140;ctx.fillStyle=`hsl(${ft*55%60},100%,60%)`;ctx.beginPath();ctx.arc(x+10,bm.y-34,3.5+Math.sin(ft)*1.5,0,Math.PI*2);ctx.fill();
}
function drawPlat(mp){
  const x=sx(mp.wx);if(x+mp.w<0||x>CW)return;
  const h=38;ctx.fillStyle='#2a2018';ctx.fillRect(x-3,mp.y-h,mp.w+6,h+3);
  for(let i=0;i<3;i++){ctx.fillStyle=i%2===0?'#B87840':'#A06830';ctx.fillRect(x,mp.y-h+i*11+2,mp.w,10);}
  ctx.fillStyle='#777';for(let rx=x+14;rx<x+mp.w-10;rx+=38){ctx.beginPath();ctx.arc(rx,mp.y-h+4,3,0,Math.PI*2);ctx.fill();}
  if(mp.rising){ctx.fillStyle='rgba(255,200,0,.9)';const ax=x+mp.w/2,ay=mp.y-h-20;ctx.beginPath();ctx.moveTo(ax,ay-14);ctx.lineTo(ax+10,ay);ctx.lineTo(ax-10,ay);ctx.closePath();ctx.fill();}
}
function drawTruck(tr){
  if(!tr.alive)return;
  const x=sx(tr.wx);if(x+tr.w<-20||x>CW+20)return;
  const by=tr.y;
  ctx.fillStyle='#8B6038';ctx.fillRect(x,by-tr.h,tr.w,tr.h);
  for(let py=0;py<tr.h;py+=10){ctx.fillStyle=py%20===0?'#9a7040':'#7a5028';ctx.fillRect(x+1,by-tr.h+py+1,tr.w-2,8);}
  ctx.fillStyle='rgba(0,0,0,.2)';[tr.w*.33,tr.w*.66].forEach(dx=>ctx.fillRect(x+dx,by-tr.h,2,tr.h));
  ctx.fillStyle='#555';[[8,8],[tr.w-8,8],[8,tr.h-8],[tr.w-8,tr.h-8]].forEach(([bx,by2])=>{ctx.beginPath();ctx.arc(x+bx,by-tr.h+by2,3,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#2a2a2a';[x+14,x+tr.w-14].forEach(wx2=>{ctx.beginPath();ctx.arc(wx2,by+2,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#555';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#888';ctx.beginPath();ctx.arc(wx2,by+2,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a2a2a';});
  if(tr.onP){ctx.fillStyle='rgba(255,220,0,.92)';const hx=x+tr.w/2,hy=by-tr.h-24;ctx.beginPath();ctx.moveTo(hx,hy-14);ctx.lineTo(hx+10,hy);ctx.lineTo(hx-10,hy);ctx.closePath();ctx.fill();}
}
function drawPit(p){
  const x=sx(p.wx);if(x+p.w<-10||x>CW+10)return;
  const g=ctx.createLinearGradient(0,GY,0,GY+130);
  g.addColorStop(0,'#0a0305');g.addColorStop(0.35,'#050105');g.addColorStop(1,'#000');
  ctx.fillStyle=g;ctx.fillRect(x,GY-2,p.w,CH-GY+2);
  // Jagged left edge
  ctx.fillStyle='#6b3412';
  ctx.beginPath();ctx.moveTo(x,GY-2);ctx.lineTo(x-8,GY-2);ctx.lineTo(x-8,GY+CH);ctx.lineTo(x,GY+CH);
  ctx.lineTo(x,GY+16);ctx.lineTo(x+12,GY+9);ctx.lineTo(x+5,GY+20);ctx.lineTo(x+16,GY+14);ctx.lineTo(x+8,GY+2);ctx.closePath();ctx.fill();
  // Jagged right edge
  ctx.beginPath();ctx.moveTo(x+p.w,GY-2);ctx.lineTo(x+p.w+8,GY-2);ctx.lineTo(x+p.w+8,GY+CH);ctx.lineTo(x+p.w,GY+CH);
  ctx.lineTo(x+p.w,GY+16);ctx.lineTo(x+p.w-12,GY+9);ctx.lineTo(x+p.w-5,GY+20);ctx.lineTo(x+p.w-16,GY+14);ctx.lineTo(x+p.w-8,GY+2);ctx.closePath();ctx.fill();
  // Depth red glow
  ctx.fillStyle='rgba(180,20,20,0.07)';ctx.fillRect(x,GY,p.w,CH-GY);
}
function drawNarrow(np){
  const x=sx(np.wx);if(x+np.w<-10||x>CW+10)return;
  ctx.fillStyle='#5a2e0a';ctx.fillRect(x,np.ceilY-62,np.w,62);
  ctx.fillStyle='rgba(0,0,0,.18)';
  for(let i=0;i<5;i++){const bx=x+np.w*.1+i*(np.w*.18);ctx.beginPath();ctx.arc(bx,np.ceilY-8,8+i*2.5,0,Math.PI);ctx.fill();}
  // Danger marks on sides
  ctx.fillStyle='rgba(255,60,60,.7)';ctx.fillRect(x,np.ceilY-3,np.w,3);
  if(x>-20&&x<360){ctx.fillStyle='rgba(255,80,80,.9)';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText('SLIDE ↓',x+np.w/2,np.ceilY-66);}
}
function drawExp(ex){
  const x=sx(ex.wx);ctx.globalAlpha=ex.life*.88;
  ctx.fillStyle='#FF6600';ctx.beginPath();ctx.arc(x,ex.y,ex.r*(1-ex.life*.5),0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(x,ex.y,ex.r*(1-ex.life*.5)*.5,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
}
function drawCoin(c){
  if(c.col)return;const x=sx(c.wx);if(x<-22||x>CW+22)return;
  const by=Math.sin(c.bobT)*5;
  const g=ctx.createRadialGradient(x-3,c.y+by-3,2,x,c.y+by,13);
  g.addColorStop(0,'#FFE566');g.addColorStop(.5,'#FFD700');g.addColorStop(1,'#BB9900');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,c.y+by,13,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#AA7700';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#7B5500';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('$',x,c.y+by+4);
}

// ── Draw: Character ───────────────────────────────────────────────────
function drawChar(){
  const isJ=P.state==='jump'||P.state==='superJump';
  const isS=P.state==='slide',isC=P.state==='crash';
  const px=P.x,py=P.y;
  ctx.save();ctx.translate(px,py);
  if(isC&&P.crashT>0&&P.crashT<99){const w=Math.sin(P.crashT*28)*5*(P.crashT>.3?1:0);ctx.translate(w,0);ctx.rotate(Math.sin(P.crashT*18)*.13);}
  if(isC&&P.crashT>=99){// big slow-mo death tumble
    ctx.rotate(Math.sin(Date.now()*.003)*.25);
    ctx.translate(0,Math.sin(Date.now()*.005)*3);
  }
  if(isS){ctx.rotate(-.48);ctx.translate(20,26);}
  // Stumble lean while running
  const t=P.legT;
  if(P.state==='run'&&P.onG)ctx.rotate(Math.sin(t*3.5)*.038);
  // Front flip — rotate around character centre while airborne
  if(isJ&&P.flipAngle!==0){
    ctx.translate(0,-32);       // pivot around torso centre
    ctx.rotate(P.flipAngle);
    ctx.translate(0,32);
  }
  // Hair floppy — rises high on jump
  const hf=isJ?Math.min(P.hairVy*-.55,22):Math.max(P.hairY*.5,-4);
  ctx.strokeStyle='#1a1a1a';ctx.fillStyle='#fff';ctx.lineWidth=2.8;ctx.lineCap='round';ctx.lineJoin='round';
  // Legs
  if(!isS){
    const stride=isJ?0:1,ls=Math.sin(t*7)*.7*stride,lkx=Math.sin(ls)*20,lky=Math.abs(Math.cos(t*7))*30*stride;
    ctx.strokeStyle='#ccc';ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(-5+lkx*.6,lky*.5);ctx.lineTo(-6+lkx,lky);ctx.stroke();
    ctx.strokeStyle='#1a1a1a';ctx.beginPath();ctx.moveTo(5,-2);ctx.lineTo(5-lkx*.6,lky*.5);ctx.lineTo(6-lkx,lky);ctx.stroke();
    ctx.fillStyle='#333';ctx.fillRect(-11+lkx,-2+lky,12,5);ctx.fillRect(2-lkx,-2+lky,12,5);ctx.fillStyle='#fff';
  } else {
    ctx.strokeStyle='#ccc';ctx.beginPath();ctx.moveTo(-4,-2);ctx.lineTo(-18,20);ctx.lineTo(-36,16);ctx.stroke();
    ctx.strokeStyle='#1a1a1a';ctx.beginPath();ctx.moveTo(4,-2);ctx.lineTo(18,20);ctx.lineTo(38,22);ctx.stroke();
  }
  // Body
  ctx.fillStyle='#fff';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=2.8;
  ctx.beginPath();ctx.moveTo(-13,-43);ctx.bezierCurveTo(-16,-29,-13,-14,-9,-4);ctx.bezierCurveTo(-5,2,5,2,9,-4);ctx.bezierCurveTo(13,-14,16,-29,13,-43);ctx.bezierCurveTo(7,-49,-7,-49,-13,-43);ctx.fill();ctx.stroke();
  // Arms — flail in air
  ctx.lineWidth=2.5;
  const as=isJ?Math.sin(Date.now()*.022)*30:Math.sin(t*7)*24;
  if(!isS){
    ctx.strokeStyle='#ccc';ctx.beginPath();ctx.moveTo(-12,-36);ctx.bezierCurveTo(-25+as,-25,-30+as*.4,-14,-24+as*.2,-7);ctx.stroke();
    ctx.strokeStyle='#1a1a1a';ctx.beginPath();ctx.moveTo(12,-36);ctx.bezierCurveTo(25-as,-25,30-as*.4,-14,24-as*.2,-7);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-24+as*.2,-7,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(24-as*.2,-7,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();
  } else {
    ctx.strokeStyle='#1a1a1a';ctx.beginPath();ctx.moveTo(-12,-36);ctx.lineTo(-34,-56);ctx.stroke();ctx.beginPath();ctx.moveTo(12,-36);ctx.lineTo(34,-56);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-34,-56,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(34,-56,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.save(); // head save (for future use)
  ctx.fillStyle='#fff';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=2.8;ctx.beginPath();ctx.arc(0,-62,23,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Eyes
  if(isC){
    ctx.lineWidth=2.2;[[-9,-65],[7,-65]].forEach(([ex,ey])=>{ctx.beginPath();ctx.moveTo(ex-5,ey-4);ctx.lineTo(ex+5,ey+4);ctx.moveTo(ex+5,ey-4);ctx.lineTo(ex-5,ey+4);ctx.stroke();});
    ctx.fillStyle='#88CCFF';ctx.beginPath();ctx.moveTo(18,-56);ctx.bezierCurveTo(22,-50,22,-44,18,-44);ctx.bezierCurveTo(14,-44,14,-50,18,-56);ctx.fill();
  } else {
    ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(-8,-64,3.8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(8,-64,3.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-6,-66,1.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(10,-66,1.4,0,Math.PI*2);ctx.fill();
    if(isJ){ctx.strokeStyle='#1a1a1a';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,-57,7,.2,Math.PI-.2);ctx.stroke();}
  }
  ctx.restore(); // end head tilt save
  // Hair — dramatically flops up on jump
  ctx.strokeStyle='#1a1a1a';ctx.lineWidth=2.5;
  [[-12,-84+hf*1.2],[-4,-88+hf*1.45],[5,-87+hf*1.35],[13,-83+hf*1.05]].forEach(([hx,hy])=>{ctx.beginPath();ctx.moveTo(hx-4,-84);ctx.bezierCurveTo(hx-2,hy-5,hx+4,hy-2,hx+2,hy);ctx.stroke();});
  if(P.state==='superJump'){ctx.strokeStyle='rgba(60,200,255,.6)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-32,36,0,Math.PI*2);ctx.stroke();}
  if(isC&&P.crashT>0.4){for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2+P.crashT*5;ctx.fillStyle=['#FFD700','#FF4444','#fff','#FF8844'][i%4];ctx.beginPath();ctx.arc(Math.cos(a)*32,Math.sin(a)*32-60,4+Math.sin(P.crashT*8)*2.5,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
}

// ── Dust ──────────────────────────────────────────────────────────────
function spawnDust(x,y,n=6,sp=3,r=180,g=150,b=110){
  for(let i=0;i<n;i++)dust.push({x:x+(Math.random()-.5)*14,y,vx:(Math.random()-.5)*sp,vy:-(Math.random()*2.5+.4),life:1,maxL:.4+Math.random()*.45,sz:4+Math.random()*8,r,g,b});
}

// ── Slow-death trigger ────────────────────────────────────────────────
function triggerDeath(cause='spike'){
  if(deathPhase!==0)return;
  deathPhase=1;deathTimer=0;
  if(cause==='spike')sfx.spike();else sfx.crash();
  P.state='crash';P.crashT=99;P.vy=0;
  spawnDust(P.x,P.y,22,6,220,80,80);
  // unlimited lives — no decrement
}
function triggerCrash(){
  if(P.inv>0||P.state==='crash')return;
  triggerDeath('obstacle');
}

// ── Hints ─────────────────────────────────────────────────────────────
let hintTO=null;
function showHint(txt,col='#fff'){
  const el=document.getElementById('action-hint');if(!el)return;
  el.textContent=txt;el.style.color=col;el.style.opacity='1';
  if(hintTO)clearTimeout(hintTO);hintTO=setTimeout(()=>el.style.opacity='0',2000);
}

// ── Update ────────────────────────────────────────────────────────────
function update(rawDt){
  if(!active||paused)return;
  // ── Death phases (use real time for pacing) ───────────────────────
  if(deathPhase>0){
    deathTimer+=rawDt;
    if(deathPhase===1){
      timeScale=Math.max(0.1,timeScale-rawDt*3.5);
      vigAlpha=Math.min(.88,vigAlpha+rawDt*1.6);
      if(deathTimer>1.8){deathPhase=2;deathTimer=0;}
    } else if(deathPhase===2){
      fadeAlpha=Math.min(1,fadeAlpha+rawDt*3);
      if(deathTimer>.45){
        deathPhase=3;deathTimer=0;
        resetP(true);sfx.respawn();
      }
    } else if(deathPhase===3){
      fadeAlpha=Math.max(0,fadeAlpha-rawDt*2.5);
      vigAlpha=Math.max(0,vigAlpha-rawDt*2);
      timeScale=Math.min(1,timeScale+rawDt*2.2);
      if(deathTimer>.55)deathPhase=0;
    }
    // Minimal physics in death — world slows
    const sdt=rawDt*timeScale;
    worldX+=spd*sdt*.25;dist+=spd*sdt*.25;
    P.hairVy+=2.2*sdt;P.hairY+=P.hairVy*sdt;if(P.hairY>0){P.hairY=0;P.hairVy*=-.45;}
    for(let i=dust.length-1;i>=0;i--){const d=dust[i];d.x+=d.vx*timeScale;d.y+=d.vy*timeScale;d.vy+=.1*timeScale;d.life-=rawDt/d.maxL;if(d.life<=0)dust.splice(i,1);}
    return;
  }
  // Jump slow-mo: brief time-stretch on takeoff, quickly returns to 1
  if(jumpSlowT>0){
    jumpSlowT=Math.max(0,jumpSlowT-rawDt);
    timeScale=0.55+(.45*(1-jumpSlowT/0.45));
  } else {
    timeScale=1;
  }
  vigAlpha=Math.max(0,vigAlpha-rawDt*2);fadeAlpha=Math.max(0,fadeAlpha-rawDt*2);

  const dt=rawDt;
  // spd tracks player velocity for loop/spinner logic
  spd=Math.abs(P.vx);

  const doJ=K['Space']||K['ArrowUp']||K['KeyW']||T.up;
  const doS=K['ArrowDown']||K['KeyS']||T.down;
  const goL=K['ArrowLeft']||K['KeyA']||T.left;
  const goR=K['ArrowRight']||K['KeyD']||T.right;

  // ── Jump — floaty gravity on ascent ──────────────────────────────
  // ── Slide ────────────────────────────────────────────────────────
  if(doS&&P.onG&&P.state!=='crash'){
    if(P.state!=='slide'){sfx.slide();P.slideEnd=0;}
    P.state='slide';P.slideT=.38;
  }
  if(P.state==='slide'){
    P.slideT-=dt;
    if(P.slideT<=0&&!doS){P.state='run';P.slideEnd=Date.now();}
    slidedustT-=dt;
    if(slidedustT<=0&&P.onG){
      spawnDust(P.x+18,GY,3,2.5,150,120,90);
      spawnDust(P.x-10,GY,2,2,170,140,100);
      slidedustT=0.05;
    }
  }

  // ── Jump — also fires from slide state (combo = super jump) ──────
  if(doJ&&P.onG&&P.state!=='crash'){
    const inSlide=P.state==='slide';
    const ts=inSlide?0:Date.now()-P.slideEnd;
    const isSuper=ts<SLIDE_WIN;
    P.vy=isSuper?SJV:JV;P.onG=false;
    P.state=isSuper?'superJump':'jump';P.hairVy=-18;
    jumpSlowT=0.45;
    P.flipAngle=0;P.flipSpd=isSuper?16:9;
    if(isSuper){sfx.superJump();spawnDust(P.x,P.y,18,7);}
    else{sfx.jump();sfx.whoosh();sfx.winNote();spawnDust(P.x,P.y,9,4);}
    setAir(1);
  }

  // Gentle air drag — preserves horizontal arc
  if(!P.onG&&P.state!=='crash') P.vx*=(1-0.6*dt);
  // ── Physics — lower gravity rising (defying gravity feel) ────────
  const grav=P.vy<0&&!P.onG?GRAV_UP:GRAV;
  P.vy+=grav;P.y+=P.vy;
  if(P.onPlat){P.y=P.onPlat.y;if(!P.onPlat.rising)P.onPlat=null;}
  // Advance front-flip while in the air
  if(!P.onG&&(P.state==='jump'||P.state==='superJump')){
    P.flipAngle+=P.flipSpd*dt;
  }
  const overPit=pits.some(p=>{const px=sx(p.wx);return P.x>px&&P.x<px+p.w;});
  if(P.y>=GY&&!overPit){
    P.y=GY;
    if(P.vy>0){
      if(P.state==='jump'||P.state==='superJump'){sfx.land();spawnDust(P.x,GY,10,4);P.state='run';setAir(0);}
      P.vy=0;P.onG=true;P.flipAngle=0;P.flipSpd=0;
    }
  }
  if(P.y>GY+160){triggerDeath('fall');return;}

  // Hair
  P.hairVy+=2.2;P.hairY+=P.hairVy*dt;if(P.hairY>0){P.hairY=0;P.hairVy*=-.45;}
  if(P.state!=='jump'&&P.state!=='superJump')P.hairY*=.85;

  if(P.inv>0)P.inv-=dt;
  if(P.state==='slide')P.legT+=dt*2.8;

  // ── Horizontal velocity → drives camera ──────────────────────────
  // Speed cap grows with distance — the further you run, the faster you go
  const MAX_VX=Math.min(900, (260+dist*0.055)*LV().spdMult);
  const ACCEL=900, FRIC=700;
  // Passive auto-boost while running right: gentle push toward current max
  if(P.onG&&P.state==='run'&&P.vx>50) P.vx=Math.min(MAX_VX, P.vx+30*dt);
  if(P.state==='crash'){
    P.vx+=(0-P.vx)*Math.min(1,FRIC*3*dt);
  } else if(goR){
    if(P.vx<-50&&!P.prevLeft){sfx.brake();spawnDust(P.x,P.y,10,5);}
    P.vx=Math.min(MAX_VX,P.vx+ACCEL*dt);
    P.prevLeft=false;
  } else if(goL){
    if(P.vx>50&&P.prevLeft===false){sfx.brake();spawnDust(P.x,P.y,10,5);}
    P.vx=Math.max(-MAX_VX*.55,P.vx-ACCEL*1.4*dt);
    P.prevLeft=true;
  } else {
    P.vx+=(0-P.vx)*Math.min(1,FRIC*dt);
    if(Math.abs(P.vx)<5)P.vx=0;
    P.prevLeft=false;
  }
  // Camera follows player — world scrolls only as player moves
  worldX=Math.max(0,worldX+P.vx*dt);
  dist=Math.max(dist,worldX);
  score+=Math.max(0,P.vx*dt)*0.015;
  // Leg speed and step rate scale with velocity
  if(P.state==='run'&&P.onG){
    P.legT+=dt*Math.max(0.8,Math.abs(P.vx)/80);
    P.stepT-=dt;if(P.stepT<=0){sfx.step();P.stepT=Math.max(0.1,0.3-Math.abs(P.vx)/2000);}
  }

  // ── Moving platforms ──────────────────────────────────────────────
  for(const mp of plats){
    if(mp.rising){mp.vy-=.7;mp.y+=mp.vy;if(mp.y<mp.startY-mp.maxRise){mp.y=mp.startY-mp.maxRise;mp.vy=0;mp.rising=false;if(mp.onP)triggerCrash();}if(mp.onP){P.y=mp.y;P.vy=0;}}
    else if(mp.y<mp.startY){mp.vy+=.8;mp.y+=mp.vy;if(mp.y>=mp.startY){mp.y=mp.startY;mp.vy=0;}}
    const mx=sx(mp.wx);
    if(!mp.rising&&P.y<=mp.y+3&&P.y>=mp.y-22&&P.x>=mx&&P.x<=mx+mp.w&&P.vy>=0){
      P.y=mp.y;P.vy=0;P.onG=true;
      if(P.state==='jump'||P.state==='superJump'){sfx.land();spawnDust(P.x,P.y,5,2);P.state='run';setAir(0);}
      if(!mp.onP){mp.rising=true;mp.vy=-.8;mp.onP=true;}P.onPlat=mp;
    }
    if(mp.onP&&(P.y<mp.y-8||P.x<sx(mp.wx)-10||P.x>sx(mp.wx)+mp.w+10)){mp.onP=false;P.onPlat=null;}
  }

  // ── Launch pads ───────────────────────────────────────────────────
  for(const pad of pads){
    const px2=sx(pad.wx);
    if(P.vy>=0&&P.y>=GY-22&&P.y<=GY+4&&P.x>=px2-8&&P.x<=px2+pad.w+8&&P.state!=='crash'&&deathPhase===0){
      // LAUNCH — massive forward boost + super high jump
      P.vy=-26;P.onG=false;
      P.vx=Math.max(Math.abs(P.vx)*2.4,800)*Math.sign(P.vx||1);
      P.vx=Math.min(P.vx,1600);
      P.state='superJump';P.hairVy=-24;
      P.flipAngle=0;P.flipSpd=24;
      jumpSlowT=0;
      sfx.superJump();sfx.winNote();
      spawnDust(P.x,GY,24,9,255,220,50);
      spawnDust(P.x,GY,14,7,255,255,255);
      showHint('⚡ SUPER LAUNCH!','#FFD700');
      setAir(1);
    }
  }

  // ── Trucks on spikes ──────────────────────────────────────────────
  truckSndT-=dt;
  for(const tr of trucks){
    if(!tr.alive)continue;
    tr.wx+=tr.vx*dt; // rolls left (vx is negative)
    const tx=sx(tr.wx),trTop=tr.y-tr.h;
    if(truckSndT<=0&&Math.abs(tx-P.x)<380){sfx.truck();truckSndT=.16;}
    // Land on top
    if(P.vy>=0&&P.y<=trTop+5&&P.y>=trTop-24&&P.x>=tx-8&&P.x<=tx+tr.w+8&&deathPhase===0){
      P.y=trTop;P.vy=0;P.onG=true;tr.onP=true;
      if(P.state==='jump'||P.state==='superJump'){sfx.land();spawnDust(P.x,P.y,8,3);P.state='run';setAir(0);}
    } else if(tr.onP&&(P.x<tx-12||P.x>tx+tr.w+12||P.y<trTop-14)){tr.onP=false;}
    if(tr.wx<worldX-220)tr.alive=false;
  }

  // ── Bombs ─────────────────────────────────────────────────────────
  for(const bm of bombs){
    if(bm.exploded)continue;
    bm.vy+=GRAV*.5;bm.wx+=bm.vx*dt;bm.y+=bm.vy;
    if(bm.y>=GY-14){bm.y=GY-14;bm.vy*=-.38;bm.vx*=.78;}
    const bx2=sx(bm.wx);
    if(Math.abs(P.x-bx2)<26&&Math.abs(P.y-bm.y)<42&&!bm.pushed){bm.pushed=true;bm.vx=(P.x<bx2?1:-1)*10;bm.vy=-4.5;}
    if(bm.pushed&&(Math.abs(bm.vx)<.1||bm.wx<worldX-50||bm.wx>worldX+CW+100)){bm.exploded=true;exps.push({wx:bm.wx,y:bm.y,r:60,life:1});sfx.explode();spawnDust(P.x,bm.y,18,8);}
  }

  // ── Spinners ──────────────────────────────────────────────────────
  for(const sp of spins){sp.angle+=sp.rotSpd*dt;if(Math.abs(sx(sp.wx)-P.x)<190&&Math.floor(dist*10)%8===0)sfx.truck();}

  // ── Collisions ────────────────────────────────────────────────────
  if(P.inv<=0&&P.state!=='crash'&&deathPhase===0){
    const ph=P.state==='slide'?32:68,pw=P.state==='slide'?32:18;
    const px1=P.x-pw,px2=P.x+pw,py1=P.y-ph,py2=P.y;
    for(const o of obs){
      const ox=sx(o.wx);if(ox+250<0||ox>CW)continue;
      if(o.type==='wall'&&px2>ox&&px1<ox+o.w&&py2>GY-o.h&&py1<GY)triggerCrash();
      else if(o.type==='low'&&px2>ox&&px1<ox+o.w&&py2>GY-o.clearH-o.barH&&py1<GY-o.clearH)triggerCrash();
      else if(o.type==='spikes'&&px2>ox&&px1<ox+o.w&&py2>GY-38&&py1<GY){triggerDeath('spike');return;}
    }
    for(const sp of spins){const dx=P.x-sx(sp.wx),dy=(P.y-65)-sp.y;if(Math.sqrt(dx*dx+dy*dy)<sp.r+sp.spikeLen+10){triggerDeath('spike');return;}}
    // Narrow path — must slide
    for(const np of narrows){
      const nx=sx(np.wx);if(nx+np.w<0||nx>CW)continue;
      if(P.x>=nx&&P.x<=nx+np.w&&P.state!=='slide'&&P.y-ph<np.ceilY){triggerDeath('lowbar');return;}
    }
    // Coins
    for(const c of coins_){if(c.col)continue;if(Math.abs(P.x-sx(c.wx))<22&&Math.abs(P.y-55-c.y)<28){c.col=true;coins++;score+=10;sfx.coin();document.getElementById('score-hud').textContent='💰 '+coins;}}
  }

  // Checkpoints
  for(const cp of cps){if(!cp.reached&&Math.abs(sx(cp.wx)-P.x)<55){cp.reached=true;lastCpWX=cp.wx;sfx.checkpoint();showHint('✓ CHECKPOINT','#88FFaa');}}

  // Particles
  for(let i=exps.length-1;i>=0;i--){exps[i].life-=dt*1.8;if(exps[i].life<=0)exps.splice(i,1);}
  for(let i=dust.length-1;i>=0;i--){const d=dust[i];d.x+=d.vx;d.y+=d.vy;d.vy+=.1;d.life-=dt/d.maxL;if(d.life<=0)dust.splice(i,1);}
  coins_.forEach(c=>{if(!c.col)c.bobT+=dt*3;});

  // Spawn + cleanup
  while(worldX+CW+220>nextSpawn){spawnAt(nextSpawn);const lv=LV();nextSpawn+=lv.obsGap[0]+Math.random()*(lv.obsGap[1]-lv.obsGap[0]);}
  if(!bgProps.length||bgProps[bgProps.length-1].wx<worldX+CW+400)genBg(bgProps.length?bgProps[bgProps.length-1].wx+80:worldX,worldX+CW+700);
  [obs,plats,bombs,spins,coins_,trucks,narrows,cps,pits,pads].forEach(a=>{for(let i=a.length-1;i>=0;i--)if((a[i].wx||0)<worldX-280)a.splice(i,1);});
  for(let i=bgProps.length-1;i>=0;i--)if(bgProps[i].wx<worldX-360)bgProps.splice(i,1);

  // Level completion
  if(!goalReached && worldX >= finishWX){
    goalReached=true; paused=true;
    sfx.win(); showLevelComplete();
  }
  if(!goalReached && sx(finishWX)>0 && sx(finishWX)<400)
    showHint('FINISH LINE ▶','#FFD700');

  // Hints
  if(P.state==='run'&&P.onG){
    if(obs.some(o=>o.type==='low'&&sx(o.wx)>0&&sx(o.wx)<280)||narrows.some(n=>sx(n.wx)>0&&sx(n.wx)<280))showHint('SLIDE ↓','#88AAFF');
    else if(trucks.some(tr=>tr.alive&&sx(tr.wx)>50&&sx(tr.wx)<360))showHint('JUMP ON TRUCK!','#FFD700');
  }
  // Weather
  updateWeather(rawDt);
}

// ── Theme backgrounds ─────────────────────────────────────────────────
function drawThemeSky(th){
  const g=ctx.createLinearGradient(0,0,0,GY);
  const S={
    mountain:['#1a5fa8','#3d84d4','#6db3e8','#a8d4f0'],
    snow:    ['#6a8aaa','#8aaabb','#b0c8d8','#dde8ee'],
    rain:    ['#0e0e18','#1a1a2a','#22223a','#2e2e48'],
    mud:     ['#1e2c0c','#2e3e14','#3e5018','#566428'],
    cave:    ['#010103','#050508','#070710','#0a0a14'],
    dino:    ['#1a6c10','#2a8c1a','#3aaa28','#60cc40'],
    future:  ['#030008','#080018','#0c0024','#100030'],
    apoc:    ['#1a0200','#3a0500','#5a1000','#7a1a00'],
    space:   ['#000003','#000008','#00000e','#000015'],
    final:   ['#1a001a','#2e0030','#1a0018','#0a0808'],
  };
  const c=S[th]||S.mountain;
  g.addColorStop(0,c[0]);g.addColorStop(0.4,c[1]);g.addColorStop(0.75,c[2]);g.addColorStop(1,c[3]);
  ctx.fillStyle=g;ctx.fillRect(0,0,CW,GY);
}
function drawSnowBg(){
  const p=worldX*0.04;
  // Icy mountains — all white
  mtns.forEach(m=>{
    let mx=(m.x-p)%(CW+640);if(mx<-380)mx+=CW+640;
    const base=GY-2,top=base-m.h;
    ctx.fillStyle='#aabccc';ctx.beginPath();ctx.moveTo(mx-m.w*.5,base);ctx.lineTo(mx,top);ctx.lineTo(mx+m.w*.5,base);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ddeef8';ctx.beginPath();ctx.moveTo(mx-m.w*.55,base-m.h*.35);ctx.lineTo(mx,top-12);ctx.lineTo(mx+m.w*.55,base-m.h*.35);ctx.closePath();ctx.fill();
  });
  // Heavy dark clouds
  const t=worldX*0.028;
  [[0.1,-30,120,38],[0.35,-20,100,32],[0.62,-40,90,28],[0.85,-25,110,35]].forEach(([fx,off,w,h])=>{
    const x=((fx*CW+off-t)%(CW+300)+CW+300)%(CW+300)-150;
    ctx.fillStyle='rgba(160,170,180,.9)';
    ctx.beginPath();ctx.ellipse(x,GY*.1+h,w,h,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x-w*.4,GY*.1+h*1.1,w*.65,h*.75,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+w*.4,GY*.1+h*1.1,w*.55,h*.68,0,0,Math.PI*2);ctx.fill();
  });
}
function drawRainBg(){
  const p=worldX*0.04;
  for(let i=0;i<18;i++){
    const bx=((i*175+Math.sin(i*7.3)*55-p)%(CW+350)+CW+350)%(CW+350)-175;
    const bh=80+((i*317)%170),bw=50+((i*73)%90);
    ctx.fillStyle='#0e1020';ctx.fillRect(bx,GY-bh,bw,bh);
    ctx.fillStyle='rgba(200,220,255,0.18)';
    for(let wy=GY-bh+8;wy<GY-12;wy+=18)for(let wx2=bx+6;wx2<bx+bw-4;wx2+=13)
      if((i*3+Math.floor(wy/18)+Math.floor((wx2-bx)/13))%4!==0)ctx.fillRect(wx2,wy,7,9);
  }
  // Dark clouds
  const t=worldX*0.025;
  [[0.15,0,140,44],[0.5,-10,120,38],[0.8,0,100,32]].forEach(([fx,off,w,h])=>{
    const x=((fx*CW+off-t)%(CW+320)+CW+320)%(CW+320)-160;
    ctx.fillStyle='rgba(20,22,35,.95)';
    ctx.beginPath();ctx.ellipse(x,GY*.06+h,w,h,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x-w*.45,GY*.06+h*1.1,w*.7,h*.78,0,0,Math.PI*2);ctx.fill();
  });
}
function drawMudBg(){
  const p=worldX*0.05;
  // Dead twisted swamp trees
  for(let i=0;i<16;i++){
    const tx=((i*210+Math.sin(i*6.1)*50-p)%(CW+420)+CW+420)%(CW+420)-210;
    const th2=80+((i*137)%100);
    ctx.strokeStyle='#2a3a0a';ctx.lineWidth=5+((i%4)*1.5);
    ctx.beginPath();ctx.moveTo(tx,GY-4);ctx.bezierCurveTo(tx+Math.sin(i)*12,GY-th2*.5,tx+Math.cos(i)*18,GY-th2*.8,tx+Math.sin(i*2)*22,GY-th2);ctx.stroke();
    // Moss/vines
    ctx.strokeStyle='rgba(60,80,20,0.5)';ctx.lineWidth=2;
    [[-8,15],[8,10],[-5,25]].forEach(([dx,dy])=>{ctx.beginPath();ctx.moveTo(tx+Math.sin(i)*22,GY-th2);ctx.bezierCurveTo(tx+Math.sin(i)*22+dx,GY-th2+dy*1.5,tx+Math.sin(i)*22+dx*2,GY-th2+dy*3,tx+Math.sin(i)*22+dx*2.5,GY-th2+dy*4);ctx.stroke();});
  }
  // Murky fog low
  ctx.fillStyle='rgba(50,70,10,0.22)';for(let i=0;i<5;i++){const fx=((i*CW*.28-p*.2)%(CW+400)+CW+400)%(CW+400)-200;ctx.beginPath();ctx.ellipse(fx,GY-30,180+i*40,28+i*8,0,0,Math.PI*2);ctx.fill();}
}
function drawCaveBg(){
  const p=worldX*0.07;
  // Stalactites
  ctx.fillStyle='#181820';
  for(let i=0;i<28;i++){
    const cx2=((i*130+Math.sin(i*4.7)*30-p)%(CW+260)+CW+260)%(CW+260)-130;
    const h=35+((i*223)%90);
    ctx.beginPath();ctx.moveTo(cx2-14,0);ctx.lineTo(cx2+14,0);ctx.lineTo(cx2,h);ctx.closePath();ctx.fill();
    if(i%4===0){ctx.fillStyle='rgba(0,160,200,0.45)';ctx.beginPath();ctx.moveTo(cx2-4,h-8);ctx.lineTo(cx2+4,h-8);ctx.lineTo(cx2,h+18);ctx.closePath();ctx.fill();ctx.fillStyle='#181820';}
  }
  // Glowing mushrooms
  for(let i=0;i<10;i++){
    const mx2=((i*260+90-p*.5)%(CW+520)+CW+520)%(CW+520)-260;
    const mc=i%2===0?'rgba(0,220,120,0.65)':'rgba(80,120,255,0.65)';
    ctx.fillStyle=mc;ctx.beginPath();ctx.ellipse(mx2,GY-22,14+((i%3)*4),11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(180,180,140,0.6)';ctx.fillRect(mx2-3,GY-16,5,18);
    ctx.shadowColor=mc;ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(mx2,GY-22,14+((i%3)*4),11,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
  // Stalagmites
  ctx.fillStyle='#181820';
  for(let i=0;i<16;i++){
    const sx2=((i*155+70-p)%(CW+310)+CW+310)%(CW+310)-155;
    const h=18+((i*191)%38);
    ctx.beginPath();ctx.moveTo(sx2-9,GY+2);ctx.lineTo(sx2+9,GY+2);ctx.lineTo(sx2,GY-h);ctx.closePath();ctx.fill();
  }
}
function drawDinoBg(){
  const p=worldX*0.055;
  // Giant prehistoric trees
  for(let i=0;i<10;i++){
    const tx=((i*320+60-p)%(CW+640)+CW+640)%(CW+640)-320;
    ctx.fillStyle='#3a2010';ctx.fillRect(tx-20,GY-310,40,310);
    ctx.fillStyle='#1a7010';ctx.beginPath();ctx.arc(tx,GY-310,85,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#28a018';ctx.beginPath();ctx.arc(tx-35,GY-340,60,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(tx+30,GY-330,55,0,Math.PI*2);ctx.fill();
  }
  // Giant ferns
  ctx.strokeStyle='#1a6008';
  for(let i=0;i<22;i++){
    const fx=((i*175-p)%(CW+350)+CW+350)%(CW+350)-175;
    const fh=60+((i*127)%80);
    for(let j=-2;j<=2;j++){
      ctx.lineWidth=2+Math.abs(j)*.5;
      ctx.beginPath();ctx.moveTo(fx,GY-fh*.2);ctx.bezierCurveTo(fx+j*35,GY-fh*.6,fx+j*60,GY-fh*.85,fx+j*72,GY-fh);ctx.stroke();
    }
  }
  // Flying pterodactyls
  for(let i=0;i<4;i++){
    const fpx=((i*CW*.38+200-p*.15)%(CW+400)+CW+400)%(CW+400)-200;
    const fpy=GY*.15+i*GY*.08+Math.sin(Date.now()*.001+i)*18;
    ctx.strokeStyle='rgba(80,40,20,0.7)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(fpx-20,fpy);ctx.lineTo(fpx,fpy-10);ctx.lineTo(fpx+20,fpy);ctx.stroke();
  }
}
function drawFutureBg(){
  const p=worldX*0.045;
  // Neon grid
  ctx.strokeStyle='rgba(0,180,255,0.07)';ctx.lineWidth=1;
  for(let i=0;i<14;i++){const lx=((i*110-p)%(CW+220)+CW+220)%(CW+220)-110;ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,GY);ctx.stroke();}
  for(let i=0;i<8;i++){const ly=i*(GY/8);ctx.beginPath();ctx.moveTo(0,ly);ctx.lineTo(CW,ly);ctx.stroke();}
  // Neon buildings
  for(let i=0;i<15;i++){
    const bx=((i*195+Math.sin(i*4.1)*45-p)%(CW+390)+CW+390)%(CW+390)-195;
    const bh=90+((i*231)%220),bw=38+((i*67)%65);
    ctx.fillStyle='#030010';ctx.fillRect(bx,GY-bh,bw,bh);
    const nc=`hsl(${(i*58+Math.floor(worldX*.01))%360},100%,60%)`;
    ctx.strokeStyle=nc;ctx.lineWidth=1.5;ctx.strokeRect(bx,GY-bh,bw,bh);
    ctx.fillStyle=nc.replace('60%','70%)').replace('hsl','rgba').replace(')',',0.25)');
    for(let wy=GY-bh+8;wy<GY-10;wy+=18)for(let wx2=bx+6;wx2<bx+bw-4;wx2+=12)
      if((i+Math.floor(wy/18))%3!==0){ctx.beginPath();ctx.arc(wx2+3,wy+4,2,0,Math.PI*2);ctx.fill();}
  }
  // Hovering ships
  for(let i=0;i<4;i++){
    const hx=((i*CW*.36+100-p*.25)%(CW+400)+CW+400)%(CW+400)-200;
    const hy=GY*.18+i*GY*.1+Math.sin(Date.now()*.0015+i)*14;
    ctx.fillStyle='rgba(0,140,255,0.35)';ctx.fillRect(hx,hy,88,10);
    ctx.strokeStyle='rgba(0,255,255,0.7)';ctx.lineWidth=1.5;ctx.strokeRect(hx,hy,88,10);
    ctx.shadowColor='rgba(0,200,255,0.8)';ctx.shadowBlur=12;ctx.strokeRect(hx,hy,88,10);ctx.shadowBlur=0;
  }
}
function drawApocBg(){
  const p=worldX*0.055;
  // Ruined buildings
  for(let i=0;i<16;i++){
    const bx=((i*168+Math.sin(i*5.9)*35-p)%(CW+336)+CW+336)%(CW+336)-168;
    const bh=55+((i*197)%130),bw=44+((i*79)%70);
    ctx.fillStyle='#1a0800';ctx.fillRect(bx,GY-bh,bw,bh);
    // Jagged rubble top
    ctx.fillStyle='#280c00';ctx.beginPath();ctx.moveTo(bx,GY-bh);
    for(let j=0;j<=bw;j+=8)ctx.lineTo(bx+j,GY-bh-((j*i*2+i*13)%22));
    ctx.lineTo(bx+bw,GY-bh);ctx.closePath();ctx.fill();
    // Glowing cracks
    if(i%3===0){ctx.strokeStyle='rgba(255,60,0,0.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx+bw*.3,GY-bh);ctx.lineTo(bx+bw*.52,GY-bh*.4);ctx.stroke();}
  }
  // Smoke clouds
  const t=worldX*0.018;
  for(let i=0;i<6;i++){
    const sx2=((i*230+80-t)%(CW+460)+CW+460)%(CW+460)-230;
    ctx.fillStyle='rgba(80,30,0,0.18)';ctx.beginPath();ctx.ellipse(sx2,GY*.28+i*GY*.06,90+i*20,38+i*10,0,0,Math.PI*2);ctx.fill();
  }
}
function drawSpaceBg(){
  const p=worldX*0.008;
  // Stars
  for(let i=0;i<140;i++){
    const sx2=((i*133+i*i*.05-p)%(CW+200)+CW+200)%(CW+200)-100;
    const sy=(i*71+i*.25)%(GY*.92);
    const sz=i%9===0?2.5:i%3===0?1.5:0.8;
    ctx.globalAlpha=(0.4+Math.sin(Date.now()*.0008+i)*.4)*( i%5===0?0.9:0.6);
    ctx.fillStyle='#fff';ctx.fillRect(sx2,sy,sz,sz);
  }
  ctx.globalAlpha=1;
  // Nebula glow
  const ng=ctx.createRadialGradient(CW*.55,GY*.38,0,CW*.55,GY*.38,220);
  ng.addColorStop(0,'rgba(80,0,120,0.25)');ng.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ng;ctx.fillRect(0,0,CW,GY);
  // Planets
  ctx.fillStyle='#b46040';ctx.beginPath();ctx.arc(CW*.8,GY*.22,38,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#c87850';ctx.beginPath();ctx.arc(CW*.8-8,GY*.22-8,14,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(200,130,80,0.5)';ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(CW*.8,GY*.22,72,16,-.28,0,Math.PI*2);ctx.stroke();
}
function drawFinalBg(){
  const p=worldX*0.05;
  // Purple nebula
  const ng=ctx.createRadialGradient(CW*.4,GY*.5,0,CW*.4,GY*.5,260);
  ng.addColorStop(0,'rgba(180,0,80,0.2)');ng.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ng;ctx.fillRect(0,0,CW,GY);
  // Chaos ruins + neon
  for(let i=0;i<14;i++){
    const bx=((i*205+Math.sin(i*6.7)*55-p)%(CW+410)+CW+410)%(CW+410)-205;
    const bh=70+((i*181)%160),bw=40+((i*71)%75);
    ctx.fillStyle='#100010';ctx.fillRect(bx,GY-bh,bw,bh);
    ctx.strokeStyle=i%2===0?'rgba(255,20,20,0.45)':'rgba(180,0,255,0.45)';
    ctx.lineWidth=1.5;ctx.strokeRect(bx,GY-bh,bw,bh);
  }
  // Random lightning flashes
  if(Math.random()<0.025){
    const lx=Math.random()*CW;
    ctx.strokeStyle='rgba(220,200,255,0.7)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(lx,0);
    let cy=0;while(cy<GY*.75){ctx.lineTo(lx+(Math.random()-.5)*44,cy+=28);}ctx.stroke();
  }
}

function drawBackground(){
  const th=LV().theme;
  drawThemeSky(th);
  switch(th){
    case 'mountain': drawMountains();drawForest();drawClouds();break;
    case 'snow':     drawSnowBg();break;
    case 'rain':     drawRainBg();break;
    case 'mud':      drawMudBg();break;
    case 'cave':     drawCaveBg();break;
    case 'dino':     drawDinoBg();break;
    case 'future':   drawFutureBg();break;
    case 'apoc':     drawApocBg();break;
    case 'space':    drawSpaceBg();break;
    case 'final':    drawFinalBg();break;
  }
}

// ── Weather ───────────────────────────────────────────────────────────
function updateWeather(dt){
  const th=LV().theme;
  if(th==='snow'){
    for(let i=0;i<3;i++) weatherParts.push({x:Math.random()*CW,y:-6,vx:(Math.random()-.5)*18,vy:55+Math.random()*35,type:'snow',life:1,sz:2+Math.random()*3,wobT:Math.random()*6.28});
  } else if(th==='rain'){
    for(let i=0;i<10;i++) weatherParts.push({x:Math.random()*CW,y:-8,vx:-55,vy:560+Math.random()*180,type:'rain',life:1});
  } else if(th==='apoc'||th==='final'){
    if(Math.random()<0.35) weatherParts.push({x:Math.random()*CW,y:GY-20,vx:(Math.random()-.5)*38,vy:-(45+Math.random()*75),type:'ember',life:1,sz:1.5+Math.random()*2.5});
  } else if(th==='space'){
    if(Math.random()<0.08) weatherParts.push({x:CW+8,y:Math.random()*GY*.85,vx:-(180+Math.random()*280),vy:(Math.random()-.5)*30,type:'asteroid',life:1,sz:3+Math.random()*6});
  }
  for(let i=weatherParts.length-1;i>=0;i--){
    const w=weatherParts[i];
    if(w.type==='snow') w.vx=Math.sin((w.wobT+=dt*1.5))*22;
    w.x+=w.vx*dt; w.y+=w.vy*dt;
    w.life-=dt*(w.type==='snow'?0.28:w.type==='rain'?1.4:w.type==='ember'?0.7:0.5);
    if(w.y>CH+10||w.x<-20||w.x>CW+20||w.life<=0) weatherParts.splice(i,1);
  }
}
function drawWeather(){
  for(const w of weatherParts){
    ctx.globalAlpha=w.life*.75;
    if(w.type==='snow'){
      ctx.fillStyle='#ddeeff';ctx.beginPath();ctx.arc(w.x,w.y,w.sz,0,Math.PI*2);ctx.fill();
    } else if(w.type==='rain'){
      ctx.strokeStyle='rgba(140,160,210,0.55)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(w.x,w.y);ctx.lineTo(w.x+7,w.y+16);ctx.stroke();
    } else if(w.type==='ember'){
      ctx.fillStyle=`hsl(${25+Math.random()*20},100%,${50+Math.random()*20}%)`;
      ctx.beginPath();ctx.arc(w.x,w.y,w.sz,0,Math.PI*2);ctx.fill();
    } else if(w.type==='asteroid'){
      ctx.fillStyle='#778899';ctx.beginPath();ctx.arc(w.x,w.y,w.sz,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#556677';ctx.beginPath();ctx.arc(w.x-w.sz*.4,w.y-w.sz*.3,w.sz*.4,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.globalAlpha=1;
}

// ── Finish line ───────────────────────────────────────────────────────
function drawFinishLine(){
  if(goalReached||finishWX>worldX+CW+300)return;
  const x=sx(finishWX);if(x<-80||x>CW+80)return;
  ctx.fillStyle='#888';ctx.fillRect(x-4,GY-250,8,250);
  const sq=13,fw=65,fh=104;
  for(let ri=0;ri<Math.ceil(fh/sq);ri++)for(let ci=0;ci<Math.ceil(fw/sq);ci++){
    ctx.fillStyle=(ri+ci)%2===0?'#fff':'#111';ctx.fillRect(x-4+ci*sq,GY-250+ri*sq,sq,sq);
  }
  const pulse=0.65+Math.sin(Date.now()*.006)*0.35;
  ctx.shadowColor=`rgba(255,215,0,${pulse})`;ctx.shadowBlur=22*pulse;
  ctx.fillStyle='#FFD700';ctx.font='bold 19px monospace';ctx.textAlign='center';
  ctx.fillText('FINISH!',x+28,GY-264);ctx.shadowBlur=0;
}

// ── Theme-aware ground ────────────────────────────────────────────────
function drawGroundThemed(){
  const th=LV().theme;
  const G={
    mountain:{c1:'#6b3412',c2:'#5a2c0e',c3:'#311608',line:'#8a9090'},
    snow:    {c1:'#c0d4e4',c2:'#a8c0d0',c3:'#80a0b8',line:'#ddeeff'},
    rain:    {c1:'#1e1e2e',c2:'#181828',c3:'#121220',line:'#2a2a42'},
    mud:     {c1:'#3c2c10',c2:'#2e2008',c3:'#1e1404',line:'#5a4018'},
    cave:    {c1:'#141418',c2:'#0e0e12',c3:'#08080c',line:'#222228'},
    dino:    {c1:'#5c3a10',c2:'#4a2c08',c3:'#341e04',line:'#7a5020'},
    future:  {c1:'#040012',c2:'#03000c',c3:'#020008',line:'rgba(0,180,255,0.35)'},
    apoc:    {c1:'#1c0800',c2:'#140600',c3:'#0e0400',line:'#2c1000'},
    space:   {c1:'#040010',c2:'#030009',c3:'#020006',line:'rgba(60,60,200,0.3)'},
    final:   {c1:'#160010',c2:'#100008',c3:'#0a0006',line:'rgba(200,0,80,0.4)'},
  };
  const g2=G[th]||G.mountain;
  const gr=ctx.createLinearGradient(0,GY,0,CH);
  gr.addColorStop(0,g2.c1);gr.addColorStop(0.07,g2.c2);gr.addColorStop(1,g2.c3);
  ctx.fillStyle=gr;ctx.fillRect(0,GY,CW,CH-GY);
  ctx.fillStyle=g2.line;ctx.fillRect(0,GY,CW,4);
  ctx.fillStyle='rgba(0,0,0,.1)';
  for(let i=0;i<34;i++){const dx=((i*72-worldX*.6)%(CW+90)+CW+90)%(CW+90);ctx.beginPath();ctx.ellipse(dx,GY+10+(i%5)*17,4,2,0,0,Math.PI*2);ctx.fill();}
}

// ── Level complete ────────────────────────────────────────────────────
function showLevelComplete(){
  const lv=LV();
  document.getElementById('lvl-icon').textContent=lv.icon;
  document.getElementById('lvl-title').textContent='LEVEL '+level+' COMPLETE!';
  document.getElementById('lvl-score').textContent='Score: '+Math.floor(score);
  document.getElementById('lvl-coins').textContent='Coins: '+coins;
  const nextBtn=document.getElementById('btn-next-lvl');
  if(level>=10){
    document.getElementById('lvl-next-name').textContent='🏆 You beat all 10 levels!';
    nextBtn.style.display='none';
  } else {
    document.getElementById('lvl-next-name').textContent='Next: '+LVLS[level].name;
    nextBtn.style.display='';
  }
  document.getElementById('lvl-overlay').style.display='flex';
}

// ── Render ────────────────────────────────────────────────────────────
function render(){
  ctx.clearRect(0,0,CW,CH);
  drawBackground();
  const th=LV().theme;
  if(th==='mountain'||th==='snow'||th==='rain')bgProps.forEach(b=>{
    if(b.type==='tree')drawTree(b.wx);
    else if(b.type==='lamp')drawLamp(b.wx);
    else if(b.type==='fence')drawFence(b.wx,b.extra||90);
    else if(b.type==='pole')drawPole(b.wx);
    else drawBush(b.wx);
  });
  cps.forEach(drawCP);
  coins_.forEach(drawCoin);
  narrows.forEach(drawNarrow);
  obs.forEach(o=>{if(o.type==='wall')drawWall(o);else if(o.type==='low')drawLow(o);else if(o.type==='spikes')drawSpikes(o);});
  pads.forEach(drawPad);
  spins.forEach(drawSpin);plats.forEach(drawPlat);trucks.forEach(drawTruck);bombs.forEach(drawBomb);exps.forEach(drawExp);
  dust.forEach(d=>{ctx.fillStyle=`rgba(${d.r},${d.g},${d.b},${d.life*.78})`;ctx.beginPath();ctx.arc(d.x,d.y,d.sz*d.life,0,Math.PI*2);ctx.fill();});
  drawGroundThemed();
  pits.forEach(drawPit);
  drawFinishLine();
  drawWeather();
  if(active&&(P.inv<=0||Math.floor(P.inv*12)%2===0))drawChar();
  drawHUD();
  // Vignette — expands from edges as player dies
  if(vigAlpha>0){
    const vg=ctx.createRadialGradient(CW/2,CH/2,CH*.18,CW/2,CH/2,CH*.88);
    vg.addColorStop(0,`rgba(0,0,0,0)`);
    vg.addColorStop(.55,`rgba(0,0,0,${vigAlpha*.38})`);
    vg.addColorStop(1,`rgba(0,0,0,${vigAlpha*.95})`);
    ctx.fillStyle=vg;ctx.fillRect(0,0,CW,CH);
    ctx.fillStyle=`rgba(160,0,0,${vigAlpha*.1})`;ctx.fillRect(0,0,CW,CH);
  }
  if(fadeAlpha>0){ctx.fillStyle=`rgba(0,0,0,${fadeAlpha})`;ctx.fillRect(0,0,CW,CH);}
}
function drawHUD(){
  const bx=CW-185,by=12;
  ctx.fillStyle='#fff';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(bx+22,by+22,21,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(bx+16,by+20,3.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(bx+28,by+20,3.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#1a1a1a';ctx.lineWidth=2;
  [[bx+15,by+4],[bx+21,by+1],[bx+28,by+3]].forEach(([hx,hy])=>{ctx.beginPath();ctx.moveTo(hx,hy+5);ctx.lineTo(hx,hy);ctx.stroke();});
  ctx.fillStyle='#FF4444';ctx.font='bold 14px monospace';ctx.textAlign='center';ctx.fillText('∞',bx+22,by+60);
}

// ── Game flow ─────────────────────────────────────────────────────────
function initGame(){
  worldX=0;spd=5.5;score=0;coins=0;dist=0;nextSpawn=500;lastCpWX=0;
  goalReached=false;finishWX=LV().goal;
  timeScale=1;vigAlpha=0;fadeAlpha=0;deathPhase=0;deathTimer=0;jumpSlowT=0;slidedustT=0;
  [obs,plats,bombs,spins,coins_,dust,exps,bgProps,cps,trucks,narrows,pits,pads].forEach(a=>a.length=0);
  weatherParts.length=0;
  genBg(0,2000);resetP();
  document.getElementById('score-hud').textContent='💰 0';
  document.getElementById('level-badge').textContent='Lv'+level+' '+LV().name;
}
function nextLevel(){
  worldX=0;dist=0;nextSpawn=500;lastCpWX=0;
  goalReached=false;finishWX=LV().goal;
  timeScale=1;vigAlpha=0;fadeAlpha=0;deathPhase=0;jumpSlowT=0;slidedustT=0;
  [obs,plats,bombs,spins,coins_,dust,exps,bgProps,cps,trucks,narrows,pits,pads].forEach(a=>a.length=0);
  weatherParts.length=0;
  genBg(0,2000);P.x=PX0;P.y=GY;P.vy=0;P.onG=true;P.state='run';P.inv=0;
  document.getElementById('level-badge').textContent='Lv'+level+' '+LV().name;
  showHint('LEVEL '+level+': '+LV().name,'#FFD700');
}
function endGame(){
  active=false;
  document.getElementById('go-overlay').style.display='flex';
  document.getElementById('go-score').textContent='Score: '+Math.floor(score);
  document.getElementById('go-coins').textContent='Coins: '+coins;
}
window.startGame   =()=>{document.getElementById('start-overlay').style.display='none';startMusic();try{AC().resume();}catch(e){}level=1;initGame();active=true;};
window.restartGame =()=>{document.getElementById('go-overlay').style.display='none';level=1;initGame();active=true;};
window.restartLevel=()=>{document.getElementById('lvl-overlay').style.display='none';paused=false;initGame();active=true;};
window.goNextLevel =()=>{document.getElementById('lvl-overlay').style.display='none';paused=false;level=Math.min(level+1,10);nextLevel();active=true;};
window.togglePause =()=>{paused=!paused;document.getElementById('pause-btn').textContent=paused?'▶':'⏸';};

// ── Loop ──────────────────────────────────────────────────────────────
let lastTs=0;
function loop(ts){const rawDt=Math.min((ts-lastTs)/1000,.05);lastTs=ts;update(rawDt);render();requestAnimationFrame(loop);}
genBg(0,1600);
requestAnimationFrame(loop);
