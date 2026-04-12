class InventorySystem {
  constructor(scene) {
    this.scene = scene;
    this.slots = [null, null, null, null];
    this.activeSlot = 0;
  }

  addWeapon(weaponDef) {
    // Find empty slot
    let emptyIdx = this.slots.findIndex(s => s === null);
    if (emptyIdx === -1) {
      // Replace active slot
      emptyIdx = this.activeSlot;
    }
    this.slots[emptyIdx] = { ...weaponDef };

    if (emptyIdx === this.activeSlot || this.slots[this.activeSlot] === null) {
      this.activeSlot = emptyIdx;
      this.scene.weaponSystem.onWeaponChanged(this.slots[this.activeSlot]);
    }
    this.scene.uiSystem.updateInventory(this.slots, this.activeSlot);
    return true;
  }

  selectSlot(idx) {
    if (idx < 0 || idx > 3 || this.slots[idx] === null) return;
    this.activeSlot = idx;
    this.scene.weaponSystem.onWeaponChanged(this.slots[this.activeSlot]);
    this.scene.uiSystem.updateInventory(this.slots, this.activeSlot);
  }

  getCurrentWeapon() {
    return this.slots[this.activeSlot] || null;
  }

  removeSlot(idx) {
    this.slots[idx] = null;
  }
}
