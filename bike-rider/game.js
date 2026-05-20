'use strict';

// ── Canvas ────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const CW = 900, CH = 520;
canvas.width = CW; canvas.height = CH;
canvas.style.touchAction = 'none';
(function resize() {
  const s = Math.min(window.innerWidth/CW, window.innerHeight/CH);
  canvas.style.width = CW*s+'px'; canvas.style.height = CH*s+'px';
  window.addEventListener('resize', resize);
})();

// ── Physics ───────────────────────────────────────────────────────
const GRAVITY   = 0.45;
const JUMP_VEL  = -11.5;
const MAX_SPD   = 5.0;
const ACCEL     = 0.35;
const FRIC_G    = 0.84;
const FRIC_A    = 0.98;
const BIKE_R    = 10;   // wheel radius

// ── Input ─────────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
let mx = CW/2, my = CH/2, mclick = false;
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mx = (e.clientX-r.left)*(CW/r.width); my = (e.clientY-r.top)*(CH/r.height);
});
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  mx = (e.clientX-r.left)*(CW/r.width); my = (e.clientY-r.top)*(CH/r.height);
  mclick = true;
});

// ── Virtual (on-screen) buttons ───────────────────────────────────
const vBtn = { p1Left:false, p1Right:false, p1Jump:false, p2Left:false, p2Right:false, p2Jump:false };
const _ptrs = new Map();

function _getVBtns(np) {
  if (np === 1) return [
    {id:'p1Left',  x:18,       y:CH-92, w:78, h:78, label:'◀'},
    {id:'p1Right', x:104,      y:CH-92, w:78, h:78, label:'▶'},
    {id:'p1Jump',  x:CW-100,   y:CH-92, w:78, h:78, label:'▲'},
  ];
  return [
    {id:'p1Left',  x:8,           y:CH-75, w:58, h:62, label:'◀'},
    {id:'p1Right', x:70,          y:CH-75, w:58, h:62, label:'▶'},
    {id:'p1Jump',  x:CW/2-70,     y:CH-75, w:58, h:62, label:'▲'},
    {id:'p2Left',  x:CW/2+8,      y:CH-75, w:58, h:62, label:'◀'},
    {id:'p2Right', x:CW/2+70,     y:CH-75, w:58, h:62, label:'▶'},
    {id:'p2Jump',  x:CW-70,       y:CH-75, w:58, h:62, label:'▲'},
  ];
}

function _toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x:(e.clientX-r.left)*(CW/r.width), y:(e.clientY-r.top)*(CH/r.height) };
}

function _hitVBtn(px, py) {
  if (state !== 'playing') return null;
  for (const b of _getVBtns(numPlayers)) {
    if (px>=b.x && px<=b.x+b.w && py>=b.y && py<=b.y+b.h) return b.id;
  }
  return null;
}

canvas.addEventListener('pointerdown', e => {
  const {x,y} = _toCanvas(e);
  const bid = _hitVBtn(x,y);
  if (bid) { _ptrs.set(e.pointerId, bid); vBtn[bid]=true; e.preventDefault(); }
});
canvas.addEventListener('pointermove', e => {
  if (!_ptrs.has(e.pointerId)) return;
  const {x,y} = _toCanvas(e);
  const prev = _ptrs.get(e.pointerId);
  const cur  = _hitVBtn(x,y);
  if (cur !== prev) {
    if (prev) vBtn[prev]=false;
    if (cur)  vBtn[cur]=true;
    _ptrs.set(e.pointerId, cur);
  }
});
canvas.addEventListener('pointerup',     e => { const b=_ptrs.get(e.pointerId); if(b) vBtn[b]=false; _ptrs.delete(e.pointerId); });
canvas.addEventListener('pointercancel', e => { const b=_ptrs.get(e.pointerId); if(b) vBtn[b]=false; _ptrs.delete(e.pointerId); });

