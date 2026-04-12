import * as THREE from 'three';
import { getTerrainHeight } from './environment.js';
import { audio } from './audio.js';

// ── RNG ────────────────────────────────────────────────────────
let _s = 8675309;
function rng() {
  _s |= 0; _s = _s + 0x6D2B79F5 | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ── Banner ─────────────────────────────────────────────────────
let _bannerTO = null;
export function showBanner(text, color = '#ff6622', dur = 5000) {
  const el = document.getElementById('event-banner');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
  el.style.borderColor = color;
  el.style.textShadow = `0 0 20px ${color}`;
  el.classList.add('show');
  clearTimeout(_bannerTO);
  _bannerTO = setTimeout(() => el.classList.remove('show'), dur);
}

// ── Screen flash ───────────────────────────────────────────────
let _flashEl = null;
function flash(color = '#fff', ms = 120) {
  if (!_flashEl) {
    _flashEl = document.createElement('div');
    Object.assign(_flashEl.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'998', opacity:'0', transition:'opacity 0.06s' });
    document.body.appendChild(_flashEl);
  }
  _flashEl.style.background = color;
  _flashEl.style.opacity = '0.75';
  setTimeout(() => { _flashEl.style.opacity = '0'; }, ms);
}

// ── Game Over overlay ──────────────────────────────────────────
export function showGameOver() {
  let el = document.getElementById('game-over');
  if (el) return;
  el = document.createElement('div');
  el.id = 'game-over';
  Object.assign(el.style, {
    position:'fixed', inset:'0', display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.88)',
    zIndex:'9999', fontFamily:"'Courier New',monospace", color:'#fff',
    animation:'fadeInGO 1.2s ease forwards',
  });
  el.innerHTML = `
    <style>
      @keyframes fadeInGO { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
      @keyframes pulseGO  { 0%,100%{text-shadow:0 0 30px #9900ff,0 0 60px #9900ff} 50%{text-shadow:0 0 10px #9900ff} }
      #game-over h1 { font-size:clamp(32px,6vw,72px); letter-spacing:6px; color:#cc44ff; animation:pulseGO 2s infinite; margin:0 0 20px; }
      #game-over p  { font-size:clamp(14px,2.5vw,22px); color:#aaaacc; letter-spacing:3px; margin:8px; }
      #go-restart   { margin-top:40px; padding:14px 40px; border:2px solid #9900ff; border-radius:30px;
                      background:transparent; color:#cc88ff; font-family:inherit; font-size:18px;
                      letter-spacing:3px; cursor:pointer; transition:all 0.25s; }
      #go-restart:hover { background:#9900ff33; color:#fff; }
    </style>
    <div style="font-size:clamp(60px,10vw,120px)">🕳️</div>
    <h1>THIS GAME HAS COME TO AN END</h1>
    <p>YOUR DRONE WAS CONSUMED BY THE BLACK HOLE</p>
    <p style="color:#666;font-size:14px;letter-spacing:2px;">NOTHING ESCAPES THE SINGULARITY</p>
    <button id="go-restart">⟳ RESTART</button>
  `;
  document.body.appendChild(el);
  document.getElementById('go-restart').onclick = () => location.reload();
}

// ─────────────────────────────────────────────────────────────
//  TERRAIN PAINTER — recolors terrain vertex colors
// ─────────────────────────────────────────────────────────────
function paintTerrain(terrain, colorFn, progress = 1) {
  const geo = terrain.geometry;
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nc = colorFn(x, y, z);
    col.setXYZ(i,
      col.getX(i) + (nc.r - col.getX(i)) * progress,
      col.getY(i) + (nc.g - col.getY(i)) * progress,
      col.getZ(i) + (nc.b - col.getZ(i)) * progress,
    );
  }
  col.needsUpdate = true;
}

function lavaColor(x, _y, z) {
  const n = Math.sin(x*0.15)*Math.cos(z*0.12);
  const hot = n > 0.2;
  return hot
    ? new THREE.Color(1.0, 0.2 + Math.random()*0.15, 0.0)
    : new THREE.Color(0.15, 0.05, 0.05);
}

function iceColor(x, _y, z) {
  const n = (Math.sin(x*0.18+1)*Math.cos(z*0.14+2)+1)*0.5;
  return new THREE.Color(
    0.72 + n*0.18,
    0.86 + n*0.1,
    0.98
  );
}

function snowColor() {
  return new THREE.Color(0.95, 0.97, 1.0);
}

// ─────────────────────────────────────────────────────────────
//  1. METEOR
// ─────────────────────────────────────────────────────────────
function triggerMeteor(scene, objects) {
  const tx = (rng()-0.5)*130, tz = (rng()-0.5)*130;
  const th = getTerrainHeight(tx, tz);
  const sx = tx + (rng()>0.5?1:-1)*(60+rng()*60);
  const sz = tz - 80 - rng()*60;
  const sy = 200 + rng()*40;

  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(3.5,12,12),
    new THREE.MeshPhongMaterial({color:0xdd3300,emissive:0xff4400,emissiveIntensity:1.2})));
  grp.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(5.5,10,10),
    new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:0.3,side:THREE.BackSide})),{}));
  grp.position.set(sx,sy,sz);
  scene.add(grp); objects.push(grp);

  // Trail
  const tCount=100, tGeo=new THREE.BufferGeometry();
  const tPos=new Float32Array(tCount*3).fill(9999);
  tGeo.setAttribute('position',new THREE.BufferAttribute(tPos,3));
  const trail=new THREE.Points(tGeo,new THREE.PointsMaterial({color:0xff6600,size:2,transparent:true,opacity:0.7}));
  scene.add(trail); objects.push(trail);
  let ti=0;

  // Impact light
  const iLight=new THREE.PointLight(0xff5500,0,120);
  iLight.position.set(tx,th+4,tz);
  scene.add(iLight); objects.push(iLight);

  // Crater disc
  const crater=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshLambertMaterial({color:0x080808}));
  crater.rotation.x=-Math.PI/2; crater.position.set(tx,th+0.2,tz);
  crater.scale.setScalar(0); scene.add(crater); objects.push(crater);

  // Rim
  const rim=new THREE.Mesh(new THREE.TorusGeometry(10,2.2,8,28),new THREE.MeshLambertMaterial({color:0x2a1500}));
  rim.rotation.x=Math.PI/2; rim.position.set(tx,th+1,tz);
  rim.scale.setScalar(0); scene.add(rim); objects.push(rim);

  // Ejecta
  const ejecta=[];
  for(let i=0;i<20;i++){
    const r=new THREE.Mesh(new THREE.DodecahedronGeometry(0.4+rng()*1.2,0),new THREE.MeshLambertMaterial({color:0x1a0900}));
    const a=rng()*Math.PI*2;
    r.position.set(tx,th+1,tz);
    r.userData={vx:Math.cos(a)*(8+rng()*18),vy:7+rng()*14,vz:Math.sin(a)*(8+rng()*18),t:0,landed:false};
    r.visible=false; scene.add(r); objects.push(r); ejecta.push(r);
  }

  // Shockwave ring
  const swMat=new THREE.MeshBasicMaterial({color:0xff8844,transparent:true,opacity:0.8,side:THREE.DoubleSide});
  const sw=new THREE.Mesh(new THREE.RingGeometry(0.1,0.5,36),swMat);
  sw.rotation.x=-Math.PI/2; sw.position.set(tx,th+0.3,tz); sw.visible=false;
  scene.add(sw); objects.push(sw);

  const dist=Math.sqrt((tx-sx)**2+(sy-th)**2+(tz-sz)**2);
  const travelTime=dist/150;
  let t=0, phase='falling', impactT=0;
  showBanner('☄️  METEOR INCOMING!','#ff4400',6000);
  audio.speak('Warning! Meteor incoming! Brace for impact!');
  audio.play('meteor_incoming');

  return dt=>{
    t+=dt;
    if(phase==='falling'){
      const p=Math.min(1,t/travelTime);
      grp.position.set(
        THREE.MathUtils.lerp(sx,tx,p),
        THREE.MathUtils.lerp(sy,th+2,p)+Math.sin(p*Math.PI)*18*(1-p),
        THREE.MathUtils.lerp(sz,tz,p)
      );
      grp.rotation.x+=dt*2.5; grp.rotation.z+=dt*1.8;
      const ta=tGeo.attributes.position.array;
      ta[ti*3]=grp.position.x+(rng()-0.5)*2;
      ta[ti*3+1]=grp.position.y+(rng()-0.5)*2;
      ta[ti*3+2]=grp.position.z+(rng()-0.5)*2;
      ti=(ti+1)%tCount;
      tGeo.attributes.position.needsUpdate=true;
      iLight.position.copy(grp.position);
      iLight.intensity=p*5;
      if(p>=1){
        phase='impact'; impactT=0;
        grp.visible=false; sw.visible=true;
        ejecta.forEach(r=>{r.visible=true;r.userData.t=0;});
        flash('#ff8844',220);
        showBanner('💥  IMPACT!','#ff6600',3000);
        audio.speak('Impact! The meteor has struck the island!');
        audio.play('meteor_impact');
      }
    } else {
      impactT+=dt;
      const swr=Math.min(15,impactT*24);
      sw.geometry.dispose();
      sw.geometry=new THREE.RingGeometry(swr*0.85,swr,36);
      sw.geometry.rotateX(-Math.PI/2);
      swMat.opacity=Math.max(0,0.8-impactT*0.5);
      iLight.intensity=Math.max(0,9-impactT*7);
      ejecta.forEach(r=>{
        if(r.userData.landed) return;
        r.userData.t+=dt;
        const et=r.userData.t;
        r.position.set(tx+r.userData.vx*et, th+1+r.userData.vy*et-5.5*et*et, tz+r.userData.vz*et);
        r.rotation.x+=dt*4; r.rotation.y+=dt*3;
        const gh=getTerrainHeight(r.position.x,r.position.z);
        if(r.position.y<=gh+0.3){r.position.y=gh+0.3;r.userData.landed=true;}
      });
      if(impactT>0.3){
        const cs=Math.min(1,(impactT-0.3)*1.5);
        crater.scale.setScalar(cs); rim.scale.setScalar(cs);
      }
      if(impactT>3) phase='done';
    }
    return phase==='done'&&t>travelTime+5;
  };
}

