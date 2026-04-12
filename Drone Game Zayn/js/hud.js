export class HUD {
  constructor() {
    this.els = {
      altitude: document.getElementById('altitude-value'),
      hspeed:   document.getElementById('hspeed-value'),
      vspeed:   document.getElementById('vspeed-value'),
      battery:  document.getElementById('battery-value'),
      fill:     document.getElementById('battery-fill'),
      distance: document.getElementById('distance-value'),
      heading:  document.getElementById('heading-value'),
      gps:      document.getElementById('gps-value'),
      horizon:  document.getElementById('horizon-line'),
    };
  }

  update({ altitude, hspeed, vspeed, battery, distance, yaw, pitch, x, z }) {
    this.els.altitude.textContent = `${altitude.toFixed(1)} m`;
    this.els.hspeed.textContent   = `${Math.abs(hspeed).toFixed(1)} m/s`;
    this.els.vspeed.textContent   = `${vspeed.toFixed(1)} m/s`;
    this.els.distance.textContent = `${distance.toFixed(0)} m`;

    // Battery
    const pct = Math.max(0, battery);
    this.els.battery.textContent = `${pct.toFixed(0)}%`;
    this.els.fill.style.width = `${pct}%`;
    this.els.fill.style.background =
      pct > 30 ? '#00ffaa' : pct > 15 ? '#ffaa00' : '#ff3333';

    // Heading
    const deg = (((-yaw * 180) / Math.PI) % 360 + 360) % 360;
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const dir = dirs[Math.round(deg / 45) % 8];
    this.els.heading.textContent = `${dir} ${deg.toFixed(0)}°`;

    // Fake GPS coords (Iceland-ish offset from position)
    const lat = (63.5 + x / 8000).toFixed(4);
    const lon = (-19.0 + z / 8000).toFixed(4);
    this.els.gps.textContent = `${lat}°N ${Math.abs(lon)}°W`;

    // Artificial horizon tilt
    const tiltPct = 50 + pitch * 80;
    this.els.horizon.style.top = `${Math.min(90, Math.max(10, tiltPct))}%`;
  }
}
