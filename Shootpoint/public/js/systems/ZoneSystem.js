class ZoneSystem {
  constructor(scene) {
    this.scene = scene;
    this.cx = scene.MAP_W / 2;
    this.cy = scene.MAP_H / 2;
    this.radius = scene.MAP_W * 0.47;
    this.targetRadius = 180;
    this.shrinkDuration = 480000; // 8 minutes
    this.elapsed = 0;
    this.damageTimer = 0;

    this.zoneGraphics = scene.add.graphics().setDepth(2);
    this.dangerOverlay = scene.add.graphics().setDepth(1);
  }

  isOutside(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.cx, this.cy) > this.radius;
  }

  update(delta) {
    this.elapsed += delta;
    const t = Math.min(this.elapsed / this.shrinkDuration, 1);
    this.radius = Phaser.Math.Linear(this.scene.MAP_W * 0.47, this.targetRadius, t);

    this.draw();

    if (this.isOutside(this.scene.player.x, this.scene.player.y)) {
      this.damageTimer += delta;
      this.scene.uiSystem.showZoneWarning(true);
      if (this.damageTimer >= 500) {
        this.damageTimer = 0;
        this.scene.takeDamage(5);
      }
    } else {
      this.damageTimer = 0;
      this.scene.uiSystem.showZoneWarning(false);
    }
  }

  draw() {
    this.zoneGraphics.clear();
    this.dangerOverlay.clear();

    // Outside danger tint
    this.dangerOverlay.fillStyle(0xff0000, 0.10);
    this.dangerOverlay.fillRect(0, 0, this.scene.MAP_W, this.scene.MAP_H);

    // Erase inside zone (overdraw with transparent-ish green tint)
    this.dangerOverlay.fillStyle(0x001100, 0.05);
    this.dangerOverlay.fillCircle(this.cx, this.cy, this.radius);

    // Zone border
    this.zoneGraphics.lineStyle(5, 0x4488ff, 1);
    this.zoneGraphics.strokeCircle(this.cx, this.cy, this.radius);

    // Inner ring pulse
    const pulseR = this.radius - 20 + Math.sin(this.elapsed * 0.003) * 6;
    this.zoneGraphics.lineStyle(2, 0x88bbff, 0.4);
    this.zoneGraphics.strokeCircle(this.cx, this.cy, pulseR);
  }
}