function drawVirtualButtons(np) {
  const btns = _getVBtns(np);
  for (const b of btns) {
    const on = vBtn[b.id];
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    const r=12, {x,y,w,h} = b;
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
    ctx.fillStyle   = on ? 'rgba(255,230,50,0.6)' : 'rgba(0,0,0,0.45)';
    ctx.strokeStyle = on ? '#FFD700' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `bold ${w>70?30:24}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = on ? '#FFD700' : '#ffffff';
    ctx.fillText(b.label, x+w/2, y+h/2);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function fR(x,y,w,h,c) { ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
function fT(s,x,y,sz,c,a) { ctx.fillStyle=c; ctx.font=`bold ${sz}px monospace`; ctx.textAlign=a||'center'; ctx.fillText(s,x,y); }
function sT(s,x,y,sz,fc,sc,lw) {
  ctx.font=`bold ${sz}px monospace`; ctx.textAlign='center';
  ctx.strokeStyle=sc||'#000'; ctx.lineWidth=lw||4; ctx.strokeText(s,x,y);
  ctx.fillStyle=fc; ctx.fillText(s,x,y);
}
function hov(x,y,w,h) { return mx>=x&&mx<=x+w&&my>=y&&my<=y+h; }
function btn(l,x,y,w,h,on) {
  fR(x,y,w,h,on?'#1a3a8a':'#0d1a44');
  ctx.strokeStyle=on?'#6699ff':'#334477'; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h);
  fT(l,x+w/2,y+h/2+7,18,'#ffffff');
}

// ── Terrain helpers ───────────────────────────────────────────────
function tY(pts, gaps, wx) {
  for (const g of gaps) if (wx>g.x1 && wx<g.x2) return CH+300;
  for (let i=0;i<pts.length-1;i++) {
    if (wx>=pts[i].x && wx<=pts[i+1].x) {
      const t=(wx-pts[i].x)/(pts[i+1].x-pts[i].x);
      return pts[i].y + t*(pts[i+1].y-pts[i].y);
    }
  }
  return pts[pts.length-1].y;
}
function tAngle(pts, gaps, wx) {
  const y1=tY(pts,gaps,wx-6), y2=tY(pts,gaps,wx+6);
  return Math.atan2(y2-y1, 12);
}

// ── Maps ──────────────────────────────────────────────────────────
const MAPS = [
  {
    name:'DESERT RUN', diff:'EASY', diffCol:'#44ff44',
    skyA:'#87ceeb', skyB:'#f5deb3', groundCol:'#c8a060', grassCol:'#d4a860',
    length:3400, startX:100,
    terrain:[
      {x:0,y:390},{x:500,y:378},{x:900,y:385},{x:1300,y:368},
      {x:1700,y:380},{x:2100,y:362},{x:2500,y:378},{x:2900,y:370},{x:3400,y:375}
    ],
    gaps:[],
    checkpoints:[900, 2100],
    lasers:[
      {x:1450,gapY:270,gapSz:110,minY:190,maxY:280,spd:55,phase:0},
      {x:2600,gapY:250,gapSz:110,minY:0,maxY:0,spd:0,phase:0},
    ],
    finish:3200,
  },
  {
    name:'GREEN HILLS', diff:'MEDIUM', diffCol:'#aaff44',
    skyA:'#6ab4e0', skyB:'#88cc66', groundCol:'#4a8a4a', grassCol:'#5aaa5a',
    length:4200, startX:100,
    terrain:[
      {x:0,y:385},{x:350,y:345},{x:650,y:385},{x:950,y:315},
      {x:1250,y:385},{x:1600,y:325},{x:1950,y:380},
      {x:2350,y:298},{x:2700,y:385},{x:3100,y:320},
      {x:3600,y:380},{x:4200,y:380}
    ],
    gaps:[{x1:1770,x2:1870}],
    checkpoints:[1000,2300,3300],
    lasers:[
      {x:1350,gapY:240,gapSz:105,minY:190,maxY:310,spd:65,phase:0},
      {x:2850,gapY:230,gapSz:105,minY:0,maxY:0,spd:0,phase:0},
      {x:3800,gapY:220,gapSz:105,minY:170,maxY:320,spd:75,phase:0.5},
    ],
    finish:4000,
  },
  {
    name:'ROCKY CANYON', diff:'HARD', diffCol:'#ffdd44',
    skyA:'#5a7aaa', skyB:'#8a6a4a', groundCol:'#7a5a3a', grassCol:'#5a4020',
    length:5000, startX:100,
    terrain:[
      {x:0,y:390},{x:400,y:325},{x:700,y:390},{x:1000,y:278},
      {x:1300,y:390},{x:1700,y:308},{x:2100,y:385},
      {x:2500,y:258},{x:2850,y:390},{x:3250,y:298},
      {x:3650,y:385},{x:4200,y:265},{x:4600,y:385},{x:5000,y:385}
    ],
    gaps:[{x1:1560,x2:1660},{x1:3050,x2:3180}],
    checkpoints:[900,2200,3600],
    lasers:[
      {x:620,gapY:230,gapSz:100,minY:185,maxY:315,spd:80,phase:0},
      {x:1950,gapY:220,gapSz:100,minY:175,maxY:300,spd:95,phase:0.5},
      {x:2700,gapY:200,gapSz:100,minY:0,maxY:0,spd:0,phase:0},
      {x:3950,gapY:210,gapSz:100,minY:160,maxY:300,spd:105,phase:0.3},
    ],
    finish:4800,
  },
  {
    name:'MOUNTAIN PEAK', diff:'VERY HARD', diffCol:'#ff8844',
    skyA:'#3a5a8a', skyB:'#aaaaaa', groundCol:'#888888', grassCol:'#666666',
    length:5800, startX:100,
    terrain:[
      {x:0,y:390},{x:500,y:305},{x:800,y:390},{x:1100,y:248},
      {x:1400,y:390},{x:1800,y:228},{x:2100,y:390},
      {x:2500,y:208},{x:2900,y:375},{x:3300,y:188},
      {x:3700,y:385},{x:4200,y:178},{x:4600,y:390},
      {x:5200,y:205},{x:5600,y:385},{x:5800,y:385}
    ],
    gaps:[{x1:1220,x2:1360},{x1:2320,x2:2470},{x1:4020,x2:4170}],
    checkpoints:[1100,2600,3900,4900],
    lasers:[
      {x:720,gapY:210,gapSz:95,minY:180,maxY:295,spd:90,phase:0},
      {x:1720,gapY:140,gapSz:95,minY:125,maxY:215,spd:120,phase:0},
      {x:2820,gapY:150,gapSz:95,minY:0,maxY:0,spd:0,phase:0},
      {x:3520,gapY:130,gapSz:95,minY:105,maxY:280,spd:130,phase:0.4},
      {x:4520,gapY:130,gapSz:95,minY:110,maxY:270,spd:115,phase:0.7},
    ],
    finish:5600,
  },
  {
    name:'LAVA EXTREME', diff:'EXTREME', diffCol:'#ff2222',
    skyA:'#1a1a2e', skyB:'#8a2a00', groundCol:'#4a1500', grassCol:'#3a1000',
    length:6500, startX:100,
    terrain:[
      {x:0,y:390},{x:400,y:288},{x:700,y:390},{x:1000,y:218},
      {x:1300,y:390},{x:1700,y:198},{x:2000,y:385},
      {x:2400,y:178},{x:2700,y:390},{x:3100,y:188},
      {x:3500,y:385},{x:4000,y:168},{x:4400,y:390},
      {x:4900,y:158},{x:5300,y:385},{x:5800,y:178},
      {x:6200,y:385},{x:6500,y:385}
    ],
    gaps:[
      {x1:1110,x2:1280},{x1:2210,x2:2380},{x1:3310,x2:3480},
      {x1:4610,x2:4870},{x1:5510,x2:5760}
    ],
    checkpoints:[950,2200,3550,4800,5850],
    lasers:[
      {x:620,gapY:190,gapSz:90,minY:165,maxY:280,spd:100,phase:0},
      {x:1620,gapY:130,gapSz:90,minY:115,maxY:195,spd:145,phase:0.2},
      {x:2620,gapY:145,gapSz:90,minY:0,maxY:0,spd:0,phase:0},
      {x:3220,gapY:125,gapSz:90,minY:105,maxY:280,spd:160,phase:0.5},
      {x:4120,gapY:115,gapSz:90,minY:95,maxY:158,spd:175,phase:0.3},
      {x:5020,gapY:120,gapSz:90,minY:100,maxY:270,spd:140,phase:0.7},
      {x:5920,gapY:108,gapSz:90,minY:90,maxY:170,spd:190,phase:0.1},
    ],
    finish:6300,
  },
];

// ── Laser class ───────────────────────────────────────────────────
class Laser {
  constructor(d) {
    this.x    = d.x;
    this.gapY = d.gapY;
    this.gapSz= d.gapSz || 110;
    this.minY = d.minY || 0;
    this.maxY = d.maxY || 0;
    this.spd  = d.spd  || 0;
    this.t    = d.phase || 0;
    this.moving = d.spd > 0;
  }

  update(dt) {
    if (!this.moving) return;
    this.t += dt / 1000;
    const range = this.maxY - this.minY - this.gapSz;
    this.gapY = this.minY + range * 0.5 * (1 + Math.sin(this.t * this.spd / 50));
  }

  hitTest(bx, by) {
    if (Math.abs(bx - this.x) > 16) return false;
    const gapBot = this.gapY + this.gapSz;
    return by < this.gapY - 6 || by > gapBot + 6;
  }

  draw(camX, ox, clipW) {
    const sx = this.x - camX + ox;
    if (sx < ox-20 || sx > ox+clipW+20) return;
    const gapBot = this.gapY + this.gapSz;
    const pulse  = 0.7 + 0.3 * Math.sin(Date.now() / 140);

    // Top beam
    ctx.fillStyle = `rgba(255,30,30,${pulse})`;
    ctx.fillRect(sx-5, 0, 10, this.gapY);
    // Bottom beam
    ctx.fillRect(sx-5, gapBot, 10, CH-gapBot);

    // Glow
    ctx.fillStyle = `rgba(255,80,80,${pulse*0.22})`;
    ctx.fillRect(sx-14, 0, 28, this.gapY);
    ctx.fillRect(sx-14, gapBot, 28, CH-gapBot);

    // Safe gap hint (faint green)
    ctx.fillStyle = 'rgba(0,255,80,0.07)';
    ctx.fillRect(sx-5, this.gapY, 10, this.gapSz);

    // Emitter nodes
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(sx-9, this.gapY-14, 18, 14);
    ctx.fillRect(sx-9, gapBot,       18, 14);
    ctx.fillStyle = `rgba(255,120,120,${pulse})`;
    ctx.fillRect(sx-5, this.gapY-10, 10, 10);
    ctx.fillRect(sx-5, gapBot+2,     10, 10);

    // Moving indicator
    if (this.moving) {
      ctx.strokeStyle = `rgba(255,180,0,${pulse*0.6})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, CH); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ── Bike class ────────────────────────────────────────────────────
class Bike {
  constructor(x, y, color, helmetCol, name, ctrl) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.angle = 0;
    this.color = color;
    this.helmetCol = helmetCol;
    this.name = name;
    this.ctrl = ctrl;
    this.onGround = false;
    this.dead = false;
    this.deadT = 0;
    this.respawnX = x;
    this.respawnY = y;
    this.lastCP = -1;
    this.finished = false;
    this.finishTime = 0;
    this.notifs = [];
    this.jumpUsed = false;
  }

  update(dt, map, vkeys) {
    this.notifs = this.notifs.filter(n => { n.life-=dt; n.y-=dt*0.045; return n.life>0; });

    if (this.dead) {
      this.deadT -= dt;
      if (this.deadT <= 0) this._respawn();
      return;
    }

    const k = this.ctrl;
    if (keys[k.right] || vkeys?.right) this.vx = Math.min(this.vx + ACCEL, MAX_SPD);
    if (keys[k.left]  || vkeys?.left)  this.vx = Math.max(this.vx - ACCEL, -MAX_SPD * 0.4);

    const jumpKey = keys[k.jump] || keys[k.jump2] || vkeys?.jump;
    if (jumpKey && this.onGround && !this.jumpUsed) {
      this.vy = JUMP_VEL;
      this.onGround = false;
      this.jumpUsed = true;
    }
    if (!jumpKey) this.jumpUsed = false;

    this.vy += GRAVITY;
    this.vx *= this.onGround ? FRIC_G : FRIC_A;

    this.x += this.vx;
    this.y += this.vy;

    // Clamp left
    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // Terrain collision
    const gY = tY(map.terrain, map.gaps, this.x) - BIKE_R;
    const inGap = tY(map.terrain, map.gaps, this.x) > CH + 200;

    if (!inGap && this.y >= gY) {
      this.y = gY;
      if (this.vy > 1) this.vy = 0;
      this.vx *= 0.92;
      this.onGround = true;
      this.angle = tAngle(map.terrain, map.gaps, this.x);
    } else {
      this.onGround = false;
    }

    // Death: fell in gap or off screen
    if (this.y > CH + 80) { this._die(); return; }

    // Laser hit
    for (const lz of map._lasers) {
      if (lz.hitTest(this.x, this.y)) { this._die(); return; }
    }

    // Checkpoints
    map.checkpoints.forEach((cpx, i) => {
      if (i > this.lastCP && this.x >= cpx) {
        this.lastCP = i;
        this.respawnX = cpx - 60;
        this.respawnY = tY(map.terrain, map.gaps, this.respawnX) - BIKE_R - 5;
        this.notifs.push({ text:'CHECKPOINT!', col:'#44ff88', y: this.y-50, life:2000 });
      }
    });

    // Finish
    if (!this.finished && this.x >= map.finish) {
      this.finished = true;
      this.finishTime = Date.now();
    }
  }

  _die() {
    this.dead = true; this.deadT = 1500;
    this.vx = 0; this.vy = 0; this.onGround = false;
  }

  _respawn() {
    this.dead = false;
    this.x = this.respawnX; this.y = this.respawnY;
    this.vx = 0; this.vy = 0;
    this.notifs.push({ text:'RESPAWN', col:'#ff8844', y: this.y-50, life:1200 });
  }

  draw(camX, ox, map) {
    const sx = this.x - camX + ox;
    const sy = this.y;

    // Blink when dead
    if (this.dead && Math.floor(this.deadT / 130) % 2 === 0) return;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-18, 4, 36, 7);

    // Rear wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-13, 0, BIKE_R, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-13, 0, BIKE_R, 0, Math.PI*2); ctx.stroke();
    // Wheel rim
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-13, 0, BIKE_R-3, 0, Math.PI*2); ctx.stroke();

    // Front wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(13, 0, BIKE_R, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(13, 0, BIKE_R, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(13, 0, BIKE_R-3, 0, Math.PI*2); ctx.stroke();

    // Frame
    ctx.fillStyle = this.color;
    ctx.fillRect(-14, -11, 28, 9);
    // Tank highlight
    ctx.fillStyle = this._lite(this.color);
    ctx.fillRect(-14, -11, 12, 5);
    // Fender
    ctx.fillStyle = this.color;
    ctx.fillRect(10, -14, 5, 7);
    // Handlebars
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(9,-11); ctx.lineTo(9,-17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6,-17); ctx.lineTo(13,-17); ctx.stroke();
    // Exhaust
    ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14,-6); ctx.lineTo(-20,-3); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20,-3); ctx.lineTo(-22,0); ctx.stroke();

    // Rider body
    ctx.fillStyle = '#cc6600';
    ctx.fillRect(-6, -24, 11, 14);
    // Rider arms
    ctx.fillStyle = '#cc6600';
    ctx.fillRect(1, -20, 8, 5);

    // Helmet
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-1, -28, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = this.helmetCol;
    ctx.beginPath(); ctx.arc(-1, -28, 7, 0, Math.PI*2); ctx.fill();
    // Visor
    ctx.fillStyle = 'rgba(180,220,255,0.65)';
    ctx.beginPath(); ctx.arc(1, -29, 3.5, 0, Math.PI*2); ctx.fill();

    ctx.restore();

    // Floating notifications
    for (const n of this.notifs) {
      const a = Math.min(n.life/500, 1);
      ctx.globalAlpha = a;
      sT(n.text, sx, n.y, 16, n.col, '#000', 3);
      ctx.globalAlpha = 1;
    }
  }

  _lite(hex) {
    const n=parseInt(hex.slice(1),16);
    return `rgb(${Math.min(255,(n>>16)+60)},${Math.min(255,((n>>8)&0xff)+60)},${Math.min(255,(n&0xff)+60)})`;
  }
}

