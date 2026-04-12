export class Controls {
  constructor() {
    this.keys = {};

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      // Prevent space/shift from scrolling page
      if (['Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  isPressed(code) {
    return !!this.keys[code];
  }
}
