/* ==========================================================================
   mascot.js – "Nova", an original round star-creature drawn in inline SVG.
   Expressions (set with data-expr, animated in CSS):
     idle · happy · thinking · encourage · celebrate · wave
   Also: the dressing-room catalogue (colours, hats, glasses, neckwear)
   and Nova's phrase lists.
   ========================================================================== */
(function () {
  'use strict';
  const KQ = (window.KQ = window.KQ || {});
  let uid = 0;

  // Rounded 5-point star body (rounded by a thick stroke with round joins)
  const STAR = 'M100 42 L123.5 79.6 L166.6 90.4 L138 124.4 L141.1 168.6 L100 152 L58.9 168.6 L62 124.4 L33.4 90.4 L76.5 79.6 Z';

  /** Small star polygon helper used by accessories and sparkles */
  function starPts(cx, cy, R, r, n) {
    n = n || 5;
    const p = [];
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      p.push((cx + Math.cos(a) * rad).toFixed(1) + ',' + (cy + Math.sin(a) * rad).toFixed(1));
    }
    return p.join(' ');
  }
  function flower(x, y, c) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      s += `<circle cx="${(x + Math.cos(a) * 5.5).toFixed(1)}" cy="${(y + Math.sin(a) * 5.5).toFixed(1)}" r="4.6" fill="${c}"/>`;
    }
    return s + `<circle cx="${x}" cy="${y}" r="3.6" fill="#ffd43b"/>`;
  }
  /** Heart-shaped lens centred on (x, y) */
  function heart(x, y) {
    return `<path d="M${x} ${y + 13} C${x - 22} ${y} ${x - 15} ${y - 16} ${x} ${y - 6} C${x + 15} ${y - 16} ${x + 22} ${y} ${x} ${y + 13} Z"/>`;
  }

  /* ---------------- Dressing room catalogue ---------------- */
  const ITEMS = [
    // colours (fill for the body)
    { id: 'color_gold',     slot: 'color', name: 'Sunny Gold',  price: 0,   fill: '#ffc93c' },
    { id: 'color_pink',     slot: 'color', name: 'Bubblegum',   price: 60,  fill: '#ff8cc6' },
    { id: 'color_mint',     slot: 'color', name: 'Mint',        price: 60,  fill: '#5ee6a8' },
    { id: 'color_sky',      slot: 'color', name: 'Sky Blue',    price: 60,  fill: '#6cc4ff' },
    { id: 'color_lavender', slot: 'color', name: 'Lavender',    price: 80,  fill: '#b69cff' },
    { id: 'color_coral',    slot: 'color', name: 'Coral',       price: 80,  fill: '#ff9f6b' },
    { id: 'color_rainbow',  slot: 'color', name: 'Rainbow',     price: 250, fill: 'rainbow' },
    // hats
    { id: 'hat_party',  slot: 'hat', name: 'Party Hat',   price: 50,  svg: () => `<path d="M80 44 L100 -12 L120 44 Z" fill="#ff6b9d" stroke="#d6336c" stroke-width="3" stroke-linejoin="round"/><path d="M86 28 L114 28 M92 12 L108 12" stroke="#ffd43b" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="-14" r="8" fill="#ffd43b"/>` },
    { id: 'hat_cap',    slot: 'hat', name: 'Sport Cap',   price: 70,  svg: () => `<path d="M70 42 Q70 2 100 2 Q130 2 130 42 Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="3"/><path d="M118 36 Q152 32 164 44 Q134 48 116 44 Z" fill="#1c7ed6"/><circle cx="100" cy="3" r="5" fill="#1c7ed6"/>` },
    { id: 'hat_bunny',  slot: 'hat', name: 'Bunny Ears',  price: 70,  svg: () => `<g transform="rotate(-14 84 34)"><ellipse cx="84" cy="2" rx="12" ry="32" fill="#fff" stroke="#dee2e6" stroke-width="3"/><ellipse cx="84" cy="6" rx="5.5" ry="22" fill="#ffc2d4"/></g><g transform="rotate(14 116 34)"><ellipse cx="116" cy="2" rx="12" ry="32" fill="#fff" stroke="#dee2e6" stroke-width="3"/><ellipse cx="116" cy="6" rx="5.5" ry="22" fill="#ffc2d4"/></g><path d="M66 44 Q100 22 134 44" stroke="#ff8fab" stroke-width="7" fill="none" stroke-linecap="round"/>` },
    { id: 'hat_chef',   slot: 'hat', name: "Chef's Hat",  price: 80,  svg: () => `<g fill="#fff" stroke="#ced4da" stroke-width="3"><circle cx="80" cy="14" r="15"/><circle cx="120" cy="14" r="15"/><circle cx="100" cy="2" r="19"/></g><rect x="74" y="20" width="52" height="24" rx="5" fill="#fff" stroke="#ced4da" stroke-width="3"/><path d="M88 26 L88 38 M100 26 L100 38 M112 26 L112 38" stroke="#e9ecef" stroke-width="3" stroke-linecap="round"/>` },
    { id: 'hat_flowers',slot: 'hat', name: 'Flower Crown',price: 90,  svg: () => `<path d="M64 44 Q100 22 136 44" stroke="#51cf66" stroke-width="5" fill="none" stroke-linecap="round"/>` + flower(68, 40, '#ff8fab') + flower(84, 32, '#b197fc') + flower(100, 29, '#ff8fab') + flower(116, 32, '#74c0fc') + flower(132, 40, '#b197fc') },
    { id: 'hat_pirate', slot: 'hat', name: 'Pirate Hat',  price: 100, svg: () => `<path d="M56 44 Q60 10 82 6 Q100 -8 118 6 Q140 10 144 44 Q100 28 56 44 Z" fill="#2b2d42" stroke="#14151f" stroke-width="3" stroke-linejoin="round"/><path d="M60 41 Q100 26 140 41" stroke="#ffd43b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M90 26 L110 10 M90 10 L110 26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="14" r="7.5" fill="#fff"/><circle cx="97" cy="13" r="2" fill="#2b2d42"/><circle cx="103" cy="13" r="2" fill="#2b2d42"/>` },
    { id: 'hat_cowboy', slot: 'hat', name: 'Cowboy Hat',  price: 110, svg: () => `<path d="M74 38 Q68 4 86 2 Q100 12 114 2 Q132 4 126 38 Z" fill="#b5651d" stroke="#7c3e12" stroke-width="3" stroke-linejoin="round"/><path d="M75 26 Q100 34 125 26 L126 34 Q100 42 74 34 Z" fill="#7c3e12"/><polygon points="${starPts(100, 33, 5.5, 2.4)}" fill="#ffd43b"/><path d="M48 32 Q56 46 100 46 Q144 46 152 32 Q148 52 100 52 Q52 52 48 32 Z" fill="#a0522d" stroke="#7c3e12" stroke-width="3" stroke-linejoin="round"/>` },
    { id: 'hat_wizard', slot: 'hat', name: 'Wizard Hat',  price: 120, svg: () => `<path d="M74 40 L108 -30 L126 40 Z" fill="#6741d9" stroke="#4c2fb0" stroke-width="3" stroke-linejoin="round"/><ellipse cx="100" cy="41" rx="40" ry="8" fill="#5233c4"/><polygon points="${starPts(100, 14, 9, 4)}" fill="#ffd43b"/><circle cx="110" cy="-6" r="3" fill="#ffd43b"/>` },
    { id: 'hat_halo',   slot: 'hat', name: 'Halo',        price: 130, svg: () => `<ellipse cx="100" cy="2" rx="36" ry="10" fill="none" stroke="#ffd43b" stroke-width="8"/><ellipse cx="100" cy="2" rx="36" ry="10" fill="none" stroke="#fff3bf" stroke-width="2.5"/><circle cx="72" cy="-6" r="2.5" fill="#fff3bf"/>` },
    { id: 'hat_crown',  slot: 'hat', name: 'Royal Crown', price: 150, svg: () => `<path d="M70 42 L72 6 L88 24 L100 -2 L112 24 L128 6 L130 42 Z" fill="#ffd43b" stroke="#e8a400" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="30" r="5" fill="#e64980"/><circle cx="83" cy="33" r="4" fill="#4dabf7"/><circle cx="117" cy="33" r="4" fill="#51cf66"/>` },
    { id: 'hat_unicorn',slot: 'hat', name: 'Unicorn Horn',price: 160, svg: () => `<path d="M89 40 L100 -22 L111 40 Z" fill="#fff3bf" stroke="#f59f00" stroke-width="3" stroke-linejoin="round"/><path d="M91 30 L108 22 M93 16 L106 10 M95 3 L104 -2" stroke="#f59f00" stroke-width="3" stroke-linecap="round"/>` + flower(84, 40, '#ff8fab') + flower(116, 40, '#b197fc') },
    { id: 'hat_helmet', slot: 'hat', name: 'Space Helmet',price: 200, front: true, svg: () => `<circle cx="100" cy="104" r="94" fill="rgba(186,230,253,.22)" stroke="#dee2e6" stroke-width="7"/><path d="M40 70 Q55 30 95 20" stroke="rgba(255,255,255,.85)" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="80" y="190" width="40" height="12" rx="5" fill="#adb5bd"/>` },
    // glasses
    { id: 'gl_round',  slot: 'glasses', name: 'Smart Specs',  price: 50,  svg: () => `<g fill="rgba(255,255,255,.18)" stroke="#2a1f45" stroke-width="4"><circle cx="85" cy="105" r="14"/><circle cx="115" cy="105" r="14"/></g><path d="M99 104 L101 104 M71 102 L60 98 M129 102 L140 98" stroke="#2a1f45" stroke-width="4" stroke-linecap="round"/>` },
    { id: 'gl_3d',     slot: 'glasses', name: '3D Glasses',   price: 60,  svg: () => `<rect x="66" y="93" width="68" height="24" rx="5" fill="#f8f9fa" stroke="#343a40" stroke-width="3"/><rect x="71" y="97" width="25" height="16" rx="3" fill="rgba(250,82,82,.72)"/><rect x="104" y="97" width="25" height="16" rx="3" fill="rgba(77,171,247,.72)"/><path d="M66 100 L58 96 M134 100 L142 96" stroke="#343a40" stroke-width="4" stroke-linecap="round"/>` },
    { id: 'gl_heart',  slot: 'glasses', name: 'Heart Glasses',price: 70,  svg: () => `<g fill="rgba(255,80,140,.55)" stroke="#c2255c" stroke-width="3" stroke-linejoin="round">${heart(85, 104)}${heart(115, 104)}</g><path d="M98 102 L102 102 M68 101 L60 97 M132 101 L140 97" stroke="#c2255c" stroke-width="4" stroke-linecap="round"/>` },
    { id: 'gl_sun',    slot: 'glasses', name: 'Cool Shades',  price: 80,  svg: () => `<rect x="69" y="95" width="28" height="20" rx="8" fill="#212529"/><rect x="103" y="95" width="28" height="20" rx="8" fill="#212529"/><path d="M97 102 L103 102 M69 100 L60 96 M131 100 L140 96" stroke="#212529" stroke-width="4" stroke-linecap="round"/><path d="M74 100 L80 100 M108 100 L114 100" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/>` },
    { id: 'gl_monocle',slot: 'glasses', name: 'Monocle',      price: 90,  svg: () => `<path d="M118 120 Q136 132 128 156" stroke="#e8a400" stroke-width="2.5" stroke-dasharray="3 3" fill="none" stroke-linecap="round"/><circle cx="115" cy="105" r="15" fill="rgba(255,255,255,.2)" stroke="#e8a400" stroke-width="4.5"/><path d="M106 98 Q110 94 115 93" stroke="rgba(255,255,255,.85)" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
    { id: 'gl_star',   slot: 'glasses', name: 'Star Glasses', price: 100, svg: () => `<polygon points="${starPts(85, 106, 17, 8.5)}" fill="rgba(255,120,190,.55)" stroke="#d6336c" stroke-width="3" stroke-linejoin="round"/><polygon points="${starPts(115, 106, 17, 8.5)}" fill="rgba(255,120,190,.55)" stroke="#d6336c" stroke-width="3" stroke-linejoin="round"/>` },
    { id: 'gl_ski',    slot: 'glasses', name: 'Ski Goggles',  price: 110, svg: () => `<path d="M66 104 L54 101 M134 104 L146 101" stroke="#1c7ed6" stroke-width="8" stroke-linecap="round"/><rect x="66" y="90" width="68" height="30" rx="15" fill="rgba(255,146,43,.78)" stroke="#1c7ed6" stroke-width="5"/><path d="M96 119 Q100 112 104 119" fill="#1c7ed6"/><path d="M76 98 L90 98 M112 98 L120 98" stroke="rgba(255,255,255,.8)" stroke-width="3" stroke-linecap="round"/>` },
    // neckwear
    { id: 'nk_bow',    slot: 'neck', name: 'Bow Tie', price: 40,  svg: () => `<path d="M100 144 L83 134 L83 154 Z M100 144 L117 134 L117 154 Z" fill="#e64980" stroke="#c2255c" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="144" r="5.5" fill="#c2255c"/>` },
    { id: 'nk_scarf',  slot: 'neck', name: 'Cozy Scarf', price: 60, svg: () => `<path d="M70 136 Q100 152 130 136 L130 147 Q100 163 70 147 Z" fill="#fa5252"/><rect x="110" y="146" width="11" height="24" rx="4" fill="#e03131"/><path d="M80 142 L80 150 M92 146 L92 154 M106 146 L106 154" stroke="#fff" stroke-width="3" opacity=".6"/>` },
    { id: 'nk_medal',  slot: 'neck', name: 'Gold Medal', price: 120, svg: () => `<path d="M86 132 L100 154 L114 132" stroke="#4dabf7" stroke-width="7" fill="none" stroke-linejoin="round"/><circle cx="100" cy="160" r="11" fill="#ffd43b" stroke="#e8a400" stroke-width="3"/><polygon points="${starPts(100, 160, 6, 3)}" fill="#e8a400"/>` }
  ];
  const itemById = (id) => ITEMS.find(i => i.id === id);

  /**
   * Build Nova's SVG markup.
   * @param {object} o { expr, equipped:{color,hat,glasses,neck}, cls }
   */
  function svg(o) {
    o = o || {};
    const id = 'nv' + (++uid);
    const eq = o.equipped || (KQ.State ? KQ.State.data.equipped : {});
    const colorItem = itemById(eq.color) || ITEMS[0];
    const fill = colorItem.fill === 'rainbow' ? `url(#${id}rb)` : colorItem.fill;
    const acc = (slot) => { const it = itemById(eq[slot]); return it ? it : null; };
    const hat = acc('hat'), gl = acc('glasses'), nk = acc('neck');
    const hand = (x, y, cls) => `<g class="${cls}"><circle cx="${x}" cy="${y}" r="12" fill="${fill}" stroke="rgba(70,35,90,.35)" stroke-width="3"/></g>`;

    return `<svg class="nova ${o.cls || ''}" data-expr="${o.expr || 'idle'}" viewBox="0 -34 200 236" role="img" aria-label="Nova the star helper">
  <defs>
    <radialGradient id="${id}hl"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b9d"/><stop offset=".25" stop-color="#ffd43b"/><stop offset=".5" stop-color="#69db7c"/><stop offset=".75" stop-color="#4dabf7"/><stop offset="1" stop-color="#b197fc"/></linearGradient>
  </defs>
  <ellipse cx="100" cy="192" rx="50" ry="8" fill="rgba(40,20,70,.18)"/>
  <g class="whole">
    ${hand(24, 80, 'hand-l')}${hand(176, 80, 'hand-r')}
    <path d="${STAR}" fill="${fill}" stroke="rgba(70,35,90,.35)" stroke-width="32" stroke-linejoin="round"/>
    <path d="${STAR}" fill="${fill}" stroke="${fill}" stroke-width="25" stroke-linejoin="round"/>
    <ellipse cx="84" cy="80" rx="34" ry="22" fill="url(#${id}hl)" transform="rotate(-20 84 80)"/>
    ${hat && !hat.front ? `<g class="acc-hat">${hat.svg()}</g>` : ''}
    <ellipse cx="73" cy="123" rx="9" ry="5.5" fill="#ff8fab" opacity=".75"/>
    <ellipse cx="127" cy="123" rx="9" ry="5.5" fill="#ff8fab" opacity=".75"/>
    <g class="eyes">
      <ellipse cx="85" cy="105" rx="8.5" ry="11.5" fill="#2a1f45"/>
      <ellipse cx="115" cy="105" rx="8.5" ry="11.5" fill="#2a1f45"/>
      <circle cx="82" cy="100" r="3.4" fill="#fff"/><circle cx="112" cy="100" r="3.4" fill="#fff"/>
      <circle cx="88" cy="109" r="1.6" fill="#fff"/><circle cx="118" cy="109" r="1.6" fill="#fff"/>
    </g>
    <path class="m m-smile" d="M89 124 Q100 135 111 124" stroke="#2a1f45" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g class="m m-grin"><path d="M87 122 Q100 142 113 122 Z" fill="#2a1f45" stroke="#2a1f45" stroke-width="3" stroke-linejoin="round"/><path d="M93 132 Q100 128 107 132 Q100 138 93 132 Z" fill="#ff8fab"/></g>
    <g class="m m-open"><ellipse cx="100" cy="129" rx="11" ry="10" fill="#2a1f45"/><ellipse cx="100" cy="134" rx="6" ry="4" fill="#ff8fab"/></g>
    <ellipse class="m m-o" cx="104" cy="128" rx="5" ry="5.5" fill="#2a1f45"/>
    <path class="m m-soft" d="M92 126 Q100 132 108 126" stroke="#2a1f45" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${gl ? `<g class="acc-gl">${gl.svg()}</g>` : ''}
    ${nk ? `<g class="acc-nk">${nk.svg()}</g>` : ''}
    ${hat && hat.front ? `<g class="acc-hat">${hat.svg()}</g>` : ''}
  </g>
  <g class="sparkles" fill="#ffd43b" stroke="#f59f00" stroke-width="1.5">
    <polygon points="${starPts(22, 18, 13, 5, 4)}"/><polygon points="${starPts(182, 26, 11, 4, 4)}"/><polygon points="${starPts(184, 150, 9, 3.5, 4)}"/>
  </g>
  <g class="think-dots" fill="#fff" stroke="#c5b9f0" stroke-width="3"><circle cx="150" cy="34" r="6"/><circle cx="166" cy="16" r="9"/><circle cx="186" cy="-8" r="12"/></g>
  <path class="heart" d="M160 58 C160 50 172 50 172 58 C172 50 184 50 184 58 C184 68 172 74 172 78 C172 74 160 68 160 58 Z" fill="#ff6b9d"/>
</svg>`;
  }

  /* ---------------- Phrases ---------------- */
  const P = {
    praise: [
      'Amazing! ✨', 'You did it!', 'Super smart!', 'Wow, great thinking!', 'Brilliant!', 'Fantastic job!',
      "You're a star! ⭐", 'Correct! High five! ✋', 'Yes! Your brain is glowing!', 'Awesome work!',
      'Spot on!', 'Perfect!', "That's exactly right!", 'Hooray! 🎉', 'You nailed it!', 'Great job, {name}!',
      'Super-duper!', 'Brainy and bright!', 'Way to go!', 'Woohoo! Right answer!'
    ],
    encourage: [
      "Nice try! Let's learn it together.", "That's okay — mistakes help us learn!", 'Good try! Let me show you.',
      "Not quite, but you're getting closer!", 'Hmm, tricky one! Look:', 'No worries — brains grow when we try!',
      "You're doing great. Here's a tip:", "Almost! Let's see why:", 'That was a hard one! Remember:',
      "Keep going, {name} — you've got this!", 'Every try makes you smarter!', "Oopsie! Here's the secret:"
    ],
    intro: [
      "Welcome to level {n}! Today it's {topic}. Let's go!", "Ready for {topic}? I'll be right here to help!",
      'Ooh, level {n}! I love {topic}!', "Let's explore {topic} together!", "Put on your thinking cap — it's {topic} time!",
      "Level {n} is waiting! Tap Start when you're ready.", "I bet you'll be great at {topic}!",
      "New adventure: {topic}! Let's shine bright!", 'Here we go, {name}! {topic} is super fun.',
      'Take your time and do your best. {topic}, here we come!', "Stretch your fingers… it's {topic} time!"
    ],
    testIntro: [
      "It's a TEST! 🏆 {q} questions mixing everything you learned. You can do it!",
      'Big challenge time! {q} questions. Remember, I can give you a hint!',
      'Trophy level! 🏆 Show what your brain can do — {q} questions!',
      'Test time, {name}! Take a deep breath. You learned so much already!'
    ],
    hint: ["Here's a little clue:", 'Psst… a hint:', "Let's think together:", 'Try this:'],
    streak3: ['3 in a row! 🔥', "Three right! You're warming up! 🔥", 'Hat-trick! 3 in a row!'],
    streak5: ["5 in a row! You're unstoppable! 🔥", 'FIVE in a row! Wow!', 'Super streak! 5 right!'],
    streak10: ['10 in a row! Legendary! 🌟', 'TEN in a row! Are you a genius?!'],
    pass: ['You passed! I knew you could do it!', 'Level complete! Your brain is AMAZING!', 'Woohoo! On to the next adventure!', 'Great work! You unlocked something new!'],
    perfect: ['PERFECT! 100 points! You are a superstar! 🌟', 'Every single one right! WOW!', 'Three stars! That was incredible!'],
    fail: ["You needed just {k} more right {answers}. Let's try again — you'll get it!", "So close! Only {k} more right {answers} next time. I believe in you!", 'Practice makes progress! {k} more right {answers} and you pass!'],
    locked: ['Level {n} is still locked 🔒. Beat level {c} first!', "Oops, that one is locked! Let's finish level {c} first.", 'Not yet! Pass level {c} and keep going toward level {n}!'],
    timeup: ["Time's up — that's okay!", 'The clock beat us this time. No problem!'],
    welcome: ["Hi! I'm Nova! ✨ Let's learn and play together!", 'Hello, friend! Ready for an adventure?', "Yay, you're here! Let's have fun learning!"],
    map: ["Pick a level, {name}! The glowing one is next.", "Where shall we go today, {name}?", "Tap the glowing level to keep going!", "You're doing so well, {name}!"],
    shopBroke: ["You need {k} more coins. Answer questions to earn more!", 'Almost! {k} more coins and it\'s yours!'],
    shopBuy: ['Ooh, I love it! Thank you!', 'Do I look fabulous? I think so!', 'So stylish! ✨'],
    daily: ['A daily gift for you! 🎁', 'Welcome back! Here is a present!']
  };
  const last = {};
  /** Pick a phrase from a list without repeating the previous one; fill {vars}. */
  function say(list, vars) {
    const arr = P[list] || [list];
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && i === last[list]) i = (i + 1) % arr.length;
    last[list] = i;
    return fill(arr[i], vars);
  }
  function fill(str, vars) {
    const v = Object.assign({ name: (KQ.State && KQ.State.data.player && KQ.State.data.player.name) || 'friend' }, vars);
    return str.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m));
  }

  /**
   * Mount Nova + speech bubble into a container element (.helper markup).
   * Returns a small controller: say(text, expr), set(expr, ms)
   */
  function helper(root, opts) {
    opts = opts || {};
    root.classList.add('helper');
    root.innerHTML = `<div class="nova-wrap"></div><div class="bubble" role="status"></div>`;
    const wrap = root.querySelector('.nova-wrap');
    const bubble = root.querySelector('.bubble');
    wrap.innerHTML = svg({ expr: opts.expr || 'idle' });
    let timer = null, current = '';
    const ctrl = {
      el: root,
      set(expr, ms) {
        const s = wrap.querySelector('svg');
        if (!s) return;
        // restart CSS animation
        s.setAttribute('data-expr', 'none');
        void s.getBoundingClientRect();
        s.setAttribute('data-expr', expr);
        clearTimeout(timer);
        if (ms) timer = setTimeout(() => s.setAttribute('data-expr', 'idle'), ms);
      },
      say(text, expr, ms) {
        current = text;
        bubble.innerHTML = (KQ.Audio.canSpeak && KQ.State.data.settings.speech ? '<span class="speak-ico" aria-hidden="true">🔊</span>' : '') + escapeHTML(text);
        bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
        if (expr) ctrl.set(expr, ms);
      },
      get text() { return current; },
      refresh() { const e = wrap.querySelector('svg').getAttribute('data-expr'); wrap.innerHTML = svg({ expr: e }); }
    };
    // Tap the bubble to hear it read aloud
    bubble.addEventListener('click', () => { if (current) { KQ.Audio.speak(current); KQ.State.bumpStat('speaks'); } });
    if (opts.text) ctrl.say(opts.text, opts.expr);
    return ctrl;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  KQ.Mascot = { svg, helper, ITEMS, itemById, say, fill, P, escapeHTML };
})();