// ── Draw terrain ──────────────────────────────────────────────────
function drawTerrain(map, camX, ox, clipW) {
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, 0, clipW, CH); ctx.clip();

  // Sky gradient
  const sg = ctx.createLinearGradient(0,0,0,CH);
  sg.addColorStop(0, map.skyA); sg.addColorStop(1, map.skyB);
  ctx.fillStyle = sg; ctx.fillRect(ox, 0, clipW, CH);

  // Lava glow (extreme map)
  if (map.name === 'LAVA EXTREME') {
    for (const g of map.gaps) {
      const gx = g.x1 - camX + ox;
      const gw = g.x2 - g.x1;
      const lv = ctx.createLinearGradient(0, CH-80, 0, CH);
      lv.addColorStop(0, 'rgba(255,80,0,0.0)'); lv.addColorStop(1, '#ff4400');
      ctx.fillStyle = lv; ctx.fillRect(gx-5, 0, gw+10, CH);
    }
  }

  // Ground polygon
  const pts = map.terrain;
  ctx.beginPath();
  ctx.moveTo(pts[0].x - camX + ox, pts[0].y);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x - camX + ox, pts[i].y);
  ctx.lineTo(pts[pts.length-1].x - camX + ox, CH);
  ctx.lineTo(pts[0].x - camX + ox, CH);
  ctx.closePath();
  ctx.fillStyle = map.groundCol; ctx.fill();

  // Grass/surface layer
  ctx.beginPath();
  ctx.moveTo(pts[0].x - camX + ox, pts[0].y);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x - camX + ox, pts[i].y);
  ctx.strokeStyle = map.grassCol; ctx.lineWidth = 5; ctx.stroke();

  // Erase gaps (void)
  for (const g of map.gaps) {
    const gx = g.x1 - camX + ox;
    const gw = g.x2 - g.x1;
    const grad = ctx.createLinearGradient(0, CH-80, 0, CH);
    grad.addColorStop(0, map.name==='LAVA EXTREME' ? 'rgba(255,60,0,0.9)' : 'rgba(30,30,50,0.9)');
    grad.addColorStop(1, map.name==='LAVA EXTREME' ? '#ff2200' : '#050510');
    ctx.fillStyle = grad; ctx.fillRect(gx, 0, gw, CH);
    // Warning stripes on gap edges
    ctx.fillStyle = 'rgba(255,200,0,0.35)';
    ctx.fillRect(gx-4, 0, 8, CH);
    ctx.fillRect(gx+gw-4, 0, 8, CH);
  }

  ctx.restore();
}