// ─────────────────────────────────────────────────────────────
//  2. RIVER — splits terrain, water rises in channel
// ─────────────────────────────────────────────────────────────
let riverMaterials = [];
let _volcanoMeshes = [];
function triggerRiver(scene, objects, _terrain, ocean, _oceanMat) {
  showBanner('🌊  A RIVER IS FORMING!','#0088ff');
  audio.speak('A river is splitting the land! Water is rushing through the island!');
  audio.play('river');

  riverMaterials = [];
  const segs = 24;
  const riverGroup = new THREE.Group();

  for(let i=0;i<segs;i++){
    const z = -160+i*14;
    const x = Math.sin(i*0.35)*15+Math.cos(i*0.18)*6;
    const h = getTerrainHeight(x,z);
    const mat = new THREE.MeshPhongMaterial({
      color:0x1166dd, transparent:true, opacity:0.88,
      specular:0x55aaff, shininess:80,
    });
    riverMaterials.push(mat);
    const seg=new THREE.Mesh(new THREE.BoxGeometry(15,1.2,15),mat);
    seg.position.set(x, Math.max(0.2,h-0.3), z);
    seg.scale.x=0.01;
    riverGroup.add(seg);
  }
  scene.add(riverGroup); objects.push(riverGroup);

  // Widen ocean slightly
  const origOceanY = ocean.position.y;
  let t=0;
  return dt=>{
    t+=dt;
    riverGroup.children.forEach((seg,i)=>{
      const delay=i*0.1;
      if(t>delay) seg.scale.x=Math.min(1,(t-delay)*2);
    });
    // Flood island edges a little
    ocean.position.y = origOceanY + Math.min(0.6, t*0.04);
    return t>segs*0.1+3;
  };
}

// ─────────────────────────────────────────────────────────────
//  3. VOLCANO — cracks mountain, map turns volcanic, river→lava
// ─────────────────────────────────────────────────────────────
function triggerVolcano(scene, objects, terrain, _ocean, vegetation) {
  const mountains=[{cx:55,cz:-40},{cx:-45,cz:55},{cx:10,cz:70},{cx:-60,cz:-25}];
  const m=mountains[Math.floor(rng()*mountains.length)];
  const vx=m.cx, vz=m.cz, vh=getTerrainHeight(vx,vz);

  let phase='warning', phaseT=0, t=0;
  showBanner('⚠️  SOMETHING SHAKES BENEATH THE MOUNTAINS...','#ffaa00',8000);
  audio.speak('Warning. Something is shaking deep beneath the mountains. Take cover!');
  audio.play('volcano_warning');

  // Crack lines from mountain
  const cracks=[];
  for(let i=0;i<12;i++){
    const angle=(i/12)*Math.PI*2;
    const pts=[]; let cx=vx,cz2=vz;
    for(let j=0;j<16;j++){
      pts.push(new THREE.Vector3(cx,getTerrainHeight(cx,cz2)+0.4,cz2));
      cx+=Math.cos(angle+(rng()-0.5)*0.9)*(3+rng()*5);
      cz2+=Math.sin(angle+(rng()-0.5)*0.9)*(3+rng()*5);
    }
    const crack=new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0xff2200})
    );
    crack.visible=false; scene.add(crack); objects.push(crack); cracks.push(crack);
  }

  // Volcano cone
  const volcMat=new THREE.MeshLambertMaterial({color:0x1a1a1a});
  const volc=new THREE.Mesh(new THREE.ConeGeometry(18,32,14),volcMat);
  volc.position.set(vx,vh-16,vz); scene.add(volc); objects.push(volc);

  // Lava cap
  const capMat=new THREE.MeshPhongMaterial({color:0xff3300,emissive:0xff1100,emissiveIntensity:1.5});
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(2,7,3,14),capMat);
  cap.position.set(vx,vh-22,vz); scene.add(cap); objects.push(cap);

  // Lava river overlay (replaces water river)
  const lavaRiverSegs=[];
  const lavaMat2=new THREE.MeshPhongMaterial({color:0xff3300,emissive:0xff1100,emissiveIntensity:0.9,transparent:true,opacity:0});
  for(let i=0;i<24;i++){
    const z=-160+i*14, x=Math.sin(i*0.35)*15+Math.cos(i*0.18)*6;
    const h=getTerrainHeight(x,z);
    const seg=new THREE.Mesh(new THREE.BoxGeometry(15,1.4,15),lavaMat2.clone());
    seg.position.set(x,Math.max(0.3,h-0.1),z);
    scene.add(seg); objects.push(seg); lavaRiverSegs.push(seg);
  }
  _volcanoMeshes=[volc,cap,...lavaRiverSegs];

  // Lava blobs
  const blobMat=new THREE.MeshBasicMaterial({color:0xff4400});
  const blobs=[];
  for(let i=0;i<32;i++){
    const blob=new THREE.Mesh(new THREE.SphereGeometry(0.8+rng()*1.1,6,6),blobMat);
    blob.userData={bvx:(rng()-0.5)*24,bvy:18+rng()*24,bvz:(rng()-0.5)*24,bt:rng()*2,delay:rng()*4};
    blob.position.set(vx,vh,vz); blob.visible=false;
    scene.add(blob); objects.push(blob); blobs.push(blob);
  }

  // Smoke
  const smokeCount=150;
  const smokeGeo=new THREE.BufferGeometry();
  const smokePos=new Float32Array(smokeCount*3);
  const smokeVel=[];
  for(let i=0;i<smokeCount;i++){
    smokePos[i*3]=vx; smokePos[i*3+1]=vh+30; smokePos[i*3+2]=vz;
    smokeVel.push({x:(rng()-0.5)*4,y:3+rng()*5,z:(rng()-0.5)*4,age:rng()*3,life:3+rng()*2});
  }
  smokeGeo.setAttribute('position',new THREE.BufferAttribute(smokePos,3));
  const smoke=new THREE.Points(smokeGeo,new THREE.PointsMaterial({color:0x222222,size:5,transparent:true,opacity:0}));
  scene.add(smoke); objects.push(smoke);

  const volcGlow=new THREE.PointLight(0xff4400,0,130);
  volcGlow.position.set(vx,vh+32,vz);
  scene.add(volcGlow); objects.push(volcGlow);

  const origBg=scene.background?scene.background.clone():new THREE.Color(0x87ceeb);
  const origFog=scene.fog?scene.fog.color.clone():new THREE.Color(0x9ad4ee);
  let terrainPainted=false;

  return dt=>{
    t+=dt; phaseT+=dt;

    if(phase==='warning'){
      if(phaseT>7){
        phase='cracking'; phaseT=0;
        showBanner('💥  THE MOUNTAIN CRACKS!','#ff4400',6000);
        audio.speak('The mountain is cracking open! Run!');
        audio.play('earthquake');
        cracks.forEach(c=>c.visible=true);
        flash('#ff3300',200);
      }
    } else if(phase==='cracking'){
      if(phaseT>5){
        phase='erupting'; phaseT=0;
        showBanner('🌋  ERUPTION! THE ISLAND IS TRANSFORMING!','#ff2200',8000);
        audio.speak('Volcanic eruption! Lava is pouring out! The island is transforming!');
        audio.play('volcano_erupt');
        flash('#ff5500',300);
        // Fade river to lava
        riverMaterials.forEach(mat=>{mat.color.set(0xff4400);mat.emissive=new THREE.Color(0xff1100);mat.emissiveIntensity=0.9;mat.specular=new THREE.Color(0xff8800);});
        // Hide vegetation near volcano
        vegetation.forEach(v=>{
          const d=Math.sqrt((v.position.x-vx)**2+(v.position.z-vz)**2);
          if(d<50) v.visible=false;
        });
      }
    } else if(phase==='erupting'){
      const rp=Math.min(1,phaseT/4);
      volc.position.y=THREE.MathUtils.lerp(vh-16,vh,rp);
      cap.position.y=THREE.MathUtils.lerp(vh-22,vh+30,rp);
      volcGlow.intensity=rp*7;
      smoke.material.opacity=Math.min(0.6,phaseT*0.08);

      // Animate smoke
      const sp=smokeGeo.attributes.position.array;
      smokeVel.forEach((v,i)=>{
        v.age+=dt;
        if(v.age>v.life){sp[i*3]=vx+(rng()-0.5)*4;sp[i*3+1]=vh+30;sp[i*3+2]=vz+(rng()-0.5)*4;v.age=0;}
        sp[i*3]+=v.x*dt; sp[i*3+1]+=v.y*dt; sp[i*3+2]+=v.z*dt;
      });
      smokeGeo.attributes.position.needsUpdate=true;

      // Lava blobs
      if(phaseT>1) blobs.forEach(b=>{
        if(phaseT<b.userData.delay) return;
        b.visible=true; b.userData.bt+=dt;
        const bt=b.userData.bt;
        b.position.set(vx+b.userData.bvx*bt, vh+30+b.userData.bvy*bt-6*bt*bt, vz+b.userData.bvz*bt);
        if(b.position.y<getTerrainHeight(b.position.x,b.position.z)+0.5){
          b.userData.bt=0; b.userData.bvx=(rng()-0.5)*24; b.userData.bvy=18+rng()*24; b.userData.bvz=(rng()-0.5)*24;
        }
      });

      // Lava river segments fade in
      lavaRiverSegs.forEach(s=>{s.material.opacity=Math.min(0.95,phaseT*0.08);});

      volcGlow.intensity=6+Math.sin(phaseT*7)*3;

      // Darken sky to volcanic red
      const dp=Math.min(1,phaseT/10);
      if(!terrainPainted&&dp>0.3){
        paintTerrain(terrain,lavaColor,dp*0.15);
      }
      if(scene.background instanceof THREE.Color)
        scene.background.lerpColors(origBg,new THREE.Color(0x1a0500),dp);
      if(scene.fog) scene.fog.color.lerpColors(origFog,new THREE.Color(0x2a0800),dp);
    }
    return t>35;
  };
}

