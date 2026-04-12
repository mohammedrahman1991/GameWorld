// All weapon definitions (normal + mythic variants)
const WEAPONS = {
  assault: {
    id: 'assault', name: 'Assault Rifle', type: 'assault',
    damage: 25, fireRate: 180, bulletSpeed: 600, range: 700,
    magSize: 30, reloadTime: 2000, spread: 0.05,
    color: 0x44ff88, bulletColor: 0xffff44,
    description: 'Versatile, reliable firepower'
  },
  smg: {
    id: 'smg', name: 'SMG', type: 'smg',
    damage: 15, fireRate: 80, bulletSpeed: 550, range: 400,
    magSize: 45, reloadTime: 1500, spread: 0.12,
    color: 0x44aaff, bulletColor: 0x88ffff,
    description: 'Shred at close range'
  },
  sniper: {
    id: 'sniper', name: 'Sniper Rifle', type: 'sniper',
    damage: 95, fireRate: 1800, bulletSpeed: 1200, range: 2000,
    magSize: 5, reloadTime: 3000, spread: 0.0,
    color: 0xff8844, bulletColor: 0xff4400,
    description: 'One shot, one kill'
  },
  shotgun: {
    id: 'shotgun', name: 'Shotgun', type: 'shotgun',
    damage: 18, fireRate: 900, bulletSpeed: 450, range: 280,
    magSize: 8, reloadTime: 2500, spread: 0.3, pellets: 8,
    color: 0xff4488, bulletColor: 0xff88cc,
    description: 'Devastating up close'
  },
  marksman: {
    id: 'marksman', name: 'Marksman Pistol', type: 'marksman',
    damage: 40, fireRate: 400, bulletSpeed: 700, range: 600,
    magSize: 12, reloadTime: 1800, spread: 0.02,
    color: 0xffee44, bulletColor: 0xffaa00,
    description: 'Precision semi-auto'
  },
  flamethrower: {
    id: 'flamethrower', name: 'Flamethrower', type: 'flamethrower',
    damage: 8, fireRate: 60, bulletSpeed: 220, range: 200,
    magSize: 100, reloadTime: 3500, spread: 0.4, isFlame: true,
    color: 0xff6600, bulletColor: 0xff2200,
    description: 'Burn everything'
  }
};

// Mythic versions (enhanced stats, golden glow)
const MYTHIC_WEAPONS = {};
Object.keys(WEAPONS).forEach(key => {
  MYTHIC_WEAPONS[key + '_mythic'] = {
    ...WEAPONS[key],
    id: key + '_mythic',
    name: '\u2726 MYTHIC ' + WEAPONS[key].name,
    isMythic: true,
    damage: Math.floor(WEAPONS[key].damage * 1.5),
    fireRate: Math.floor(WEAPONS[key].fireRate * 0.75),
    magSize: Math.floor(WEAPONS[key].magSize * 1.5),
    color: 0xffd700,
    bulletColor: 0xffd700,
    glowColor: 0xffd700
  };
});

// Legendary versions (★ — 1.25× stats, orange glow, 500 coins)
const LEGENDARY_WEAPONS = {};
Object.keys(WEAPONS).forEach(key => {
  LEGENDARY_WEAPONS[key + '_legendary'] = {
    ...WEAPONS[key],
    id: key + '_legendary',
    name: '\u2605 LEGENDARY ' + WEAPONS[key].name,
    isLegendary: true,
    damage:    Math.floor(WEAPONS[key].damage   * 1.25),
    fireRate:  Math.floor(WEAPONS[key].fireRate  * 0.87),
    magSize:   Math.floor(WEAPONS[key].magSize   * 1.25),
    color:      0xff8800,
    bulletColor:0xff6600,
    glowColor:  0xff8800
  };
});

const ALL_WEAPONS = { ...WEAPONS, ...LEGENDARY_WEAPONS, ...MYTHIC_WEAPONS };