// ── Draw checkpoint / finish ──────────────────────────────────────
function drawCheckpoints(map, camX, ox, clipW) {
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, 0, clipW, CH); ctx.clip();

  map.checkpoints.forEach((cpx, i) => {
    const sx = cpx - camX + ox;
    if (sx < ox-40 || sx > ox+clipW+40) return;
    const ty = tY(map.terrain, map.gaps, cpx);
    // Posts
    ctx.fillStyle = '#eecc00';
    ctx.fillRect(sx-3, ty-80, 6, 80);
    // Flag
    ctx.fillStyle = '#ffee00';
    ctx.fillRect(sx-3, ty-80, 22, 14);
    ctx.fillStyle = '#cc8800';
    ctx.fillRect(sx-3, ty-80, 22, 5);
    fT(`CP ${i+1}`, sx+8, ty-88, 11, '#ffee00');
  });

  // Finish line
  const fx = map.finish - camX + ox;
  if (fx > ox-40 && fx < ox+clipW+40) {
    const fy = tY(map.terrain, map.gaps, map.finish);
    // Posts
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx-3, fy-90, 6, 90);
    // Checkered banner
    for (let r=0;r<5;r++) for (let c=0;c<6;c++) {
      ctx.fillStyle = (r+c)%2===0 ? '#ffffff' : '#000000';
      ctx.fillRect(fx-3+c*8, fy-90+r*10, 8, 10);
    }
    sT('FINISH', fx, fy-100, 14, '#ffffff', '#000', 3);
  }

  ctx.restore();
}