// ─────────────────────────────────────────────────────────────
//  4. EARTHQUAKE + THUNDERSTORM + LIGHTNING
// ─────────────────────────────────────────────────────────────
function triggerEarthquake(scene, objects, droneState) {
  showBanner('🌍  EARTHQUAKE!','#cc8800');
  audio.speak('Earthquake! The ground is shaking! Hold on tight!');
  audio.play('earthquake');

  // Ground cracks
  for(let i=0;i<12;i++){
    const pts=[]; let x=(rng()-0.5)*200, z=(rng()-0.5)*200;
    for(let j=0;j<22;j++){
      pts.push(new THREE.Vector3(x,getTerrainHeight(x,z)+0.25,z));
      x+=(rng()-0.5)*18; z+=(rng()-0.5)*10+7;
    }
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0x0a0500}));
    scene.add(line); objects.push(line);
  }

  // Storm clouds — lighter grey so they don't look like black blobs
  const stormClouds=[];
  for(let i=0;i<8;i++){
    const c=new THREE.Group();
    const puffs=4+Math.floor(rng()*4);
    for(let p=0;p<puffs;p++){
      const sz=8+rng()*12;
      const puff=new THREE.Mesh(new THREE.SphereGeometry(sz,7,5),
        new THREE.MeshPhongMaterial({color:0x556677,transparent:true,opacity:0}));
      puff.position.set(p*10-puffs*5,rng()*5,rng()*8); c.add(puff);
    }
    c.position.set((rng()-0.5)*280, 55+rng()*18, (rng()-0.5)*280);
    c.userData.speed=1.5+rng()*3;
    scene.add(c); objects.push(c); stormClouds.push(c);
  }

  function spawnLightning(){
    const lx=(rng()-0.5)*200, lz=(rng()-0.5)*200;
    const lh=getTerrainHeight(lx,lz);
    let pts=[], cx=lx+(rng()-0.5)*20, cy=65+rng()*25;
    while(cy>lh){ pts.push(new THREE.Vector3(cx,cy,lz+(rng()-0.5)*6)); cx+=(rng()-0.5)*9; cy-=7+rng()*9; }
    pts.push(new THREE.Vector3(lx,lh,lz));
    const bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0xffffff,linewidth:3}));
    scene.add(bolt); objects.push(bolt);
    const sl=new THREE.PointLight(0xaabbff,14,90);
    sl.position.set(lx,lh+4,lz);
    scene.add(sl); objects.push(sl);
    flash('#aaccff',90);
    audio.play('lightning');
    setTimeout(()=>{scene.remove(bolt);scene.remove(sl);},180);
  }

  let t=0, nextL=4;
  return dt=>{
    t+=dt;
    droneState.shake=t<5?Math.sin(t*28)*0.55*(1-t/5):0;
    const fade=Math.min(1,t/3);
    stormClouds.forEach(c=>{
      c.children.forEach(p=>{p.material.opacity=fade*0.88;});
      c.position.x+=c.userData.speed*dt;
      if(c.position.x>400) c.position.x=-400;
    });
    if(t>=nextL&&t<20){ spawnLightning(); nextL+=1.6+rng()*2.2; }
    // Fade and remove storm clouds when event ends
    if(t>18){
      const fade=Math.max(0,1-(t-18)/4);
      stormClouds.forEach(c=>c.children.forEach(p=>{p.material.opacity=fade*0.75;}));
    }
    if(t>22) stormClouds.forEach(c=>scene.remove(c));
    return t>22;
  };
}

// ─────────────────────────────────────────────────────────────
//  5. ICE FALL — chunks rain down, entire terrain freezes
// ─────────────────────────────────────────────────────────────
function triggerIceFall(scene, objects, terrain, ocean, vegetation) {
  showBanner('🧊  ICE AGE INCOMING!','#aaddff');
  audio.speak('Ice age incoming! Giant ice chunks are falling from the sky! The island is freezing over!');
  audio.play('ice_fall');

  const iceMat=new THREE.MeshPhongMaterial({color:0xaaddff,transparent:true,opacity:0.78,specular:0xffffff,shininess:140});
  const chunks=[];
  for(let i=0;i<50;i++){
    const x=(rng()-0.5)*290, z=(rng()-0.5)*290;
    const chunk=new THREE.Mesh(new THREE.OctahedronGeometry(1+rng()*3.5,0),iceMat);
    chunk.position.set(x,85+rng()*90,z);
    chunk.userData={vy:-(5+rng()*10),rs:(rng()-0.5)*3,ground:getTerrainHeight(x,z),landed:false};
    scene.add(chunk); objects.push(chunk); chunks.push(chunk);
  }

  // Freeze ocean surface
  const icePlateMat=new THREE.MeshPhongMaterial({color:0xbbddff,transparent:true,opacity:0,specular:0xffffff,shininess:100});
  const icePlate=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400,2,2),icePlateMat);
  icePlate.rotation.x=-Math.PI/2; icePlate.position.y=0.3;
  scene.add(icePlate); objects.push(icePlate);

  // Ice spires rising from ground
  const spires=[];
  for(let i=0;i<30;i++){
    const sx=(rng()-0.5)*240, sz=(rng()-0.5)*240;
    const sh=getTerrainHeight(sx,sz);
    if(sh<1) continue;
    const spire=new THREE.Mesh(
      new THREE.ConeGeometry(0.4+rng()*0.8,3+rng()*8,6),
      new THREE.MeshPhongMaterial({color:0xbbeeff,transparent:true,opacity:0.8,specular:0xffffff,shininess:160})
    );
    spire.position.set(sx,sh,sz);
    spire.scale.y=0;
    scene.add(spire); objects.push(spire); spires.push(spire);
  }

  let t=0, terrainFrozen=false;
  return dt=>{
    t+=dt;
    let allLanded=true;
    chunks.forEach(c=>{
      if(c.userData.landed) return;
      allLanded=false;
      c.position.y+=c.userData.vy*dt;
      c.rotation.x+=c.userData.rs*dt; c.rotation.z+=c.userData.rs*0.7*dt;
      if(c.position.y<=c.userData.ground+0.8){c.position.y=c.userData.ground+0.5;c.userData.landed=true;}
    });

    // Freeze ocean
    icePlateMat.opacity=Math.min(0.75,t*0.06);
    ocean.material.opacity=Math.max(0.1,0.88-t*0.06);

    // Ice spires grow in
    if(t>2) spires.forEach((s,i)=>{
      const delay=i*0.15;
      if(t-2>delay) s.scale.y=Math.min(1,(t-2-delay)*0.7);
    });

    // Paint terrain ice
    if(t>3&&!terrainFrozen){
      terrainFrozen=true;
      paintTerrain(terrain,iceColor,0.7);
      // Turn scene pale blue
      if(scene.background instanceof THREE.Color) scene.background.set(0xbbddff);
      if(scene.fog) scene.fog.color.set(0xcceeFF);
      // Coat vegetation white
      vegetation.forEach(v=>v.traverse(c=>{
        if(c.isMesh&&c.material) c.material.color.lerp(new THREE.Color(0xddeeff),0.7);
      }));
      // Freeze volcano (lava → ice) if it erupted earlier
      _volcanoMeshes.forEach(m=>{
        if(!m.material) return;
        m.material.color.set(0xaaddff);
        if(m.material.emissive) m.material.emissive.set(0x001133);
        if('emissiveIntensity' in m.material) m.material.emissiveIntensity=0.0;
      });
    }

    return (allLanded||t>14)&&t>14;
  };
}

