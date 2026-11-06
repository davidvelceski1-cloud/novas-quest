/* ==========================================================================
   effects.js – confetti, particle bursts and haptic feedback.
   One <canvas id="fx"> covers the game; particles are drawn with
   requestAnimationFrame and the loop stops when nothing is left.
   No flashing: particles only move and fade.
   ========================================================================== */
(function () {
  'use strict';
  const KQ = (window.KQ = window.KQ || {});

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#ff6b9d', '#ffd43b', '#51cf66', '#4dabf7', '#9775fa', '#ff922b', '#ffffff'];

  let canvas, g, W = 0, H = 0, dpr = 1, parts = [], running = false;

  function setup() {
    canvas = document.getElementById('fx');
    if (!canvas) return;
    g = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  function loop() {
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= 1;
      p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
      const a = Math.min(1, p.life / 30);
      g.save();
      g.globalAlpha = a;
      g.translate(p.x, p.y); g.rotate(p.rot);
      g.fillStyle = p.color;
      if (p.shape === 'rect') { g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
      else if (p.shape === 'circle') { g.beginPath(); g.arc(0, 0, p.size / 2, 0, Math.PI * 2); g.fill(); }
      else { drawStar(p.size / 2); }
      g.restore();
    }
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; g.clearRect(0, 0, W, H); }
  }
  function drawStar(r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.45 : r;
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      g.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    g.closePath(); g.fill();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  /** Rain of confetti from the top. amount ~ 80 normal, 180 for 3 stars. */
  function confetti(amount) {
    if (!g) setup();
    if (!g) return;
    resize();
    const n = reduced() ? Math.round((amount || 80) / 4) : (amount || 80);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
        grav: 0.06, drag: 0.995, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25,
        size: 8 + Math.random() * 8, color: COLORS[i % COLORS.length],
        shape: ['rect', 'circle', 'star'][i % 3], life: 220 + Math.random() * 80
      });
    }
    kick();
  }

  /** Small burst of stars at a screen point (e.g. a correct answer). */
  function burst(x, y, amount, colors) {
    if (!g) setup();
    if (!g) return;
    const rect = canvas.getBoundingClientRect();
    const cx = x - rect.left, cy = y - rect.top;
    const n = reduced() ? 6 : (amount || 18);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const sp = 2.5 + Math.random() * 3.5;
      parts.push({
        x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1,
        grav: 0.12, drag: 0.96, rot: 0, vr: 0.1, size: 10 + Math.random() * 8,
        color: (colors || COLORS)[i % (colors || COLORS).length], shape: 'star', life: 45 + Math.random() * 20
      });
    }
    kick();
  }
  function burstAt(el, amount, colors) {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, amount, colors);
  }

  /** Haptic feedback where supported (Android Chrome; iOS ignores it). */
  function haptic(pattern) {
    try {
      const ua = navigator.userActivation;
      if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(pattern);
    } catch (e) { /* ignore */ }
  }

  /** Animate a number counting up inside an element. */
  function countUp(el, to, ms, suffix) {
    const start = performance.now(), from = 0, dur = reduced() ? 1 : (ms || 1000);
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * e) + (suffix || '');
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  KQ.FX = { setup, resize, confetti, burst, burstAt, haptic, countUp, reduced };
})();
