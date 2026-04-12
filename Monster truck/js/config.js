// ============================================================
//  MONSTER TRUCK MAYHEM - Game Configuration
// ============================================================
const GAME_CONFIG = {
    WIDTH: 1280,
    HEIGHT: 720,
    GRAVITY: 950,

    // Player movement
    PLAYER_SPEED: 290,
    PLAYER_SPRINT_SPEED: 460,
    PLAYER_JUMP_VEL: -660,
    SLIDE_SPEED: 390,
    SLIDE_DURATION: 550,
    SPRINT_DURATION: 2200,
    SPRINT_COOLDOWN: 5000,

    // Health
    PLAYER_MAX_HP: 100,
    HP_BOX_HEAL: 50,
    INVINCIBILITY_DURATION: 1500,

    // Weapons
    FIRE_SPEED: 540,
    FIRE_DAMAGE: 22,
    FIRE_COOLDOWN: 320,
    FIRE_LIFETIME: 1400,

    // Buffs
    INVISIBILITY_DURATION: 10000,

    // World
    GROUND_Y: 628,
    GROUND_H: 100,
    CAMERA_LERP: 0.1,

    // Boss arena trigger (px from world end)
    BOSS_ZONE_OFFSET: 1200,

    // Colors
    COLORS: {
        P1: 0xFF3D00,
        P2: 0x1565C0,
        FIRE: 0xFF6D00,
        HP_HIGH: 0x4CAF50,
        HP_MED: 0xFDD835,
        HP_LOW: 0xF44336,
        BOSS_HP: 0xE91E63,
        WHITE: 0xFFFFFF,
        BLACK: 0x000000,
    }
};
