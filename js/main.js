/* ==========================================================================
   main.js – app start, screen router and all screens.
   Screens: splash · setup · map · intro · question · results ·
            album · badges · shop · settings (behind a parental gate)
   Each screen is a function that fills a fresh .screen element and may
   return a cleanup function (timers, listeners).
   ========================================================================== */
(function () {
  'use strict';
  const KQ = window.KQ;
  const S = KQ.State, M = KQ.Mascot, A = KQ.Audio, FX = KQ.FX, LV = KQ.Levels;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = M.escapeHTML;
  const screensEl = $('#screens');
  const modalRoot = $('#modal-root');
  let current = null;

  /* ======================= Router ======================= */
  /**
   * Show a new screen.
   * @param {Function} build (el) => optional cleanup fn
   * @param {object} o { cls, world, zoom, floaties }
   */
  function show(build, o) {
    o = o || {};
    A.stopSpeaking();
    closeModal();
    const el = document.createElement('div');
    const worldCls = o.world !== undefined ? ' world-' + o.world : '';
    el.className = 'screen enter' + (o.zoom ? ' zoom' : '') + worldCls + (o.cls ? ' ' + o.cls : '');
    if (o.world === 4) el.appendChild(Object.assign(document.createElement('div'), { className: 'space-stars' }));
    if (o.floaties !== false) addFloaties(el, o.world !== undefined ? KQ.WORLDS[o.world].floaties : ['⭐', '🌈', '🎈', '✨', '🦋', '☁️']);
    const old = current;
    current = { el, cleanup: null };
    screensEl.appendChild(el);
    try { current.cleanup = build(el) || null; } catch (e) { console.error(e); }
    if (old) {
      if (old.cleanup) try { old.cleanup(); } catch (e) { /* ignore */ }
      old.el.classList.add('leave');
      setTimeout(() => old.el.remove(), 320);
    }
    setTimeout(() => el.classList.remove('enter'), 460);
  }

  function addFloaties(el, list) {
    const f = document.createElement('div');
    f.className = 'floaties';
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('span');
      s.textContent = list[i % list.length];
      s.style.left = (5 + Math.random() * 85) + '%';
      s.style.top = (5 + Math.random() * 85) + '%';
      s.style.setProperty('--d', (10 + Math.random() * 8) + 's');
      s.style.setProperty('--dl', (-Math.random() * 10) + 's');
      f.appendChild(s);
    }
    el.appendChild(f);
  }

  /** Attach a click handler (with tap sound) to every [data-act] in root. */
  function wire(root, handlers) {
    root.querySelectorAll('[data-act]').forEach(b => {
      const fn = handlers[b.dataset.act];
      if (fn) b.addEventListener('click', (e) => { if (!b.dataset.silent) A.play('tap'); fn(e, b); });
    });
  }

  /* ======================= Modals ======================= */
  let modalClose = null;
  function modal(o) {
    closeModal();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      ${o.mascot ? `<div style="width:110px;height:118px">${M.svg({ expr: o.mascot })}</div>` : ''}
      ${o.title ? `<div class="h2">${esc(o.title)}</div>` : ''}
      ${o.html || ''}
      <div class="btn-row"></div></div>`;
    const row = back.querySelector('.btn-row');
    (o.buttons || []).forEach(bt => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (bt.cls || '');
      b.innerHTML = bt.label;
      b.addEventListener('click', () => { A.play('tap'); if (bt.close !== false) closeModal(); if (bt.onClick) bt.onClick(); });
      row.appendChild(b);
    });
    if (!o.buttons || !o.buttons.length) row.remove();
    if (o.dismiss !== false) back.addEventListener('click', (e) => { if (e.target === back) closeModal(); });
    modalRoot.appendChild(back);
    modalClose = () => { back.remove(); modalClose = null; if (o.onClose) o.onClose(); };
    if (o.setup) o.setup(back);
    return closeModal;
  }
  function closeModal() { if (modalClose) modalClose(); }

  /* ======================= Small UI bits ======================= */
  const starsHTML = (n) => [1, 2, 3].map(i => `<span class="${i <= n ? 'on' : 'off'}">★</span>`).join('');
  const coinPill = () => `<span class="pill" aria-label="coins"><i class="coin" aria-hidden="true"></i><span class="coin-n">${S.data.coins}</span></span>`;
  const starPill = () => `<span class="pill" aria-label="stars"><span aria-hidden="true">⭐</span>${S.totalStars()}</span>`;
  const backBtn = (act) => `<button class="btn white round" data-act="${act || 'back'}" aria-label="Back">←</button>`;
  function avatarHTML(size) {
    const p = S.data.player || { name: '?', color: '#9775fa' };
    const ch = esc((p.name || '?').trim().charAt(0).toUpperCase() || '★');
    return `<span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${p.color};border:4px solid #fff;font-weight:900;font-size:${Math.round(size * 0.48)}px;color:#2a1f45;box-shadow:0 3px 0 rgba(0,0,0,.15)">${ch}</span>`;
  }
  function stickerHTML(id, px) {
    const isWorld = id[0] === 'W';
    const num = Number(id.slice(1));
    const st = isWorld ? KQ.WORLDS[num].sticker : KQ.LEVELS[num - 1].sticker;
    const w = isWorld ? num : KQ.LEVELS[num - 1].world;
    const [c1, c2] = KQ.WORLDS[w].colors;
    const size = px ? `width:${px}px;height:${px}px;min-width:${px}px;min-height:${px}px;font-size:${Math.round(px * 0.55)}px;` : '';
    return `<span class="sticker${isWorld ? ' special' : ''}" style="--sc:${c1};--sc2:${c2};${size}">${st.e}</span>`;
  }

  /* ======================= 1. Splash ======================= */
  function splash() {
    show((el) => {
      el.classList.add('menu-bg');
      el.innerHTML = `
        <div class="grow center" style="gap:14px">
          <h1 class="title on-dark" style="font-size:46px">Nova’s<br>Quest</h1>
          <div class="pill" style="font-size:18px">Learn • Play • Shine ✨</div>
          <div style="width:min(62%,240px);aspect-ratio:200/236">${M.svg({ expr: 'wave' })}</div>
          <div class="helper-slot" style="width:100%"></div>
        </div>
        <div class="center" style="gap:12px;padding-bottom:10px">
          <button class="btn big" data-act="play">▶ Play</button>
          <small class="on-dark" style="font-weight:800">For kids 6–10 · No ads · Works offline</small>
        </div>`;
      const bubble = document.createElement('div');
      bubble.className = 'card';
      bubble.style.cssText = 'font-size:20px;font-weight:800;text-align:center;padding:10px 14px';
      bubble.textContent = S.data.player ? `Welcome back, ${S.data.player.name}! ✨` : M.say('welcome');
      $('.helper-slot', el).appendChild(bubble);
      wire(el, { play: () => { A.init(); if (S.data.settings.music) A.setMusic(true); S.data.player ? map() : setup(); } });
    }, { cls: 'menu-bg', zoom: true });
  }

  /* ======================= 2. Player setup ======================= */
  const AVATAR_COLORS = ['#ff8cc6', '#ffa94d', '#ffd43b', '#69db7c', '#74c0fc', '#b197fc'];
  function setup(editing) {
    show((el) => {
      const p = S.data.player || { name: '', color: AVATAR_COLORS[4] };
      let color = p.color;
      el.innerHTML = `
        ${editing ? `<div class="topbar">${backBtn()}</div>` : ''}
        <div class="grow center" style="gap:14px">
          <div style="width:120px;height:130px">${M.svg({ expr: 'wave' })}</div>
          <div class="card center" style="gap:12px;width:100%">
            <div class="h2">What’s your name?</div>
            <input class="name-input" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Your name" aria-label="Your first name" value="${esc(p.name)}">
            <div class="h2" style="font-size:22px;margin:4px 0 0">Pick your color</div>
            <div class="color-row">${AVATAR_COLORS.map(c => `<button class="color-dot${c === color ? ' sel' : ''}" data-c="${c}" style="background:${c}" aria-label="color"></button>`).join('')}</div>
            <small class="muted" style="font-weight:700">🔒 Your name stays on this device only.</small>
          </div>
        </div>
        <div style="padding:10px 0"><button class="btn big wide" data-act="go">Let’s go! ➜</button></div>`;
      const input = $('.name-input', el);
      el.querySelectorAll('.color-dot').forEach(b => b.addEventListener('click', () => {
        A.play('pop'); color = b.dataset.c;
        el.querySelectorAll('.color-dot').forEach(x => x.classList.toggle('sel', x === b));
      }));
      const go = () => {
        const name = input.value.replace(/[^\p{L}\p{M}' -]/gu, '').trim().slice(0, 12) || 'Friend';
        S.data.player = { name, color };
        S.save();
        input.blur();
        editing ? settingsScreen() : map();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      wire(el, { go, back: () => settingsScreen() });
    }, { cls: 'menu-bg' });
  }

  /* ======================= 3. World map ======================= */
  let dailyChecked = false;
  function map(o) {
    o = o || {};
    show((el) => {
      el.classList.add('map-screen');
      el.innerHTML = `
        <div class="topbar">
          ${avatarHTML(48)}<span class="pill" style="max-width:40%;overflow:hidden;white-space:nowrap">${esc(S.data.player ? S.data.player.name : '')}</span>
          <span class="spacer"></span>${starPill()}${coinPill()}
        </div>
        <div class="map-scroll"><div class="map-inner"></div></div>
        <div class="map-footer"><div class="map-helper"></div></div>
        <nav class="navbar">
          <button class="btn pink" data-act="album" aria-label="Sticker album">📒<small>Stickers</small></button>
          <button class="btn yellow" data-act="badges" aria-label="Badges">🏅<small>Badges</small></button>
          <button class="btn purple" data-act="shop" aria-label="Dressing room">👗<small>Nova</small></button>
          <button class="btn blue" data-act="settings" aria-label="Settings for grown-ups">⚙️<small>Grown-ups</small></button>
        </nav>`;
      const helper = M.helper($('.map-helper', el), { expr: 'idle' });
      helper.el.querySelector('.nova-wrap').style.cssText = 'width:62px;height:68px';
      helper.say(M.say('map'), 'wave', 2500);
      buildMap(el, helper, o);
      wire(el, {
        album: () => album(), badges: () => badgesScreen(), shop: () => shop(),
        settings: () => parentalGate(() => settingsScreen())
      });
      if (!dailyChecked) {
        dailyChecked = true;
        setTimeout(() => {
          const gift = S.claimDaily();
          if (gift) {
            A.play('coin');
            modal({ mascot: 'happy', title: M.say('daily'), html: `<p style="font-size:34px">+${gift} <i class="coin" aria-hidden="true"></i></p>`, buttons: [{ label: 'Yay! 🎉', cls: 'yellow' }],
              onClose: () => { const n = el.querySelector('.coin-n'); if (n) n.textContent = S.data.coins; } });
            FX.confetti(40);
          }
        }, 700);
      }
    }, { cls: 'map-screen', floaties: false });
  }

  function buildMap(el, helper, o) {
    const scroll = $('.map-scroll', el), inner = $('.map-inner', el);
    const W = scroll.clientWidth || 340;
    const GAP = 104, BANNER = 160;
    let y = 0;
    const pts = [];
    let html = '';
    const cur = S.currentLevel();
    KQ.WORLDS.forEach((w) => {
      const y0 = y;
      html += `<div class="world-banner" style="top:${y + 30}px">${w.icon} ${esc(w.name)}<small>Levels ${w.id * 10 + 1}–${w.id * 10 + 10}</small></div>`;
      y += BANNER;
      for (let i = 0; i < 10; i++) {
        const id = w.id * 10 + i + 1;
        const x = W / 2 + Math.sin((id - 1) * 0.9) * W * 0.27;
        const ny = y + 40;
        pts.push([x, ny]);
        const L = KQ.LEVELS[id - 1], rec = S.lvl(id), locked = !S.isUnlocked(id);
        html += `<button class="node world-${w.id}${L.test ? ' test' : ''}${locked ? ' locked' : ''}${id === cur ? ' current' : ''}" data-id="${id}" style="left:${x}px;top:${ny}px"
          aria-label="Level ${id}${L.test ? ' test' : ''}${locked ? ', locked' : ', ' + rec.stars + ' stars'}">
          ${L.test ? '<span class="trophy" aria-hidden="true">🏆</span>' : ''}${locked ? '<span class="lock">🔒</span>' : id}
          ${!locked && rec.passed ? `<span class="stars" aria-hidden="true">${starsHTML(rec.stars)}</span>` : ''}</button>`;
        y += GAP;
      }
      y += 10;
      html = `<div class="map-band world-${w.id}" style="top:${y0}px;height:${y - y0}px">${w.id === 4 ? '<div class="space-stars"></div>' : ''}</div>` + html;
    });
    // winding path (smooth curves between nodes)
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y1 - y0) / 2;
      d += ` C${x0} ${y0 + my} ${x1} ${y1 - my} ${x1} ${y1}`;
    }
    const total = y + 40;
    inner.style.height = total + 'px';
    inner.innerHTML = html + `<svg class="map-path" width="${W}" height="${total}" aria-hidden="true">
      <path d="${d}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="20" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/></svg>`;
    // put the path behind the nodes
    inner.insertBefore(inner.querySelector('.map-path'), inner.querySelector('.world-banner'));
    // mascot standing on the current level
    const [cx, cy] = pts[cur - 1];
    const mm = document.createElement('div');
    mm.className = 'map-mascot';
    mm.style.left = cx + 'px'; mm.style.top = cy + 'px';
    mm.innerHTML = M.svg({ expr: 'idle' });
    inner.appendChild(mm);
    // scroll so the current level is in view
    scroll.style.scrollBehavior = 'auto';
    scroll.scrollTop = Math.max(0, cy - scroll.clientHeight * 0.55);
    scroll.style.scrollBehavior = '';

    inner.querySelectorAll('.node').forEach(n => n.addEventListener('click', () => {
      const id = Number(n.dataset.id);
      if (!S.isUnlocked(id)) {
        A.play('wrong'); FX.haptic(30);
        n.animate && !FX.reduced() && n.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 350 });
        helper.say(M.say('locked', { n: id, c: S.currentLevel() }), 'encourage', 2500);
        return;
      }
      A.play('tap');
      intro(id);
    }));
    if (o.justUnlocked) {
      const n = inner.querySelector(`.node[data-id="${o.justUnlocked}"]`);
      if (n) setTimeout(() => { A.play('unlock'); FX.burstAt(n, 22); n.animate && n.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-out' }); }, 450);
    }
  }

  /* ======================= 4. Level intro ======================= */
  function intro(id) {
    const L = KQ.LEVELS[id - 1], rec = S.lvl(id);
    show((el) => {
      const timer = S.data.settings.timers && LV.timerFor(id, 'mc') > 0;
      el.innerHTML = `
        <div class="topbar">${backBtn()}<span class="spacer"></span>${coinPill()}</div>
        <div class="grow center" style="gap:12px">
          <div class="card intro-card${L.test ? ' test' : ''}" style="width:100%">
            <span class="badge-type${L.test ? ' test' : ''}">${L.test ? '🏆 TEST' : '📝 Quiz'} · ${esc(KQ.WORLDS[L.world].name)}</span>
            <div class="lvl-num">Level ${id}</div>
            <div class="h2" style="margin:0">${L.icon} ${esc(L.title)}</div>
            <div class="learn">🎯 You’ll learn: ${esc(L.learn)}</div>
            <div class="reward-row">
              <span class="reward">❓ ${L.questions} questions</span>
              ${timer ? '<span class="reward">⏱️ Relaxed timer</span>' : ''}
              ${rec.plays ? `<span class="reward">Best: ${rec.best} <span style="color:#f59f00">${'★'.repeat(rec.stars)}</span></span>` : ''}
            </div>
          </div>
          <div class="intro-helper" style="width:100%"></div>
        </div>
        <div style="padding:8px 0"><button class="btn big wide ${L.test ? 'gold' : 'world'}" data-act="start">Start! ▶</button></div>`;
      const h = M.helper($('.intro-helper', el), { expr: 'wave' });
      h.el.querySelector('.nova-wrap').style.cssText = 'width:96px;height:104px';
      const line = L.test ? M.say('testIntro', { q: L.questions }) : M.say('intro', { n: id, topic: L.topic });
      h.say(line, 'wave');
      wire(el, { back: () => map(), start: () => play(id) });
    }, { world: L.world, zoom: true });
  }

  /* ======================= 5. Question screen ======================= */
  function play(id, opts) {
    opts = opts || {};
    const L = KQ.LEVELS[id - 1];
    const run = { id, qs: LV.buildQuiz(id), i: 0, correct: 0, streak: 0, maxStreak: 0, coins: 0, dev: !!opts.dev };
    KQ.App.currentRun = run;   // read-only hook used by automated tests
    show((el) => {
      el.classList.add('q-screen');
      el.innerHTML = `
        <div class="topbar">
          <button class="btn white round" data-act="quit" aria-label="Leave level">✕</button>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${run.qs.length}"><i></i><b></b></div>
          <span class="streak" aria-label="streak">🔥<span class="sn">0</span></span>
        </div>
        <div class="timer" hidden><i></i></div>
        <div class="q-helper"></div>
        <div class="q-area"></div>
        <div class="q-actions">
          <button class="btn yellow" data-act="hint" data-silent="1">💡 Help</button>
          ${A.canSpeak && S.data.settings.speech ? '<button class="btn blue" data-act="speak" data-silent="1" aria-label="Read the question aloud" style="flex:0 0 auto;width:96px">🔊</button>' : ''}
        </div>`;
      const helper = M.helper($('.q-helper', el), { expr: 'idle' });
      const area = $('.q-area', el), bar = $('.progress', el), timerEl = $('.timer', el);
      const hintBtn = $('[data-act="hint"]', el);
      let ctrl = null, answered = false, hintUsed = false, tmr = null, nextTimer = null, sheet = null;

      function stopTimer() { if (tmr) clearInterval(tmr); tmr = null; }
      function startTimer(q) {
        stopTimer();
        const secs = S.data.settings.timers ? LV.timerFor(id, q.type) : 0;
        timerEl.hidden = !secs;
        if (!secs) return;
        const t0 = performance.now(), fill = timerEl.firstElementChild;
        timerEl.classList.remove('low');
        tmr = setInterval(() => {
          const left = 1 - (performance.now() - t0) / (secs * 1000);
          fill.style.transform = `scaleX(${Math.max(0, left)})`;
          timerEl.classList.toggle('low', left < 0.25);
          if (left <= 0) { stopTimer(); if (!answered && ctrl) { ctrl.reveal(); onAnswer(false, { timeout: true }); } }
        }, 100);
      }

      function showQuestion() {
        answered = false; hintUsed = false;
        if (sheet) { sheet.remove(); sheet = null; }
        if (ctrl && ctrl.destroy) ctrl.destroy();
        const q = run.qs[run.i];
        bar.firstElementChild.style.width = (run.i / run.qs.length) * 100 + '%';
        bar.lastElementChild.textContent = `${run.i + 1} / ${run.qs.length}`;
        bar.setAttribute('aria-valuenow', run.i + 1);
        hintBtn.disabled = false; hintBtn.innerHTML = '💡 Help';
        ctrl = KQ.Q.render(q, {
          area, test: !!L.test, choices: LV.choicesFor(id), matchPairs: LV.matchPairsFor(id), memPairs: LV.memPairsFor(id),
          onDone: (ok, info) => onAnswer(ok, info)
        });
        helper.say(run.i === 0 && ['mc', 'tf'].includes(q.type) ? (L.test ? 'Trophy time! You can do it! 🏆' : 'Let’s go! Tap the right answer.') : pickPrompt(q), 'idle');
        startTimer(q);
      }
      function pickPrompt(q) {
        const t = { order: 'Tap or drag to put them in order!', match: 'Tap a card on the left, then its partner!', memory: 'Flip two cards to find a pair!', input: 'Type the answer on the number pad!', count: 'Count carefully!', pattern: 'What comes next?', tf: 'True or false?' }[q.type];
        return t || pickFrom(['You’ve got this!', 'Think carefully…', 'Take your time!', 'Ready? Look closely!', 'Here’s the next one!']);
      }
      const pickFrom = (a) => a[Math.floor(Math.random() * a.length)];

      function onAnswer(ok, info) {
        if (answered) return;
        answered = true;
        stopTimer();
        hintBtn.disabled = true;
        const q = run.qs[run.i];
        let gained = 0;
        if (ok) {
          run.correct++; run.streak++;
          run.maxStreak = Math.max(run.maxStreak, run.streak);
          gained = S.COIN_CORRECT + (run.streak >= 3 ? S.COIN_STREAK : 0);
          run.coins += gained;
          A.play('correct'); FX.haptic([15, 40, 15]);
          if (info && info.el) FX.burstAt(info.el, 18);
          let line = M.say('praise');
          if (run.streak === 3) line = M.say('streak3');
          else if (run.streak === 5) line = M.say('streak5');
          else if (run.streak === 10) line = M.say('streak10');
          if (run.streak >= 3) setTimeout(() => A.play('coin'), 350);
          helper.say(line, 'happy', 1400);
        } else {
          run.streak = 0;
          A.play('wrong'); FX.haptic(60);
          helper.say(info && info.timeout ? M.say('timeup') : M.say('encourage'), 'encourage');
        }
        const sEl = $('.streak', el);
        sEl.querySelector('.sn').textContent = run.streak;
        sEl.classList.toggle('hot', run.streak >= 3);
        bar.firstElementChild.style.width = ((run.i + 1) / run.qs.length) * 100 + '%';
        showSheet(ok, q, gained);
      }

      function showSheet(ok, q, gained) {
        sheet = document.createElement('div');
        sheet.className = 'feedback ' + (ok ? 'ok' : 'oops');
        const last = run.i === run.qs.length - 1;
        const ans = KQ.Q.answerText(q);
        if (ok) {
          sheet.innerHTML = `<div class="fb-title"><span class="fb-ico" aria-hidden="true">✓</span>Correct! <span style="margin-left:auto">+${gained} <i class="coin" aria-hidden="true"></i></span></div>
            <button class="btn wide" data-next>${last ? 'See my score! 🎉' : 'Next ➜'}</button>`;
        } else {
          sheet.innerHTML = `<div class="fb-title"><span class="fb-ico" aria-hidden="true">↺</span>Let’s learn!</div>
            ${ans ? `<div class="fb-text">The answer is: <b>${esc(ans)}</b></div>` : ''}
            <div class="fb-text">💬 ${esc(q.explain || '')}</div>
            <div class="row">
              ${A.canSpeak && S.data.settings.speech ? '<button class="btn blue round" data-say aria-label="Read explanation aloud">🔊</button>' : ''}
              <button class="btn orange grow" data-next>${last ? 'See my score ➜' : 'Got it! Next ➜'}</button>
            </div>`;
        }
        el.appendChild(sheet);
        const next = () => {
          clearTimeout(nextTimer);
          A.play('tap');
          if (last) finish(); else { run.i++; showQuestion(); }
        };
        sheet.querySelector('[data-next]').addEventListener('click', next);
        const sayBtn = sheet.querySelector('[data-say]');
        if (sayBtn) sayBtn.addEventListener('click', () => { A.speak((ans ? 'The answer is ' + ans + '. ' : '') + (q.explain || '')); S.bumpStat('speaks'); });
        // correct answers move on by themselves after a short celebration
        if (ok) nextTimer = setTimeout(next, 1600);
      }

      function finish() {
        stopTimer();
        const summary = run.dev
          ? fakeSummary(id, run.correct, run.qs.length)
          : S.recordResult({ levelId: id, correct: run.correct, total: run.qs.length, maxStreak: run.maxStreak, runCoins: run.coins });
        results(id, summary);
      }

      wire(el, {
        quit: () => modal({
          mascot: 'encourage', title: 'Leave this level?', html: '<p>Your answers in this level won’t be saved.</p>',
          buttons: [{ label: 'Keep playing', cls: '' }, { label: 'Leave', cls: 'orange', onClick: () => map() }]
        }),
        hint: () => {
          if (answered || hintUsed || !ctrl) return;
          hintUsed = true; hintBtn.disabled = true; hintBtn.innerHTML = '💡 Used';
          A.play('star');
          const txt = ctrl.hint();
          helper.say(txt, 'thinking');
          S.bumpStat('hints');
        },
        speak: () => { const q = run.qs[run.i]; A.speak(KQ.Q.speechText(q)); S.bumpStat('speaks'); }
      });
      showQuestion();
      return () => { stopTimer(); clearTimeout(nextTimer); if (ctrl && ctrl.destroy) ctrl.destroy(); };
    }, { world: L.world, floaties: true });
  }

  /** Results summary without saving (developer test mode). */
  function fakeSummary(id, correct, total) {
    const score = Math.round((correct / total) * 100), stars = S.starsFor(score);
    return { score, stars, passed: score >= 80, firstPass: false, unlockedNext: false, coins: correct * 5, sticker: score >= 80 ? 'L' + id : null, worldSticker: null, newBadges: [], needed: Math.max(0, Math.ceil(0.8 * total) - correct), correct, total, newBest: true };
  }

  /* ======================= 6. Results ======================= */
  function results(id, r) {
    const L = KQ.LEVELS[id - 1];
    show((el) => {
      const title = r.passed ? (r.stars === 3 ? 'PERFECT! 🌟' : 'Level complete! 🎉') : 'Keep practicing! 💪';
      const ringColor = r.passed ? '#16a34a' : '#f08c00';
      const C = 2 * Math.PI * 52;
      el.innerHTML = `
        <div class="grow" style="display:flex;flex-direction:column;gap:10px;justify-content:center;min-height:0">
          <div class="card center" style="gap:8px;${L.test ? 'border:5px solid var(--gold)' : ''}">
            <div class="h2" style="margin:0">${title}</div>
            <div class="ring-wrap">
              <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="#ece8f5" stroke-width="14"/>
                <circle class="ring" cx="60" cy="60" r="52" fill="none" stroke="${ringColor}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.2s ease-out"/></svg>
              <div class="score"><span class="sc">0</span><small>out of 100</small></div>
            </div>
            <div class="big-stars" aria-label="${r.stars} stars">${[1, 2, 3].map(() => '<span>★</span>').join('')}</div>
            <div style="font-weight:800">${r.correct} of ${r.total} correct${r.newBest && r.passed ? ' · New best!' : ''}</div>
            <div class="reward-row rewards"></div>
          </div>
          <div class="res-helper"></div>
        </div>
        <div class="row" style="padding:8px 0;gap:10px">
          <button class="btn white round" data-act="map" aria-label="Map">🗺️</button>
          ${r.passed
            ? `<button class="btn orange" data-act="retry" style="padding:0 14px">↻</button>${id < 50 ? '<button class="btn grow" data-act="next">Next ➜</button>' : '<button class="btn gold grow" data-act="map">👑 Map</button>'}`
            : '<button class="btn grow" data-act="retry">↻ Try again</button>'}
        </div>`;
      const h = M.helper($('.res-helper', el), { expr: r.passed ? 'celebrate' : 'encourage' });
      h.el.querySelector('.nova-wrap').style.cssText = 'width:84px;height:92px';
      let line;
      if (r.passed && id === 50) line = 'You finished ALL 50 levels! You are a true Champion! 👑';
      else if (r.passed) line = r.stars === 3 ? M.say('perfect') : M.say('pass');
      else line = M.say('fail', { k: r.needed, answers: r.needed === 1 ? 'answer' : 'answers' });
      h.say(line, r.passed ? 'celebrate' : 'encourage');

      // animations: ring, count-up, stars, rewards
      const ring = $('.ring', el);
      requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDashoffset = C * (1 - r.score / 100); }));
      FX.countUp($('.sc', el), r.score, 1200);
      const starEls = el.querySelectorAll('.big-stars span');
      for (let i = 0; i < r.stars; i++) setTimeout(() => { starEls[i].classList.add('on'); A.play('star'); }, 1300 + i * 380);
      if (r.passed) {
        setTimeout(() => { A.play(r.stars === 3 ? 'fanfare' : 'victory'); FX.confetti(r.stars === 3 ? 200 : 90); if (r.stars === 3) setTimeout(() => FX.confetti(120), 900); }, 500);
      }
      const rw = $('.rewards', el);
      const addReward = (html, delay) => setTimeout(() => { rw.insertAdjacentHTML('beforeend', `<span class="reward">${html}</span>`); }, delay);
      let d = 1500 + r.stars * 380;
      addReward(`<i class="coin" aria-hidden="true"></i> +${r.coins}`, d); setTimeout(() => A.play('coin'), d);
      if (r.sticker) addReward(`${stickerHTML(r.sticker, 40)} New sticker!`, (d += 400));
      if (r.worldSticker) addReward(`${KQ.WORLDS[Number(r.worldSticker.slice(1))].sticker.e} World sticker!`, (d += 400));
      (r.newBadges || []).forEach(b => addReward(`${b.icon} ${esc(b.name)}`, (d += 400)));

      wire(el, {
        map: () => map({ justUnlocked: r.unlockedNext ? id + 1 : null }),
        retry: () => intro(id),
        next: () => intro(id + 1)
      });
    }, { world: L.world, zoom: true });
  }

  /* ======================= 7. Album & badges ======================= */
  function album() {
    show((el) => {
      const have = S.data.stickers;
      const total = 55;
      let html = '';
      KQ.WORLDS.forEach(w => {
        html += `<div class="section-title on-dark">${w.icon} ${esc(w.name)}</div><div class="sticker-grid">`;
        for (let i = 1; i <= 10; i++) {
          const id = w.id * 10 + i, sid = 'L' + id;
          html += have.includes(sid)
            ? `<button class="sticker-btn" data-s="${sid}" style="background:none;border:none;padding:0">${stickerHTML(sid)}</button>`
            : `<button class="sticker locked" data-lock="${id}" aria-label="Locked sticker">?</button>`;
        }
        html += '</div>';
        const wid = 'W' + w.id;
        html += `<div class="row" style="justify-content:center;margin-top:8px">${have.includes(wid)
          ? `<button class="sticker-btn" data-s="${wid}" style="background:none;border:none;padding:0;width:70px">${stickerHTML(wid)}</button>`
          : `<button class="sticker locked special" data-wlock="${w.id}" style="width:70px" aria-label="Locked world sticker">🏆</button>`}</div>`;
      });
      el.innerHTML = `
        <div class="topbar">${backBtn()}<div class="h2 on-dark" style="margin:0">📒 Stickers</div><span class="spacer"></span><span class="pill">${have.length} / ${total}</span></div>
        <div class="list-scroll">${html}</div>`;
      el.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
        A.play('pop');
        const sid = b.dataset.s, isW = sid[0] === 'W', n = Number(sid.slice(1));
        const st = isW ? KQ.WORLDS[n].sticker : KQ.LEVELS[n - 1].sticker;
        modal({ html: `${stickerHTML(sid, 130)}<div class="h2">${esc(st.name)}</div><p>${isW ? 'For finishing ' + esc(KQ.WORLDS[n].name) + '!' : 'Earned in level ' + n + ': ' + esc(KQ.LEVELS[n - 1].title)}</p>`, buttons: [{ label: 'Cool! 😎' }] });
      }));
      el.querySelectorAll('[data-lock]').forEach(b => b.addEventListener('click', () => { A.play('tap'); modal({ mascot: 'thinking', html: `<p>Pass level ${b.dataset.lock} to get this sticker!</p>`, buttons: [{ label: 'OK!' }] }); }));
      el.querySelectorAll('[data-wlock]').forEach(b => b.addEventListener('click', () => { A.play('tap'); modal({ mascot: 'thinking', html: `<p>Finish every level in ${esc(KQ.WORLDS[b.dataset.wlock].name)} to win this special sticker!</p>`, buttons: [{ label: 'OK!' }] }); }));
      wire(el, { back: () => map() });
    }, { cls: 'menu-bg' });
  }

  function badgesScreen() {
    show((el) => {
      const got = S.data.badges;
      el.innerHTML = `
        <div class="topbar">${backBtn()}<div class="h2 on-dark" style="margin:0">🏅 Badges</div><span class="spacer"></span><span class="pill">${got.length} / ${S.BADGES.length}</span></div>
        <div class="list-scroll"><div class="badge-list">${S.BADGES.map(b => `
          <div class="badge-item${got.includes(b.id) ? '' : ' locked'}"><span class="bi" aria-hidden="true">${b.icon}</span>
          <div><b>${esc(b.name)} ${got.includes(b.id) ? '✓' : ''}</b><span>${esc(b.desc)}</span></div></div>`).join('')}</div></div>`;
      wire(el, { back: () => map() });
    }, { cls: 'menu-bg' });
  }

  /* ======================= 8. Dressing room (shop) ======================= */
  function shop() {
    show((el) => {
      const sections = [['color', '🎨 Colors'], ['hat', '🎩 Hats'], ['glasses', '👓 Glasses'], ['neck', '🎀 Extras']];
      el.innerHTML = `
        <div class="topbar">${backBtn()}<div class="h2 on-dark" style="margin:0">👗 Nova</div><span class="spacer"></span>${coinPill()}</div>
        <div class="shop-top" style="display:flex;align-items:center;gap:6px;flex:0 0 auto;margin-top:6px">
          <div class="shop-nova" style="width:120px;height:132px;flex:0 0 auto"></div>
          <div class="bubble shop-bubble" style="margin-bottom:0">Tap something to try it on!</div>
        </div>
        <div class="list-scroll"></div>`;
      const nova = $('.shop-nova', el), bubble = $('.shop-bubble', el), list = $('.list-scroll', el);
      const say = (t) => { bubble.textContent = t; bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop'); };
      const drawNova = (expr) => { nova.innerHTML = M.svg({ expr: expr || 'wave' }); };
      function drawList() {
        const eq = S.data.equipped, owned = S.data.owned;
        list.innerHTML = sections.map(([slot, label]) => `
          <div class="section-title on-dark">${label}</div>
          <div class="shop-grid">${M.ITEMS.filter(i => i.slot === slot).map(it => {
            const isOwned = owned.includes(it.id), isOn = eq[slot] === it.id;
            const preview = { color: slot === 'color' ? it.id : 'color_gold', hat: slot === 'hat' ? it.id : null, glasses: slot === 'glasses' ? it.id : null, neck: slot === 'neck' ? it.id : null };
            return `<button class="shop-item${isOwned ? ' owned' : ''}${isOn ? ' equipped' : ''}" data-id="${it.id}" aria-label="${esc(it.name)}">
              <span class="si">${M.svg({ expr: 'idle', equipped: preview, cls: 'mini' })}</span>${esc(it.name)}
              <span class="price">${isOn ? 'Wearing ✓' : isOwned ? 'Owned' : '<i class="coin" aria-hidden="true"></i> ' + it.price}</span></button>`;
          }).join('')}</div>`).join('');
        list.querySelectorAll('.shop-item').forEach(b => b.addEventListener('click', () => onItem(M.itemById(b.dataset.id))));
      }
      function onItem(it) {
        const eq = S.data.equipped;
        if (S.data.owned.includes(it.id)) {
          A.play('pop');
          if (eq[it.slot] === it.id && it.slot !== 'color') S.equip(it.slot, null);
          else S.equip(it.slot, it.id);
          drawNova('happy'); drawList();
          say(eq[it.slot] ? 'How do I look? ✨' : 'Back to classic Nova!');
          return;
        }
        if (S.data.coins < it.price) {
          A.play('wrong');
          drawNova('encourage');
          say(M.say('shopBroke', { k: it.price - S.data.coins }));
          return;
        }
        modal({
          mascot: 'thinking', title: it.name, html: `<p>Buy this for <b>${it.price} <i class="coin" aria-hidden="true"></i></b>?</p>`,
          buttons: [{ label: 'Not now', cls: 'white' }, { label: 'Buy! <i class="coin" aria-hidden="true"></i>', cls: 'yellow', onClick: () => {
            if (S.buy(it.id, it.price)) {
              S.equip(it.slot, it.id);
              A.play('unlock'); FX.confetti(50);
              drawNova('celebrate'); drawList();
              el.querySelector('.coin-n').textContent = S.data.coins;
              say(M.say('shopBuy'));
            }
          } }]
        });
      }
      drawNova(); drawList();
      wire(el, { back: () => map() });
    }, { cls: 'menu-bg' });
  }

  /* ======================= 9. Parental gate & settings ======================= */
  function parentalGate(onPass) {
    modal({
      title: 'Grown-ups only 🔒',
      html: `<p>Press and <b>hold</b> the button for 3 seconds.</p>
             <button class="btn purple wide hold-btn" type="button"><span class="fill"></span><span class="lbl">Hold me</span></button>`,
      buttons: [{ label: 'Cancel', cls: 'white' }],
      setup(back) {
        const b = back.querySelector('.hold-btn'), fill = b.querySelector('.fill'), lbl = b.querySelector('.lbl');
        let t0 = 0, raf = 0;
        const stop = () => { cancelAnimationFrame(raf); t0 = 0; fill.style.width = '0'; lbl.textContent = 'Hold me'; };
        const tick = () => {
          const p = Math.min(1, (performance.now() - t0) / 3000);
          fill.style.width = p * 100 + '%';
          lbl.textContent = p < 1 ? `Keep holding… ${Math.ceil(3 - p * 3)}` : 'Opening!';
          if (p >= 1) { closeModal(); A.play('unlock'); onPass(); return; }
          raf = requestAnimationFrame(tick);
        };
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
        b.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    });
  }

  function settingsScreen() {
    show((el) => {
      const st = S.data.settings;
      const row = (key, label, sub, disabled) => `
        <div class="setting-row"><div>${label}<small>${sub}</small></div>
          <button class="switch-wrap" data-key="${key}" role="switch" aria-checked="${!!st[key]}" aria-label="${label}" ${disabled ? 'disabled' : ''}><span class="switch${st[key] ? ' on' : ''}"></span></button></div>`;
      el.innerHTML = `
        <div class="topbar">${backBtn()}<div class="h2 on-dark" style="margin:0">⚙️ Grown-ups</div></div>
        <div class="list-scroll">
          ${row('sfx', '🔔 Sound effects', 'Taps, cheers and jingles')}
          ${row('music', '🎵 Music', 'Soft background tune')}
          ${row('speech', '🔊 Read aloud', A.canSpeak ? 'Shows 🔊 buttons that read questions' : 'Not supported on this device', !A.canSpeak)}
          ${row('timers', '⏱️ Timers', 'Relaxed timers from level 31')}
          <div class="setting-row"><div>🙂 Player<small>${esc(S.data.player ? S.data.player.name : '')}</small></div><button class="btn white" data-act="player" style="font-size:18px">Edit</button></div>
          <div class="setting-row"><div>🗑️ Reset progress<small>Deletes all levels, coins & stickers</small></div><button class="btn orange" data-act="reset" style="font-size:18px">Reset</button></div>
          <div class="card" style="font-size:16px;font-weight:600;line-height:1.4">
            <b>Privacy:</b> everything is saved only on this device (no account, no ads, no tracking, no internet needed).
            ${S.storageOK ? '' : '<br><b>⚠️ Saving is blocked in this browser, so progress will be lost when the page closes.</b>'}
            <br><b>Tip:</b> on a phone, use “Add to Home Screen” to play full-screen offline.
          </div>
        </div>`;
      el.querySelectorAll('.switch-wrap').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.key;
        st[k] = !st[k];
        S.save();
        b.setAttribute('aria-checked', st[k]);
        b.firstElementChild.classList.toggle('on', st[k]);
        if (k === 'music') A.setMusic(st[k]);
        A.play('tap');
      }));
      wire(el, {
        back: () => map(),
        player: () => setup(true),
        reset: () => modal({
          mascot: 'thinking', title: 'Reset everything?', html: '<p>All levels, stars, coins, stickers, badges and Nova’s clothes will be deleted. This cannot be undone.</p>',
          buttons: [{ label: 'Cancel', cls: 'white' }, { label: 'Yes, reset', cls: 'orange', onClick: () => {
            modal({ title: 'Are you really sure?', buttons: [{ label: 'No', cls: 'white' }, { label: 'Delete all', cls: 'orange', onClick: () => { S.reset(); A.setMusic(false); dailyChecked = false; splash(); } }] });
          } }]
        })
      });
    }, { cls: 'menu-bg' });
  }

  /* ======================= Boot ======================= */
  function boot() {
    S.load();
    FX.setup();
    $('#rotate-mascot').innerHTML = M.svg({ expr: 'wave' });

    // First tap anywhere unlocks audio (browser rule); also give haptic taps.
    document.addEventListener('pointerdown', (e) => {
      A.init();
      if (S.data.settings.music) A.setMusic(true);
      if (e.target.closest && e.target.closest('.btn, .ans, .node, .tile, .mcard')) FX.haptic(8);
    }, { passive: true });
    // No pinch / double-tap zoom, no long-press menu on game elements.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
    // Pause music when the app is hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { A.setMusic(false); A.stopSpeaking(); } else if (S.data.settings.music) A.setMusic(true);
    });

    // PWA manifest + offline support (only over http/https; file:// would log CORS errors).
    if (/^https?:$/.test(location.protocol)) {
      const link = document.createElement('link'); link.rel = 'manifest'; link.href = 'manifest.json';
      document.head.appendChild(link);
    }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
    }

    // Developer shortcuts for testing, e.g. index.html#dev=level:12
    const dev = /dev=([\w:]+)/.exec(location.hash);
    if (dev) {
      const [what, a, b] = dev[1].split(':');
      if (!S.data.player) S.data.player = { name: 'Tester', color: '#74c0fc' };
      dailyChecked = true;
      if (what === 'level') return play(Number(a) || 1, { dev: true });
      if (what === 'intro') return intro(Number(a) || 1);
      if (what === 'results') return results(Number(a) || 1, fakeSummary(Number(a) || 1, Number(b) || 9, KQ.LEVELS[(Number(a) || 1) - 1].questions));
      if (what === 'map') return map();
      if (what === 'album') return album();
      if (what === 'badges') return badgesScreen();
      if (what === 'shop') return shop();
      if (what === 'settings') return settingsScreen();
      if (what === 'setup') return setup();
    }
    splash();
  }

  // Expose a few hooks (handy for testing from the console)
  KQ.App = { show, splash, map, intro, play, results, album, badgesScreen, shop, settingsScreen, setup, modal, closeModal };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