// ─────────────────────────────────────────────────────────────
//  6. SNOW — snowflakes only, terrain turns white, fades out
// ─────────────────────────────────────────────────────────────
function triggerSnow(scene, objects, terrain) {
  showBanner("❄️  IT'S SNOWING!",'#cceeff');
  audio.speak("It's snowing! Everything is turning white!");
  audio.play('snow');

  const snowMat=new THREE.PointsMaterial({color:0xffffff,size:0.55,transparent:true,opacity:0.85});
  const count=5000;
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3);
  const vel=[];
  for(let i=0;i<count;i++){
    pos[i*3]=(Math.random()-0.5)*380; pos[i*3+1]=Math.random()*150+10; pos[i*3+2]=(Math.random()-0.5)*380;
    vel.push({x:(Math.random()-0.5)*0.4,y:-(0.4+Math.random()*1.0),z:(Math.random()-0.5)*0.4});
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const snow=new THREE.Points(geo,snowMat);
  scene.add(snow); objects.push(snow);

  // Paint terrain white
  paintTerrain(terrain,snowColor,0.5);
  if(scene.background instanceof THREE.Color) scene.background.set(0xccddee);
  if(scene.fog) scene.fog.color.set(0xddeeff);

  const DURATION=22;
  let t=0;
  return dt=>{
    t+=dt;
    // Only move particles while still snowing
    if(t<DURATION-4){
      const pa=geo.attributes.position.array;
      for(let i=0;i<count;i++){
        pa[i*3]+=vel[i].x*dt; pa[i*3+1]+=vel[i].y*dt; pa[i*3+2]+=vel[i].z*dt;
        if(pa[i*3+1]<0) pa[i*3+1]=140;
      }
      geo.attributes.position.needsUpdate=true;
    }
    // Fade out completely in final 4 seconds
    snowMat.opacity = t < DURATION-4 ? 0.85 : Math.max(0, 0.85*(1-(t-(DURATION-4))/4));
    if(t>DURATION) scene.remove(snow);
    return t>DURATION;
  };
}