// ── Draw one viewport ─────────────────────────────────────────────
function drawViewport(bike, map, ox, clipW) {
  const camX = Math.max(0, Math.min(map.length - clipW, bike.x - clipW * 0.38));

  drawTerrain(map, camX, ox, clipW);
  drawCheckpoints(map, camX, ox, clipW);

  // Lasers
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, 0, clipW, CH); ctx.clip();
  for (const lz of map._lasers) lz.draw(camX, ox, clipW);
  ctx.restore();

  // Bike
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, 0, clipW, CH); ctx.clip();
  bike.draw(camX, ox, map);
  ctx.restore();

  // HUD per viewport
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, 0, clipW, CH); ctx.clip();
  fR(ox, 0, clipW, 44, 'rgba(0,0,0,0.65)');
  sT(bike.name, ox + clipW/2, 28, 15, bike.color, '#000', 3);
  const cp = bike.lastCP+1;
  fT(`CP: ${cp}/${map.checkpoints.length}`, ox+clipW/2-50, 40, 11, '#aaaaaa');
  // Progress bar
  const pct = Math.min(bike.x / map.finish, 1);
  fR(ox+10, 46, clipW-20, 5, '#333');
  fR(ox+10, 46, (clipW-20)*pct, 5, bike.color);
  ctx.restore();
}

