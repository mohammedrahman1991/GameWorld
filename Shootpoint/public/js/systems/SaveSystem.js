const SaveSystem = (() => {
  const KEY = 'shootpoint_save';

  function getWeekNumber() {
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  }

  function defaultSave() {
    return {
      coins: 0,
      totalWins: 0,
      weeklyPoints: 0,
      weekNumber: getWeekNumber(),
      unlockedMythics: [],
      unlockedLegendaries: [],
      selectedSoldier: 'ghost',
      version: 1
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      const data = JSON.parse(raw);
      if (!data.unlockedLegendaries) data.unlockedLegendaries = [];
      if (data.weekNumber !== getWeekNumber()) {
        data.weeklyPoints = 0;
        data.weekNumber = getWeekNumber();
        save(data);
      }
      return data;
    } catch (e) {
      return defaultSave();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  function addCoins(amount) {
    const data = load();
    data.coins += amount;
    save(data);
    return data.coins;
  }

  function addWin() {
    const data = load();
    data.totalWins += 1;
    data.weeklyPoints += 100;
    if (data.totalWins % 10 === 0) {
      data.coins += 1000;
      data.weeklyPoints += 1000;
    } else {
      data.coins += 100;
    }
    save(data);
    return data;
  }

  function unlockMythic(itemId) {
    const data = load();
    if (!data.unlockedMythics.includes(itemId)) {
      if (data.coins >= 1000) {
        data.coins -= 1000;
        data.unlockedMythics.push(itemId);
        save(data);
        return true;
      }
      return false;
    }
    return true;
  }

  function hasMythic(itemId) {
    return load().unlockedMythics.includes(itemId);
  }

  function unlockLegendary(itemId) {
    const data = load();
    if (!data.unlockedLegendaries.includes(itemId)) {
      if (data.coins >= 500) {
        data.coins -= 500;
        data.unlockedLegendaries.push(itemId);
        save(data);
        return true;
      }
      return false;
    }
    return true;
  }

  function hasLegendary(itemId) {
    return load().unlockedLegendaries.includes(itemId);
  }

  function setSelectedSoldier(soldierId) {
    const data = load();
    data.selectedSoldier = soldierId;
    save(data);
  }

  function getRankTier(points) {
    if (points >= 5000) return { name: 'DIAMOND',  color: 0x00ffff,  next: null };
    if (points >= 3000) return { name: 'PLATINUM', color: 0xe5e4e2,  next: 5000 };
    if (points >= 1500) return { name: 'GOLD',     color: 0xffd700,  next: 3000 };
    if (points >= 500)  return { name: 'SILVER',   color: 0xc0c0c0,  next: 1500 };
    return                     { name: 'BRONZE',   color: 0xcd7f32,  next: 500  };
  }

  return { load, save, addCoins, addWin, unlockMythic, hasMythic, unlockLegendary, hasLegendary, setSelectedSoldier, getRankTier };
})();