// ─────────────────────────────────────────────────────────────
//  6b. CHRISTMAS — Snowman, Santa, reindeer, tree, sledders, wolves
// ─────────────────────────────────────────────────────────────
function triggerChristmas(scene, objects, _terrain, _vegetation) {
  showBanner('🎄  IT\'S CHRISTMAS! HO HO HO!','#ff3333');
  audio.speak("Ho ho ho! It is Christmas! Santa Claus is flying over the island! Look at the reindeer! Merry Christmas!");
  audio.play('snow');

  // ── Snowman ──────────────────────────────────────────────────
  const SX=20, SZ=20, SH=getTerrainHeight(SX,SZ);
  const snowWhite=new THREE.MeshPhongMaterial({color:0xeef5ff,specular:0xffffff,shininess:60});
  const snowman=new THREE.Group();
  [[0,1.2,0,2.5],[0,3.6,0,1.8],[0,5.5,0,1.3]].forEach(([x,y,z,r])=>{
    const ball=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),snowWhite);
    ball.position.set(x,y,z); snowman.add(ball);
  });
  const coal=new THREE.MeshBasicMaterial({color:0x111111});
  [[-0.42,5.72,1.18],[0.42,5.72,1.18]].forEach(([x,y,z])=>{
    const e=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8),coal); e.position.set(x,y,z); snowman.add(e);
  });
  const nose=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.6,8),new THREE.MeshLambertMaterial({color:0xff7700}));
  nose.rotation.x=-Math.PI/2; nose.position.set(0,5.5,1.32); snowman.add(nose);
  for(let i=0;i<4;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(0.11,6,6),coal);b.position.set(0,4.1-i*0.52,1.75);snowman.add(b);}
  [[-1.1,3.65,0,-0.4,4.0,1.4],[1.1,3.65,0,0.4,4.0,1.4]].forEach(([x1,y1,z1,x2,y2,z2])=>{
    snowman.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1,y1,z1),new THREE.Vector3(x2,y2,z2)]),new THREE.LineBasicMaterial({color:0x4a2810,linewidth:4})));
  });
  const scarf=new THREE.Mesh(new THREE.TorusGeometry(1.45,0.24,8,24),new THREE.MeshLambertMaterial({color:0xdd2200}));
  scarf.rotation.x=Math.PI/2; scarf.position.set(0,4.4,0); snowman.add(scarf);
  // Skully/beanie cap
  const hat=new THREE.Group();
  const beanieCyl=new THREE.Mesh(new THREE.CylinderGeometry(0.90,1.05,1.1,14),new THREE.MeshLambertMaterial({color:0x1a1a33}));
  beanieCyl.position.y=0.55; hat.add(beanieCyl);
  const beanieTop=new THREE.Mesh(new THREE.SphereGeometry(0.91,14,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshLambertMaterial({color:0x1a1a33}));
  beanieTop.position.y=1.1; hat.add(beanieTop);
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(1.14,1.08,0.30,14),new THREE.MeshLambertMaterial({color:0x111122}));
  cuff.position.y=0.15; hat.add(cuff);
  const skStripe1=new THREE.Mesh(new THREE.CylinderGeometry(0.94,0.94,0.12,14),new THREE.MeshLambertMaterial({color:0xdd2200}));
  skStripe1.position.y=0.70; hat.add(skStripe1);
  const skStripe2=new THREE.Mesh(new THREE.CylinderGeometry(0.94,0.94,0.10,14),new THREE.MeshLambertMaterial({color:0xeeeeee}));
  skStripe2.position.y=0.88; hat.add(skStripe2);
  const pomPom=new THREE.Mesh(new THREE.SphereGeometry(0.24,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));
  pomPom.position.y=1.78; hat.add(pomPom);
  hat.position.set(0,6.2,0); snowman.add(hat);
  // Snow boots at the base
  const bootMat2=new THREE.MeshLambertMaterial({color:0x2a1005});
  [[-0.75,-1.05,2.05],[0.75,-1.05,2.05]].forEach(([bx2,by2,bz2])=>{
    const bbase=new THREE.Mesh(new THREE.BoxGeometry(0.78,0.5,1.3),bootMat2);
    bbase.position.set(bx2,by2,bz2); snowman.add(bbase);
    const btoe=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,6),bootMat2);
    btoe.scale.set(1,0.65,0.9); btoe.position.set(bx2,by2-0.05,bz2+0.6); snowman.add(btoe);
  });
  snowman.position.set(SX,SH+95,SZ);
  scene.add(snowman); objects.push(snowman);

  // ── Builders around snowman ───────────────────────────────────
  const builders=[];
  [{x:SX-4,z:SZ+3},{x:SX+4,z:SZ-2},{x:SX-2,z:SZ-4.5}].forEach((bp,ci)=>{
    const bh=getTerrainHeight(bp.x,bp.z);
    const b=new THREE.Group();
    const col=[0xcc2200,0x2255cc,0x338833][ci];
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.55,0.22),new THREE.MeshLambertMaterial({color:col}));
    body.position.y=1.1; b.add(body);
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.32,0.32),new THREE.MeshLambertMaterial({color:0xf4a460}));
    head.position.y=1.56; b.add(head);
    const aL=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12),new THREE.MeshLambertMaterial({color:col}));
    aL.position.set(-0.3,1.15,0.25); aL.rotation.x=-0.8; aL.name='barm'; b.add(aL);
    const aR=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12),new THREE.MeshLambertMaterial({color:col}));
    aR.position.set(0.3,1.15,0.25); aR.rotation.x=-0.8; b.add(aR);
    [-0.1,0.1].forEach(x=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.5,0.14),new THREE.MeshLambertMaterial({color:0x223355}));
      leg.position.set(x,0.62,0); b.add(leg);
    });
    b.position.set(bp.x,bh,bp.z);
    b.lookAt(new THREE.Vector3(SX,bh,SZ));
    scene.add(b); objects.push(b); builders.push({mesh:b,phase:ci*1.2});
  });

  // ── Christmas Tree ─────────────────────────────────────────────
  function makeXmasTree(x,z,scale=1){
    const g=new THREE.Group();
    const h=getTerrainHeight(x,z);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.18*scale,0.22*scale,1.2*scale,8),new THREE.MeshLambertMaterial({color:0x5a3010}));
    trunk.position.y=0.6*scale; g.add(trunk);
    [[2.2,1.5],[1.7,3.0],[1.1,4.2],[0.55,5.1]].forEach(([r,y])=>{
      const tier=new THREE.Mesh(new THREE.ConeGeometry(r*scale,1.6*scale,10),new THREE.MeshLambertMaterial({color:0x0d5e0d}));
      tier.position.y=y*scale; g.add(tier);
    });
    // Star on top
    const star=new THREE.Mesh(new THREE.OctahedronGeometry(0.28*scale,0),new THREE.MeshBasicMaterial({color:0xffee00}));
    star.position.y=6.1*scale; g.add(star);
    // Decorations (colored balls)
    for(let i=0;i<14;i++){
      const ang=i*(Math.PI*2/14);
      const layer=Math.floor(i/5);
      const rx=(1.8-layer*0.5)*scale, ry=(2.0+layer*1.4)*scale;
      const ball=new THREE.Mesh(new THREE.SphereGeometry(0.13*scale,6,6),new THREE.MeshBasicMaterial({color:[0xff2222,0xffee00,0x2255ff,0xff8800][i%4]}));
      ball.position.set(Math.cos(ang)*rx,ry,Math.sin(ang)*rx); g.add(ball);
    }
    g.position.set(x,h,z);
    return g;
  }
  const tree1=makeXmasTree(SX+8,SZ-3,1.1);
  const tree2=makeXmasTree(SX-10,SZ+6,0.85);
  const tree3=makeXmasTree(SX+5,SZ+9,0.95);
  [tree1,tree2,tree3].forEach(t=>{scene.add(t);objects.push(t);});

  // Fairy lights strung between trees — glowing point lights
  [tree1,tree2,tree3].forEach((t,i)=>{
    const pl=new THREE.PointLight([0xff4444,0xffee44,0x4466ff][i],2.5,18);
    pl.position.copy(t.position); pl.position.y+=5;
    scene.add(pl); objects.push(pl);
  });

  // ── Santa Sleigh + Reindeer ────────────────────────────────────
  const santaGroup=new THREE.Group();

  // Sleigh body
  const sleighBody=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.0,1.4),new THREE.MeshLambertMaterial({color:0xcc1111}));
  sleighBody.position.y=0; santaGroup.add(sleighBody);
  // Sleigh runners
  [-0.55,0.55].forEach(z=>{
    const runner=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.12,0.18),new THREE.MeshLambertMaterial({color:0x8B4513}));
    runner.position.set(0,-0.56,z); santaGroup.add(runner);
  });
  // Sleigh back rest
  const back=new THREE.Mesh(new THREE.BoxGeometry(0.18,1.4,1.4),new THREE.MeshLambertMaterial({color:0xcc1111}));
  back.position.set(-1.4,0.7,0); santaGroup.add(back);
  // Sack of gifts
  const sack=new THREE.Mesh(new THREE.SphereGeometry(0.65,8,8),new THREE.MeshLambertMaterial({color:0xaa8833}));
  sack.scale.y=1.3; sack.position.set(-0.9,0.95,0); santaGroup.add(sack);

  // Santa
  const santa=new THREE.Group();
  const sMat=new THREE.MeshLambertMaterial({color:0xcc1111});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.3),sMat); body.position.y=0.3; santa.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.36,0.36),new THREE.MeshLambertMaterial({color:0xf4c090})); head.position.y=0.78; santa.add(head);
  // White beard
  const beard=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),new THREE.MeshLambertMaterial({color:0xffffff})); beard.scale.y=0.6; beard.position.set(0,0.62,0.18); santa.add(beard);
  // Hat
  const sHat=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.45,8),new THREE.MeshLambertMaterial({color:0xcc1111})); sHat.position.set(0,1.05,0); santa.add(sHat);
  const hatBall=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshBasicMaterial({color:0xffffff})); hatBall.position.set(0,1.26,0); santa.add(hatBall);
  santa.position.set(0.6,0.5,0);
  santaGroup.add(santa);

  // Reindeer (8 reindeer in two rows)
  const deerPositions=[];
  for(let row=0;row<2;row++){
    for(let col=0;col<4;col++){
      deerPositions.push({x:4+col*2.8,z:(row-0.5)*2.2});
    }
  }
  deerPositions.forEach(dp=>{
    const deer=new THREE.Group();
    const dMat=new THREE.MeshLambertMaterial({color:0xaa6633});
    const dbody=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.45,0.35),dMat); dbody.position.y=0.3; deer.add(dbody);
    const dneck=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.4,0.22),dMat); dneck.position.set(0.48,0.55,0); deer.add(dneck);
    const dhead=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.28,0.28),dMat); dhead.position.set(0.65,0.8,0); deer.add(dhead);
    // Antlers
    [[-0.1,0],[0.1,0]].forEach(([oz,_])=>{
      const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.5,5),new THREE.MeshLambertMaterial({color:0x6b3a1f}));
      ant.position.set(0.65,1.05,oz); ant.rotation.z=0.35*(oz>0?1:-1); deer.add(ant);
    });
    // Legs (galloping — alternating)
    [[-0.3,0.22],[0.3,0.22],[-0.3,-0.22],[0.3,-0.22]].forEach(([x,z],li)=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.38,0.1),dMat);
      leg.position.set(x,-0.1,z); leg.userData.legIdx=li; leg.name='leg'; deer.add(leg);
    });
    deer.position.set(dp.x,0,dp.z);
    santaGroup.add(deer);
  });

  // Reins (lines)
  const reinsMat=new THREE.LineBasicMaterial({color:0x8B4513});
  const reinsGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.4,0.5,0.55),new THREE.Vector3(13,0,0.55),new THREE.Vector3(1.4,0.5,-0.55),new THREE.Vector3(13,0,-0.55)]);
  santaGroup.add(new THREE.Line(reinsGeo,reinsMat));

  // Fly path — enters from left, crosses island at mountain height
  santaGroup.scale.setScalar(1.3);
  santaGroup.position.set(-120,90,15);
  santaGroup.rotation.y=0;
  const santaGlow=new THREE.PointLight(0xffee88,5,65);
  santaGlow.position.set(0,4,0); santaGroup.add(santaGlow);
  scene.add(santaGroup); objects.push(santaGroup);

  // ── Sledders down the mountain ─────────────────────────────────
  const SLED_MOUNTAIN={cx:-45,cz:55}; // mountain peak
  const sledders=[];
  for(let si=0;si<3;si++){
    const sg=new THREE.Group();
    // Sled plank
    const plank=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.12,0.5),new THREE.MeshLambertMaterial({color:0x8B4513}));
    sg.add(plank);
    // Sled runner blades
    [-0.2,0.2].forEach(z=>{
      const blade=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.06,0.06),new THREE.MeshLambertMaterial({color:0x888888}));
      blade.position.set(0,-0.09,z); sg.add(blade);
    });
    // Rider on sled
    const rider=new THREE.Group();
    const rBody=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.18,0.42),new THREE.MeshLambertMaterial({color:[0xcc2200,0x2244bb,0x228833][si]}));
    rBody.position.y=0.18; rider.add(rBody);
    const rHead=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.26,0.26),new THREE.MeshLambertMaterial({color:0xf4a460}));
    rHead.position.y=0.42; rider.add(rHead);
    sg.add(rider);
    // Start each sledder at a slightly different spot on the mountain slope
    const startAngle=Math.PI*(0.8+si*0.15);
    const startR=18+si*5;
    const sx2=SLED_MOUNTAIN.cx+Math.cos(startAngle)*startR;
    const sz2=SLED_MOUNTAIN.cz+Math.sin(startAngle)*startR;
    sg.position.set(sx2, getTerrainHeight(sx2,sz2)+0.25, sz2);
    sg.userData={
      progress:si*0.22,
      speed:4+si*1.2,
      startX:sx2, startZ:sz2,
      targetX:SLED_MOUNTAIN.cx+Math.cos(startAngle)*55,
      targetZ:SLED_MOUNTAIN.cz+Math.sin(startAngle)*55,
    };
    scene.add(sg); objects.push(sg); sledders.push(sg);
  }

  // ── Wolves on mountain ─────────────────────────────────────────
  const wolves=[];
  const wolfMountains=[{cx:55,cz:-40},{cx:-45,cz:55}];
  for(let wi=0;wi<4;wi++){
    const wm=wolfMountains[wi%2];
    const wg=new THREE.Group();
    const wMat=new THREE.MeshLambertMaterial({color:0x3a2010});
    // Body
    const wBody=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.45,0.35),wMat); wBody.position.y=0.35; wg.add(wBody);
    // Head
    const wHead=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.32,0.45),wMat); wHead.position.set(0.5,0.6,0); wg.add(wHead);
    // Snout
    const snout=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.16,0.28),new THREE.MeshLambertMaterial({color:0x555555})); snout.position.set(0.68,0.52,0); wg.add(snout);
    // Ears
    [[-0.08,0.8,0.12],[0.08,0.8,0.12]].forEach(([x,y,z])=>{
      const ear=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.2,5),wMat); ear.position.set(x+0.5,y,z); wg.add(ear);
    });
    // Tail (angled up)
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,0.55,6),wMat);
    tail.position.set(-0.5,0.6,0); tail.rotation.z=-0.9; wg.add(tail);
    // Legs
    [[-0.25,0.22],[-0.25,-0.22],[0.25,0.22],[0.25,-0.22]].forEach(([x,z])=>{
      const wLeg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.36,0.1),wMat); wLeg.position.set(x,-0.04,z); wg.add(wLeg);
    });
    // Eyes (yellow)
    [[-0.07,0.65,0.23],[0.07,0.65,0.23]].forEach(([x,y,z])=>{
      const ey=new THREE.Mesh(new THREE.SphereGeometry(0.045,5,5),new THREE.MeshBasicMaterial({color:0xffcc00})); ey.position.set(x+0.5,y,z); wg.add(ey);
    });
    const wa=(wi/4)*Math.PI*2+0.5;
    const wr=10+wi*4;
    const wx=wm.cx+Math.cos(wa)*wr, wz=wm.cz+Math.sin(wa)*wr;
    const wh=getTerrainHeight(wx,wz);
    wg.position.set(wx,wh,wz);
    wg.rotation.y=wa+Math.PI;
    wg.scale.setScalar(1.6);
    wg.userData={phase:wi*1.1,patrolAngle:wa,patrolR:wr,centerX:wm.cx,centerZ:wm.cz,speed:0.4+wi*0.1};
    scene.add(wg); objects.push(wg); wolves.push(wg);
  }
  // Wolf point light so they glow on the mountain at night
  wolves.forEach(w=>{
    const wl=new THREE.PointLight(0xffcc44,1.5,20);
    wl.position.set(0,3,0); w.add(wl);
  });

  // ── Continuous snow particles (lighter than main snow) ─────────
  const joySnowMat=new THREE.PointsMaterial({color:0xffffff,size:0.4,transparent:true,opacity:0.6});
  const jCount=3000;
  const jGeo=new THREE.BufferGeometry();
  const jPos=new Float32Array(jCount*3);
  const jVel=[];
  for(let i=0;i<jCount;i++){
    jPos[i*3]=(Math.random()-0.5)*350; jPos[i*3+1]=Math.random()*140+10; jPos[i*3+2]=(Math.random()-0.5)*350;
    jVel.push({x:(Math.random()-0.5)*0.3,y:-(0.3+Math.random()*0.7),z:(Math.random()-0.5)*0.3});
  }
  jGeo.setAttribute('position',new THREE.BufferAttribute(jPos,3));
  const joySnow=new THREE.Points(jGeo,joySnowMat);
  scene.add(joySnow); objects.push(joySnow);

  const DURATION=25;
  const SNOWFALL=2.5;
  let t=0, snowmanLanded=false;

  return dt=>{
    t+=dt;

    // Snow particles (loop while event lives, fade at end)
    const jp=jGeo.attributes.position.array;
    for(let i=0;i<jCount;i++){
      jp[i*3]+=jVel[i].x*dt; jp[i*3+1]+=jVel[i].y*dt; jp[i*3+2]+=jVel[i].z*dt;
      if(jp[i*3+1]<0) jp[i*3+1]=130;
    }
    jGeo.attributes.position.needsUpdate=true;
    joySnowMat.opacity=t>DURATION-5?Math.max(0,0.6*((DURATION-t)/5)):0.6;

    // Wolf howl when Christmas scene begins
    if(t>3&&t<3.05) audio.play('wolf_howl');

    // Snowman drops from sky
    if(t<SNOWFALL){
      const p=t/SNOWFALL;
      snowman.position.y=SH+95*(1-p*p);
      snowman.rotation.y+=dt*2.5;
    } else if(!snowmanLanded){
      snowmanLanded=true;
      snowman.position.y=SH;
      snowman.rotation.y=0;
      flash('#ccffff',280);
    }

    // Builders wiggle
    builders.forEach((b,i)=>{
      b.phase+=dt*2;
      const arm=b.mesh.getObjectByName('barm');
      if(arm) arm.rotation.x=-0.8+Math.sin(b.phase+i)*0.45;
    });

    // Santa flies across sky (slow arc)
    const flyT=Math.min(1,t/DURATION);
    santaGroup.position.x=THREE.MathUtils.lerp(-120,150,flyT);
    santaGroup.position.z=THREE.MathUtils.lerp(15,-25,flyT);
    santaGroup.position.y=88+Math.sin(flyT*Math.PI)*8+Math.sin(t*0.4)*2;
    santaGroup.rotation.y=-0.18+flyT*0.08;
    // Wobble reindeer legs
    santaGroup.children.forEach(c=>{
      if(c.isGroup&&c!==santa){
        c.traverse(n=>{ if(n.name==='leg') n.rotation.x=Math.sin(t*4+n.userData.legIdx*0.8)*0.3; });
      }
    });

    // Christmas tree star twinkle
    [tree1,tree2,tree3].forEach(tr=>{
      const star=tr.children.find(c=>c.material&&c.material.color&&c.material.color.getHex()===0xffee00);
      if(star) star.scale.setScalar(1+Math.sin(t*3)*0.15);
    });

    // Fairy lights pulse
    objects.forEach(o=>{ if(o.isLight&&o.type==='PointLight'){ o.intensity=2+Math.sin(t*2+o.position.x)*1.2; }});

    // Sledders slide down
    sledders.forEach((s)=>{
      s.userData.progress+=s.userData.speed*dt*0.012;
      if(s.userData.progress>1) s.userData.progress=0;
      const p=s.userData.progress;
      const nx=THREE.MathUtils.lerp(s.userData.startX,s.userData.targetX,p);
      const nz=THREE.MathUtils.lerp(s.userData.startZ,s.userData.targetZ,p);
      const ny=getTerrainHeight(nx,nz)+0.25;
      s.position.set(nx,ny,nz);
      s.rotation.y=Math.atan2(s.userData.targetX-s.userData.startX,s.userData.targetZ-s.userData.startZ);
      // Tilt sled forward on slope
      const slope=(ny-(getTerrainHeight(nx-0.5,nz-0.5)+0.25))*0.15;
      s.rotation.x=THREE.MathUtils.clamp(slope,-0.5,0.5);
    });

    // Wolves patrol mountain
    wolves.forEach(w=>{
      w.userData.phase+=dt*w.userData.speed;
      w.userData.patrolAngle+=dt*0.18;
      const nx2=w.userData.centerX+Math.cos(w.userData.patrolAngle)*w.userData.patrolR;
      const nz2=w.userData.centerZ+Math.sin(w.userData.patrolAngle)*w.userData.patrolR;
      w.position.set(nx2,getTerrainHeight(nx2,nz2),nz2);
      w.rotation.y=w.userData.patrolAngle+Math.PI/2;
      // Leg trot
      w.children.forEach(c=>{ if(c.geometry&&c.geometry.type==='BoxGeometry'&&c.position.y<0) c.rotation.x=Math.sin(w.userData.phase*6)*0.35; });
    });

    if(t>DURATION){
      scene.remove(joySnow);
      return true;
    }
    return false;
  };
}

