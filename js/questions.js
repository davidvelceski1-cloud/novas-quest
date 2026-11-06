/* ==========================================================================
   questions.js – renderers for every question type.
   Each renderer draws into ctx.area and returns a controller:
     hint()    → shows visual help once and returns a sentence for Nova
     reveal()  → shows the right answer (used on timeout)
     destroy() → removes listeners
   When the child finishes it calls ctx.onDone(correct, { el }).
   Types: mc · tf · count · pattern · order · match · memory · input
   ========================================================================== */
(function () {
  'use strict';
  const KQ = (window.KQ = window.KQ || {});
  const { shuffle } = KQ.Levels;
  const esc = (s) => KQ.Mascot.escapeHTML(s);
  const sfx = (n) => KQ.Audio.play(n);

  /* ---------------- small DOM helpers ---------------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  const EMOJI_ONLY = /^[\s\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]+$/u;
  const isEmoji = (s) => EMOJI_ONLY.test(String(s));
  function graphemes(s) {
    s = String(s).replace(/\s/g, '');
    if (window.Intl && Intl.Segmenter) return [...new Intl.Segmenter().segment(s)].length;
    return Array.from(s.replace(/️/g, '')).length;
  }
  function ansClass(text) {
    if (!isEmoji(text)) return 'ans';
    return graphemes(text) <= 2 ? 'ans emoji' : 'ans emoji-row';
  }
  function markCorrect(b) { b.classList.add('correct'); if (!b.querySelector('.mark')) b.appendChild(el('span', 'mark', '✓')); b.setAttribute('aria-label', (b.getAttribute('aria-label') || b.textContent) + ' – correct'); }
  function markWrong(b) { b.classList.add('wrong'); if (!b.querySelector('.mark')) b.appendChild(el('span', 'mark', '↺')); }
  function lockAll(container) { container.querySelectorAll('button').forEach(b => b.classList.add('locked')); }

  /* ---------------- visuals: clock & fraction pie ---------------- */
  function clockSVG(t) {
    const [h, m] = t.split(':').map(Number);
    const hand = (deg, len) => { const r = (deg * Math.PI) / 180; return [50 + len * Math.sin(r), 50 - len * Math.cos(r)].map(v => v.toFixed(1)); };
    let nums = '';
    for (let i = 1; i <= 12; i++) { const [x, y] = hand(i * 30, 36); nums += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="800" fill="#2a1f45">${i}</text>`; }
    let ticks = '';
    for (let i = 0; i < 60; i++) { const [x1, y1] = hand(i * 6, 45); const [x2, y2] = hand(i * 6, i % 5 ? 43 : 41); ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8a80a8" stroke-width="${i % 5 ? 0.6 : 1.4}"/>`; }
    const [hx, hy] = hand((h % 12) * 30 + m * 0.5, 23);
    const [mx, my] = hand(m * 6, 35);
    return `<svg class="clock-svg" viewBox="0 0 100 100" role="img" aria-label="An analog clock">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#7e22ce" stroke-width="4"/>${ticks}${nums}
      <line x1="50" y1="50" x2="${hx}" y2="${hy}" stroke="#2a1f45" stroke-width="5" stroke-linecap="round"/>
      <line x1="50" y1="50" x2="${mx}" y2="${my}" stroke="#d6336c" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="3.5" fill="#2a1f45"/></svg>`;
  }
  function fracSVG(k, d) {
    let s = '';
    for (let i = 0; i < d; i++) {
      const a1 = (i / d) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 1) / d) * Math.PI * 2 - Math.PI / 2;
      const x1 = 50 + 44 * Math.cos(a1), y1 = 50 + 44 * Math.sin(a1), x2 = 50 + 44 * Math.cos(a2), y2 = 50 + 44 * Math.sin(a2);
      s += `<path d="M50 50 L${x1.toFixed(2)} ${y1.toFixed(2)} A44 44 0 ${1 / d > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${i < k ? '#ff922b' : '#fff'}" stroke="#2a1f45" stroke-width="2.2" stroke-linejoin="round"/>`;
    }
    return `<svg class="frac-svg" viewBox="0 0 100 100" role="img" aria-label="A circle cut into ${d} equal parts with ${k} colored">${s}</svg>`;
  }

  /** The white question card (text + optional visual). */
  function qCard(q, ctx, visualHTML) {
    const card = el('div', 'qcard' + (ctx.test ? ' test-frame' : ''));
    const text = el('div', 'qtext' + (q.q.length > 60 ? ' long' : ''), esc(q.q));
    card.appendChild(text);
    let vis = visualHTML;
    if (!vis && q.v) vis = `<div class="qvisual">${esc(q.v)}</div>`;
    if (!vis && q.clock) vis = `<div class="qvisual">${clockSVG(q.clock)}</div>`;
    if (!vis && q.frac) vis = `<div class="qvisual">${fracSVG(q.frac[0], q.frac[1])}</div>`;
    if (vis) card.insertAdjacentHTML('beforeend', vis);
    ctx.area.appendChild(card);
    return card;
  }

  /** Shared "choose one answer" engine for mc, tf, count & pattern. */
  function choiceEngine(q, ctx, options, correctValue, onPicked) {
    const box = el('div', 'answers');
    const allEmoji = options.every(o => isEmoji(o.label));
    const shortText = options.every(o => String(o.label).length <= 11);
    const cols = (allEmoji || (shortText && options.length !== 3)) ? 2 : 1;
    box.classList.add(cols === 2 ? 'cols-2' : 'cols-1');
    let locked = false;
    const buttons = options.map(o => {
      const b = el('button', ansClass(o.label), esc(o.label));
      b.type = 'button';
      b.setAttribute('aria-label', o.speak || o.label);
      b.dataset.value = String(o.value);
      b.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        sfx('tap');
        const ok = String(o.value) === String(correctValue);
        lockAll(box);
        if (ok) markCorrect(b);
        else { markWrong(b); const c = buttons.find(x => x.dataset.value === String(correctValue)); if (c) markCorrect(c); }
        if (onPicked) onPicked(ok);
        ctx.onDone(ok, { el: b });
      });
      box.appendChild(b);
      return b;
    });
    ctx.area.appendChild(box);
    return {
      box, buttons,
      /** dim one wrong option (if more than 2 remain); returns true if it did */
      dimOne() {
        const live = buttons.filter(b => !b.classList.contains('dim'));
        if (live.length <= 2) return false;
        const wrong = shuffle(live.filter(b => b.dataset.value !== String(correctValue)));
        if (!wrong.length) return false;
        wrong[0].classList.add('dim');
        return true;
      },
      reveal() {
        locked = true; lockAll(box);
        const c = buttons.find(x => x.dataset.value === String(correctValue));
        if (c) markCorrect(c);
      }
    };
  }

  /* ---------------- 1. Multiple choice ---------------- */
  function renderMC(q, ctx) {
    qCard(q, ctx);
    const n = Math.min(ctx.choices, 1 + q.wrong.length);
    const vals = shuffle([q.a].concat(shuffle(q.wrong).slice(0, n - 1)));
    const eng = choiceEngine(q, ctx, vals.map(v => ({ label: v, value: v })), q.a);
    return {
      hint() {
        if (q.hint) return q.hint;
        if (eng.dimOne()) return 'I hid one wrong answer!';
        const first = String(q.a).trim()[0];
        if (/[A-Za-z0-9]/.test(first)) return `It starts with “${first}”.`;
        return 'Look closely at each picture!';
      },
      reveal: eng.reveal, destroy() {}
    };
  }

  /* ---------------- 2. True / False ---------------- */
  function renderTF(q, ctx) {
    qCard(q, ctx);
    const eng = choiceEngine(q, ctx, [{ label: '👍 True', value: 'true', speak: 'True' }, { label: '👎 False', value: 'false', speak: 'False' }], String(q.a));
    eng.box.classList.remove('cols-1'); eng.box.classList.add('cols-2');
    eng.buttons.forEach(b => { b.style.minHeight = '84px'; b.style.fontSize = '24px'; });
    return {
      hint() { return q.hint || 'Read it slowly. Is it like real life?'; },
      reveal: eng.reveal, destroy() {}
    };
  }

  /* ---------------- 3. Count the objects ---------------- */
  function renderCount(q, ctx) {
    let tapCount = 0;
    const grid = el('div', 'count-grid');
    for (let i = 0; i < q.n; i++) {
      const s = el('span', '', esc(q.emoji));
      s.setAttribute('role', 'button'); s.setAttribute('aria-label', 'object ' + (i + 1));
      // tapping an object numbers it – a natural counting aid
      s.addEventListener('click', () => {
        if (s.classList.contains('tapped')) return;
        s.classList.add('tapped'); tapCount++;
        s.appendChild(el('i', '', String(tapCount)));
        sfx('pop');
      });
      grid.appendChild(s);
    }
    const card = qCard(q, ctx, ' ');
    card.appendChild(grid);
    const n = Math.min(ctx.choices, 4);
    const set = new Set([q.n]);
    const cand = shuffle([q.n - 1, q.n + 1, q.n + 2, q.n - 2, q.n + 3]).filter(v => v >= 1 && v <= 12);
    for (const c of cand) { if (set.size >= n) break; set.add(c); }
    const vals = [...set].sort((a, b) => a - b);
    const eng = choiceEngine(q, ctx, vals.map(v => ({ label: String(v), value: v })), q.n);
    return {
      hint() { eng.dimOne(); return 'Tap each one as you count!'; },
      reveal: eng.reveal, destroy() {}
    };
  }

  /* ---------------- 4. Complete the pattern ---------------- */
  function renderPattern(q, ctx) {
    const row = el('div', 'pattern-row');
    q.seq.forEach(s => row.appendChild(el('span', '', esc(s))));
    const slot = el('span', 'slot', '?');
    row.appendChild(slot);
    const card = qCard(q, ctx, ' ');
    card.appendChild(row);
    const n = Math.min(ctx.choices, 1 + q.wrong.length);
    const vals = shuffle([q.a].concat(shuffle(q.wrong).slice(0, n - 1)));
    const fillSlot = () => { slot.textContent = q.a; slot.classList.add('filled'); };
    const eng = choiceEngine(q, ctx, vals.map(v => ({ label: v, value: v })), q.a, () => fillSlot());
    return {
      hint() { eng.dimOne(); return q.hint || 'Find the part that repeats!'; },
      reveal() { eng.reveal(); fillSlot(); }, destroy() {}
    };
  }

  /* ---------------- 5. Drag to order ----------------
     Tap one tile then another to swap them, or drag a tile onto another. */
  function renderOrder(q, ctx) {
    qCard(q, ctx);
    const items = q.items;
    const vertical = items.some(s => String(s).length > 9);
    let order = items.map((_, i) => i);
    if (items.length > 1) { let g = 0; do { order = shuffle(order); } while (order.every((v, i) => v === i) && g++ < 20); }
    const fixed = new Set();       // positions locked by a hint
    let sel = -1, locked = false;

    const wrap = el('div', 'numpad-wrap');
    const zone = el('div', 'order-zone' + (vertical ? ' vertical' : ''));
    const check = el('button', 'btn purple wide', '✓ Check');
    check.type = 'button';
    wrap.appendChild(zone); wrap.appendChild(check);
    ctx.area.appendChild(wrap);

    function draw(states) {
      zone.innerHTML = '';
      order.forEach((itemIdx, pos) => {
        const t = el('button', 'tile', (vertical ? `<span class="num">${pos + 1}</span>` : '') + `<span>${esc(items[itemIdx])}</span>`);
        t.type = 'button';
        t.dataset.pos = pos;
        t.setAttribute('aria-label', `${items[itemIdx]}, position ${pos + 1}`);
        if (pos === sel) t.classList.add('sel');
        if (fixed.has(pos)) t.classList.add('fixed');
        if (states) t.classList.add(states[pos] ? 'good' : 'bad');
        attach(t, pos);
        zone.appendChild(t);
      });
    }
    function swap(a, b) {
      if (a === b || fixed.has(a) || fixed.has(b)) return;
      [order[a], order[b]] = [order[b], order[a]];
      sfx('flip'); KQ.FX.haptic(8);
    }
    function attach(t, pos) {
      let start = null, moved = false, over = null;
      t.addEventListener('pointerdown', (e) => {
        if (locked || fixed.has(pos)) return;
        start = { x: e.clientX, y: e.clientY }; moved = false;
        try { t.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      t.addEventListener('pointermove', (e) => {
        if (!start) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) > 10) { moved = true; t.classList.add('dragging'); sel = -1; }
        if (!moved) return;
        t.style.transform = `translate(${dx}px, ${dy}px)`;
        const under = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList && n.classList.contains('tile') && n !== t);
        if (over && over !== under) over.classList.remove('over');
        over = under || null;
        if (over) over.classList.add('over');
      });
      const end = (e, cancelled) => {
        if (!start) return;
        start = null;
        if (moved) {
          if (!cancelled && over) swap(pos, Number(over.dataset.pos));
          draw();
        } else if (!cancelled) {
          // tap-to-swap
          if (sel === -1) { sel = pos; sfx('tap'); }
          else if (sel === pos) sel = -1;
          else { swap(sel, pos); sel = -1; }
          draw();
        }
      };
      t.addEventListener('pointerup', (e) => end(e, false));
      t.addEventListener('pointercancel', (e) => end(e, true));
    }
    check.addEventListener('click', () => {
      if (locked) return;
      locked = true; check.disabled = true;
      // compare the text, so identical items (like the two E's in TREE) are interchangeable
      const states = order.map((v, i) => items[v] === items[i]);
      const ok = states.every(Boolean);
      draw(states);
      if (!ok) setTimeout(() => { order = items.map((_, i) => i); draw(order.map(() => true)); }, 1100);
      ctx.onDone(ok, { el: check });
    });
    draw();
    return {
      hint() {
        // put the first wrong item in its right place and lock it
        const p = order.findIndex((v, i) => items[v] !== items[i] && !fixed.has(i));
        if (p >= 0) {
          // find a tile (not yet in its place) whose text belongs at position p
          const from = order.findIndex((v, i) => i !== p && !fixed.has(i) && items[v] === items[p]);
          if (from >= 0) { [order[p], order[from]] = [order[from], order[p]]; fixed.add(p); }
        }
        sel = -1; draw();
        return 'The gold one is in place. Swap the rest!';
      },
      reveal() { locked = true; check.disabled = true; order = items.map((_, i) => i); draw(order.map(() => true)); },
      destroy() {}
    };
  }

  /* ---------------- 6. Match pairs ---------------- */
  const PAIR_COLORS = ['#7e22ce', '#1d4ed8', '#be185d', '#0f766e', '#b45309', '#4338ca'];
  function renderMatch(q, ctx) {
    qCard(q, ctx);
    const pairs = shuffle(q.pairs).slice(0, ctx.matchPairs);
    const allowed = pairs.length >= 5 ? 2 : 1;
    let mistakes = 0, matched = 0, selL = null, selR = null, locked = false;
    const cols = el('div', 'match-cols');
    const L = el('div', 'match-col'), R = el('div', 'match-col');
    cols.appendChild(L); cols.appendChild(R);
    ctx.area.appendChild(cols);
    const mk = (text, idx, side) => {
      const b = el('button', ansClass(text), esc(text));
      b.type = 'button'; b.dataset.idx = idx; b.dataset.side = side;
      b.addEventListener('click', () => pickSide(b));
      return b;
    };
    const lefts = shuffle(pairs.map((p, i) => mk(p[0], i, 'L')));
    const rights = shuffle(pairs.map((p, i) => mk(p[1], i, 'R')));
    lefts.forEach(b => L.appendChild(b)); rights.forEach(b => R.appendChild(b));

    function pair(a, b) {
      const color = PAIR_COLORS[matched % PAIR_COLORS.length];
      [a, b].forEach(x => {
        x.classList.remove('sel'); x.classList.add('correct', 'paired');
        const tag = el('span', 'tag', String(matched + 1)); tag.style.background = color; x.appendChild(tag);
      });
      matched++;
    }
    function pickSide(b) {
      if (locked || b.classList.contains('paired')) return;
      sfx('tap');
      if (b.dataset.side === 'L') { if (selL) selL.classList.remove('sel'); selL = b; }
      else { if (selR) selR.classList.remove('sel'); selR = b; }
      b.classList.add('sel');
      if (selL && selR) {
        const a = selL, c = selR; selL = selR = null;
        if (a.dataset.idx === c.dataset.idx) {
          pair(a, c); sfx('pop'); KQ.FX.burstAt(c, 8);
          if (matched === pairs.length) finish();
        } else {
          mistakes++; sfx('wrong'); KQ.FX.haptic(40);
          [a, c].forEach(x => { x.classList.remove('sel'); x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong'), 600); });
        }
      }
    }
    function finish() { locked = true; ctx.onDone(mistakes <= allowed, { el: cols }); }
    function autoMatch() {
      const l = lefts.find(x => !x.classList.contains('paired'));
      if (!l) return false;
      const r = rights.find(x => x.dataset.idx === l.dataset.idx);
      pair(l, r); return true;
    }
    return {
      hint() {
        if (selL) selL.classList.remove('sel'); if (selR) selR.classList.remove('sel'); selL = selR = null;
        autoMatch();
        if (matched === pairs.length) setTimeout(finish, 300);
        return 'I matched one pair for you!';
      },
      reveal() { locked = true; while (autoMatch()) { /* match all */ } },
      destroy() {}
    };
  }

  /* ---------------- 7. Memory flip ---------------- */
  function renderMemory(q, ctx) {
    qCard(q, ctx);
    const pairs = shuffle(q.pairs).slice(0, ctx.memPairs);
    const allowed = pairs.length * 2;
    const cards = shuffle([].concat(...pairs.map((p, i) => [{ t: p[0], id: i }, { t: p[1], id: i }])));
    const nCards = cards.length;
    const cols = nCards <= 6 ? 3 : nCards === 10 ? 5 : 4;
    const rows = Math.ceil(nCards / cols);
    const grid = el('div', 'mem-grid');
    grid.style.gridTemplateColumns = `repeat(${cols}, var(--cs, 72px))`;
    grid.style.gridAutoRows = 'var(--cs, 72px)';
    ctx.area.appendChild(grid);
    let first = null, busy = false, found = 0, misses = 0, done = false;
    const btns = cards.map((c, i) => {
      const b = el('button', 'mcard', `<span class="in"><span class="face back">★</span><span class="face front${isEmoji(c.t) ? '' : ' txt'}">${esc(c.t)}</span></span>`);
      b.type = 'button'; b.setAttribute('aria-label', 'card ' + (i + 1));
      b.addEventListener('click', () => flip(b, c));
      grid.appendChild(b);
      return b;
    });
    // size the cards to fit the free space (no scrolling!)
    requestAnimationFrame(() => {
      const r = grid.getBoundingClientRect();
      const gap = 10;
      const w = (r.width - gap * (cols - 1)) / cols, h = (r.height - gap * (rows - 1)) / rows;
      const size = Math.max(56, Math.min(w, h, 100));
      grid.style.setProperty('--cs', Math.floor(size) + 'px');
    });
    function flip(b, c) {
      if (busy || done || b.classList.contains('up') || b.classList.contains('done')) return;
      sfx('flip'); b.classList.add('up'); b.setAttribute('aria-label', c.t);
      if (!first) { first = { b, c }; return; }
      const a = first; first = null;
      if (a.c.id === c.id) {
        setTimeout(() => { a.b.classList.add('done'); b.classList.add('done'); sfx('pop'); KQ.FX.burstAt(b, 8); }, 250);
        found++;
        if (found === pairs.length) { done = true; setTimeout(() => ctx.onDone(misses <= allowed, { el: grid }), 500); }
      } else {
        misses++; busy = true;
        setTimeout(() => { a.b.classList.add('miss'); b.classList.add('miss'); }, 250);
        setTimeout(() => { [a.b, b].forEach(x => x.classList.remove('up', 'miss')); busy = false; }, 1000);
      }
    }
    return {
      hint() {
        busy = true;
        const hidden = btns.filter(b => !b.classList.contains('up') && !b.classList.contains('done'));
        hidden.forEach(b => b.classList.add('up'));
        setTimeout(() => { hidden.forEach(b => b.classList.remove('up')); busy = false; }, 1600);
        return 'Peek! Remember where they are!';
      },
      reveal() { done = true; btns.forEach(b => b.classList.add('up', 'done')); },
      destroy() {}
    };
  }

  /* ---------------- 8. Number pad ---------------- */
  function renderInput(q, ctx) {
    qCard(q, ctx);
    const wrap = el('div', 'numpad-wrap');
    const disp = el('div', 'num-display', '&nbsp;');
    disp.setAttribute('aria-live', 'polite');
    const pad = el('div', 'numpad');
    wrap.appendChild(disp); wrap.appendChild(pad);
    ctx.area.appendChild(wrap);
    let val = '', locked = false;
    const show = () => { disp.textContent = val || ' '; };
    const press = (k) => {
      if (locked) return;
      if (k === '⌫') { val = val.slice(0, -1); sfx('tap'); }
      else if (k === '✓') {
        if (!val) { disp.classList.remove('wrong'); void disp.offsetWidth; disp.classList.add('wrong'); setTimeout(() => disp.classList.remove('wrong'), 500); return; }
        locked = true;
        const ok = Number(val) === q.a;
        if (ok) { disp.classList.add('correct'); disp.textContent = val + ' ✓'; }
        else { disp.classList.add('wrong'); disp.textContent = `${val} ↺  →  ${q.a}`; }
        ctx.onDone(ok, { el: disp });
        return;
      } else if (val.length < 4) { val = (val === '0' ? '' : val) + k; sfx('tap'); }
      show();
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].forEach(k => {
      const cls = k === '✓' ? 'btn' : k === '⌫' ? 'btn orange' : 'btn white';
      const b = el('button', cls, k);
      b.type = 'button';
      b.setAttribute('aria-label', k === '⌫' ? 'delete' : k === '✓' ? 'check answer' : k);
      b.addEventListener('click', () => press(k));
      pad.appendChild(b);
    });
    // physical keyboard support (desktop)
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Enter') press('✓');
    };
    document.addEventListener('keydown', onKey);
    // On short screens use 4 columns (3 rows) so nothing is cut off
    requestAnimationFrame(() => { if (ctx.area.scrollHeight > ctx.area.clientHeight + 1) pad.classList.add('compact'); });
    return {
      hint() {
        if (q.hint) return q.hint;
        const a = q.a;
        if (a < 10) return `It’s between ${Math.max(0, a - 2)} and ${a + 2}.`;
        const lo = Math.floor(a / 10) * 10;
        return `It’s from ${lo} to ${lo + 9}.`;
      },
      reveal() { locked = true; disp.classList.add('correct'); disp.textContent = String(q.a); },
      destroy() { document.removeEventListener('keydown', onKey); }
    };
  }

  const RENDERERS = { mc: renderMC, tf: renderTF, count: renderCount, pattern: renderPattern, order: renderOrder, match: renderMatch, memory: renderMemory, input: renderInput };

  function render(q, ctx) {
    ctx.area.innerHTML = '';
    const fn = RENDERERS[q.type] || renderMC;
    return fn(q, ctx);
  }

  /** Short text of the right answer for the feedback sheet. */
  function answerText(q) {
    switch (q.type) {
      case 'tf': return q.a ? 'True' : 'False';
      case 'count': return String(q.n);
      case 'input': return String(q.a);
      case 'order': return q.items.join(' → ');
      case 'match': case 'memory': return '';
      default: return String(q.a);
    }
  }
  /** Text read aloud by the 🔊 button. */
  function speechText(q) {
    let t = q.q;
    if (q.type === 'tf') t += '. True or false?';
    if (q.type === 'mc' && !isEmoji(q.a)) t += '. ';
    return t;
  }

  KQ.Q = { render, answerText, speechText, clockSVG, fracSVG, isEmoji };
})();
