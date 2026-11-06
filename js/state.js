/* ==========================================================================
   state.js – saving, loading, progress, coins, stickers & badges.
   Everything is stored on this device only, under ONE versioned key.
   If localStorage is unavailable (private mode, blocked), we keep an
   in-memory copy so the game still works for the current session.
   ========================================================================== */
(function () {
  'use strict';
  const KQ = (window.KQ = window.KQ || {});

  const SAVE_KEY = 'kidsquest_save_v1';
  const PASS_SCORE = 80;           // score needed to pass a level
  const COIN_CORRECT = 5;          // coins per correct answer
  const COIN_STREAK = 2;           // extra coins per answer while streak >= 3
  const COIN_PASS = 10;            // bonus for passing
  const COIN_3STARS = 25;          // bonus for a perfect score
  const COIN_DAILY = 25;           // daily gift

  function freshSave() {
    return {
      v: 1,
      player: null,                // { name, color }
      unlocked: 1,                 // highest unlocked level number
      levels: {},                  // "12": { best, stars, plays, passed, failed }
      coins: 0,
      coinsTotal: 0,               // lifetime coins (for badge)
      stickers: [],                // "L1".."L50", "W0".."W4"
      badges: [],
      owned: ['color_gold'],
      equipped: { color: 'color_gold', hat: null, glasses: null, neck: null },
      settings: { sfx: true, music: false, speech: true, timers: true },
      daily: { last: '', days: 0 },
      stats: { bestStreak: 0, hints: 0, speaks: 0, correct: 0, perfectMath: [] }
    };
  }

  let data = freshSave();
  let storageOK = true;

  /** Deep-merge saved data onto defaults so older saves gain new fields. */
  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    for (const k of Object.keys(saved)) {
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof saved[k] === 'object' && saved[k] !== null && !Array.isArray(saved[k])) {
        base[k] = merge(base[k], saved[k]);
      } else {
        base[k] = saved[k];
      }
    }
    return base;
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 1) data = merge(freshSave(), parsed);
      }
    } catch (e) {
      storageOK = false;          // fall back to memory
    }
    return data;
  }

  function save() {
    if (!storageOK) return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      storageOK = false;
      return false;
    }
  }

  function reset() {
    data = freshSave();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    save();
  }

  /* ---------------- Level progress ---------------- */
  function lvl(id) { return data.levels[id] || { best: 0, stars: 0, plays: 0, passed: false, failed: false }; }
  function isUnlocked(id) { return id <= data.unlocked; }
  function starsFor(score) { return score >= 100 ? 3 : score >= 90 ? 2 : score >= PASS_SCORE ? 1 : 0; }
  function totalStars() { return Object.values(data.levels).reduce((s, l) => s + (l.stars || 0), 0); }
  function passedCount() { return Object.values(data.levels).filter(l => l.passed).length; }

  /** The level the player should play next (pulsing on the map). */
  function currentLevel() {
    for (let i = 1; i <= Math.min(data.unlocked, 50); i++) if (!lvl(i).passed) return i;
    return Math.min(data.unlocked, 50);
  }

  /**
   * Store the result of one attempt and hand out rewards.
   * @param {object} r { levelId, correct, total, maxStreak, runCoins }
   * @returns summary used by the results screen
   */
  function recordResult(r) {
    const L = KQ.LEVELS[r.levelId - 1];
    const score = Math.round((r.correct / r.total) * 100);
    const stars = starsFor(score);
    const passed = score >= PASS_SCORE;
    const prev = lvl(r.levelId);
    const firstPass = passed && !prev.passed;
    const retriedPass = passed && prev.failed && !prev.passed;
    const needed = passed ? 0 : Math.ceil((PASS_SCORE / 100) * r.total) - r.correct;

    const entry = {
      best: Math.max(prev.best, score),
      stars: Math.max(prev.stars, stars),
      plays: prev.plays + 1,
      passed: prev.passed || passed,
      failed: prev.failed || !passed
    };
    data.levels[r.levelId] = entry;

    // Coins
    let coins = r.runCoins;
    if (passed) coins += COIN_PASS;
    if (stars === 3) coins += COIN_3STARS;
    addCoins(coins);

    // Unlock next level
    let unlockedNext = false;
    if (passed && r.levelId < 50 && data.unlocked < r.levelId + 1) {
      data.unlocked = r.levelId + 1;
      unlockedNext = true;
    }

    // Stickers
    let sticker = null, worldSticker = null;
    if (firstPass) {
      const sid = 'L' + r.levelId;
      if (!data.stickers.includes(sid)) { data.stickers.push(sid); sticker = sid; }
      // World completed? (every level in the world passed)
      const w = L.world;
      const allDone = KQ.LEVELS.filter(x => x.world === w).every(x => lvl(x.id).passed);
      const wid = 'W' + w;
      if (allDone && !data.stickers.includes(wid)) { data.stickers.push(wid); worldSticker = wid; }
    }

    // Stats
    data.stats.bestStreak = Math.max(data.stats.bestStreak, r.maxStreak);
    data.stats.correct += r.correct;
    if (stars === 3 && L.tags && L.tags.includes('math') && !data.stats.perfectMath.includes(r.levelId)) data.stats.perfectMath.push(r.levelId);

    const newBadges = checkBadges({ levelId: r.levelId, score, retriedPass, test: !!L.test });
    save();
    return { score, stars, passed, prevBest: prev.best, newBest: score > prev.best, firstPass, unlockedNext, coins, sticker, worldSticker, newBadges, needed, correct: r.correct, total: r.total };
  }

  /* ---------------- Coins & shop ---------------- */
  function addCoins(n) {
    data.coins += n;
    data.coinsTotal += n;
  }
  function buy(itemId, price) {
    if (data.owned.includes(itemId)) return true;
    if (data.coins < price) return false;
    data.coins -= price;
    data.owned.push(itemId);
    checkBadges({});
    save();
    return true;
  }
  function equip(slot, itemId) {
    data.equipped[slot] = itemId;
    save();
  }

  /** Daily gift: returns coins given (0 if already claimed today). */
  function claimDaily() {
    const today = new Date();
    const key = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    if (data.daily.last === key) return 0;
    data.daily.last = key;
    data.daily.days += 1;
    addCoins(COIN_DAILY);
    checkBadges({});
    save();
    return COIN_DAILY;
  }

  /* ---------------- Badges ----------------
     Each badge: id, icon, name, description, and a test function. */
  const BADGES = [
    { id: 'first_step',  icon: '👣', name: 'First Step',     desc: 'Pass level 1',                       test: (d) => lvl(1).passed },
    { id: 'perfect',     icon: '💯', name: 'Perfect Score',  desc: 'Score 100 on any level',             test: (d, c) => c.score === 100 || Object.values(d.levels).some(l => l.best === 100) },
    { id: 'streak5',     icon: '🔥', name: '5 in a Row',     desc: 'Answer 5 questions right in a row',  test: (d) => d.stats.bestStreak >= 5 },
    { id: 'streak10',    icon: '☄️', name: 'Super Streak',   desc: 'Answer 10 right in a row',           test: (d) => d.stats.bestStreak >= 10 },
    { id: 'explorer',    icon: '🧭', name: 'World Explorer', desc: 'Finish a whole world',               test: (d) => d.stickers.some(s => s[0] === 'W') },
    { id: 'test_ace',    icon: '🏆', name: 'Test Ace',       desc: 'Score 100 on a TEST level',          test: (d, c) => (c.test && c.score === 100) || KQ.LEVELS.some(L => L.test && lvl(L.id).best === 100) },
    { id: 'math_wizard', icon: '🧙', name: 'Math Wizard',    desc: 'Get 3 stars on 5 math levels',       test: (d) => d.stats.perfectMath.length >= 5 },
    { id: 'never_give_up', icon: '💪', name: 'Never Give Up', desc: 'Pass a level after trying again',   test: (d, c) => !!c.retriedPass || d.badges.includes('never_give_up') },
    { id: 'stylish',     icon: '🎩', name: 'Looking Good',   desc: 'Buy an item for Nova',               test: (d) => d.owned.length > 1 },
    { id: 'coins500',    icon: '💰', name: 'Coin Collector', desc: 'Earn 500 coins in total',            test: (d) => d.coinsTotal >= 500 },
    { id: 'stickers25',  icon: '📒', name: 'Sticker Fan',    desc: 'Collect 25 stickers',                test: (d) => d.stickers.length >= 25 },
    { id: 'stars50',     icon: '🌟', name: 'Star Gazer',     desc: 'Earn 50 stars',                      test: (d) => totalStars() >= 50 },
    { id: 'daily3',      icon: '📅', name: 'Happy Visitor',  desc: 'Play on 3 different days',           test: (d) => d.daily.days >= 3 },
    { id: 'listener',    icon: '👂', name: 'Good Listener',  desc: 'Use the 🔊 button 10 times',         test: (d) => d.stats.speaks >= 10 },
    { id: 'halfway',     icon: '⛰️', name: 'Halfway Hero',   desc: 'Pass 25 levels',                     test: (d) => passedCount() >= 25 },
    { id: 'champion',    icon: '👑', name: 'Champion',       desc: 'Pass all 50 levels',                 test: (d) => passedCount() >= 50 }
  ];

  /** Award any newly earned badges; returns the list of new badge objects. */
  function checkBadges(ctx) {
    const fresh = [];
    for (const b of BADGES) {
      if (data.badges.includes(b.id)) continue;
      let ok = false;
      try { ok = b.test(data, ctx || {}); } catch (e) { ok = false; }
      if (ok) { data.badges.push(b.id); fresh.push(b); }
    }
    return fresh;
  }

  function bumpStat(name) {
    data.stats[name] = (data.stats[name] || 0) + 1;
    const nb = checkBadges({});
    save();
    return nb;
  }

  KQ.State = {
    SAVE_KEY, PASS_SCORE, COIN_CORRECT, COIN_STREAK, BADGES,
    get data() { return data; },
    get storageOK() { return storageOK; },
    load, save, reset, lvl, isUnlocked, starsFor, totalStars, passedCount, currentLevel,
    recordResult, addCoins, buy, equip, claimDaily, checkBadges, bumpStat
  };
})();