// ─────────────────────────────────────────────────────────────
//  7. BLACK HOLE — massive gravitational horror, persists forever
// ─────────────────────────────────────────────────────────────
function triggerBlackHole(scene, objects, droneState, droneGroup, vegetation) {
  const bx=(rng()-0.5)*60, bz=(rng()-0.5)*60;
  const bh=getTerrainHeight(bx,bz);
  const bhY=bh+14;

  showBanner('🕳️  BLACK HOLE DETECTED — FLEE NOW!','#9900ff',99999);
  audio.speak('Warning! A black hole has torn open above the island! Fly away immediately! Do not get close or your drone will be consumed forever!');
  audio.play('blackhole');

  // Dark singularity disc
  const disc=new THREE.Mesh(new THREE.CircleGeometry(0.1,64),new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide}));
  disc.rotation.x=-Math.PI/2; disc.position.set(bx,bhY,bz);
  scene.add(disc); objects.push(disc);

  // Primary accretion ring
  const ringMat=new THREE.MeshBasicMaterial({color:0x9900ff,side:THREE.DoubleSide,transparent:true,opacity:0.9});
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.1,0.3,64),ringMat);
  ring.rotation.x=-Math.PI/2; ring.position.set(bx,bhY,bz);
  scene.add(ring); objects.push(ring);

  // Outer faint halo
  const haloMat=new THREE.MeshBasicMaterial({color:0x6600cc,side:THREE.DoubleSide,transparent:true,opacity:0.12});
  const halo=new THREE.Mesh(new THREE.RingGeometry(0.1,0.5,48),haloMat);
  halo.rotation.x=-Math.PI/2; halo.position.set(bx,bhY,bz);
  scene.add(halo); objects.push(halo);

  // Gyroscope orbital rings (3 rings at different tilts)
  const orbitRings=[], orbitMats=[];
  for(let ri=0;ri<3;ri++){
    const oMat=new THREE.MeshBasicMaterial({color:[0xff00cc,0x0088ff,0xffaa00][ri],transparent:true,opacity:0.7,side:THREE.DoubleSide});
    const or=new THREE.Mesh(new THREE.RingGeometry(0.1,0.3,40),oMat);
    or.position.set(bx,bhY,bz);
    or.rotation.x=(ri/3)*Math.PI+0.4;
    or.rotation.z=(ri/3)*Math.PI*0.7;
    scene.add(or); objects.push(or); orbitRings.push(or); orbitMats.push(oMat);
  }

  // Gravitational lensing glow light
  const lensGlow=new THREE.PointLight(0x6600cc,0,120);
  lensGlow.position.set(bx,bhY,bz);
  scene.add(lensGlow); objects.push(lensGlow);

  // Second coloured fill light for drama
  const fillLight=new THREE.PointLight(0xff00aa,0,80);
  fillLight.position.set(bx,bhY+5,bz);
  scene.add(fillLight); objects.push(fillLight);

  // Debris — wide sweep: all vegetation within 120 units
  const suckItems=[];
  vegetation.forEach(v=>{
    const d=Math.sqrt((v.position.x-bx)**2+(v.position.z-bz)**2);
    if(d<120){
      suckItems.push({obj:v,delay:Math.max(0,(d-5)/10),active:false,reached:false});
    }
  });

  // Ground-level debris chunks (lots more)
  for(let i=0;i<80;i++){
    const a=rng()*Math.PI*2, r=4+rng()*90;
    const dx2=bx+Math.cos(a)*r, dz2=bz+Math.sin(a)*r;
    const dh=getTerrainHeight(dx2,dz2);
    const shapes=[
      new THREE.BoxGeometry(0.4+rng()*1.2,0.4+rng()*1.2,0.4+rng()*1.2),
      new THREE.OctahedronGeometry(0.5+rng()*1.0,0),
      new THREE.TetrahedronGeometry(0.6+rng()*0.8,0),
    ];
    const chunk=new THREE.Mesh(shapes[Math.floor(rng()*3)],
      new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(0.75+rng()*0.15,0.8,0.4)}));
    chunk.position.set(dx2,dh,dz2);
    chunk.userData={delay:rng()*6};
    scene.add(chunk); objects.push(chunk);
    suckItems.push({obj:chunk,delay:chunk.userData.delay,active:false,reached:false});
  }

  // Sky debris raining toward the hole from above
  for(let i=0;i<40;i++){
    const a=rng()*Math.PI*2, r=2+rng()*25;
    const skyFrag=new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4+rng()*1.5,0),
      new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(0.8+rng()*0.1,1,0.5)})
    );
    skyFrag.position.set(bx+Math.cos(a)*r, 55+rng()*70, bz+Math.sin(a)*r);
    skyFrag.userData={delay:rng()*10};
    scene.add(skyFrag); objects.push(skyFrag);
    suckItems.push({obj:skyFrag,delay:skyFrag.userData.delay,active:false,reached:false});
  }

  let t=0, droneCapturing=false, droneT=0;
  let maxRadius=0, prevShake=0;

  return dt=>{
    t+=dt;
    const growing=t<32;
    if(growing) maxRadius=Math.min(20,t*0.65);

    // Pulsating singularity disc
    const pulse=1+0.1*Math.sin(t*16);
    disc.geometry.dispose();
    disc.geometry=new THREE.CircleGeometry(maxRadius*pulse,64);

    // Primary ring — grows and tilts
    ring.geometry.dispose();
    ring.geometry=new THREE.RingGeometry(maxRadius*(0.88+0.06*Math.sin(t*9)),maxRadius+2.5+Math.sin(t*7)*0.8,64);
    ring.rotation.y+=dt*1.8; ring.rotation.z+=dt*0.9;

    // Outer halo
    halo.geometry.dispose();
    halo.geometry=new THREE.RingGeometry(maxRadius+2,maxRadius+9+Math.sin(t*5)*1.5,48);
    haloMat.opacity=0.08+Math.abs(Math.sin(t*4))*0.07;

    // Orbital gyroscope rings
    orbitRings.forEach((or,ri)=>{
      or.geometry.dispose();
      or.geometry=new THREE.RingGeometry(maxRadius*(0.65+ri*0.12),maxRadius*(0.65+ri*0.12)+2,40);
      or.rotation.y+=dt*(0.9+ri*0.7);
      or.rotation.z+=dt*(0.5+ri*0.4);
      orbitMats[ri].opacity=0.55+Math.sin(t*8+ri*2)*0.3;
    });

    // Pulsating lights
    lensGlow.intensity=6+Math.sin(t*11)*4;
    lensGlow.distance=maxRadius*6+Math.sin(t*7)*10;
    fillLight.intensity=3+Math.sin(t*8+1.5)*2;

    // Ring color cycle
    ringMat.color.setHSL((0.75+t*0.04)%1,1,0.65);

    // Suck in items (during growing phase)
    if(growing){
      suckItems.forEach(item=>{
        if(item.reached||t<item.delay) return;
        item.active=true;
        const obj=item.obj;
        const dx=bx-obj.position.x, dy=bhY-obj.position.y, dz2=bz-obj.position.z;
        const dist=Math.sqrt(dx*dx+dy*dy+dz2*dz2)+0.1;
        if(dist<1.5){ obj.visible=false; item.reached=true; return; }
        const spd=Math.max(8,50/dist);
        obj.position.x+=dx/dist*spd*dt;
        obj.position.y+=dy/dist*spd*dt;
        obj.position.z+=dz2/dist*spd*dt;
        if(obj.rotation){ obj.rotation.x+=dt*7; obj.rotation.y+=dt*5; obj.rotation.z+=dt*3; }
      });
    }

    // ── PERSISTENT KILL ZONE — runs every frame regardless of other events ──
    if(!droneState.gameOver){
      const ddx=bx-droneState.pos.x, ddy=bhY-droneState.pos.y, ddz=bz-droneState.pos.z;
      const droneDist=Math.sqrt(ddx*ddx+ddy*ddy+ddz*ddz);
      const bhR=Math.max(maxRadius,18); // always at least 18 once fully grown

      // Ground shake — felt up to 90 units away
      if(droneDist<90){
        const shakeAmt=(1-droneDist/90)*0.5*Math.abs(Math.sin(t*22));
        droneState.shake=Math.max(prevShake,shakeAmt);
        prevShake=shakeAmt;
      } else {
        prevShake=0;
      }

      // Gravitational pull — felt up to 3× the radius
      if(droneDist<bhR*3.5&&droneDist>0.5){
        const pull=Math.max(0,(bhR*3.5-droneDist)/(bhR*3.5));
        const forceFactor=16+(t>32?12:0); // stronger after fully grown
        droneState.vel.x+=ddx/droneDist*pull*forceFactor*dt;
        droneState.vel.y+=ddy/droneDist*pull*forceFactor*dt;
        droneState.vel.z+=ddz/droneDist*pull*forceFactor*dt;
        droneState.captured=droneDist<bhR;
      }

      // Event horizon breach → game over
      if(droneDist<bhR*0.65&&!droneCapturing){
        droneCapturing=true;
        droneState.captured=true;
        showBanner('💀  YOUR DRONE IS BEING CONSUMED...','#ff00ff',99999);
        audio.speak('No! Your drone is being consumed by the black hole! Nothing can escape the singularity!');
        audio.play('blackhole_capture');
      }
      if(droneCapturing&&droneDist>0.1){
        droneT+=dt;
        droneState.vel.x+=ddx/droneDist*35*dt;
        droneState.vel.y+=ddy/droneDist*35*dt;
        droneState.vel.z+=ddz/droneDist*35*dt;
        droneGroup.rotation.z+=dt*droneT*5;
        droneGroup.rotation.x+=dt*droneT*4;
        droneGroup.scale.setScalar(Math.max(0,1-droneT*0.25));
        if(droneDist<2||droneT>4){
          droneGroup.visible=false;
          droneState.gameOver=true;
          document.getElementById('hud').style.opacity='0';
          setTimeout(()=>showGameOver(),800);
        }
      }
    }

    return false; // BLACK HOLE NEVER ENDS — persists as a hazard through all future events
  };
}

