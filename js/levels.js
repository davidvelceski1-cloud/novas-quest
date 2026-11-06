/* ==========================================================================
   levels.js – ALL game content: 5 worlds, 50 levels, question pools.
   --------------------------------------------------------------------------
   HOW TO ADD QUESTIONS: find the level below and add a line to its `pool`
   using one of the builder helpers:

     mc(question, correct, [wrong1, wrong2, wrong3], explanation, {v:'🍌'})
     tf(statement, true|false, explanation)
     count(emoji, 'plural name', number)
     pat([sequence...], next, [wrong...], explanation)
     ord(question, [items in the CORRECT order], explanation)
     match(question, [[left, right], ...], explanation)
     mem(question, [[cardA, cardB], ...], explanation)   // memory pairs
     inp(question, numberAnswer, explanation)           // number pad

   Extra visuals (5th argument of mc / inp):  {v:'🍎'} big emoji,
   {clock:'3:30'} analog clock, {frac:[1,4]} shaded pie.
   Math levels also have a `gen()` function that creates fresh questions
   for every attempt (so the arithmetic is always correct).
   Test levels (every 5th) automatically mix questions from `from` levels.
   ========================================================================== */
(function () {
  'use strict';
  const KQ = (window.KQ = window.KQ || {});

  /* ---------------- tiny helpers ---------------- */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  /** n unique numeric distractors near `ans` (never equal, never below min). */
  function near(ans, spread, n, min, extra) {
    n = n || 3; min = min === undefined ? 0 : min;
    const set = new Set();
    (extra || []).forEach(v => { if (v !== ans && v >= min && Number.isInteger(v)) set.add(v); });
    let guard = 0;
    while (set.size < n + 3 && guard++ < 300) {
      const v = ans + rnd(1, spread) * (Math.random() < 0.5 ? -1 : 1);
      if (v >= min && v !== ans) set.add(v);
    }
    let k = 1;
    while (set.size < n) { if (ans + k !== ans) set.add(ans + k); k++; }
    return shuffle([...set]).slice(0, n).map(String);
  }
  const NAMES = ['Mia', 'Leo', 'Ava', 'Sam', 'Zoe', 'Ben', 'Ella', 'Omar', 'Lila', 'Kai', 'Nora', 'Ravi'];

  /* ---------------- question builders ---------------- */
  const mc = (q, a, wrong, explain, x) => Object.assign({ type: 'mc', q, a: String(a), wrong: wrong.map(String), explain }, x || {});
  const tf = (q, a, explain, x) => Object.assign({ type: 'tf', q, a: !!a, explain }, x || {});
  const count = (emoji, name, n, explain) => ({ type: 'count', q: `How many ${name} can you count?`, emoji, n, explain: explain || `There are ${n} ${name}. Touch each one as you count!` });
  const pat = (seq, a, wrong, explain, q) => ({ type: 'pattern', q: q || 'What comes next?', seq, a: String(a), wrong: wrong.map(String), explain });
  const ord = (q, items, explain) => ({ type: 'order', q, items, explain });
  const match = (q, pairs, explain) => ({ type: 'match', q, pairs, explain: explain || 'Each pair goes together!' });
  const mem = (q, pairs, explain) => ({ type: 'memory', q, pairs, explain: explain || 'Find the cards that go together!' });
  const memSame = (q, list, explain) => mem(q, list.map(e => [e, e]), explain);
  const inp = (q, a, explain, x) => Object.assign({ type: 'input', q, a: Number(a), explain }, x || {});

  /* ======================= GENERATORS (math) ======================= */
  const COUNT_ITEMS = [['🍎', 'apples'], ['⭐', 'stars'], ['🐞', 'ladybugs'], ['🎈', 'balloons'], ['🐟', 'fish'], ['🌸', 'flowers'], ['🚗', 'cars'], ['🦆', 'ducks'], ['🍓', 'strawberries'], ['🐥', 'chicks'], ['🍄', 'mushrooms'], ['🐝', 'bees']];

  function genCount(n, max) {
    return Array.from({ length: n }, () => { const [e, name] = pick(COUNT_ITEMS); return count(e, name, rnd(1, max || 10)); });
  }

  function addExplain(a, b, s) {
    if (b < 10 && a < 20) return `${a} + ${b} = ${s}. Start at ${a} and count on ${b} more!`;
    if (b < 10) return `${a} + ${b} = ${s}. Add the ones: ${a % 10} + ${b} = ${(a % 10) + b}, then add the tens.`;
    const ta = a - (a % 10), tb = b - (b % 10);
    return `Tens: ${ta} + ${tb} = ${ta + tb}. Ones: ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}. Together that makes ${s}!`;
  }
  const subExplain = (a, b, d) => `${a} − ${b} = ${d}. Check it: ${d} + ${b} = ${a}!`;

  const STORY = [['🐠', 'fish'], ['🐚', 'shells'], ['🦀', 'crabs'], ['🍌', 'bananas'], ['🎈', 'balloons'], ['🍪', 'cookies']];

  /** Addition within `max`. minA lets bigger levels avoid tiny sums. */
  function genAdd(max, n, minA, spread) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(minA || 1, max - 1), b = rnd(1, Math.max(1, max - a)), s = a + b;
      const ex = addExplain(a, b, s), sp = spread || (max > 20 ? 10 : 3);
      const kind = i % 5;
      if (kind === 0 || kind === 2) out.push(mc(`${a} + ${b} = ?`, s, near(s, sp, 3, 0, [s + 1, s - 1, s + 10, s - 10]), ex));
      else if (kind === 1) out.push(inp(`${a} + ${b} = ?`, s, ex));
      else if (kind === 3) { const [e, name] = pick(STORY); out.push(mc(`There are ${a} ${name} ${e}. ${b} more come. How many ${name} now?`, s, near(s, sp, 3, 0, [s - 1, s + 1]), ex)); }
      else { const shown = Math.random() < 0.5 ? s : s + pick([-1, 1, 2]); out.push(tf(`${a} + ${b} = ${shown}`, shown === s, ex)); }
    }
    return out;
  }

  function genSub(max, n, minA, spread) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(Math.max(3, minA || 3), max), b = rnd(1, a - 1), d = a - b;
      const ex = subExplain(a, b, d), sp = spread || (max > 20 ? 10 : 3);
      const kind = i % 5;
      if (kind === 0 || kind === 2) out.push(mc(`${a} − ${b} = ?`, d, near(d, sp, 3, 0, [d + 1, d - 1, a + b]), ex));
      else if (kind === 1) out.push(inp(`${a} − ${b} = ?`, d, ex));
      else if (kind === 3) { const [e, name] = pick(STORY); out.push(mc(`There are ${a} ${name} ${e}. ${b} go away. How many are left?`, d, near(d, sp, 3, 0, [d + 1, d - 1]), ex)); }
      else { const shown = Math.random() < 0.5 ? d : d + pick([-1, 1]); out.push(tf(`${a} − ${b} = ${shown}`, shown === d, ex)); }
    }
    return out;
  }

  /** Missing-number puzzles: a + __ = s */
  function genMissing(max, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(1, max - 2), b = rnd(1, max - a), s = a + b;
      if (i % 2) out.push(inp(`${a} + __ = ${s}`, b, `${s} − ${a} = ${b}, so ${a} + ${b} = ${s}.`));
      else out.push(inp(`${s} − __ = ${a}`, b, `${s} − ${b} = ${a}. Check it: ${a} + ${b} = ${s}.`));
    }
    return out;
  }

  /** Compare two numbers with > < = */
  function genCompare(max, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(0, max); let b = Math.random() < 0.15 ? a : rnd(0, max);
      const sign = a > b ? '>' : a < b ? '<' : '=';
      const ex = sign === '=' ? `${a} and ${b} are the same, so we use =.` : sign === '>' ? `${a} is bigger than ${b}. The open mouth of > eats the bigger number!` : `${a} is smaller than ${b}. The open mouth of < faces the bigger number ${b}!`;
      out.push(mc(`Which sign is right?  ${a} __ ${b}`, sign, ['>', '<', '='].filter(s => s !== sign), ex));
    }
    return out;
  }

  function genOrderNums(max, n, k) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const set = new Set(); while (set.size < (k || 4)) set.add(rnd(0, max));
      const nums = [...set].sort((x, y) => x - y).map(String);
      out.push(ord('Put the numbers in order, smallest first', nums, `From smallest to biggest: ${nums.join(', ')}.`));
    }
    return out;
  }

  function mulDistractors(a, b) {
    const p = a * b;
    return near(p, 4, 3, 1, [a * (b + 1), a * (b - 1), (a + 1) * b, p + 1, p - 1, a + b].filter(v => v > 0));
  }
  function mulExplain(a, b) {
    const p = a * b;
    if (b <= 6) { const steps = Array.from({ length: b }, (_, i) => a * (i + 1)); return `${a} × ${b} = ${p}. Count by ${a}s: ${steps.join(', ')}!`; }
    return `${a} × ${b} = ${p}. That's ${b} groups of ${a}.`;
  }
  const GROUP_ITEMS = [['🍪', 'cookies', 'plates'], ['🍓', 'strawberries', 'bowls'], ['⭐', 'stars', 'rows'], ['🐟', 'fish', 'tanks'], ['🎈', 'balloons', 'bunches']];
  /** Times tables. `tables` = list of the first factor, e.g. [2,5,10]. */
  function genMul(tables, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = pick(tables), b = rnd(2, 10), p = a * b, ex = mulExplain(a, b);
      const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
      const kind = i % 5;
      if (kind === 0 || kind === 2) out.push(mc(`${x} × ${y} = ?`, p, mulDistractors(a, b), ex));
      else if (kind === 1) out.push(inp(`${x} × ${y} = ?`, p, ex));
      else if (kind === 3) {
        const [e, name, grp] = pick(GROUP_ITEMS);
        const g = Math.min(a, b), per = Math.max(a, b);
        out.push(mc(`There are ${g} ${grp} with ${per} ${name} ${e} in each. How many ${name} in all?`, p, mulDistractors(a, b), `${g} × ${per} = ${p}.`));
      } else { const shown = Math.random() < 0.5 ? p : p + pick([-a, a, 1, -1]); out.push(tf(`${x} × ${y} = ${shown}`, shown === p, ex)); }
    }
    return out;
  }

  function genDiv(n, maxB) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const b = rnd(2, maxB || 10), c = rnd(2, 10), a = b * c;
      const ex = `${a} ÷ ${b} = ${c}, because ${b} × ${c} = ${a}.`;
      const kind = i % 4;
      if (kind === 0) out.push(mc(`${a} ÷ ${b} = ?`, c, near(c, 3, 3, 1, [c + 1, c - 1, b]), ex));
      else if (kind === 1) out.push(inp(`${a} ÷ ${b} = ?`, c, ex));
      else if (kind === 2) out.push(mc(`${a} cookies 🍪 are shared equally by ${b} friends. How many does each friend get?`, c, near(c, 3, 3, 1, [c + 1, c - 1]), ex));
      else out.push(inp(`__ × ${b} = ${a}`, c, ex));
    }
    return out;
  }

  /** Analog clock questions. mins = allowed minute values, e.g. [0,30] */
  function clockExplain(h, m) {
    const t = `${h}:${String(m).padStart(2, '0')}`;
    if (m === 0) return `The long hand points to 12 and the short hand points to ${h}, so it is ${h} o’clock (${t}).`;
    if (m === 30) return `The long hand on 6 means half past. The short hand is just past ${h}, so it is ${t}.`;
    if (m === 15) return `The long hand on 3 means quarter past. The short hand is just past ${h}, so it is ${t}.`;
    return `The long hand on 9 means 45 minutes past the hour. The short hand is nearly at ${h % 12 + 1}, so it is ${t}.`;
  }
  function genClock(n, mins) {
    const out = [];
    const fmt = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
    for (let i = 0; i < n; i++) {
      const h = rnd(1, 12), m = pick(mins), a = fmt(h, m);
      const hn = h % 12 + 1, hp = (h + 10) % 12 + 1, alt = m === 0 ? 30 : 0;
      const wrong = [...new Set([fmt(hn, m), fmt(hp, m), fmt(h, alt), fmt(hn, alt), fmt(h, m === 15 ? 45 : 15)])].filter(x => x !== a);
      out.push(mc('What time does the clock show?', a, shuffle(wrong).slice(0, 3), clockExplain(h, m), { clock: a }));
    }
    return out;
  }

  /** Number sequences: step up (or down) */
  function genSeq(n, steps, down) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const st = pick(steps), goDown = down && Math.random() < 0.35;
      let start = goDown ? rnd(st * 5, st * 10 + 20) : rnd(0, 20);
      if (st >= 5) start = Math.round(start / st) * st;
      const seq = [0, 1, 2, 3].map(k => start + (goDown ? -k * st : k * st));
      const ans = start + (goDown ? -4 * st : 4 * st);
      out.push(mc(`What number comes next?  ${seq.join(', ')}, __`, ans, near(ans, Math.max(2, st), 3, 0, [ans + 1, ans - 1, ans + st, ans - st * 2]),
        `Each number goes ${goDown ? 'down' : 'up'} by ${st}: ${seq[3]} ${goDown ? '−' : '+'} ${st} = ${ans}.`));
    }
    return out;
  }

  function genPlaceValue(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const v = rnd(11, 99), t = Math.floor(v / 10), o = v % 10;
      if (i % 2) out.push(mc(`How many tens are in ${v}?`, t, near(t, 3, 3, 0, [o, t + 1, t - 1].filter(x => x !== t)), `${v} is ${t} tens and ${o} ones.`));
      else out.push(mc(`Which number has ${t} tens and ${o} ones?`, v, near(v, 3, 3, 0, [o * 10 + t, v + 10, v - 10].filter(x => x !== v && x > 0)), `${t} tens is ${t * 10}, plus ${o} ones makes ${v}.`));
    }
    return out;
  }

  function genEvenOdd(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const even = Math.random() < 0.5;
      const ans = rnd(5, 49) * 2 - (even ? 0 : 1);
      const wrong = []; while (wrong.length < 3) { const w = rnd(5, 49) * 2 - (even ? 1 : 0); if (!wrong.includes(String(w))) wrong.push(String(w)); }
      out.push(mc(`Which number is ${even ? 'EVEN' : 'ODD'}?`, ans, wrong, `${ans} ends in ${ans % 10}. Even numbers end in 0, 2, 4, 6 or 8; odd numbers end in 1, 3, 5, 7 or 9.`));
    }
    return out;
  }

  /** "Which group has more?" with emoji groups */
  function genMore(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const e = pick(COUNT_ITEMS)[0];
      const set = new Set(); while (set.size < 3) set.add(rnd(1, 8));
      const counts = [...set].sort((x, y) => y - x);
      const asStr = (k) => e.repeat(k);
      out.push(mc('Which group has MORE?', asStr(counts[0]), counts.slice(1).map(asStr), `${counts[0]} is more than ${counts.slice(1).join(' or ')}.`));
    }
    return out;
  }
  function genBeforeAfter(n, max) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i % 3, v = rnd(2, (max || 10) - 1);
      if (k === 0) out.push(mc(`What number comes AFTER ${v}?`, v + 1, near(v + 1, 2, 3, 0, [v - 1, v + 2, v]), `After ${v} comes ${v + 1}. Count: ${v}, ${v + 1}!`));
      else if (k === 1) out.push(mc(`What number comes BEFORE ${v}?`, v - 1, near(v - 1, 2, 3, 0, [v + 1, v - 2, v]), `Before ${v} comes ${v - 1}. Count: ${v - 1}, ${v}!`));
      else out.push(mc(`What number is BETWEEN ${v - 1} and ${v + 1}?`, v, near(v, 2, 3, 0, [v + 2, v - 2]), `${v - 1}, ${v}, ${v + 1} — ${v} sits in the middle.`));
    }
    return out;
  }

  /** Emoji patterns: AB, AAB, ABB, ABC */
  const PAT_SETS = [['🔴', '🔵', '🟡', '🟢'], ['🍎', '🍌', '🍇', '🍓'], ['🐶', '🐱', '🐰', '🐸'], ['⭐', '🌙', '☀️', '☁️'], ['🔺', '🟦', '⚪', '❤️'], ['🌸', '🍀', '🍄', '🌻']];
  function genPattern(n, units) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const set = shuffle(pick(PAT_SETS));
      const tpl = pick(units || ['AB', 'AAB', 'ABB', 'ABC']);
      const unit = tpl.split('').map(c => set[c.charCodeAt(0) - 65]);
      const len = unit.length === 2 ? 5 : 6 + (unit.length === 3 && Math.random() < 0.5 ? 1 : 0);
      const seq = Array.from({ length: len }, (_, k) => unit[k % unit.length]);
      const ans = unit[len % unit.length];
      const wrong = shuffle([...new Set(set.filter(s => s !== ans))]).slice(0, 3);
      out.push(pat(seq, ans, wrong, `The pattern repeats ${unit.join(' ')} — so next comes ${ans}.`));
    }
    return out;
  }

  /** Fractions shown as a shaded pie */
  function genFraction(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = pick([2, 3, 4, 4, 5, 6, 8]), k = rnd(1, d - 1), a = `${k}/${d}`;
      const val = k / d, cands = [`${d - k}/${d}`, `${k}/${d + 1}`, `${k + 1}/${d}`, `${Math.max(1, k - 1)}/${d}`, `${d}/${k + d}`, `1/${k + 1}`, `${k}/${d * 2}`, '1/4', '3/4', '1/3', '2/3', '1/8'];
      const wrong = [...new Set(cands)].filter(c => { const [x, y] = c.split('/').map(Number); return c !== a && x < y && Math.abs(x / y - val) > 1e-9; });
      out.push(mc('What fraction of the circle is colored?', a, shuffle(wrong).slice(0, 3), `${k} of the ${d} equal parts are colored, so the fraction is ${a}.`, { frac: [k, d] }));
    }
    return out;
  }
  function genHalves(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (i % 2) { const q = rnd(1, 10) * 4; out.push(mc(`What is one quarter (1/4) of ${q}?`, q / 4, near(q / 4, 3, 3, 1, [q / 2, q / 4 + 1]), `One quarter means 4 equal parts: ${q} ÷ 4 = ${q / 4}.`)); }
      else { const h = rnd(1, 20) * 2; out.push(mc(`What is half of ${h}?`, h / 2, near(h / 2, 3, 3, 0, [h, h / 2 + 2]), `Half means 2 equal parts: ${h} ÷ 2 = ${h / 2}.`)); }
    }
    return out;
  }

  /** Word problems (world 5) */
  function genWord(n) {
    const out = [];
    const T = [
      () => { const N = pick(NAMES), a = rnd(12, 60), b = rnd(5, 39); return inp(`${N} has ${a} stickers and gets ${b} more. How many stickers does ${N} have now?`, a + b, `${a} + ${b} = ${a + b}.`); },
      () => { const N = pick(NAMES), a = rnd(30, 90), b = rnd(8, a - 5); return inp(`${N} had ${a} marbles and gave ${b} away. How many are left?`, a - b, `${a} − ${b} = ${a - b}.`); },
      () => { const a = rnd(2, 9), b = rnd(3, 10); return inp(`There are ${a} boxes with ${b} crayons ✏️ in each box. How many crayons in all?`, a * b, `${a} × ${b} = ${a * b}.`); },
      () => { const N = pick(NAMES), b = rnd(2, 8), c = rnd(2, 9); return inp(`${N} shares ${b * c} cookies 🍪 equally with ${b} friends (they get all of them). How many does each friend get?`, c, `${b * c} ÷ ${b} = ${c}.`); },
      () => { const N = pick(NAMES), a = rnd(2, 6), b = rnd(3, 8), c = rnd(2, 9); return inp(`${N} buys ${a} packs of ${b} cards and finds ${c} more cards. How many cards in total?`, a * b + c, `${a} × ${b} = ${a * b}, then ${a * b} + ${c} = ${a * b + c}.`); },
      () => { const N = pick(NAMES), cost = rnd(20, 80), has = rnd(5, cost - 3); return inp(`A toy rocket 🚀 costs ${cost} coins. ${N} has ${has} coins. How many more coins does ${N} need?`, cost - has, `${cost} − ${has} = ${cost - has}.`); },
      () => { const legs = rnd(2, 9); return inp(`A spider 🕷️ has 8 legs. How many legs do ${legs} spiders have?`, legs * 8, `${legs} × 8 = ${legs * 8}.`); },
      () => { const w = rnd(2, 9); return inp(`One week has 7 days. How many days are in ${w} weeks?`, w * 7, `${w} × 7 = ${w * 7}.`); },
      () => { const N = pick(NAMES), a = rnd(3, 9) * 10; return mc(`${N} reads ${a} pages. That is half of the book. How many pages does the book have?`, a * 2, near(a * 2, 10, 3, 1, [a / 2, a + 10, a * 2 + 10]), `Half is ${a}, so the whole book is ${a} × 2 = ${a * 2} pages.`); },
      () => { const s = rnd(3, 9), r = rnd(3, 9); return mc(`A garden has ${r} rows with ${s} flowers 🌷 in each row. How many flowers?`, r * s, mulDistractors(r, s), `${r} × ${s} = ${r * s}.`); }
    ];
    for (let i = 0; i < n; i++) out.push(T[i % T.length]());
    return out;
  }

  /** Mixed challenge (world 5) */
  function genMixed(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i % 6;
      if (k === 0) { const a = rnd(100, 600), b = rnd(20, 99); out.push(inp(`${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}. Add ones, then tens, then hundreds.`)); }
      else if (k === 1) { const a = rnd(120, 900), b = rnd(20, 99); out.push(inp(`${a} − ${b} = ?`, a - b, subExplain(a, b, a - b))); }
      else if (k === 2) { const a = rnd(3, 10), b = rnd(3, 10); out.push(inp(`${a} × ${b} = ?`, a * b, mulExplain(a, b))); }
      else if (k === 3) { const b = rnd(3, 10), c = rnd(3, 10); out.push(mc(`${b * c} ÷ ${b} = ?`, c, near(c, 3, 3, 1, [c + 1, c - 1, b]), `${b * c} ÷ ${b} = ${c}, because ${b} × ${c} = ${b * c}.`)); }
      else if (k === 4) { const a = rnd(3, 9), b = rnd(3, 9); out.push(inp(`__ × ${a} = ${a * b}`, b, `${b} × ${a} = ${a * b}.`)); }
      else { const a = rnd(2, 9), b = rnd(2, 9), c = rnd(1, 20); out.push(mc(`${a} × ${b} + ${c} = ?`, a * b + c, near(a * b + c, 5, 3, 1, [a * (b + c), a * b, a * b + c + 1]), `First multiply: ${a} × ${b} = ${a * b}. Then add ${c}: ${a * b + c}.`)); }
    }
    return out;
  }

  /* ======================= WORLDS ======================= */
  const WORLDS = [
    { id: 0, name: 'Rainbow Meadow', icon: '🌈', floaties: ['🌸', '🦋', '🌼', '☁️', '🐝', '🌷'], sticker: { e: '🌈', name: 'Meadow Champion' }, colors: ['#ffd6f0', '#ff9ad5'] },
    { id: 1, name: 'Ocean Reef',     icon: '🐠', floaties: ['🐟', '🐚', '💧', '🌊', '⭐', '🐡'], sticker: { e: '🐬', name: 'Dolphin Hero' }, colors: ['#d0f4ff', '#58d8ff'] },
    { id: 2, name: 'Jungle Canopy',  icon: '🌴', floaties: ['🍃', '🌺', '🦜', '🍌', '🌿', '🦋'], sticker: { e: '🐘', name: 'Jungle Elephant' }, colors: ['#ecfccb', '#7be07f'] },
    { id: 3, name: 'Sky Islands',    icon: '☁️', floaties: ['☁️', '🎈', '⭐', '🌤️', '🕊️', '✨'], sticker: { e: '🦄', name: 'Sky Unicorn' }, colors: ['#ede9fe', '#c8b8ff'] },
    { id: 4, name: 'Space Station',  icon: '🚀', floaties: ['⭐', '🪐', '🌙', '☄️', '🛸', '✨'], sticker: { e: '🌟', name: 'Super Star' }, colors: ['#ede9fe', '#9775fa'] }
  ];

  /* ======================= LEVELS ======================= */
  const RAW = [
    /* ---------------- WORLD 1 · RAINBOW MEADOW ---------------- */
    { id: 1, title: 'Colors of the Rainbow', topic: 'colors', icon: '🎨', learn: 'Name colors and find things that are red, yellow, green and blue.', sticker: ['🎨', 'Paint Palette'],
      pool: [
        mc('What color is a banana?', 'Yellow 🟡', ['Blue 🔵', 'Red 🔴', 'Purple 🟣'], 'Ripe bananas are yellow — yummy!', { v: '🍌' }),
        mc('What color is grass?', 'Green 🟢', ['Pink 🌸', 'Blue 🔵', 'Black ⚫'], 'Grass is green, just like leaves.', { v: '🌿' }),
        mc('What color is a strawberry?', 'Red 🔴', ['Blue 🔵', 'Green 🟢', 'White ⚪'], 'Ripe strawberries are red with tiny seeds.', { v: '🍓' }),
        mc('What color is the sky on a sunny day?', 'Blue 🔵', ['Green 🟢', 'Orange 🟠', 'Brown 🟤'], 'On a sunny day the sky looks blue.', { v: '☀️' }),
        mc('What color is a carrot?', 'Orange 🟠', ['Purple 🟣', 'Blue 🔵', 'Black ⚫'], 'Carrots are usually orange and crunchy!', { v: '🥕' }),
        mc('What color is snow?', 'White ⚪', ['Green 🟢', 'Red 🔴', 'Purple 🟣'], 'Fresh snow is white and sparkly.', { v: '⛄' }),
        mc('Which one is RED?', '🍎', ['🍌', '🥦', '🍇'], 'The apple is red. Bananas are yellow, broccoli is green and grapes are purple.'),
        mc('Which one is YELLOW?', '🐥', ['🐸', '🍆', '🍓'], 'The baby chick is yellow and fluffy.'),
        mc('Which one is GREEN?', '🐸', ['🍓', '🍋', '🍆'], 'The frog is green, so it can hide in leaves.'),
        mc('Red and yellow paint mixed together make…', 'Orange 🟠', ['Green 🟢', 'Blue 🔵', 'Black ⚫'], 'Red + yellow = orange!'),
        mc('Blue and yellow paint mixed together make…', 'Green 🟢', ['Red 🔴', 'Orange 🟠', 'Pink 🌸'], 'Blue + yellow = green!'),
        mc('Red and blue paint mixed together make…', 'Purple 🟣', ['Yellow 🟡', 'Green 🟢', 'Orange 🟠'], 'Red + blue = purple!'),
        mc('How many colors are in a rainbow?', '7', ['3', '10', '5'], 'A rainbow has 7 colors: red, orange, yellow, green, blue, indigo and violet.', { v: '🌈' }),
        tf('A frog is often green.', true, 'Many frogs are green so they can hide among the leaves.', { v: '🐸' }),
        tf('A lemon is purple.', false, 'Lemons are yellow, like the sunshine!', { v: '🍋' }),
        tf('Chocolate is usually brown.', true, 'Most chocolate is brown and sweet.', { v: '🍫' }),
        match('Match each color to a thing with that color', [['🔴 Red', '🍓'], ['🟡 Yellow', '🍌'], ['🟢 Green', '🥦'], ['🔵 Blue', '💧'], ['🟠 Orange', '🥕'], ['🟣 Purple', '🍇']], 'Strawberries are red, bananas yellow, broccoli green, water drops blue, carrots orange and grapes purple.'),
        memSame('Flip the cards and find the matching colors!', ['🔴', '🟡', '🔵', '🟢', '🟣', '🟠'])
      ] },
    { id: 2, title: 'Super Shapes', topic: 'shapes', icon: '🔺', learn: 'Find circles, squares, triangles and stars, and count their sides.', sticker: ['🔺', 'Triangle Pal'],
      pool: [
        mc('Which one is a CIRCLE?', '🔵', ['🔺', '🟥', '⭐'], 'A circle is perfectly round, like 🔵.'),
        mc('Which one is a TRIANGLE?', '🔺', ['🟦', '🟢', '❤️'], 'A triangle has 3 sides and 3 corners, like 🔺.'),
        mc('Which one is a SQUARE?', '🟨', ['🔺', '⚪', '⭐'], 'A square has 4 equal sides, like 🟨.'),
        mc('Which one is a STAR?', '⭐', ['🔷', '🟢', '🔺'], 'A star has 5 points, like ⭐.'),
        mc('Which one is a HEART?', '❤️', ['🟦', '🔺', '⚪'], 'A heart shape is the shape of love ❤️.'),
        mc('How many sides does a triangle have?', '3', ['4', '2', '5'], 'A triangle has 3 straight sides and 3 corners.', { v: '🔺' }),
        mc('How many sides does a square have?', '4', ['3', '5', '6'], 'A square has 4 sides, all the same length.', { v: '🟥' }),
        mc('How many corners does a circle have?', '0', ['1', '2', '4'], 'A circle is round all the way around, so it has no corners.', { v: '⚪' }),
        mc('A slice of pizza looks like which shape?', 'Triangle 🔺', ['Circle ⚪', 'Square 🟥', 'Star ⭐'], 'A pizza slice is pointy with 3 sides, like a triangle.', { v: '🍕' }),
        mc('A ball looks like which shape?', 'Circle ⚪', ['Triangle 🔺', 'Square 🟥', 'Heart ❤️'], 'A ball is round, like a circle.', { v: '⚽' }),
        mc('Which shape has 5 points?', '⭐', ['🔺', '🟦', '⚪'], 'A star has 5 points.'),
        tf('A circle has 4 corners.', false, 'A circle is round and has no corners at all.'),
        tf('A square has 4 equal sides.', true, 'Yes! All 4 sides of a square are the same length.'),
        tf('A triangle has 3 sides.', true, 'Yes! Tri means three.'),
        match('Match each shape to its name', [['🔺', 'Triangle'], ['🟥', 'Square'], ['⚪', 'Circle'], ['⭐', 'Star'], ['❤️', 'Heart'], ['🔷', 'Diamond']], 'Every shape has its own name!'),
        memSame('Find the matching shapes!', ['🔺', '🟦', '⚪', '⭐', '❤️', '🔷']),
        pat(['🔺', '⚪', '🔺', '⚪', '🔺'], '⚪', ['🔺', '⭐', '🟥'], 'The pattern goes triangle, circle, triangle, circle… so a circle comes next.')
      ] },
    { id: 3, title: 'Counting Fun', topic: 'counting to 10', icon: '🔢', learn: 'Count objects up to 10 and put numbers in order.', sticker: ['🔢', 'Number Buddy'], tags: ['math'],
      pool: [
        mc('Which number comes after 4?', '5', ['3', '6', '2'], 'We count 3, 4, 5 — so 5 comes after 4.'),
        mc('Which number comes before 8?', '7', ['9', '6', '5'], 'We count 6, 7, 8 — so 7 comes before 8.'),
        mc('How many fingers are on one hand?', '5', ['4', '6', '10'], 'One hand has 5 fingers. Two hands have 10!', { v: '✋' }),
        mc('How many legs does a dog have?', '4', ['2', '6', '3'], 'Dogs walk on 4 legs.', { v: '🐕' }),
        ord('Put the numbers in order, smallest first', ['1', '2', '3', '4'], 'We count 1, 2, 3, 4.'),
        ord('Put the numbers in order, smallest first', ['3', '4', '5', '6', '7'], 'We count 3, 4, 5, 6, 7.'),
        ord('Put the numbers in order, smallest first', ['6', '7', '8', '9', '10'], 'We count 6, 7, 8, 9, 10.'),
        tf('5 is more than 3.', true, '5 is bigger than 3 — count: 3, 4, 5!'),
        tf('2 is more than 9.', false, '9 is much more than 2.')
      ],
      gen: () => genCount(12, 10) },
    { id: 4, title: 'ABC Letters', topic: 'letters', icon: '🔤', learn: 'Learn letters, their sounds and the ABC order.', sticker: ['🔤', 'ABC Block'],
      pool: [
        mc('Which letter does APPLE start with?', 'A', ['B', 'M', 'S'], 'A-A-Apple starts with A!', { v: '🍎' }),
        mc('Which letter does BALL start with?', 'B', ['D', 'P', 'T'], 'B-B-Ball starts with B!', { v: '⚽' }),
        mc('Which letter does CAT start with?', 'C', ['D', 'T', 'M'], 'C-C-Cat starts with C!', { v: '🐱' }),
        mc('Which letter does DOG start with?', 'D', ['B', 'G', 'O'], 'D-D-Dog starts with D!', { v: '🐶' }),
        mc('Which letter does FISH start with?', 'F', ['S', 'H', 'P'], 'F-F-Fish starts with F!', { v: '🐟' }),
        mc('Which letter does SUN start with?', 'S', ['Z', 'C', 'N'], 'S-S-Sun starts with S!', { v: '☀️' }),
        mc('Which letter does MOON start with?', 'M', ['N', 'W', 'O'], 'M-M-Moon starts with M!', { v: '🌙' }),
        mc('Which letter does TREE start with?', 'T', ['F', 'R', 'L'], 'T-T-Tree starts with T!', { v: '🌳' }),
        mc('Which letter comes after A?', 'B', ['C', 'Z', 'D'], 'A, B, C… B comes right after A.'),
        mc('Which letter comes after C?', 'D', ['E', 'B', 'G'], 'A, B, C, D… D comes right after C.'),
        mc('How many letters are in the alphabet?', '26', ['20', '30', '24'], 'The English alphabet has 26 letters, from A to Z.'),
        tf('Z is the last letter of the alphabet.', true, 'Yes! The alphabet ends with X, Y, Z.'),
        tf('The word EGG starts with the letter E.', true, 'E-E-Egg starts with E!', { v: '🥚' }),
        tf('The word LION starts with the letter M.', false, 'L-L-Lion starts with L.', { v: '🦁' }),
        match('Match the big letter to the small letter', [['A', 'a'], ['B', 'b'], ['D', 'd'], ['G', 'g'], ['M', 'm'], ['R', 'r']], 'Every big (capital) letter has a small letter partner.'),
        ord('Put the letters in ABC order', ['A', 'B', 'C', 'D'], 'The alphabet starts A, B, C, D.'),
        ord('Put the letters in ABC order', ['E', 'F', 'G', 'H'], 'In the alphabet: E, F, G, H.'),
        ord('Put the letters in ABC order', ['P', 'Q', 'R', 'S'], 'In the alphabet: P, Q, R, S.'),
        mem('Find each big letter and its small letter!', [['A', 'a'], ['B', 'b'], ['E', 'e'], ['H', 'h'], ['T', 't'], ['Q', 'q']])
      ] },
    { id: 5, test: true, from: [1, 2, 3, 4], title: 'Meadow Test 1', topic: 'colors, shapes, counting & letters', icon: '🏆', learn: 'A mixed review of levels 1 to 4.', sticker: ['🏅', 'Meadow Medal'] },
    { id: 6, title: 'Animal Friends', topic: 'animals', icon: '🐄', learn: 'Animal sounds, animal babies and where animals live.', sticker: ['🐰', 'Bunny Friend'],
      pool: [
        mc('Which animal says “Moo”?', '🐄', ['🐑', '🐷', '🐔'], 'Cows say moo!'),
        mc('Which animal says “Woof”?', '🐶', ['🐱', '🐮', '🐸'], 'Dogs say woof!'),
        mc('Which animal says “Meow”?', '🐱', ['🐶', '🦆', '🐴'], 'Cats say meow!'),
        mc('Which animal says “Quack”?', '🦆', ['🐷', '🐑', '🐄'], 'Ducks say quack!'),
        mc('Which animal has a very long neck?', '🦒', ['🐷', '🐢', '🐰'], 'Giraffes have super long necks to reach leaves on tall trees.'),
        mc('Which animal has a trunk?', '🐘', ['🦁', '🐒', '🦓'], 'Elephants use their long trunk like a nose and a hand.'),
        mc('Which animal can fly?', '🐦', ['🐢', '🐕', '🐄'], 'Most birds can fly with their wings.'),
        mc('Which animal hops and lives near a pond?', '🐸', ['🐌', '🐟', '🐄'], 'Frogs hop and like ponds.'),
        mc('What do we get from cows to drink?', 'Milk 🥛', ['Juice 🧃', 'Lemonade 🍋', 'Cocoa ☕'], 'Cows give us milk.'),
        mc('A baby dog is called a…', 'Puppy', ['Kitten', 'Calf', 'Chick'], 'A baby dog is a puppy.', { v: '🐶' }),
        mc('A baby cat is called a…', 'Kitten', ['Puppy', 'Lamb', 'Foal'], 'A baby cat is a kitten.', { v: '🐱' }),
        mc('A baby sheep is called a…', 'Lamb', ['Cub', 'Kitten', 'Duckling'], 'A baby sheep is a lamb.', { v: '🐑' }),
        tf('A fish lives in water.', true, 'Fish live in water and breathe with gills.', { v: '🐟' }),
        tf('A cow can fly.', false, 'Cows walk on four legs — only in stories can they fly!', { v: '🐄' }),
        tf('A spider has 8 legs.', true, 'Count them: spiders have 8 legs.', { v: '🕷️' }),
        tf('Birds have feathers.', true, 'Yes! Only birds have feathers.', { v: '🐦' }),
        match('Match each animal to its sound', [['🐶', 'Woof'], ['🐱', 'Meow'], ['🐄', 'Moo'], ['🦆', 'Quack'], ['🐑', 'Baa'], ['🐷', 'Oink']], 'Every animal has its own sound!'),
        match('Match each animal to its home', [['🐝', 'Hive'], ['🐦', 'Nest'], ['🐟', 'Pond'], ['🐰', 'Burrow'], ['🐴', 'Stable'], ['🕷️', 'Web']], 'Animals live in all kinds of homes.'),
        memSame('Find the matching animals!', ['🐶', '🐱', '🐰', '🐸', '🐷', '🐮'])
      ] },
    { id: 7, title: 'Pattern Parade', topic: 'patterns', icon: '🧩', learn: 'Find what comes next in repeating patterns.', sticker: ['🧩', 'Puzzle Piece'],
      pool: [
        pat(['1', '2', '1', '2', '1'], '2', ['1', '3', '4'], 'The pattern repeats 1, 2 — so 2 comes next.'),
        pat(['🌞', '🌙', '🌞', '🌙'], '🌞', ['🌙', '⭐', '☁️'], 'Sun, moon, sun, moon… sun comes next!'),
        pat(['🐶', '🐶', '🐱', '🐶', '🐶'], '🐱', ['🐶', '🐰', '🐭'], 'The pattern is dog, dog, cat — so cat comes next.'),
        tf('In the pattern 🔴 🔵 🔴 🔵 … the next one is 🔴.', true, 'Red, blue, red, blue… red comes next!')
      ],
      gen: () => genPattern(14, ['AB', 'AB', 'AAB', 'ABB', 'ABC']) },
    { id: 8, title: 'More or Less', topic: 'comparing numbers', icon: '⚖️', learn: 'Which group has more, and which number comes before or after.', sticker: ['🍎', 'Counting Apple'], tags: ['math'],
      pool: [
        mc('Zero means…', 'Nothing at all', ['One thing', 'Ten things', 'A lot'], 'Zero (0) means none — nothing at all.'),
        tf('7 is more than 4.', true, '7 comes after 4 when we count, so it is more.'),
        tf('3 is more than 8.', false, '8 is more than 3.'),
        tf('10 is the biggest number from 1 to 10.', true, 'Counting 1 to 10 ends with 10 — the biggest!')
      ],
      gen: () => [].concat(genMore(5), genBeforeAfter(6, 10), genOrderNums(10, 2, 4), genCount(3, 10)) },
    { id: 9, title: 'Bugs & Flowers', topic: 'bugs and flowers', icon: '🦋', learn: 'Discover bees, butterflies, ladybugs and flowers.', sticker: ['🦋', 'Butterfly'],
      pool: [
        mc('Which bug makes honey?', '🐝', ['🐞', '🐜', '🐛'], 'Bees make honey from flower nectar.'),
        mc('A caterpillar grows up to become a…', '🦋 Butterfly', ['🐝 Bee', '🐞 Ladybug', '🐌 Snail'], 'Caterpillars turn into butterflies!', { v: '🐛' }),
        mc('How many legs does an insect have?', '6', ['4', '8', '10'], 'All insects have 6 legs.', { v: '🐜' }),
        mc('Which one is a flower?', '🌷', ['🍄', '🌵', '🌳'], 'The tulip 🌷 is a flower.'),
        mc('What color are the spots on most ladybugs?', 'Black ⚫', ['Blue 🔵', 'Green 🟢', 'Pink 🌸'], 'Most ladybugs are red with black spots.', { v: '🐞' }),
        mc('Where do honeybees live?', 'In a hive', ['In a nest of mud', 'Under the sea', 'In a shell'], 'Honeybees live together in a hive.', { v: '🐝' }),
        mc('What do bees collect from flowers?', 'Nectar', ['Sand', 'Rocks', 'Milk'], 'Bees drink sweet nectar from flowers to make honey.'),
        mc('Which animal spins a web?', '🕷️', ['🐝', '🐞', '🦋'], 'Spiders spin sticky webs to catch food.'),
        mc('Which one carries its shell on its back?', '🐌', ['🐜', '🦋', '🐝'], 'Snails carry their shell home everywhere they go.'),
        tf('Ants are very strong for their size.', true, 'Ants can carry things much heavier than their own body!', { v: '🐜' }),
        tf('A worm has lots of legs.', false, 'Worms have no legs at all — they wiggle!'),
        tf('Butterflies taste with their feet.', true, 'It’s true! Butterflies have taste sensors on their feet.', { v: '🦋' }),
        tf('Flowers need water to grow.', true, 'Like all plants, flowers need water and sunlight.', { v: '🌻' }),
        tf('A spider is an insect.', false, 'Spiders have 8 legs, insects have 6 — so a spider is not an insect.', { v: '🕷️' }),
        ord('Put the butterfly’s life in order', ['🥚 Egg', '🐛 Caterpillar', '🛌 Cocoon', '🦋 Butterfly'], 'Egg → caterpillar → chrysalis (cocoon) → butterfly!'),
        match('Match the bug to what it does', [['🐝', 'Makes honey'], ['🕷️', 'Spins webs'], ['🐛', 'Eats leaves'], ['🐌', 'Carries a shell']], 'Every little creature has a special job.'),
        memSame('Find the matching bugs and flowers!', ['🐝', '🦋', '🐞', '🌷', '🌻', '🐛'])
      ] },
    { id: 10, test: true, from: [1, 2, 3, 4, 6, 7, 8, 9], title: 'Meadow Big Test', topic: 'everything in Rainbow Meadow', icon: '🏆', learn: 'The big review of the whole Rainbow Meadow!', sticker: ['🏆', 'Meadow Trophy'] },

    /* ---------------- WORLD 2 · OCEAN REEF ---------------- */
    { id: 11, title: 'Adding Bubbles', topic: 'adding to 20', icon: '➕', learn: 'Add numbers up to 20 by counting on.', sticker: ['🐠', 'Tropical Fish'], tags: ['math'],
      pool: [
        mc('Doubles! 5 + 5 = ?', '10', ['8', '11', '55'], '5 + 5 = 10, like two hands of fingers!'),
        mc('Which is the same as 10?', '6 + 4', ['5 + 4', '7 + 4', '3 + 3'], '6 + 4 = 10.'),
        tf('Adding 0 to a number keeps it the same.', true, '7 + 0 = 7 — adding nothing changes nothing!')
      ],
      gen: () => [].concat(genAdd(10, 6), genAdd(20, 9, 5)) },
    { id: 12, title: 'Taking Away', topic: 'subtracting to 20', icon: '➖', learn: 'Take away numbers up to 20.', sticker: ['🦀', 'Crab Pal'], tags: ['math'],
      pool: [
        mc('10 − 10 = ?', '0', ['10', '1', '20'], 'If you take away everything, nothing is left: 0.'),
        tf('Taking away 0 keeps a number the same.', true, '9 − 0 = 9 — nothing was taken away.')
      ],
      gen: () => [].concat(genSub(10, 6), genSub(20, 9, 11)) },
    { id: 13, title: 'First Words', topic: 'first words', icon: '📖', learn: 'Read and spell short words like cat, dog and sun.', sticker: ['📖', 'First Book'],
      pool: [
        mc('Which word is this?', 'cat', ['cot', 'cut', 'car'], 'C-A-T spells cat.', { v: '🐱' }),
        mc('Which word is this?', 'dog', ['dig', 'dot', 'log'], 'D-O-G spells dog.', { v: '🐶' }),
        mc('Which word is this?', 'sun', ['run', 'sum', 'bun'], 'S-U-N spells sun.', { v: '☀️' }),
        mc('Which word is this?', 'pig', ['big', 'peg', 'pin'], 'P-I-G spells pig.', { v: '🐷' }),
        mc('Which word is this?', 'hat', ['hot', 'hit', 'ham'], 'H-A-T spells hat.', { v: '🎩' }),
        mc('Which word is this?', 'bed', ['bad', 'bud', 'red'], 'B-E-D spells bed.', { v: '🛏️' }),
        mc('Which word is this?', 'bus', ['bun', 'bug', 'but'], 'B-U-S spells bus.', { v: '🚌' }),
        mc('Which word is this?', 'fox', ['box', 'fix', 'fog'], 'F-O-X spells fox.', { v: '🦊' }),
        mc('Which word is this?', 'cup', ['cap', 'pup', 'cut'], 'C-U-P spells cup.', { v: '☕' }),
        mc('Which word is this?', 'egg', ['leg', 'beg', 'peg'], 'E-G-G spells egg.', { v: '🥚' }),
        tf('“dog” is spelled D-O-G.', true, 'Yes! D-O-G.'),
        tf('“sun” is spelled S-A-N.', false, 'Sun is spelled S-U-N.'),
        ord('Put the letters in order to spell 🐶', ['D', 'O', 'G'], 'D-O-G spells dog!'),
        ord('Put the letters in order to spell 🐱', ['C', 'A', 'T'], 'C-A-T spells cat!'),
        ord('Put the letters in order to spell 🐟', ['F', 'I', 'S', 'H'], 'F-I-S-H spells fish!'),
        match('Match the word to its picture', [['cat', '🐱'], ['dog', '🐶'], ['sun', '☀️'], ['bus', '🚌'], ['hat', '🎩'], ['fish', '🐟']], 'Reading words is like a secret code!'),
        mem('Match each word to its picture!', [['cat', '🐱'], ['dog', '🐶'], ['sun', '☀️'], ['pig', '🐷'], ['egg', '🥚'], ['bus', '🚌']])
      ] },
    { id: 14, title: 'Sea Creatures', topic: 'sea animals', icon: '🐙', learn: 'Meet whales, octopuses, crabs, sharks and more.', sticker: ['🐙', 'Octopus'],
      pool: [
        mc('Which sea animal has 8 arms?', '🐙', ['🦀', '🐠', '🐬'], 'An octopus has 8 arms. Octo means eight!'),
        mc('Which sea animal has claws and walks sideways?', '🦀', ['🐙', '🐬', '🐳'], 'Crabs walk sideways and pinch with their claws.'),
        mc('What is the biggest animal in the world?', 'Blue whale 🐋', ['Shark 🦈', 'Octopus 🐙', 'Dolphin 🐬'], 'The blue whale is the biggest animal that has ever lived!'),
        mc('Which sea animal has a hard shell and lays eggs on the beach?', 'Sea turtle 🐢', ['Dolphin 🐬', 'Jellyfish', 'Shark 🦈'], 'Sea turtles crawl onto beaches to lay their eggs in the sand.'),
        mc('A big group of fish swimming together is called a…', 'School', ['Herd', 'Flock', 'Pack'], 'Fish swim together in a school.', { v: '🐟' }),
        mc('Which whale has a long tusk and is called the “unicorn of the sea”?', 'Narwhal', ['Dolphin', 'Seal', 'Shark'], 'The narwhal has a long tusk — it is really a very long tooth!'),
        mc('Which of these lives in the sea?', '🐠', ['🐫', '🦁', '🐿️'], 'Tropical fish live in the sea. Camels, lions and squirrels live on land.'),
        mc('Penguins are birds that cannot fly, but they are great at…', 'Swimming', ['Climbing trees', 'Flying high', 'Digging tunnels'], 'Penguins use their wings like flippers to swim fast!', { v: '🐧' }),
        mc('Which body part do fish use to breathe?', 'Gills', ['Lungs', 'Ears', 'Tails'], 'Fish breathe through gills, which take oxygen from water.', { v: '🐟' }),
        tf('A whale is a mammal that breathes air.', true, 'Whales come up to the surface to breathe air.', { v: '🐳' }),
        tf('A starfish is a real fish.', false, 'A starfish (sea star) is not a fish — it has no backbone and no fins.', { v: '⭐' }),
        tf('Sharks have many rows of teeth.', true, 'Sharks have rows of teeth and grow new ones all the time.', { v: '🦈' }),
        tf('An octopus has 3 hearts.', true, 'Amazing but true: an octopus has 3 hearts!', { v: '🐙' }),
        tf('Ocean water is salty.', true, 'Sea water has lots of salt in it — that’s why we can’t drink it.', { v: '🌊' }),
        match('Match each sea animal to its name', [['🐙', 'Octopus'], ['🦀', 'Crab'], ['🐬', 'Dolphin'], ['🦈', 'Shark'], ['🐢', 'Turtle'], ['🐳', 'Whale']], 'Now you know the sea animals!'),
        memSame('Find the matching sea animals!', ['🐙', '🦀', '🐬', '🦈', '🐢', '🐠'])
      ] },
    { id: 15, test: true, from: [11, 12, 13, 14], title: 'Reef Test 1', topic: 'adding, taking away, words & sea animals', icon: '🏆', learn: 'A mixed review of levels 11 to 14.', sticker: ['🥇', 'Reef Medal'] },
    { id: 16, title: 'Opposites', topic: 'opposites', icon: '🌗', learn: 'Big and small, hot and cold — words that mean the opposite.', sticker: ['🌗', 'Half Moon'],
      pool: [
        mc('What is the opposite of HOT?', 'Cold ❄️', ['Warm', 'Red', 'Fast'], 'Hot ↔ cold. Warm is just a little hot!', { v: '🔥' }),
        mc('What is the opposite of BIG?', 'Small', ['Huge', 'Tall', 'Round'], 'Big ↔ small.', { v: '🐘' }),
        mc('What is the opposite of UP?', 'Down', ['Over', 'High', 'Top'], 'Up ↔ down.', { v: '⬆️' }),
        mc('What is the opposite of DAY?', 'Night 🌙', ['Morning', 'Sunny', 'Noon'], 'Day ↔ night.', { v: '☀️' }),
        mc('What is the opposite of HAPPY?', 'Sad', ['Glad', 'Silly', 'Funny'], 'Happy ↔ sad. Glad means the same as happy!', { v: '😀' }),
        mc('What is the opposite of FAST?', 'Slow', ['Quick', 'Speedy', 'Strong'], 'Fast ↔ slow. Quick means the same as fast.', { v: '🐇' }),
        mc('What is the opposite of OPEN?', 'Closed', ['Wide', 'Empty', 'Inside'], 'Open ↔ closed.', { v: '🚪' }),
        mc('What is the opposite of FULL?', 'Empty', ['Heavy', 'Big', 'Round'], 'Full ↔ empty.', { v: '🥛' }),
        mc('What is the opposite of WET?', 'Dry', ['Cold', 'Rainy', 'Soft'], 'Wet ↔ dry.', { v: '💧' }),
        mc('What is the opposite of LOUD?', 'Quiet', ['Noisy', 'Happy', 'Long'], 'Loud ↔ quiet. Shhh!', { v: '📢' }),
        mc('What is the opposite of TALL?', 'Short', ['Long', 'High', 'Thin'], 'Tall ↔ short.', { v: '🦒' }),
        mc('What is the opposite of SOFT?', 'Hard', ['Fluffy', 'Gentle', 'Warm'], 'Soft ↔ hard.', { v: '🧸' }),
        tf('“Up” is the opposite of “down”.', true, 'Yes! Up ↔ down.'),
        tf('“Fast” is the opposite of “quick”.', false, 'Fast and quick mean the same thing! The opposite of fast is slow.'),
        tf('“In” is the opposite of “out”.', true, 'Yes! In ↔ out.'),
        match('Match the opposites', [['Hot', 'Cold'], ['Big', 'Small'], ['Up', 'Down'], ['Day', 'Night'], ['Happy', 'Sad'], ['Open', 'Closed']], 'Opposites are as different as can be!'),
        mem('Find the opposite pairs!', [['Hot', 'Cold'], ['Big', 'Small'], ['Fast', 'Slow'], ['Wet', 'Dry'], ['Full', 'Empty'], ['Loud', 'Quiet']])
      ] },
    { id: 17, title: 'Big & Small', topic: 'size comparison', icon: '🐳', learn: 'Compare sizes and numbers: bigger, smaller, taller, heavier.', sticker: ['🐳', 'Whale of a Size'], tags: ['math'],
      pool: [
        mc('Which animal is the biggest?', 'Elephant 🐘', ['Mouse 🐭', 'Cat 🐱', 'Rabbit 🐰'], 'Elephants are the biggest animals that live on land.'),
        mc('Which is the smallest?', 'Ant 🐜', ['Dog 🐕', 'Horse 🐎', 'Cow 🐄'], 'An ant is tiny — much smaller than a dog, horse or cow.'),
        mc('Which is heavier?', 'A car 🚗', ['A leaf 🍃', 'A feather', 'A balloon 🎈'], 'A car is very heavy. Leaves, feathers and balloons are light.'),
        mc('Which is longer?', 'A train 🚂', ['A pencil ✏️', 'A spoon 🥄', 'A shoe 👟'], 'A train is much longer than a pencil, spoon or shoe.'),
        mc('Which animal is the tallest?', 'Giraffe 🦒', ['Cat 🐱', 'Dog 🐕', 'Pig 🐷'], 'Giraffes are the tallest animals in the world.'),
        mc('Which sign means “is bigger than”?', '>', ['<', '=', '+'], 'The > sign opens its mouth toward the bigger number: 5 > 2.'),
        ord('Put them in order from smallest to biggest', ['🐜 Ant', '🐭 Mouse', '🐕 Dog', '🐘 Elephant'], 'Ant, mouse, dog, elephant — from tiny to huge!'),
        ord('Put them in order from smallest to biggest', ['🍒 Cherry', '🍎 Apple', '🍉 Watermelon'], 'A cherry is small, an apple is medium and a watermelon is big.'),
        tf('A mouse is bigger than a horse.', false, 'A horse is much bigger than a mouse.'),
        tf('The Sun is bigger than the Earth.', true, 'The Sun is so big that about a million Earths could fit inside it!', { v: '☀️' }),
        tf('15 is bigger than 51.', false, '51 has 5 tens; 15 has only 1 ten. So 51 is bigger.')
      ],
      gen: () => [].concat(genCompare(20, 4), genOrderNums(20, 2, 4)) },
    { id: 18, title: 'Number Mix', topic: 'adding & taking away', icon: '🐚', learn: 'Mix adding and taking away up to 20, and find missing numbers.', sticker: ['🐚', 'Magic Shell'], tags: ['math'],
      pool: [
        tf('8 + 2 is the same as 2 + 8.', true, 'You can add in any order: both make 10!'),
        mc('Which number makes 10?  7 + __', '3', ['2', '4', '17'], '7 + 3 = 10.')
      ],
      gen: () => [].concat(genAdd(20, 5, 3), genSub(20, 5, 8), genMissing(20, 6)) },
    { id: 19, title: 'Rhyme Time', topic: 'rhymes and sounds', icon: '🎵', learn: 'Find words that rhyme and words that start with the same sound.', sticker: ['🎵', 'Rhyme Note'],
      pool: [
        mc('Which word rhymes with CAT?', 'hat', ['dog', 'cup', 'sun'], 'Cat and hat both end with “-at”.'),
        mc('Which word rhymes with DOG?', 'frog', ['cat', 'dig', 'bed'], 'Dog and frog both end with “-og”.'),
        mc('Which word rhymes with SUN?', 'bun', ['sit', 'moon', 'sad'], 'Sun and bun both end with “-un”.'),
        mc('Which word rhymes with BEE?', 'tree', ['bed', 'bat', 'bus'], 'Bee and tree both end with an “ee” sound.'),
        mc('Which word rhymes with CAKE?', 'snake', ['cat', 'cook', 'kite'], 'Cake and snake both end with “-ake”.'),
        mc('Which word rhymes with STAR?', 'car', ['stop', 'sun', 'sky'], 'Star and car both end with “-ar”.'),
        mc('Which word rhymes with MOON?', 'spoon', ['moth', 'mean', 'man'], 'Moon and spoon both end with “-oon”.'),
        mc('Which word rhymes with FISH?', 'dish', ['fan', 'fox', 'fist'], 'Fish and dish both end with “-ish”.'),
        mc('Which word rhymes with BOAT?', 'coat', ['bat', 'boot', 'bit'], 'Boat and coat both end with “-oat”.'),
        mc('Which word rhymes with KING?', 'ring', ['kite', 'kick', 'cake'], 'King and ring both end with “-ing”.'),
        mc('Which word starts with the same sound as BALL?', 'bat', ['cat', 'dog', 'sun'], 'B-b-ball and b-b-bat both start with B.'),
        mc('Which word starts with the same sound as MOUSE?', 'milk', ['house', 'nose', 'sock'], 'M-m-mouse and m-m-milk both start with M.'),
        tf('“Cake” rhymes with “snake”.', true, 'Yes! Cake – snake.'),
        tf('“Moon” rhymes with “fish”.', false, 'Moon rhymes with spoon; fish rhymes with dish.'),
        match('Match the rhyming words', [['cat', 'hat'], ['bee', 'tree'], ['moon', 'spoon'], ['star', 'car'], ['king', 'ring'], ['boat', 'coat']], 'Rhyming words sound the same at the end.'),
        mem('Find the rhyming pairs!', [['cat', 'hat'], ['fish', 'dish'], ['bee', 'tree'], ['frog', 'dog'], ['cake', 'snake'], ['moon', 'spoon']])
      ] },
    { id: 20, test: true, from: [11, 12, 13, 14, 16, 17, 18, 19], title: 'Reef Big Test', topic: 'everything in Ocean Reef', icon: '🏆', learn: 'The big review of the whole Ocean Reef!', sticker: ['⚓', 'Golden Anchor'] },

    /* ---------------- WORLD 3 · JUNGLE CANOPY ---------------- */
    { id: 21, title: 'Jungle Adding', topic: 'adding to 100', icon: '🐒', learn: 'Add bigger numbers: tens first, then ones.', sticker: ['🐒', 'Cheeky Monkey'], tags: ['math'],
      pool: [
        mc('10 + 10 + 10 = ?', '30', ['20', '40', '33'], 'Three tens make 30.'),
        mc('50 + 50 = ?', '100', ['55', '90', '1000'], '5 tens + 5 tens = 10 tens = 100.'),
        tf('40 + 20 = 60', true, '4 tens + 2 tens = 6 tens = 60.')
      ],
      gen: () => [].concat(genAdd(100, 7, 10, 10), genAdd(60, 5, 10, 10)) },
    { id: 22, title: 'Jungle Take-Away', topic: 'subtracting to 100', icon: '🦜', learn: 'Take away bigger numbers and check your answer by adding.', sticker: ['🦜', 'Parrot'], tags: ['math'],
      pool: [
        mc('100 − 1 = ?', '99', ['90', '101', '10'], 'One less than 100 is 99.'),
        mc('70 − 30 = ?', '40', ['30', '100', '43'], '7 tens − 3 tens = 4 tens = 40.'),
        tf('90 − 50 = 40', true, '9 tens − 5 tens = 4 tens = 40.')
      ],
      gen: () => [].concat(genSub(100, 7, 25, 10), genSub(60, 5, 20, 10)) },
    { id: 23, title: 'Spelling Safari', topic: 'spelling', icon: '✏️', learn: 'Spot the correctly spelled word.', sticker: ['✏️', 'Super Pencil'],
      pool: [
        mc('Which word is spelled correctly?', 'elephant', ['elefant', 'eliphant', 'elephent'], 'E-L-E-P-H-A-N-T. The “f” sound is spelled “ph”!', { v: '🐘' }),
        mc('Which word is spelled correctly?', 'because', ['becuase', 'becos', 'beacause'], 'B-E-C-A-U-S-E: be-cause.'),
        mc('Which word is spelled correctly?', 'friend', ['freind', 'frend', 'friand'], 'F-R-I-E-N-D. Remember: a friend is there to the END!'),
        mc('Which word is spelled correctly?', 'school', ['skool', 'scool', 'shcool'], 'S-C-H-O-O-L: school.', { v: '🏫' }),
        mc('Which word is spelled correctly?', 'rabbit', ['rabit', 'rabbitt', 'rabet'], 'R-A-B-B-I-T, with a double B.', { v: '🐰' }),
        mc('Which word is spelled correctly?', 'house', ['hous', 'howse', 'huose'], 'H-O-U-S-E: house.', { v: '🏠' }),
        mc('Which word is spelled correctly?', 'water', ['watter', 'wotter', 'watar'], 'W-A-T-E-R: water.', { v: '💧' }),
        mc('Which word is spelled correctly?', 'little', ['littel', 'litle', 'lettle'], 'L-I-T-T-L-E, with a double T.'),
        mc('Which word is spelled correctly?', 'happy', ['hapy', 'happey', 'hapee'], 'H-A-P-P-Y, with a double P.', { v: '😀' }),
        mc('Which word is spelled correctly?', 'animal', ['animel', 'anamal', 'aminal'], 'A-N-I-M-A-L: an-i-mal.', { v: '🐾' }),
        mc('Which word is spelled correctly?', 'yellow', ['yelow', 'yellou', 'yello'], 'Y-E-L-L-O-W, with a double L.', { v: '🟡' }),
        mc('Which word is spelled correctly?', 'monkey', ['monky', 'munkey', 'monkee'], 'M-O-N-K-E-Y: monkey.', { v: '🐒' }),
        mc('Which word is spelled correctly?', 'banana', ['bananna', 'banan', 'bannana'], 'B-A-N-A-N-A: ba-na-na.', { v: '🍌' }),
        mc('Which word is spelled correctly?', 'flower', ['flowr', 'flowar', 'flouer'], 'F-L-O-W-E-R: flower.', { v: '🌺' }),
        mc('Fill in the missing letter:  m _ n k e y', 'o', ['a', 'u', 'e'], 'Monkey is spelled M-O-N-K-E-Y.', { v: '🐒' }),
        mc('Fill in the missing letter:  t i g _ r', 'e', ['a', 'i', 'o'], 'Tiger is spelled T-I-G-E-R.', { v: '🐯' }),
        tf('“Tiger” is spelled T-I-G-E-R.', true, 'Yes! T-I-G-E-R.', { v: '🐯' }),
        tf('“Jungle” is spelled J-U-N-G-E-L.', false, 'Jungle is spelled J-U-N-G-L-E.'),
        ord('Put the letters in order to spell 🐸', ['F', 'R', 'O', 'G'], 'F-R-O-G spells frog!'),
        ord('Put the letters in order to spell 🌳', ['T', 'R', 'E', 'E'], 'T-R-E-E spells tree!')
      ] },
    { id: 24, title: 'Plant Power', topic: 'plants', icon: '🌻', learn: 'Parts of a plant and what plants need to grow.', sticker: ['🌻', 'Sunflower'],
      pool: [
        mc('Which part of a plant takes in water from the soil?', 'Roots', ['Flower', 'Leaves', 'Fruit'], 'Roots grow underground and drink water from the soil.'),
        mc('What do plants need to grow?', 'Sunlight, water and air', ['Candy and juice', 'Only darkness', 'Toys and games'], 'Plants need sunlight, water and air (and soil helps too).'),
        mc('Which part of a plant makes seeds?', 'Flower', ['Roots', 'Stem', 'Bark'], 'Flowers make seeds that can grow into new plants.', { v: '🌸' }),
        mc('What do most plants grow from?', 'A seed 🌱', ['A rock', 'A shell', 'A feather'], 'Most plants start as a tiny seed.'),
        mc('Which part holds the plant up and carries water to the leaves?', 'Stem', ['Petal', 'Root hair', 'Seed'], 'The stem is like a straw and a backbone for the plant.'),
        mc('Plants give off a gas that we breathe. What is it?', 'Oxygen', ['Smoke', 'Carbon dioxide', 'Helium'], 'Plants take in carbon dioxide and give us oxygen to breathe!'),
        mc('Which of these is a fruit that grows on a tree?', '🍎 Apple', ['🥕 Carrot', '🥔 Potato', '🧅 Onion'], 'Apples grow on apple trees.'),
        mc('Which vegetable grows under the ground?', '🥕 Carrot', ['🍅 Tomato', '🌽 Corn', '🍆 Eggplant'], 'A carrot is a root that grows under the ground.'),
        mc('A cactus grows best in…', 'The desert 🏜️', ['The ocean', 'A dark cave', 'Deep snow'], 'Cactuses store water, so they live well in dry deserts.', { v: '🌵' }),
        mc('Bees help flowers by carrying…', 'Pollen', ['Sand', 'Water', 'Rocks'], 'Bees carry pollen from flower to flower, which helps make seeds.', { v: '🐝' }),
        mc('What color are most leaves in summer?', 'Green 🟢', ['Blue 🔵', 'Purple 🟣', 'White ⚪'], 'Leaves are green because of something called chlorophyll.', { v: '🍃' }),
        tf('Plants make their own food using sunlight.', true, 'Yes! Leaves use sunlight to make food for the plant.', { v: '☀️' }),
        tf('A tree is a plant.', true, 'Trees are big plants with woody stems called trunks.', { v: '🌳' }),
        tf('Plants grow well in total darkness forever.', false, 'Plants need light to make their food.'),
        ord('Put the steps in order: how a plant grows', ['🌰 Seed', '🌱 Sprout', '🌿 Young plant', '🌻 Flower'], 'Seed → sprout → young plant → flower!'),
        match('Match the plant part to its job', [['Roots', 'Drink water'], ['Leaves', 'Make food'], ['Stem', 'Hold it up'], ['Flower', 'Make seeds']], 'Each part of a plant has a job.'),
        memSame('Find the matching plants!', ['🌻', '🌵', '🌴', '🍄', '🌷', '🌲'])
      ] },
    { id: 25, test: true, from: [21, 22, 23, 24], title: 'Jungle Test 1', topic: 'big adding, take-away, spelling & plants', icon: '🏆', learn: 'A mixed review of levels 21 to 24.', sticker: ['🐯', 'Tiger Medal'] },
    { id: 26, title: 'My Amazing Body', topic: 'the human body', icon: '💪', learn: 'Your heart, lungs, brain, bones and five senses.', sticker: ['💪', 'Strong Arm'],
      pool: [
        mc('Which organ pumps blood around your body?', 'Heart ❤️', ['Lungs', 'Stomach', 'Brain'], 'Your heart is a strong muscle that pumps blood all day and night.'),
        mc('What do you use to breathe?', 'Lungs', ['Heart', 'Bones', 'Stomach'], 'Your lungs fill with air every time you breathe in.'),
        mc('Which body part helps you think and remember?', 'Brain 🧠', ['Heart', 'Lungs', 'Elbow'], 'Your brain is the boss of your body!'),
        mc('How many main senses do people have?', '5', ['3', '7', '10'], 'Our 5 main senses are sight, hearing, smell, taste and touch.'),
        mc('You see with your…', 'Eyes 👀', ['Ears 👂', 'Nose 👃', 'Hands ✋'], 'We see with our eyes.'),
        mc('You hear with your…', 'Ears 👂', ['Eyes 👀', 'Tongue 👅', 'Feet 🦶'], 'We hear with our ears.'),
        mc('You smell with your…', 'Nose 👃', ['Ears 👂', 'Eyes 👀', 'Knees'], 'We smell with our nose.'),
        mc('You taste with your…', 'Tongue 👅', ['Nose 👃', 'Ears 👂', 'Hair'], 'Taste buds on your tongue let you taste.'),
        mc('What holds your body up and gives it shape?', 'Skeleton (bones) 🦴', ['Hair', 'Nails', 'Freckles'], 'Your skeleton is made of bones — adults have 206 of them!'),
        mc('Where does food go after you swallow it?', 'Stomach', ['Lungs', 'Heart', 'Brain'], 'Food goes down to your stomach, where it gets broken down.'),
        mc('Which is the healthiest snack?', '🍎 Apple', ['🍭 Lollipop', '🍩 Donut', '🍬 Candy'], 'Fruit gives your body vitamins and energy.'),
        tf('You should brush your teeth twice a day.', true, 'Brushing in the morning and at night keeps teeth healthy.', { v: '😁' }),
        tf('Your heart is a muscle.', true, 'Yes! Your heart is a muscle that never takes a holiday.'),
        tf('Bones are soft like jelly.', false, 'Bones are hard and strong — they protect your body.', { v: '🦴' }),
        tf('Drinking water is good for your body.', true, 'Water helps every part of your body work well.', { v: '💧' }),
        match('Match the sense to the body part', [['Sight', '👀'], ['Hearing', '👂'], ['Smell', '👃'], ['Taste', '👅'], ['Touch', '✋']], 'Five senses, five helpers!'),
        mem('Match each sense to its body part!', [['See', '👀'], ['Hear', '👂'], ['Smell', '👃'], ['Taste', '👅'], ['Touch', '✋'], ['Think', '🧠']])
      ] },
    { id: 27, title: 'Tick-Tock Time', topic: 'telling time', icon: '⏰', learn: 'Read clocks: o’clock and half past.', sticker: ['⏰', 'Alarm Clock'],
      pool: [
        mc('How many minutes are in one hour?', '60', ['100', '30', '12'], 'One hour has 60 minutes.'),
        mc('How many hours are in one day?', '24', ['12', '60', '7'], 'A whole day and night is 24 hours.'),
        mc('When the long hand points to 12, the time is…', 'o’clock', ['half past', 'quarter past', 'quarter to'], 'Long hand on 12 means exactly o’clock.'),
        mc('When the long hand points to 6, it is…', 'half past', ['o’clock', 'quarter past', 'midnight'], 'Long hand on 6 means half past — 30 minutes.'),
        mc('Which hand shows the hour?', 'The short hand', ['The long hand', 'Both hands', 'Neither hand'], 'The short hand shows hours; the long hand shows minutes.'),
        mc('What time is 30 minutes after 2:00?', '2:30', ['3:00', '2:15', '1:30'], '2:00 plus 30 minutes is 2:30 — half past two.'),
        tf('Half an hour is 30 minutes.', true, 'Half of 60 minutes is 30 minutes.'),
        tf('A quarter of an hour is 15 minutes.', true, '60 ÷ 4 = 15 minutes.'),
        ord('Put the parts of the day in order', ['🌅 Morning', '☀️ Afternoon', '🌆 Evening', '🌙 Night'], 'Morning, afternoon, evening, night!')
      ],
      gen: () => genClock(10, [0, 30]) },
    { id: 28, title: 'Number Trails', topic: 'sequences', icon: '🐍', learn: 'Skip counting, days of the week and months of the year.', sticker: ['🐍', 'Sequence Snake'],
      pool: [
        mc('Which day comes after Friday?', 'Saturday', ['Thursday', 'Sunday', 'Monday'], 'Friday, then Saturday, then Sunday.'),
        mc('Which month comes after March?', 'April', ['May', 'February', 'June'], 'January, February, March, April…'),
        mc('How many days are in a week?', '7', ['5', '10', '12'], 'Monday to Sunday is 7 days.'),
        mc('How many months are in a year?', '12', ['10', '7', '52'], 'January to December is 12 months.'),
        ord('Put the days in order', ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], 'Monday, Tuesday, Wednesday, Thursday.'),
        ord('Put the days in order', ['Friday', 'Saturday', 'Sunday'], 'Friday, Saturday, Sunday — weekend!'),
        ord('Put the months in order', ['January', 'February', 'March', 'April'], 'The year starts January, February, March, April.'),
        ord('Put the months in order', ['September', 'October', 'November', 'December'], 'The year ends September, October, November, December.')
      ],
      gen: () => genSeq(10, [2, 5, 10, 3], false) },
    { id: 29, title: 'Number Explorer', topic: 'numbers to 100', icon: '🍌', learn: 'Tens and ones, even and odd, and comparing numbers.', sticker: ['🍌', 'Banana Bunch'], tags: ['math'],
      pool: [
        tf('Every even number can be split into two equal groups.', true, 'Even numbers share fairly into 2 equal groups.'),
        mc('What is 10 more than 47?', '57', ['48', '37', '147'], 'Adding 10 makes the tens digit go up by one: 47 → 57.')
      ],
      gen: () => [].concat(genPlaceValue(4), genEvenOdd(3), genCompare(100, 3), genMissing(50, 3), genOrderNums(100, 2, 4)) },
    { id: 30, test: true, from: [21, 22, 23, 24, 26, 27, 28, 29], title: 'Jungle Big Test', topic: 'everything in Jungle Canopy', icon: '🏆', learn: 'The big review of the whole Jungle Canopy!', sticker: ['🦁', 'Jungle Lion'] },

    /* ---------------- WORLD 4 · SKY ISLANDS (timers start here) ---------------- */
    { id: 31, title: 'Times Tables 2·5·10', topic: 'the 2, 5 and 10 times tables', icon: '🎈', learn: 'Multiply by 2, 5 and 10 by skip counting.', sticker: ['🎈', 'Balloon'], tags: ['math'],
      pool: [
        tf('Any number times 10 ends in 0.', true, '3 × 10 = 30, 7 × 10 = 70 — they all end in 0!'),
        tf('5 × 2 is the same as 2 × 5.', true, 'Both make 10. You can multiply in any order.'),
        mc('What is 1 × 9?', '9', ['1', '10', '19'], 'Any number times 1 stays the same.')
      ],
      gen: () => genMul([2, 5, 10], 14) },
    { id: 32, title: 'Times Tables 3·4', topic: 'the 3 and 4 times tables', icon: '🌤️', learn: 'Multiply by 3 and 4.', sticker: ['🌤️', 'Sunny Cloud'], tags: ['math'],
      pool: [
        mc('What is 4 × 0?', '0', ['4', '40', '1'], 'Anything times 0 is 0.'),
        tf('3 × 4 = 4 × 3', true, 'Both equal 12.')
      ],
      gen: () => genMul([3, 4], 15) },
    { id: 33, title: 'Sentence Builders', topic: 'sentences', icon: '💬', learn: 'Build sentences, use capital letters and punctuation.', sticker: ['💬', 'Chatty Bubble'],
      pool: [
        ord('Build the sentence', ['The', 'dog', 'runs', 'fast.'], '“The dog runs fast.” Sentences start with a capital letter and end with a period.'),
        ord('Build the sentence', ['I', 'like', 'to', 'read.'], '“I like to read.”'),
        ord('Build the sentence', ['Birds', 'can', 'fly', 'high.'], '“Birds can fly high.”'),
        ord('Build the sentence', ['We', 'play', 'in', 'the', 'park.'], '“We play in the park.”'),
        ord('Build the sentence', ['My', 'cat', 'is', 'sleeping.'], '“My cat is sleeping.”'),
        ord('Build the sentence', ['Can', 'you', 'help', 'me?'], '“Can you help me?” — a question ends with a question mark.'),
        mc('Which word completes the sentence?  The bird ___ in the sky.', 'flies', ['swims', 'barks', 'digs'], 'Birds fly: “The bird flies in the sky.”'),
        mc('Which word completes the sentence?  She ___ a big cake yesterday.', 'baked', ['bakes', 'baking', 'bake'], '“Yesterday” tells us it already happened, so we say “baked”.'),
        mc('Which sentence is written correctly?', 'I have a red ball.', ['i have a red ball.', 'I have a red ball', 'i Have a red Ball'], 'It starts with a capital letter and ends with a period.'),
        mc('What goes at the end of a question?', '?', ['.', '!', ','], 'Questions end with a question mark: “How are you?”'),
        mc('Which word is a NOUN (a person, place or thing)?', 'Apple', ['Run', 'Happy', 'Quickly'], 'An apple is a thing, so it is a noun.'),
        mc('Which word is a VERB (an action word)?', 'Jump', ['Table', 'Green', 'Soft'], 'Jump is something you do, so it is a verb.'),
        mc('Which word is an ADJECTIVE (a describing word)?', 'Fluffy', ['Dog', 'Run', 'Under'], 'Fluffy describes how something looks or feels.'),
        mc('Which word should start with a capital letter?', 'london', ['apple', 'happy', 'table'], 'Names of places, like London, always start with a capital letter.'),
        tf('A sentence starts with a capital letter.', true, 'Yes! Every sentence starts with a capital letter.'),
        tf('“Run” is a naming word (noun).', false, '“Run” is an action word — a verb.')
      ] },
    { id: 34, title: 'Weather & Seasons', topic: 'weather and seasons', icon: '🌦️', learn: 'Sun, rain, snow, wind and the four seasons.', sticker: ['🌦️', 'Weather Cloud'],
      pool: [
        mc('How many seasons are there in a year?', '4', ['2', '6', '12'], 'Spring, summer, autumn (fall) and winter.'),
        mc('In which season do many trees lose their leaves?', 'Autumn 🍂', ['Summer ☀️', 'Spring 🌷', 'Winter ❄️'], 'In autumn (fall), leaves change color and drop.'),
        mc('Which season is usually the hottest?', 'Summer ☀️', ['Winter ❄️', 'Autumn 🍂', 'Spring 🌷'], 'Summer is usually the warmest season.'),
        mc('Which season is usually the coldest?', 'Winter ❄️', ['Summer ☀️', 'Spring 🌷', 'Autumn 🍂'], 'Winter is usually the coldest season.'),
        mc('In which season do many flowers start to bloom?', 'Spring 🌷', ['Winter ❄️', 'Autumn 🍂', 'Summer ☀️'], 'Spring is when many flowers wake up and bloom.'),
        mc('What falls from clouds when it is very cold?', 'Snow ❄️', ['Sand', 'Leaves', 'Feathers'], 'When it is cold enough, water in clouds freezes into snow.'),
        mc('What can you see in the sky when the sun shines through rain?', 'A rainbow 🌈', ['A comet', 'A tornado', 'Fog'], 'Sunlight shining through raindrops makes a rainbow.'),
        mc('What do we use to measure temperature?', 'A thermometer 🌡️', ['A ruler', 'A clock', 'A scale'], 'A thermometer tells us how hot or cold it is.'),
        mc('A very strong spinning wind storm is called a…', 'Tornado 🌪️', ['Rainbow', 'Breeze', 'Puddle'], 'A tornado is a spinning column of wind.'),
        mc('What are clouds made of?', 'Tiny drops of water', ['Cotton', 'Smoke', 'Marshmallows'], 'Clouds are made of tiny water drops (and ice crystals when it is cold).', { v: '☁️' }),
        mc('What should you wear on a rainy day?', 'A raincoat ☔', ['A swimsuit', 'Sunglasses', 'Sandals'], 'A raincoat keeps you dry!'),
        tf('We see lightning before we hear thunder because light travels faster than sound.', true, 'Light is much faster than sound!', { v: '⛈️' }),
        tf('Snow is made of frozen water.', true, 'Snowflakes are tiny ice crystals.', { v: '❄️' }),
        tf('Winter is usually the hottest season.', false, 'Summer is usually the hottest; winter is usually the coldest.'),
        ord('Put the seasons in order, starting with spring', ['🌷 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'], 'Spring → summer → autumn → winter, then spring again!'),
        match('Match the weather to its picture', [['Sunny', '☀️'], ['Rainy', '🌧️'], ['Snowy', '🌨️'], ['Windy', '💨'], ['Stormy', '⛈️'], ['Cloudy', '☁️']], 'Every kind of weather has its own look.'),
        memSame('Find the matching weather cards!', ['☀️', '🌧️', '❄️', '🌈', '⛈️', '🌪️'])
      ] },
    { id: 35, test: true, from: [31, 32, 33, 34], title: 'Sky Test 1', topic: 'times tables, sentences & weather', icon: '🏆', learn: 'A mixed review of levels 31 to 34.', sticker: ['🦅', 'Sky Eagle'] },
    { id: 36, title: 'Around the World', topic: 'continents and oceans', icon: '🌍', learn: 'The 7 continents, the oceans and the animals that live there.', sticker: ['🌍', 'Planet Globe'],
      pool: [
        mc('How many continents are there?', '7', ['5', '9', '12'], 'There are 7 continents: Africa, Antarctica, Asia, Australia, Europe, North America and South America.'),
        mc('Which is the biggest continent?', 'Asia', ['Europe', 'Australia', 'Antarctica'], 'Asia is the biggest continent and has the most people.'),
        mc('Which continent is covered in ice and is the coldest?', 'Antarctica', ['Africa', 'Asia', 'Europe'], 'Antarctica is the coldest place on Earth.', { v: '🐧' }),
        mc('On which continent do kangaroos live in the wild?', 'Australia', ['Africa', 'Europe', 'South America'], 'Wild kangaroos live only in Australia.', { v: '🦘' }),
        mc('On which continent do zebras live in the wild?', 'Africa', ['Europe', 'Australia', 'North America'], 'Wild zebras live in Africa.', { v: '🦓' }),
        mc('Which is the largest ocean?', 'Pacific Ocean', ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'], 'The Pacific is the biggest and deepest ocean.', { v: '🌊' }),
        mc('The Amazon rainforest is mostly on which continent?', 'South America', ['Africa', 'Europe', 'Australia'], 'The Amazon is mostly in Brazil, in South America.'),
        mc('Which continent has the Sahara, a huge desert?', 'Africa', ['Asia', 'Europe', 'Antarctica'], 'The Sahara is in northern Africa.', { v: '🏜️' }),
        mc('In which country do giant pandas live in the wild?', 'China', ['Brazil', 'Canada', 'Egypt'], 'Wild giant pandas live in the mountains of China.', { v: '🐼' }),
        mc('In which country are the Great Pyramids of Giza?', 'Egypt', ['Mexico', 'Japan', 'Italy'], 'The Great Pyramids of Giza are in Egypt, in Africa.'),
        mc('Which continent are Canada and the USA in?', 'North America', ['South America', 'Europe', 'Asia'], 'Canada, the USA and Mexico are in North America.'),
        mc('A round model of the Earth is called a…', 'Globe 🌍', ['Map', 'Compass', 'Telescope'], 'A globe shows the Earth as a ball.'),
        tf('Antarctica is the hottest continent.', false, 'Antarctica is the coldest continent!'),
        tf('Most of Earth’s surface is covered by water.', true, 'About 7 out of every 10 parts of Earth’s surface is water.'),
        tf('Australia is both a country and a continent.', true, 'Yes! Australia is a country and a continent.'),
        match('Match the animal to the continent where it lives wild', [['🦘', 'Australia'], ['🦓', 'Africa'], ['🐧', 'Antarctica'], ['🐼', 'Asia'], ['🦙', 'South America']], 'Kangaroos in Australia, zebras in Africa, emperor penguins in Antarctica, pandas in Asia and llamas in South America.'),
        ord('Put the continents in order from smallest to biggest', ['Australia', 'Europe', 'Africa', 'Asia'], 'Australia is the smallest continent and Asia is the biggest.')
      ] },
    { id: 37, title: 'Logic Puzzles', topic: 'logic puzzles', icon: '🧠', learn: 'Odd one out, riddles and thinking step by step.', sticker: ['🧠', 'Big Brain'],
      pool: [
        mc('Which one does NOT belong?', '🚗', ['🍎', '🍌', '🍇'], 'Apple, banana and grapes are fruits. A car is not a fruit!'),
        mc('Which one does NOT belong?', '🌳', ['🐶', '🐱', '🐰'], 'Dog, cat and rabbit are animals. A tree is a plant.'),
        mc('Which one does NOT belong?', '🐟', ['☀️', '🌙', '⭐'], 'The sun, moon and stars are in the sky. A fish lives in water.'),
        mc('Which one does NOT belong?', '🐄', ['🚗', '🚌', '🚲'], 'Car, bus and bike are ways to travel. A cow is an animal.'),
        mc('Which number does NOT belong?  2, 4, 6, 7', '7', ['2', '4', '6'], '2, 4 and 6 are even. 7 is odd.'),
        mc('Which number does NOT belong?  10, 20, 25, 30', '25', ['10', '20', '30'], '10, 20 and 30 are tens. 25 is not.'),
        mc('Tom is taller than Sam. Sam is taller than Ben. Who is the shortest?', 'Ben', ['Tom', 'Sam', 'They are all the same'], 'Tom > Sam > Ben, so Ben is the shortest.'),
        mc('Ana is older than Leo. Leo is older than Mia. Who is the oldest?', 'Ana', ['Leo', 'Mia', 'They are all the same'], 'Ana > Leo > Mia, so Ana is the oldest.'),
        mc('If today is Monday, what day is tomorrow?', 'Tuesday', ['Sunday', 'Wednesday', 'Friday'], 'The day after Monday is Tuesday.'),
        mc('If yesterday was Saturday, what day is today?', 'Sunday', ['Friday', 'Monday', 'Saturday'], 'The day after Saturday is Sunday.'),
        mc('I have 4 legs, I bark and I wag my tail. What am I?', '🐶 Dog', ['🐱 Cat', '🐦 Bird', '🐟 Fish'], 'Dogs bark and wag their tails!'),
        mc('I am yellow, I am a fruit and monkeys love me. What am I?', '🍌 Banana', ['🍋 Lemon', '🌽 Corn', '🧀 Cheese'], 'A banana! (A lemon is yellow too, but monkeys love bananas.)'),
        mc('A bag has 3 red balls and 1 blue ball. Which color are you most likely to pick?', 'Red', ['Blue', 'Green', 'Yellow'], 'There are more red balls, so red is most likely.'),
        pat(['1', '3', '5', '7'], '9', ['8', '10', '11'], 'The numbers go up by 2: 7 + 2 = 9.'),
        pat(['🔴', '🔴', '🔵', '🔴', '🔴', '🔵', '🔴', '🔴'], '🔵', ['🔴', '🟢', '🟡'], 'The pattern is red, red, blue — so blue comes next.'),
        tf('All cats have whiskers. Milo is a cat. So Milo has whiskers.', true, 'If ALL cats have whiskers and Milo is a cat, Milo must have whiskers.'),
        tf('If it rains, the ground outside gets wet.', true, 'Rain makes the ground wet.')
      ] },
    { id: 38, title: 'Times Tables 6–9', topic: 'the 6, 7, 8 and 9 times tables', icon: '✈️', learn: 'Master the trickier times tables.', sticker: ['✈️', 'Jet Plane'], tags: ['math'],
      pool: [
        tf('9 × 9 = 81', true, '9 × 9 = 81. A fun trick: 8 + 1 = 9!'),
        tf('7 × 8 = 54', false, '7 × 8 = 56. Remember: 5, 6, 7, 8 → 56 = 7 × 8!')
      ],
      gen: () => genMul([6, 7, 8, 9], 15) },
    { id: 39, title: 'Word Wizards', topic: 'grammar and words', icon: '📚', learn: 'Plurals, past tense and words that mean the same.', sticker: ['📚', 'Book Stack'],
      pool: [
        mc('One mouse, two…', 'mice', ['mouses', 'meese', 'mousies'], 'The plural of mouse is mice.', { v: '🐭' }),
        mc('One child, two…', 'children', ['childs', 'childes', 'childrens'], 'The plural of child is children.'),
        mc('One foot, two…', 'feet', ['foots', 'feets', 'footies'], 'The plural of foot is feet.', { v: '🦶' }),
        mc('One tooth, two…', 'teeth', ['tooths', 'teeths', 'toothes'], 'The plural of tooth is teeth.'),
        mc('One box, two…', 'boxes', ['boxs', 'boxies', 'boxen'], 'Words ending in x add -es: boxes.', { v: '📦' }),
        mc('One baby, two…', 'babies', ['babys', 'babyes', 'babis'], 'Change the y to i and add -es: babies.'),
        mc('Today I run. Yesterday I…', 'ran', ['runned', 'runs', 'running'], 'The past of run is ran.'),
        mc('Today I go. Yesterday I…', 'went', ['goed', 'goes', 'gone'], 'The past of go is went.'),
        mc('Today I eat. Yesterday I…', 'ate', ['eated', 'eats', 'eating'], 'The past of eat is ate.'),
        mc('Today I swim. Yesterday I…', 'swam', ['swimmed', 'swims', 'swum'], 'The past of swim is swam.'),
        mc('Which word means the same as BIG?', 'large', ['tiny', 'short', 'thin'], 'Big and large mean the same.'),
        mc('Which word means the same as HAPPY?', 'glad', ['sad', 'angry', 'sleepy'], 'Happy and glad mean the same.'),
        mc('Which word means the same as FAST?', 'quick', ['slow', 'heavy', 'quiet'], 'Fast and quick mean the same.'),
        tf('“Dogs” is the plural of “dog”.', true, 'Yes — just add -s!'),
        tf('The past of “sing” is “singed”.', false, 'The past of sing is sang.'),
        match('Match each word to its past tense', [['go', 'went'], ['eat', 'ate'], ['see', 'saw'], ['swim', 'swam'], ['run', 'ran'], ['sing', 'sang']], 'Some verbs change completely in the past tense!'),
        mem('Find the words that mean the same!', [['big', 'large'], ['happy', 'glad'], ['fast', 'quick'], ['small', 'little'], ['start', 'begin'], ['shout', 'yell']])
      ] },
    { id: 40, test: true, from: [31, 32, 33, 34, 36, 37, 38, 39], title: 'Sky Big Test', topic: 'everything in Sky Islands', icon: '🏆', learn: 'The big review of the whole Sky Islands!', sticker: ['🐉', 'Sky Dragon'] },

    /* ---------------- WORLD 5 · SPACE STATION ---------------- */
    { id: 41, title: 'Sharing is Dividing', topic: 'division', icon: '🚀', learn: 'Share equally and divide using times tables.', sticker: ['🚀', 'Rocket'], tags: ['math'],
      pool: [
        tf('Division means sharing into equal groups.', true, 'Yes! 12 ÷ 3 means sharing 12 into 3 equal groups.'),
        mc('What is 10 ÷ 1?', '10', ['1', '0', '11'], 'Dividing by 1 leaves the number the same.')
      ],
      gen: () => genDiv(15) },
    { id: 42, title: 'Fraction Pizza', topic: 'fractions', icon: '🍕', learn: 'Halves, quarters and simple fractions.', sticker: ['🍕', 'Pizza Slice'], tags: ['math'],
      pool: [
        mc('Which is bigger: 1/2 or 1/4?', '1/2', ['1/4', 'They are the same', '1/8'], 'Cutting into 2 pieces makes bigger pieces than cutting into 4.'),
        mc('How many halves make a whole?', '2', ['1', '4', '3'], 'Two halves make one whole.'),
        mc('How many quarters make a whole?', '4', ['2', '3', '8'], 'Four quarters make one whole.'),
        mc('A pizza is cut into 8 equal slices. You eat 3. What fraction did you eat?', '3/8', ['3/5', '5/8', '8/3'], 'You ate 3 of the 8 slices: 3/8.', { v: '🍕' }),
        tf('2/4 is the same amount as 1/2.', true, 'Two quarters make one half.'),
        tf('1/3 is bigger than 1/2.', false, 'Halves are bigger than thirds, so 1/2 is bigger.')
      ],
      gen: () => [].concat(genFraction(8), genHalves(4)) },
    { id: 43, title: 'Planet Tour', topic: 'the planets', icon: '🪐', learn: 'The Sun, the Moon and the 8 planets of our Solar System.', sticker: ['🪐', 'Ringed Planet'],
      pool: [
        mc('How many planets are in our Solar System?', '8', ['9', '7', '10'], 'There are 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.'),
        mc('Which planet is closest to the Sun?', 'Mercury', ['Venus', 'Earth', 'Neptune'], 'Mercury is the closest planet to the Sun.'),
        mc('Which planet do we live on?', 'Earth 🌍', ['Mars', 'Venus', 'Jupiter'], 'We live on planet Earth!'),
        mc('Which planet is called the Red Planet?', 'Mars', ['Jupiter', 'Venus', 'Neptune'], 'Mars looks red because of rusty dust on its surface.'),
        mc('Which is the biggest planet?', 'Jupiter', ['Saturn', 'Earth', 'Mars'], 'Jupiter is the biggest planet — more than 1,000 Earths could fit inside!'),
        mc('Which planet is famous for its big, bright rings?', 'Saturn 🪐', ['Mars', 'Mercury', 'Earth'], 'Saturn has the biggest, brightest rings, made of ice and rock.'),
        mc('Which planet is the hottest?', 'Venus', ['Mercury', 'Mars', 'Earth'], 'Venus is the hottest because its thick clouds trap the heat — even hotter than Mercury!'),
        mc('Which planet is farthest from the Sun?', 'Neptune', ['Saturn', 'Jupiter', 'Uranus'], 'Neptune is the eighth and farthest planet.'),
        mc('What is the Sun?', 'A star ⭐', ['A planet', 'A moon', 'A comet'], 'The Sun is a star — the closest star to Earth.', { v: '☀️' }),
        mc('What travels around the Earth?', 'The Moon 🌙', ['The Sun', 'Mars', 'Jupiter'], 'The Moon orbits (goes around) the Earth.'),
        mc('How long does Earth take to travel around the Sun once?', 'About one year', ['One day', 'One week', 'One hour'], 'One trip around the Sun takes about 365 days — one year.'),
        mc('Why do we have day and night?', 'The Earth spins', ['The Sun turns off', 'Clouds cover the Sun', 'The Moon hides the Sun'], 'As Earth spins, our side faces the Sun (day) and then turns away (night).'),
        mc('Who was the first person to walk on the Moon?', 'Neil Armstrong', ['Isaac Newton', 'Albert Einstein', 'Marie Curie'], 'Neil Armstrong walked on the Moon in 1969.', { v: '🌕' }),
        tf('The Moon makes its own light.', false, 'The Moon shines because it reflects light from the Sun.', { v: '🌙' }),
        tf('Astronauts float around inside the space station.', true, 'Astronauts float because they are falling around the Earth together with the station.', { v: '🛰️' }),
        tf('Jupiter is smaller than Earth.', false, 'Jupiter is much, much bigger than Earth.'),
        ord('Put these planets in order, starting nearest the Sun', ['Mercury', 'Venus', 'Earth', 'Mars'], 'Mercury, Venus, Earth, Mars — the four rocky planets.'),
        ord('Put these planets in order, starting nearest the Sun', ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], 'Jupiter, Saturn, Uranus, Neptune — the four giant planets.'),
        match('Match each planet to its clue', [['Mars', 'Red planet'], ['Saturn', 'Bright rings'], ['Earth', 'Our home'], ['Jupiter', 'Biggest'], ['Mercury', 'Closest to Sun']], 'Every planet is special!')
      ] },
    { id: 44, title: 'Science Lab', topic: 'science facts', icon: '🔬', learn: 'Ice and steam, magnets, gravity, light and sound.', sticker: ['🔬', 'Microscope'],
      pool: [
        mc('At what temperature does water freeze?', '0 °C', ['10 °C', '50 °C', '100 °C'], 'Water freezes into ice at 0 °C (32 °F).', { v: '🧊' }),
        mc('At what temperature does water boil?', '100 °C', ['0 °C', '50 °C', '30 °C'], 'Water boils at 100 °C (212 °F) at sea level.'),
        mc('Ice is water as a…', 'Solid', ['Liquid', 'Gas', 'Rainbow'], 'Ice is solid water — it keeps its shape.', { v: '🧊' }),
        mc('Steam is water as a…', 'Gas', ['Solid', 'Liquid', 'Crystal'], 'When water boils it turns into a gas called steam.'),
        mc('Which of these sticks to a magnet?', 'An iron nail', ['A wooden spoon', 'A plastic cup', 'A paper towel'], 'Magnets attract iron and steel.', { v: '🧲' }),
        mc('What force pulls things down to the ground?', 'Gravity', ['Magnetism', 'Wind', 'Light'], 'Gravity pulls everything toward the Earth.', { v: '🍎' }),
        mc('Animals that eat only plants are called…', 'Herbivores', ['Carnivores', 'Omnivores', 'Predators'], 'Herbivores, like cows and rabbits, eat only plants.'),
        mc('Which animal is a mammal?', '🐬 Dolphin', ['🦈 Shark', '🐍 Snake', '🐸 Frog'], 'Dolphins are mammals: they breathe air and feed their babies milk.'),
        mc('A baby frog is called a…', 'Tadpole', ['Kitten', 'Cub', 'Chick'], 'Frogs start life as tadpoles that swim with tails.', { v: '🐸' }),
        mc('Which material lets light pass through?', 'Glass', ['Wood', 'Metal', 'Stone'], 'Glass is transparent — light goes through it.', { v: '🔍' }),
        mc('Sounds are made when things…', 'Vibrate', ['Freeze', 'Melt', 'Sleep'], 'Sound happens when something vibrates (wiggles back and forth very fast).', { v: '🥁' }),
        mc('Which of these makes its own light?', 'The Sun', ['The Moon', 'A mirror', 'A rock'], 'The Sun makes its own light. The Moon and mirrors only reflect light.'),
        mc('A scientist who studies dinosaur fossils is called a…', 'Paleontologist', ['Astronaut', 'Chef', 'Pilot'], 'Paleontologists dig up and study fossils.', { v: '🦕' }),
        tf('Ice melts when it gets warm.', true, 'Warmth turns solid ice into liquid water.', { v: '🧊' }),
        tf('Wood is pulled by magnets.', false, 'Magnets do not attract wood — only some metals like iron.', { v: '🧲' }),
        tf('Light travels faster than sound.', true, 'Light is the fastest thing in the universe!'),
        match('Match each animal to its group', [['🐟', 'Fish'], ['🐦', 'Bird'], ['🐍', 'Reptile'], ['🐸', 'Amphibian'], ['🐕', 'Mammal']], 'Scientists sort animals into groups.')
      ] },
    { id: 45, test: true, from: [41, 42, 43, 44], title: 'Space Test 1', topic: 'division, fractions, planets & science', icon: '🏆', learn: 'A mixed review of levels 41 to 44.', sticker: ['👽', 'Space Friend'] },
    { id: 46, title: 'Story Problems', topic: 'word problems', icon: '🛰️', learn: 'Read carefully and choose +, −, × or ÷ to solve real problems.', sticker: ['🛰️', 'Satellite'], tags: ['math'],
      pool: [],
      gen: () => genWord(16) },
    { id: 47, title: 'Math Mission', topic: 'mixed math', icon: '☄️', learn: 'Bigger numbers and all four operations.', sticker: ['☄️', 'Comet'], tags: ['math'],
      pool: [
        tf('Multiplying comes before adding: 2 + 3 × 4 = 14', true, 'First 3 × 4 = 12, then 2 + 12 = 14.')
      ],
      gen: () => genMixed(16) },
    { id: 48, title: 'Brain Teasers', topic: 'brain teasers', icon: '🤖', learn: 'Tricky number patterns and logic riddles.', sticker: ['🤖', 'Robot Pal'],
      pool: [
        mc('What number comes next?  2, 4, 8, 16, __', '32', ['18', '24', '20'], 'Each number doubles: 16 × 2 = 32.'),
        mc('What number comes next?  1, 4, 9, 16, __', '25', ['20', '24', '36'], 'These are 1×1, 2×2, 3×3, 4×4… next is 5×5 = 25.'),
        mc('What letter comes next?  A, C, E, G, __', 'I', ['H', 'J', 'K'], 'Skip one letter each time: G, (H), I.'),
        mc('A farmer has 5 cows and 3 hens. How many legs are there in total?', '26', ['16', '32', '8'], 'Cows: 5 × 4 = 20. Hens: 3 × 2 = 6. 20 + 6 = 26.'),
        mc('Lily is 2 years older than Max. Max is 7. How old is Lily?', '9', ['5', '7', '14'], '7 + 2 = 9.'),
        mc('I am a number. If you double me, you get 14. What am I?', '7', ['28', '12', '16'], 'Half of 14 is 7, and 7 + 7 = 14.'),
        mc('How many sides do 3 triangles have altogether?', '9', ['6', '3', '12'], 'Each triangle has 3 sides: 3 × 3 = 9.'),
        mc('Which weighs more: 1 kg of feathers or 1 kg of rocks?', 'They weigh the same', ['The feathers', 'The rocks', 'Neither has weight'], '1 kg is 1 kg, whatever it is made of!'),
        mc('What day is it one week after a Wednesday?', 'Wednesday', ['Thursday', 'Tuesday', 'Sunday'], 'A week has 7 days, so one week later it is Wednesday again.'),
        mc('Ben is first in line. Zoe is not last. Mia is also in the line. Who is last?', 'Mia', ['Ben', 'Zoe', 'Nobody'], 'Ben is first and Zoe is not last, so Mia must be last.'),
        mc('There are 12 kids. Half of them wear hats. How many kids wear hats?', '6', ['12', '4', '24'], 'Half of 12 is 6.'),
        mc('Which one does NOT belong?', '🕷️ Spider', ['🐝 Bee', '🐜 Ant', '🦋 Butterfly'], 'Bees, ants and butterflies are insects with 6 legs. A spider has 8 legs.'),
        mc('If 3 cats catch 3 mice in 3 minutes, how many mice does 1 cat catch in 3 minutes?', '1', ['3', '9', '0'], 'Each cat catches 1 mouse in those 3 minutes.'),
        tf('An even number plus an even number is always even.', true, 'Like 4 + 6 = 10. Even + even is always even.'),
        tf('Odd + odd always makes an odd number.', false, 'Odd + odd makes even, like 3 + 5 = 8.'),
        ord('Put in order from smallest to biggest', ['1/4', '1/2', '3/4', '1'], 'A quarter, a half, three quarters, then a whole.'),
        pat(['🌑', '🌓', '🌕', '🌑', '🌓'], '🌕', ['🌑', '🌓', '⭐'], 'The pattern repeats 🌑 🌓 🌕 — so 🌕 comes next.')
      ] },
    { id: 49, title: 'Measure Masters', topic: 'measuring and shapes', icon: '🌙', learn: 'Centimeters, kilograms, minutes and many-sided shapes.', sticker: ['🌙', 'Crescent Moon'],
      pool: [
        mc('How many centimeters are in 1 meter?', '100', ['10', '1000', '60'], '1 meter = 100 centimeters.', { v: '📏' }),
        mc('How many grams are in 1 kilogram?', '1000', ['100', '10', '60'], '1 kilogram = 1000 grams.'),
        mc('How many seconds are in one minute?', '60', ['100', '30', '10'], '1 minute = 60 seconds.', { v: '⏱️' }),
        mc('How many days are in a year that is not a leap year?', '365', ['300', '366', '400'], 'A normal year has 365 days; a leap year has 366.'),
        mc('About how many weeks are in a year?', '52', ['12', '36', '100'], 'A year has about 52 weeks.'),
        mc('Which unit would you use to measure how long a pencil is?', 'Centimeters', ['Kilograms', 'Liters', 'Hours'], 'Length is measured in centimeters or meters.', { v: '✏️' }),
        mc('Which unit would you use to measure milk?', 'Liters', ['Meters', 'Kilograms', 'Degrees'], 'Liquids are measured in liters.', { v: '🥛' }),
        mc('What time is it 15 minutes after 3:45?', '4:00', ['3:55', '4:15', '3:30'], '3:45 + 15 minutes = 4:00.'),
        mc('What shape has 6 sides?', 'Hexagon', ['Pentagon', 'Octagon', 'Triangle'], 'A hexagon has 6 sides — like a honeycomb cell!', { v: '🐝' }),
        mc('How many sides does an octagon have?', '8', ['6', '5', '10'], 'Octo means 8 — an octagon has 8 sides, like a stop sign.'),
        mc('How many sides does a pentagon have?', '5', ['4', '6', '8'], 'Penta means 5 — a pentagon has 5 sides.'),
        tf('A right angle looks like the corner of a square.', true, 'A right angle is a square corner, like the corner of a book.'),
        tf('1 meter is longer than 1 centimeter.', true, '1 meter is 100 times longer than 1 centimeter.'),
        match('Match each shape to its number of sides', [['Triangle', '3'], ['Square', '4'], ['Pentagon', '5'], ['Hexagon', '6'], ['Octagon', '8']], 'Count the sides!')
      ],
      gen: () => genClock(4, [0, 15, 30, 45]) },
    { id: 50, test: true, from: [41, 42, 43, 44, 46, 47, 48, 49], title: 'Grand Finale', topic: 'everything in Space Station', icon: '🏆', learn: 'The final test of your whole adventure!', sticker: ['👑', 'Champion Crown'] }
  ];

  /* ---------------- difficulty curve ---------------- */
  const choicesFor = (id) => (id <= 4 ? 2 : id <= 14 ? 3 : 4);         // answer options 2 → 3 → 4
  const matchPairsFor = (id) => (id <= 10 ? 3 : id <= 30 ? 4 : 5);
  const memPairsFor = (id) => (id <= 10 ? 3 : id <= 20 ? 4 : id <= 30 ? 5 : 6);
  /** Seconds per question (0 = no timer). Generous, only from level 31. */
  const timerFor = (id, type) => {
    if (id < 31) return 0;
    const base = Math.max(30, 45 - (id - 31));
    return ['order', 'match', 'memory', 'input'].includes(type) ? Math.round(base * 1.6) : base;
  };

  const LEVELS = RAW.map(L => Object.assign({ pool: [], tags: [] }, L, {
    world: Math.floor((L.id - 1) / 10),
    questions: L.test ? 15 : 10,
    sticker: { e: L.sticker[0], name: L.sticker[1] }
  }));

  /* ---------------- building one attempt ---------------- */
  function poolFor(L) {
    let p = (L.pool || []).slice();
    if (L.gen) p = p.concat(L.gen());
    return p;
  }
  const keyOf = (q) => q.type + '|' + q.q + '|' + (q.a !== undefined ? q.a : '') + '|' + (q.n || '') + '|' + (q.seq || q.items || q.clock || q.frac || '');
  const CAPS = { memory: 1, match: 2, order: 2, tf: 3 };

  /** Pick the questions for one attempt (shuffled every time). */
  function buildQuiz(id) {
    const L = LEVELS[id - 1];
    const total = L.questions;
    const chosen = [], seen = new Set(), used = {};
    const caps = L.test ? { memory: 2, match: 2, order: 3, tf: 4 } : CAPS;
    const fits = (q, ignoreCaps) => !seen.has(keyOf(q)) && (ignoreCaps || (used[q.type] || 0) < (caps[q.type] || 99));
    const add = (q) => { chosen.push(q); seen.add(keyOf(q)); used[q.type] = (used[q.type] || 0) + 1; };

    if (L.test) {
      // round-robin over the source levels so every topic is reviewed
      const lists = shuffle(L.from).map(fid => shuffle(poolFor(LEVELS[fid - 1])));
      let guard = 0;
      while (chosen.length < total && guard++ < 500) {
        const list = lists[guard % lists.length];
        const i = list.findIndex(q => fits(q));
        if (i >= 0) add(list.splice(i, 1)[0]);
      }
      const rest = shuffle([].concat(...lists));
      for (const q of rest) { if (chosen.length >= total) break; if (fits(q, true)) add(q); }
    } else {
      const pool = shuffle(poolFor(L));
      for (const q of pool) { if (chosen.length >= total) break; if (fits(q)) add(q); }
      for (const q of pool) { if (chosen.length >= total) break; if (fits(q, true)) add(q); }
    }
    return shuffle(chosen);
  }

  KQ.WORLDS = WORLDS;
  KQ.LEVELS = LEVELS;
  KQ.Levels = { buildQuiz, poolFor, choicesFor, matchPairsFor, memPairsFor, timerFor, shuffle, rnd, pick };
})();
