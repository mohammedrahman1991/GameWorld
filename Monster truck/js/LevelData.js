// ============================================================
//  MONSTER TRUCK MAYHEM - Level Data
//  10 levels, boss every 2 levels, unique worlds
// ============================================================

const LEVEL_DATA = [

    // ── LEVEL 1 ─────────────────────────────────────────────
    {
        level: 1,
        name: 'Enchanted Forest',
        world: 'forest',
        isBossLevel: false,
        worldLength: 3400,
        sky: { top: 0x87CEEB, bottom: 0xB0E0E6 },
        ground: { color: 0x558B2F, dirt: 0x5D4037 },
        decorColors: [0x2E7D32, 0x1B5E20, 0x388E3C],
        enemyGroups: [
            { type: 'slime',    count: 4, startX: 480,  spacing: 160 },
            { type: 'slime',    count: 3, startX: 1050, spacing: 170 },
            { type: 'treeling', count: 3, startX: 1650, spacing: 200 },
            { type: 'slime',    count: 4, startX: 2300, spacing: 155 },
        ],
        enemyStats: {
            slime:    { hp: 28,  speed: 72,  damage: 12, score: 10 },
            treeling: { hp: 45,  speed: 55,  damage: 15, score: 18, shooter: false },
        },
        platforms: [
            { x: 780,  y: 510, width: 200, color: 0x4CAF50 },
            { x: 1480, y: 470, width: 180, color: 0x388E3C },
            { x: 2150, y: 500, width: 160, color: 0x4CAF50 },
        ],
        hpBoxes: [{ x: 1200 }, { x: 2600 }],
    },

    // ── LEVEL 2 ─── JUNGLE (BOSS) ───────────────────────────
    {
        level: 2,
        name: 'Jungle Ruins',
        world: 'jungle',
        isBossLevel: true,
        worldLength: 3700,
        sky: { top: 0x006064, bottom: 0x2E7D32 },
        ground: { color: 0x33691E, dirt: 0x4E342E },
        decorColors: [0x004D40, 0x00695C, 0x37474F],
        enemyGroups: [
            { type: 'vineCreeper', count: 4, startX: 480,  spacing: 165 },
            { type: 'vineCreeper', count: 4, startX: 1100, spacing: 155 },
            { type: 'jungleSkull', count: 3, startX: 1800, spacing: 190 },
            { type: 'vineCreeper', count: 3, startX: 2450, spacing: 165 },
        ],
        enemyStats: {
            vineCreeper: { hp: 38, speed: 92,  damage: 15, score: 18 },
            jungleSkull: { hp: 55, speed: 65,  damage: 22, score: 28, shooter: true },
        },
        platforms: [
            { x: 700,  y: 490, width: 200, color: 0x33691E },
            { x: 1350, y: 455, width: 180, color: 0x2E7D32 },
            { x: 2050, y: 480, width: 200, color: 0x33691E },
        ],
        hpBoxes: [{ x: 1050 }, { x: 2300 }],
        boss: {
            type: 'jungleKing',
            name: 'JUNGLE KING',
            subName: 'King of the Vines',
            hp: 360,
            color: 0x4E342E,
            accentColor: 0x76FF03,
            size: 130,
            attacks: ['slam', 'charge', 'vine_toss'],
            damage: 22,
            speed: 105,
        },
    },

    // ── LEVEL 3 ─────────────────────────────────────────────
    {
        level: 3,
        name: 'Desert Sands',
        world: 'desert',
        isBossLevel: false,
        worldLength: 3500,
        sky: { top: 0xFFF9C4, bottom: 0xFFEE58 },
        ground: { color: 0xF9A825, dirt: 0xE65100 },
        decorColors: [0xF57F17, 0xEF6C00, 0xBF360C],
        enemyGroups: [
            { type: 'sandScorpion', count: 5, startX: 480,  spacing: 145 },
            { type: 'sandScorpion', count: 4, startX: 1100, spacing: 155 },
            { type: 'cactusFiend',  count: 2, startX: 1720, spacing: 260 },
            { type: 'sandScorpion', count: 4, startX: 2350, spacing: 145 },
        ],
        enemyStats: {
            sandScorpion: { hp: 48,  speed: 98,  damage: 18, score: 22 },
            cactusFiend:  { hp: 75,  speed: 42,  damage: 26, score: 38, shooter: true },
        },
        platforms: [
            { x: 900,  y: 505, width: 150, color: 0xF9A825 },
            { x: 1700, y: 465, width: 150, color: 0xF9A825 },
        ],
        hpBoxes: [{ x: 1300 }, { x: 2700 }],
    },

    // ── LEVEL 4 ─── CAKE WORLD (BOSS) ───────────────────────
    {
        level: 4,
        name: 'Cake World',
        world: 'cake',
        isBossLevel: true,
        worldLength: 3700,
        sky: { top: 0xFF80AB, bottom: 0xFF4081 },
        ground: { color: 0xF8BBD0, dirt: 0xF48FB1 },
        decorColors: [0xE91E63, 0xAD1457, 0x880E4F],
        enemyGroups: [
            { type: 'candyChomper',  count: 5, startX: 480,  spacing: 155 },
            { type: 'candyChomper',  count: 4, startX: 1100, spacing: 155 },
            { type: 'frostingGhost', count: 3, startX: 1720, spacing: 205 },
            { type: 'candyChomper',  count: 4, startX: 2400, spacing: 155 },
        ],
        enemyStats: {
            candyChomper:  { hp: 58, speed: 102, damage: 21, score: 28 },
            frostingGhost: { hp: 72, speed: 72,  damage: 27, score: 38, floats: true },
        },
        platforms: [
            { x: 750,  y: 490, width: 200, color: 0xF48FB1 },
            { x: 1440, y: 455, width: 180, color: 0xF06292 },
            { x: 2120, y: 490, width: 200, color: 0xF48FB1 },
        ],
        hpBoxes: [{ x: 980 }, { x: 2250 }],
        boss: {
            type: 'cakeGolem',
            name: 'CAKE GOLEM',
            subName: 'The Frosting Monster',
            hp: 460,
            color: 0xF06292,
            accentColor: 0xFFFFFF,
            size: 155,
            attacks: ['frosting_spray', 'stomp', 'candy_rain'],
            damage: 24,
            speed: 82,
        },
    },

    // ── LEVEL 5 ─────────────────────────────────────────────
    {
        level: 5,
        name: 'Pizza World',
        world: 'pizza',
        isBossLevel: false,
        worldLength: 3500,
        sky: { top: 0xFF5722, bottom: 0xBF360C },
        ground: { color: 0xFFCC02, dirt: 0xF57F17 },
        decorColors: [0xE64A19, 0xD84315, 0xBF360C],
        enemyGroups: [
            { type: 'pizzaGobbler', count: 5, startX: 480,  spacing: 155 },
            { type: 'pizzaGobbler', count: 5, startX: 1100, spacing: 145 },
            { type: 'cheeseBlob',   count: 3, startX: 1720, spacing: 210 },
            { type: 'pizzaGobbler', count: 4, startX: 2350, spacing: 155 },
        ],
        enemyStats: {
            pizzaGobbler: { hp: 62, speed: 112, damage: 24, score: 32, spinner: true },
            cheeseBlob:   { hp: 95, speed: 62,  damage: 32, score: 48 },
        },
        platforms: [
            { x: 820,  y: 480, width: 200, color: 0xFFCC02 },
            { x: 1620, y: 450, width: 180, color: 0xFFB300 },
            { x: 2320, y: 478, width: 170, color: 0xFFCC02 },
        ],
        hpBoxes: [{ x: 1220 }, { x: 2650 }],
    },

    // ── LEVEL 6 ─── ZOMBIE WORLD (BOSS) ─────────────────────
    {
        level: 6,
        name: 'Zombie World',
        world: 'zombie',
        isBossLevel: true,
        worldLength: 3900,
        sky: { top: 0x1A237E, bottom: 0x311B92 },
        ground: { color: 0x424242, dirt: 0x212121 },
        decorColors: [0x4A148C, 0x38006B, 0x1A0033],
        enemyGroups: [
            { type: 'kidZombie', count: 6, startX: 480,  spacing: 150 },
            { type: 'kidZombie', count: 5, startX: 1100, spacing: 150 },
            { type: 'ghost',     count: 3, startX: 1830, spacing: 210 },
            { type: 'kidZombie', count: 5, startX: 2520, spacing: 150 },
            { type: 'ghost',     count: 2, startX: 3050, spacing: 260 },
        ],
        enemyStats: {
            kidZombie: { hp: 72, speed: 82,  damage: 26, score: 38 },
            ghost:     { hp: 52, speed: 62,  damage: 22, score: 32, floats: true, phase: true },
        },
        platforms: [
            { x: 920,  y: 480, width: 200, color: 0x424242 },
            { x: 1730, y: 445, width: 180, color: 0x616161 },
            { x: 2530, y: 475, width: 200, color: 0x424242 },
        ],
        hpBoxes: [{ x: 1030 }, { x: 2350 }, { x: 3300 }],
        boss: {
            type: 'zombieLord',
            name: 'ZOMBIE LORD',
            subName: 'King of the Undead',
            hp: 560,
            color: 0x558B2F,
            accentColor: 0x76FF03,
            size: 175,
            attacks: ['zombie_summon', 'toxic_slam', 'poison_cloud'],
            damage: 30,
            speed: 72,
        },
    },

    // ── LEVEL 7 ─────────────────────────────────────────────
    {
        level: 7,
        name: 'Cubic Block World',
        world: 'blockworld',
        isBossLevel: false,
        worldLength: 3700,
        sky: { top: 0x4FC3F7, bottom: 0x81D4FA },
        ground: { color: 0x8BC34A, dirt: 0x6D4C41 },
        decorColors: [0x558B2F, 0x33691E, 0x8D6E63],
        enemyGroups: [
            { type: 'cubeCreep',   count: 5, startX: 480,  spacing: 165 },
            { type: 'cubeCreep',   count: 5, startX: 1100, spacing: 155 },
            { type: 'pixelSpider', count: 3, startX: 1830, spacing: 210 },
            { type: 'cubeCreep',   count: 4, startX: 2530, spacing: 165 },
            { type: 'pixelSpider', count: 3, startX: 3060, spacing: 210 },
        ],
        enemyStats: {
            cubeCreep:   { hp: 82, speed: 88,  damage: 29, score: 42, pixelated: true },
            pixelSpider: { hp: 62, speed: 104, damage: 26, score: 36, jumper: true },
        },
        platforms: [
            { x: 810,  y: 480, width: 200, color: 0x8D6E63 },
            { x: 1520, y: 445, width: 200, color: 0x795548 },
            { x: 2330, y: 472, width: 200, color: 0x8D6E63 },
        ],
        hpBoxes: [{ x: 1320 }, { x: 2750 }],
    },

    // ── LEVEL 8 ─── BRICK LAND (BOSS) ───────────────────────
    {
        level: 8,
        name: 'Brick Land',
        world: 'brickland',
        isBossLevel: true,
        worldLength: 3900,
        sky: { top: 0x00BCD4, bottom: 0x0097A7 },
        ground: { color: 0xCE93D8, dirt: 0xAB47BC },
        decorColors: [0x7B1FA2, 0x6A1B9A, 0x4A148C],
        enemyGroups: [
            { type: 'brickling', count: 5, startX: 480,  spacing: 165 },
            { type: 'brickling', count: 5, startX: 1100, spacing: 155 },
            { type: 'neonBot',   count: 3, startX: 1830, spacing: 230 },
            { type: 'brickling', count: 5, startX: 2530, spacing: 155 },
            { type: 'neonBot',   count: 3, startX: 3130, spacing: 230 },
        ],
        enemyStats: {
            brickling: { hp: 92,  speed: 92,  damage: 32, score: 48 },
            neonBot:   { hp: 82,  speed: 72,  damage: 37, score: 55, shooter: true },
        },
        platforms: [
            { x: 860,  y: 472, width: 200, color: 0xCE93D8 },
            { x: 1620, y: 432, width: 200, color: 0xBA68C8 },
            { x: 2430, y: 462, width: 200, color: 0xCE93D8 },
        ],
        hpBoxes: [{ x: 1120 }, { x: 2450 }, { x: 3380 }],
        boss: {
            type: 'brickTitan',
            name: 'BRICK TITAN',
            subName: 'The Neon Destroyer',
            hp: 660,
            color: 0x7C4DFF,
            accentColor: 0x00E5FF,
            size: 195,
            attacks: ['laser_beam', 'ground_stomp', 'wall_smash', 'neon_pulse'],
            damage: 34,
            speed: 62,
        },
    },

    // ── LEVEL 9 ─────────────────────────────────────────────
    {
        level: 9,
        name: 'Tropical Beach',
        world: 'beach',
        isBossLevel: false,
        worldLength: 3700,
        sky: { top: 0x29B6F6, bottom: 0x03A9F4 },
        ground: { color: 0xFFD54F, dirt: 0xFFB300 },
        decorColors: [0x0288D1, 0x0277BD, 0x01579B],
        enemyGroups: [
            { type: 'waveRider', count: 5, startX: 480,  spacing: 165 },
            { type: 'waveRider', count: 5, startX: 1100, spacing: 155 },
            { type: 'sandCrab',  count: 4, startX: 1830, spacing: 210 },
            { type: 'waveRider', count: 5, startX: 2530, spacing: 165 },
            { type: 'sandCrab',  count: 3, startX: 3130, spacing: 210 },
        ],
        enemyStats: {
            waveRider: { hp: 98,  speed: 98,  damage: 34, score: 52 },
            sandCrab:  { hp: 115, speed: 68,  damage: 40, score: 63, sideways: true },
        },
        platforms: [
            { x: 910,  y: 478, width: 200, color: 0xFFD54F },
            { x: 1720, y: 442, width: 200, color: 0xFFCA28 },
            { x: 2530, y: 468, width: 200, color: 0xFFD54F },
        ],
        hpBoxes: [{ x: 1320 }, { x: 2850 }],
    },

    // ── LEVEL 10 ─── NYC SHOWDOWN (FINAL BOSS) ──────────────
    {
        level: 10,
        name: 'NYC Showdown',
        world: 'nyc',
        isBossLevel: true,
        worldLength: 4100,
        sky: { top: 0xB0BEC5, bottom: 0x90A4AE },
        ground: { color: 0x607D8B, dirt: 0x455A64 },
        decorColors: [0xF57F17, 0xF9A825, 0xFFD600],
        enemyGroups: [
            { type: 'cityGremlin', count: 6, startX: 480,  spacing: 155 },
            { type: 'cityGremlin', count: 6, startX: 1100, spacing: 150 },
            { type: 'rooftopBat',  count: 4, startX: 1830, spacing: 205 },
            { type: 'cityGremlin', count: 5, startX: 2530, spacing: 160 },
            { type: 'rooftopBat',  count: 4, startX: 3130, spacing: 205 },
            { type: 'cityGremlin', count: 4, startX: 3550, spacing: 155 },
        ],
        enemyStats: {
            cityGremlin: { hp: 115, speed: 102, damage: 37, score: 58 },
            rooftopBat:  { hp: 82,  speed: 125, damage: 32, score: 52, floats: true },
        },
        platforms: [
            { x: 910,  y: 472, width: 200, color: 0x546E7A },
            { x: 1720, y: 435, width: 200, color: 0x607D8B },
            { x: 2530, y: 462, width: 200, color: 0x546E7A },
            { x: 3350, y: 452, width: 200, color: 0x607D8B },
        ],
        hpBoxes: [{ x: 1020 }, { x: 2250 }, { x: 3500 }],
        boss: {
            type: 'megaMech',
            name: 'MEGA MECH',
            subName: 'Destroyer of Cities',
            hp: 820,
            color: 0x212121,
            accentColor: 0xFF1744,
            size: 215,
            attacks: ['rocket_volley', 'ground_stomp', 'laser_sweep', 'drone_swarm', 'mega_slam'],
            damage: 42,
            speed: 52,
        },
    },
];