// ─────────────────────────────────────────────────────────────
//  8. ALIENS
// ─────────────────────────────────────────────────────────────
function triggerAliens(scene, objects) {
  showBanner('👽  ALIEN INVASION!','#00ff88');
  audio.speak('Alien invasion! Unidentified flying objects detected over the island!');
  audio.play('aliens');
  const ufoMat=new THREE.MeshPhongMaterial({color:0x88ffcc,emissive:0x00aa55,emissiveIntensity:0.6,specular:0xffffff,shininess:100});
  const ufos=[];
  for(let i=0;i<4;i++){
    const ufo=new THREE.Group();
    const s=new THREE.Mesh(new THREE.SphereGeometry(5,16,8,0,Math.PI*2,0,Math.PI/2),ufoMat);
    s.rotation.x=Math.PI; ufo.add(s);
    ufo.add(new THREE.Mesh(new THREE.SphereGeometry(5,16,8,0,Math.PI*2,0,Math.PI/4),ufoMat));
    const dome=new THREE.Mesh(new THREE.SphereGeometry(2.5,12,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhongMaterial({color:0x44ffcc,transparent:true,opacity:0.7}));
    dome.position.y=1.5; ufo.add(dome);
    for(let j=0;j<8;j++){
      const a=(j/8)*Math.PI*2;
      const l=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,6),new THREE.MeshBasicMaterial({color:j%2===0?0xff0088:0xffff00}));
      l.position.set(Math.cos(a)*4.2,-1,Math.sin(a)*4.2); ufo.add(l);
    }
    const beam=new THREE.Mesh(new THREE.ConeGeometry(4,15,16,1,true),new THREE.MeshBasicMaterial({color:0x00ffaa,transparent:true,opacity:0.35,side:THREE.DoubleSide}));
    beam.rotation.x=Math.PI; beam.position.y=-8; ufo.add(beam);
    ufo.position.set((rng()-0.5)*200,40+rng()*30,(rng()-0.5)*200);
    ufo.userData={angle:rng()*Math.PI*2,radius:20+rng()*30,speed:0.4+rng()*0.4,bob:rng()*Math.PI*2,cx:(rng()-0.5)*80,cz:(rng()-0.5)*80};
    scene.add(ufo); objects.push(ufo); ufos.push(ufo);
  }
  let t=0;
  return dt=>{
    t+=dt;
    ufos.forEach(u=>{
      u.userData.angle+=u.userData.speed*dt; u.userData.bob+=dt*1.2;
      u.position.set(u.userData.cx+Math.cos(u.userData.angle)*u.userData.radius,40+Math.sin(u.userData.bob)*5,u.userData.cz+Math.sin(u.userData.angle)*u.userData.radius);
      u.rotation.y+=dt*2;
    });
    return t>12;
  };
}

