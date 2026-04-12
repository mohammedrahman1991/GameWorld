// ─────────────────────────────────────────────────────────────
//  Drone Selection Lobby
// ─────────────────────────────────────────────────────────────

export const DRONE_TYPES = {
  mavic: {
    id:    'mavic',
    name:  'MAVIC PRO',
    emoji: '🚁',
    desc:  'All-purpose folding drone. Smooth, reliable, great for beginners.',
    color: '#222222',
    accent:'#00ffaa',
    stats: { speed: 3, control: 3, stability: 3, range: 3 },
    physics: { hz: 9, vz: 5.5, yaw: 1.5, drag: 0.88 },
  },
  racer: {
    id:    'racer',
    name:  'STORM RACER',
    emoji: '⚡',
    desc:  'Ultra-fast FPV racer. Blazing speed, high skill required.',
    color: '#ff4400',
    accent:'#ffcc00',
    stats: { speed: 5, control: 2, stability: 1, range: 2 },
    physics: { hz: 20, vz: 10, yaw: 2.8, drag: 0.84 },
  },
  mini: {
    id:    'mini',
    name:  'MINI FLYER',
    emoji: '🌸',
    desc:  'Tiny & nimble. Perfect control, floats like a feather.',
    color: '#ff88cc',
    accent:'#ffffff',
    stats: { speed: 2, control: 5, stability: 5, range: 1 },
    physics: { hz: 6, vz: 5, yaw: 1.2, drag: 0.93 },
  },
  cargo: {
    id:    'cargo',
    name:  'CARGO MAX',
    emoji: '📦',
    desc:  'Heavy-lift delivery drone. Slow & steady, very stable.',
    color: '#f5a623',
    accent:'#333333',
    stats: { speed: 1, control: 4, stability: 5, range: 4 },
    physics: { hz: 5, vz: 3.5, yaw: 1.0, drag: 0.95 },
  },
  stealth: {
    id:    'stealth',
    name:  'SHADOW X',
    emoji: '🦅',
    desc:  'Military stealth. Fast, silent, cuts through the air.',
    color: '#1a2a1a',
    accent:'#44ff44',
    stats: { speed: 4, control: 3, stability: 3, range: 5 },
    physics: { hz: 15, vz: 8, yaw: 2.2, drag: 0.86 },
  },
};

function statBar(n, max = 5, color = '#00ffaa') {
  let html = '<div class="stat-bar">';
  for (let i = 0; i < max; i++) {
    html += `<div class="stat-pip ${i < n ? 'filled' : ''}" style="${i < n ? `background:${color}` : ''}"></div>`;
  }
  html += '</div>';
  return html;
}