// ── Game state ────────────────────────────────────────────────────
let state      = 'title';
let numPlayers = 1;
let selMap     = null;
let activMap   = null;
let bikes      = [];
let lastTime   = 0;

function startGame(mapIdx, np) {
  numPlayers = np;
  const m = MAPS[mapIdx];
  // Instantiate lasers
  m._lasers = m.lasers.map(d => new Laser(d));

  const sy = tY(m.terrain, m.gaps, m.startX) - BIKE_R - 5;
  if (np === 1) {
    bikes = [
      new Bike(m.startX, sy, '#3388ff', '#3388ff', 'RIDER', {right:'KeyD',left:'KeyA',jump:'KeyW',jump2:'Space'}),
    ];
  } else {
    bikes = [
      new Bike(m.startX,    sy, '#3388ff', '#3388ff', 'P1', {right:'KeyD',left:'KeyA',jump:'KeyW',jump2:'Space'}),
      new Bike(m.startX-30, sy, '#ff3333', '#ff3333', 'P2', {right:'ArrowRight',left:'ArrowLeft',jump:'ArrowUp',jump2:'Numpad0'}),
    ];
  }
  activMap = m;
  state = 'playing';
}

// ── Render screens ────────────────────────────────────────────────
function renderTitle() {
  // Background
  const g = ctx.createLinearGradient(0,0,0,CH);
  g.addColorStop(0,'#0d1a3a'); g.addColorStop(1,'#1a3060');
  ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);

  // Road hints
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=3;
  for (let y=80;y<CH;y+=60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke(); }

  sT('BIKE RIDER', CW/2, 140, 82, '#FFD700', '#000', 5);
  sT('5 Maps · Checkpoints · Laser Gates', CW/2, 192, 17, '#aabbff', '#000', 2);

  const h1=hov(CW/2-155,244,148,62), h2=hov(CW/2+8,244,148,62);
  btn('🏍  1 PLAYER',  CW/2-155,244,148,62,h1);
  btn('🏍  2 PLAYER',  CW/2+8,  244,148,62,h2);

  fT('Use A D to move · W/Space to jump', CW/2,330,13,'#556677');
  fT('2-Player: P1=WASD  P2=Arrow Keys',  CW/2,348,13,'#445566');

  if (mclick) {
    if (h1) { numPlayers=1; state='mapselect'; }
    if (h2) { numPlayers=2; state='mapselect'; }
  }
}