// ─────────────────────────────────────────────────────────────
//  9. MONSTERS
// ─────────────────────────────────────────────────────────────
function makeZombie(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.65,0.3),new THREE.MeshLambertMaterial({color:0x446622}));
  body.position.y=1.15; g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.42,0.4),new THREE.MeshLambertMaterial({color:0x446622}));
  head.position.y=1.63; g.add(head);
  [[-0.1,1.68,0.21],[0.1,1.68,0.21]].forEach(([x,y,z])=>{
    const e=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshBasicMaterial({color:0xff0000}));
    e.position.set(x,y,z); g.add(e);
    const gl=new THREE.PointLight(0xff0000,0.4,2.5); gl.position.set(x,y,z); g.add(gl);
  });
  const aL=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.52,0.14),new THREE.MeshLambertMaterial({color:0x446622}));
  aL.position.set(-0.38,1.2,0.25); aL.rotation.z=0.3; aL.rotation.x=-1.0; aL.name='armL'; g.add(aL);
  const aR=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.52,0.14),new THREE.MeshLambertMaterial({color:0x446622}));
  aR.position.set(0.38,1.2,0.25); aR.rotation.z=-0.3; aR.rotation.x=-1.0; aR.name='armR'; g.add(aR);
  [-0.13,0.13].forEach((x,i)=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.56,0.16),new THREE.MeshLambertMaterial({color:0x332211}));
    leg.position.set(x,0.62,0); leg.rotation.x=i===0?-0.2:0.2; g.add(leg);
  });
  return g;
}
function triggerMonsters(scene,objects){
  showBanner('🧟  ZOMBIE MONSTERS!','#44ff00');
  audio.speak('Zombie monsters are rising from the ground! They are heading your way!');
  audio.play('monsters');
  const monsters=[];
  for(let i=0;i<8;i++){
    const m=makeZombie();
    const a=rng()*Math.PI*2, r=30+rng()*80;
    const mx=Math.cos(a)*r, mz=Math.sin(a)*r;
    m.position.set(mx,getTerrainHeight(mx,mz),mz);
    m.userData={angle:rng()*Math.PI*2,speed:1.5+rng()*2,phase:rng()*Math.PI*2};
    scene.add(m); objects.push(m); monsters.push(m);
  }
  let t=0;
  return dt=>{
    t+=dt;
    monsters.forEach(m=>{
      m.userData.phase+=dt*m.userData.speed*3;
      m.position.x+=Math.sin(m.userData.angle)*m.userData.speed*dt;
      m.position.z+=Math.cos(m.userData.angle)*m.userData.speed*dt;
      if(Math.sqrt(m.position.x**2+m.position.z**2)>130) m.userData.angle+=Math.PI;
      m.position.y=getTerrainHeight(m.position.x,m.position.z);
      m.rotation.y=m.userData.angle+Math.PI;
      const aL=m.getObjectByName('armL'),aR=m.getObjectByName('armR');
      if(aL) aL.rotation.x=-1.0+Math.sin(m.userData.phase)*0.3;
      if(aR) aR.rotation.x=-1.0+Math.sin(m.userData.phase+Math.PI)*0.3;
      m.children[0].position.y=1.15+Math.abs(Math.sin(m.userData.phase*2))*0.12;
    });
    return t>15;
  };
}

// ─────────────────────────────────────────────────────────────
//  End-of-cycle overlay
// ─────────────────────────────────────────────────────────────
function showEndCycle(onContinue, onEnd) {
  if(document.getElementById('end-cycle')) return;
  const el=document.createElement('div');
  el.id='end-cycle';
  Object.assign(el.style,{
    position:'fixed',inset:'0',display:'flex',flexDirection:'column',
    alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.90)',
    zIndex:'9999',fontFamily:"'Courier New',monospace",color:'#fff',
  });
  el.innerHTML=`
    <style>
      @keyframes fadeEC{from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}
      @keyframes pulseEC{0%,100%{text-shadow:0 0 30px #00ffaa,0 0 60px #00ffaa}50%{text-shadow:0 0 10px #00ffaa}}
      #end-cycle{animation:fadeEC 1s ease forwards}
      #end-cycle h1{font-size:clamp(22px,4.5vw,54px);letter-spacing:5px;color:#00ffaa;animation:pulseEC 2.2s infinite;margin:0 0 16px}
      #end-cycle p{color:#88ccaa;letter-spacing:2px;font-size:clamp(11px,1.8vw,17px);margin:6px}
      .ec-btn{margin:10px;padding:13px 34px;border:2px solid;border-radius:30px;background:transparent;font-family:inherit;font-size:15px;letter-spacing:3px;cursor:pointer;transition:all .25s}
      #ec-continue{border-color:#00ffaa;color:#00ffaa}#ec-continue:hover{background:rgba(0,255,170,.15)}
      #ec-end{border-color:#ff4455;color:#ff4455}#ec-end:hover{background:rgba(255,68,85,.15)}
    </style>
    <div style="font-size:90px">🏆</div>
    <h1>MISSION CYCLE COMPLETE</h1>
    <p>YOU SURVIVED ALL EVENTS ON ZAYN'S ISLAND</p>
    <p style="color:#446655;font-size:12px;letter-spacing:2px;margin-top:10px">WHAT WOULD YOU LIKE TO DO?</p>
    <div style="margin-top:28px;display:flex;gap:16px;flex-wrap:wrap;justify-content:center">
      <button class="ec-btn" id="ec-continue">⟳ PLAY AGAIN FROM START</button>
      <button class="ec-btn" id="ec-end">✕ END MISSION</button>
    </div>`;
  document.body.appendChild(el);
  document.getElementById('ec-continue').onclick=()=>{ el.remove(); onContinue(); };
  document.getElementById('ec-end').onclick=()=>{ el.remove(); onEnd(); };
}

function showFinalScreen() {
  const el=document.createElement('div');
  el.id='final-screen';
  Object.assign(el.style,{
    position:'fixed',inset:'0',display:'flex',flexDirection:'column',
    alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.97)',
    zIndex:'9999',fontFamily:"'Courier New',monospace",color:'#fff',
  });
  el.innerHTML=`
    <style>
      @keyframes glow{0%,100%{text-shadow:0 0 30px #00ffaa,0 0 60px #00ffaa}50%{text-shadow:0 0 10px #00ffaa}}
      #final-screen h1{font-size:clamp(22px,5vw,58px);letter-spacing:6px;color:#00ffaa;animation:glow 2s infinite;margin:0 0 18px}
      #final-screen p{color:#88ccaa;letter-spacing:3px;font-size:clamp(11px,1.8vw,17px);margin:7px}
      #fs-replay{margin-top:40px;padding:14px 40px;border:2px solid #00ffaa;border-radius:30px;background:transparent;color:#00ffaa;font-family:inherit;font-size:17px;letter-spacing:3px;cursor:pointer;transition:all .25s}
      #fs-replay:hover{background:rgba(0,255,170,.15);box-shadow:0 0 20px rgba(0,255,170,.4)}
    </style>
    <div style="font-size:100px">🌍</div>
    <h1>MISSION COMPLETE</h1>
    <p>ZAYN'S WORLD HAS BEEN FULLY EXPLORED</p>
    <p style="color:#446644;font-size:13px;margin-top:16px;letter-spacing:2px">THANK YOU FOR FLYING WITH DRONE PRO</p>
    <button id="fs-replay">⟳ PLAY AGAIN</button>`;
  document.body.appendChild(el);
  document.getElementById('fs-replay').onclick=()=>location.reload();
}

// ─────────────────────────────────────────────────────────────
//  Event Manager
// ─────────────────────────────────────────────────────────────
export function createEventManager(scene, droneState, terrain, ocean, oceanMat, vegetation, droneGroup) {
  const objects=[], updaters=[];
  let elapsed=0, nextEvent=30, idx=0, cycleComplete=false;

  const eventFns=[
    ()=>triggerMeteor(scene,objects),
    ()=>triggerRiver(scene,objects,terrain,ocean,oceanMat),
    ()=>triggerVolcano(scene,objects,terrain,ocean,vegetation),
    ()=>triggerEarthquake(scene,objects,droneState),
    ()=>triggerIceFall(scene,objects,terrain,ocean,vegetation),
    ()=>triggerSnow(scene,objects,terrain),
    ()=>triggerChristmas(scene,objects,terrain,vegetation),
    ()=>triggerBlackHole(scene,objects,droneState,droneGroup,vegetation),
    ()=>triggerAliens(scene,objects),
    ()=>triggerMonsters(scene,objects),
  ];

  return {
    update(dt){
      if(droneState.gameOver) return;
      elapsed+=dt;

      if(!cycleComplete && elapsed>=nextEvent){
        if(idx>=eventFns.length){
          // All 10 events completed — pause and ask player
          cycleComplete=true;
          showEndCycle(
            ()=>{
              // Clear all spawned objects from scene and reset
              objects.forEach(o=>scene.remove(o));
              objects.length=0;
              updaters.length=0;
              idx=0;
              nextEvent=elapsed+30;
              cycleComplete=false;
            },
            ()=>showFinalScreen()
          );
        } else {
          nextEvent+=30;
          const u=eventFns[idx]();
          idx++;
          updaters.push({fn:u,done:false});
        }
      }

      for(let i=updaters.length-1;i>=0;i--){
        if(!updaters[i].done&&updaters[i].fn(dt)) updaters[i].done=true;
      }
    },
  };
}