export function showLobby() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.id = 'lobby';
    document.body.appendChild(overlay);

    overlay.innerHTML = `
      <style>
        #lobby {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.93);
          backdrop-filter: blur(8px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          font-family: 'Courier New', monospace; color: #fff;
          overflow-y: auto; padding: 20px 10px;
        }
        @keyframes lobbyFadeIn { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lobbyGlow   { 0%,100%{text-shadow:0 0 24px #00ffaa,0 0 50px #00ffaa} 50%{text-shadow:0 0 8px #00ffaa} }
        @keyframes spinSlow    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        #lobby-inner { animation: lobbyFadeIn 0.7s ease; width: 100%; max-width: 1060px; }
        #lobby-title { text-align: center; margin-bottom: 6px; }
        #lobby-title h1 {
          font-size: clamp(22px,5vw,52px); letter-spacing: 8px;
          color: #00ffaa; animation: lobbyGlow 2.5s infinite; margin: 0;
        }
        #lobby-title p { color: #669988; font-size: 13px; letter-spacing: 3px; margin: 6px 0 28px; }
        #drone-cards {
          display: flex; gap: 14px; justify-content: center;
          flex-wrap: wrap; margin-bottom: 30px;
        }
        .drone-card {
          width: 175px; background: rgba(255,255,255,0.04);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 18px 14px;
          cursor: pointer; transition: all 0.22s;
          display: flex; flex-direction: column; align-items: center;
          user-select: none;
        }
        .drone-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.35);
          transform: translateY(-4px);
        }
        .drone-card.selected {
          border-color: var(--accent);
          background: rgba(255,255,255,0.09);
          box-shadow: 0 0 22px var(--accent-glow);
          transform: translateY(-6px);
        }
        .drone-emoji { font-size: 46px; margin-bottom: 10px; line-height:1; }
        .drone-name  { font-size: 13px; font-weight: bold; letter-spacing: 2px; margin-bottom: 6px; color: #fff; }
        .drone-desc  { font-size: 10px; color: rgba(255,255,255,0.5); text-align:center; line-height:1.5; margin-bottom: 12px; min-height:44px; }
        .stat-row    { width: 100%; margin-bottom: 5px; }
        .stat-label  { font-size: 9px; letter-spacing: 1px; color: rgba(255,255,255,0.4); margin-bottom: 3px; }
        .stat-bar    { display: flex; gap: 3px; }
        .stat-pip    { width: 18px; height: 7px; border-radius: 2px; background: rgba(255,255,255,0.12); }
        .stat-pip.filled { background: #00ffaa; }
        #lobby-launch {
          display: block; margin: 0 auto;
          padding: 15px 56px; font-size: 18px; letter-spacing: 4px;
          font-family: 'Courier New', monospace; font-weight: bold;
          background: transparent; color: #00ffaa;
          border: 2px solid #00ffaa; border-radius: 32px;
          cursor: pointer; transition: all 0.25s;
          text-shadow: 0 0 12px rgba(0,255,170,0.6);
          box-shadow: 0 0 16px rgba(0,255,170,0.15);
        }
        #lobby-launch:hover {
          background: rgba(0,255,170,0.14);
          box-shadow: 0 0 32px rgba(0,255,170,0.45);
          transform: scale(1.03);
        }
        #lobby-selected-info {
          text-align: center; margin-bottom: 22px; min-height: 28px;
          font-size: 13px; letter-spacing: 2px; color: #88ccaa;
        }
        #lobby-selected-info span { color: #00ffaa; font-weight: bold; }
        #lobby-hint {
          text-align: center; margin-top: 16px; color: rgba(255,255,255,0.22);
          font-size: 10px; letter-spacing: 2px;
        }
      </style>

      <div id="lobby-inner">
        <div id="lobby-title">
          <h1>✈ DRONE PRO</h1>
          <p>CHOOSE YOUR DRONE — THEN LAUNCH</p>
        </div>

        <div id="drone-cards"></div>

        <div id="lobby-selected-info">Select a drone above</div>

        <button id="lobby-launch" disabled style="opacity:0.45;cursor:not-allowed">
          ▶ LAUNCH MISSION
        </button>

        <div id="lobby-hint">PRESS ANY DRONE CARD TO SELECT · THEN CLICK LAUNCH</div>
      </div>
    `;

    // Build cards
    const container = overlay.querySelector('#drone-cards');
    let selected = null;

    Object.values(DRONE_TYPES).forEach(drone => {
      const card = document.createElement('div');
      card.className = 'drone-card';
      card.style.setProperty('--accent', drone.accent);
      card.style.setProperty('--accent-glow', drone.accent + '55');
      card.innerHTML = `
        <div class="drone-emoji">${drone.emoji}</div>
        <div class="drone-name" style="color:${drone.accent}">${drone.name}</div>
        <div class="drone-desc">${drone.desc}</div>
        <div class="stat-row"><div class="stat-label">SPEED</div>${statBar(drone.stats.speed, 5, drone.accent)}</div>
        <div class="stat-row"><div class="stat-label">CONTROL</div>${statBar(drone.stats.control, 5, drone.accent)}</div>
        <div class="stat-row"><div class="stat-label">STABILITY</div>${statBar(drone.stats.stability, 5, drone.accent)}</div>
        <div class="stat-row"><div class="stat-label">RANGE</div>${statBar(drone.stats.range, 5, drone.accent)}</div>
      `;
      card.addEventListener('click', () => {
        container.querySelectorAll('.drone-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selected = drone;
        overlay.querySelector('#lobby-selected-info').innerHTML =
          `Selected: <span>${drone.emoji} ${drone.name}</span> — ${drone.desc}`;
        const btn = overlay.querySelector('#lobby-launch');
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
      });
      container.appendChild(card);
    });

    // Auto-select Mavic
    container.querySelector('.drone-card').click();

    overlay.querySelector('#lobby-launch').addEventListener('click', () => {
      overlay.style.transition = 'opacity 0.5s';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        resolve(selected);
      }, 500);
    });
  });
}