function renderMapSelect() {
  const g = ctx.createLinearGradient(0,0,0,CH);
  g.addColorStop(0,'#0d1a3a'); g.addColorStop(1,'#0a1428');
  ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
  sT('SELECT MAP', CW/2, 44, 28, '#FFD700', '#000');
  fT(`${numPlayers} PLAYER${numPlayers>1?'S':''}  ·  ${numPlayers>1?'SPLIT SCREEN':'FULL SCREEN'}`, CW/2, 68, 13, '#667788');

  const cardW=158, cardH=200, gap=12;
  const totalW = 5*cardW + 4*gap;
  const startX = (CW-totalW)/2;

  MAPS.forEach((m,i) => {
    const cx = startX + i*(cardW+gap);
    const cy = 90;
    const isH = hov(cx,cy,cardW,cardH);
    const isSel = selMap===i;

    // Card background
    fR(cx,cy,cardW,cardH, isSel?'#1a3a6a':isH?'#122250':'#0d1a3a');
    ctx.strokeStyle=isSel?'#FFD700':isH?'#6699ff':'#223355'; ctx.lineWidth=isSel?3:2;
    ctx.strokeRect(cx,cy,cardW,cardH);

    // Mini terrain preview
    ctx.save();
    ctx.beginPath(); ctx.rect(cx+6,cy+6,cardW-12,80); ctx.clip();
    const preG = ctx.createLinearGradient(0,0,0,80);
    preG.addColorStop(0,m.skyA); preG.addColorStop(1,m.skyB);
    ctx.fillStyle=preG; ctx.fillRect(cx+6,cy+6,cardW-12,80);
    ctx.beginPath();
    m.terrain.forEach((pt,pi) => {
      const px = cx+6 + (pt.x/m.length)*(cardW-12);
      const py = cy+6 + (pt.y-160)/3;
      pi===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
    });
    ctx.lineTo(cx+cardW-6,cy+86); ctx.lineTo(cx+6,cy+86); ctx.closePath();
    ctx.fillStyle=m.groundCol; ctx.fill();
    ctx.restore();

    // Map name
    fT(m.name, cx+cardW/2, cy+100, 11, '#ffffff');
    // Difficulty
    fT(m.diff, cx+cardW/2, cy+118, 12, m.diffCol);
    // Stats
    fT(`Gaps: ${m.gaps.length}`, cx+cardW/2, cy+136, 11, '#aaaaaa');
    fT(`Lasers: ${m.lasers.length}`, cx+cardW/2, cy+152, 11, '#ff8888');
    fT(`CPs: ${m.checkpoints.length}`, cx+cardW/2, cy+168, 11, '#88ffaa');

    // Select btn
    const bh=hov(cx+10,cy+176,cardW-20,18);
    fR(cx+10,cy+176,cardW-20,18, isSel?'#2a5aaa':bh?'#1a3a7a':'#0d1a44');
    ctx.strokeStyle=isSel?'#FFD700':'#334477'; ctx.lineWidth=1; ctx.strokeRect(cx+10,cy+176,cardW-20,18);
    fT(isSel?'✓ SELECTED':'SELECT', cx+cardW/2, cy+189, 11, isSel?'#FFD700':'#aaaaff');

    if (mclick && hov(cx,cy,cardW,cardH)) selMap = i;
  });

  if (selMap !== null) {
    const ph=hov(CW/2-75,310,150,50);
    btn('▶  PLAY', CW/2-75, 310, 150, 50, ph);
    if (mclick && ph) startGame(selMap, numPlayers);
  }

  const bh=hov(CW/2-60,378,120,36);
  btn('← BACK', CW/2-60,378,120,36,bh);
  if (mclick && bh) { state='title'; selMap=null; }
}

