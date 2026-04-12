// ============================================================
//  Monster Truck Mayhem — Phaser 3 Entry Point
//  All artwork original & copyright-free
// ============================================================

const PhaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    width:  GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    backgroundColor: '#0D0520',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GAME_CONFIG.GRAVITY },
            debug: false,
        },
    },
    scene: [
        BootScene,
        MenuScene,
        GameScene,
        HUDScene,
        LevelCompleteScene,
        GameOverScene,
        WinScene,
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    audio: {
        disableWebAudio: false,
    },
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
    },
});