function renderPlaying(dt) {
  if (!activMap) return;
  const map = activMap;
  for (const lz of map._lasers) lz.update(dt);

  const vk1 = { right:vBtn.p1Right, left:vBtn.p1Left, jump:vBtn.p1Jump };
  const vk2 = { right:vBtn.p2Right, left:vBtn.p2Left, jump:vBtn.p2Jump };
  bikes[0].update(dt, map, vk1);
  if (numPlayers > 1) bikes[1].update(dt, map, vk2);

  if (numPlayers === 1) {
    drawViewport(bikes[0], map, 0, CW);
  } else {
    drawViewport(bikes[0], map, 0,      CW/2);
    drawViewport(bikes[1], map, CW/2,   CW/2);
    // Divider line
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(CW/2-2, 0, 4, CH);
  }

  drawVirtualButtons(numPlayers);

  // Check finish
  const done = numPlayers === 1 ? bikes[0].finished
                                : bikes.some(b => b.finished);
  if (done) {
    state = 'finish';
  }
}

function renderFinish() {
  if (!activMap) return;
  // Keep drawing the last game frame
  if (numPlayers === 1) {
    drawViewport(bikes[0], activMap, 0, CW);
  } else {
    drawViewport(bikes[0], activMap, 0, CW/2);
    drawViewport(bikes[1], activMap, CW/2, CW/2);
    ctx.fillStyle='#FFD700'; ctx.fillRect(CW/2-2,0,4,CH);
  }

  // Modal
  ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,CW,CH);
  fR(CW/2-230, CH/2-140, 460, 280, '#0d1a3a');
  ctx.strokeStyle='#FFD700'; ctx.lineWidth=3; ctx.strokeRect(CW/2-230,CH/2-140,460,280);

  if (numPlayers === 1) {
    sT('YOU WIN! 🏆', CW/2, CH/2-75, 52, '#FFD700', '#000');
    sT('Finish Line Reached!', CW/2, CH/2-22, 20, '#ffffff', '#000');
  } else {
    const w = bikes[0].finished && (!bikes[1].finished || bikes[0].finishTime <= bikes[1].finishTime)
            ? 'PLAYER 1 WINS! 🏆' : 'PLAYER 2 WINS! 🏆';
    const wCol = bikes[0].finished && (!bikes[1].finished || bikes[0].finishTime<=bikes[1].finishTime)
               ? bikes[0].color : bikes[1].color;
    sT(w, CW/2, CH/2-75, 38, wCol, '#000');
  }

  const rh=hov(CW/2-190,CH/2+30,180,52), gh=hov(CW/2+10,CH/2+30,180,52);
  btn('▶ TRY AGAIN', CW/2-190,CH/2+30,180,52,rh);
  btn('⌂ MAP SELECT', CW/2+10, CH/2+30,180,52,gh);

  if (mclick) {
    if (rh && activMap && selMap!==null) startGame(selMap, numPlayers);
    if (gh) { state='mapselect'; activMap=null; }
  }
}

// ── Main loop ─────────────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min(ts-lastTime, 50);
  lastTime = ts;
  ctx.clearRect(0,0,CW,CH);

  if (state==='title')     renderTitle();
  else if (state==='mapselect') renderMapSelect();
  else if (state==='playing')   renderPlaying(dt);
  else if (state==='finish')    renderFinish();

  mclick = false;
  requestAnimationFrame(loop);
}
requestAnimationFrame(ts => { lastTime=ts; requestAnimationFrame(loop); });
