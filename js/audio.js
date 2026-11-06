/* ==========================================================================
   audio.js – every sound is synthesised with the Web Audio API (no files).
   Audio starts only after the first tap (browser autoplay rules).
   Also wraps speechSynthesis for the optional "read aloud" 🔊 feature.
   ========================================================================== */
(function () {
  'use strict';
  const KQ = (window.KQ = window.KQ || {});

  let ctx = null, master = null, sfxBus = null, musicBus = null;
  let musicOn = false, musicTimer = null, nextNoteTime = 0, step = 0;

  /** Create / resume the AudioContext. Call from a user gesture. */
  function init() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
        musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
      }
      if (ctx.state === 'suspended') ctx.resume();
      if (musicOn && !musicTimer) startMusic();
    } catch (e) { ctx = null; }
  }

  const sfxEnabled = () => KQ.State && KQ.State.data.settings.sfx;

  /** One soft note with an attack/decay envelope. */
  function note(freq, t, dur, opts) {
    if (!ctx) return;
    const o = Object.assign({ type: 'sine', vol: 0.3, slide: 0, bus: sfxBus }, opts);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(freq * o.slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  // Note frequencies (Hz)
  const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784.0, A5: 880.0, B5: 987.8, C6: 1046.5, E6: 1318.5, G6: 1568 };

  const SOUNDS = {
    tap(t)    { note(N.G5, t, 0.07, { type: 'triangle', vol: 0.18 }); },
    correct(t){ [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => note(f, t + i * 0.075, 0.18, { type: 'triangle', vol: 0.28 })); },
    wrong(t)  { note(N.E4, t, 0.22, { type: 'sine', vol: 0.22 }); note(N.C4, t + 0.16, 0.3, { type: 'sine', vol: 0.2 }); }, // gentle "hmm-mm"
    star(t)   { note(N.C6, t, 0.25, { type: 'sine', vol: 0.25 }); note(N.E6, t + 0.08, 0.3, { type: 'sine', vol: 0.22 }); note(N.G6, t + 0.16, 0.4, { type: 'sine', vol: 0.18 }); },
    coin(t)   { note(N.B5, t, 0.08, { type: 'square', vol: 0.1 }); note(N.E6, t + 0.08, 0.25, { type: 'square', vol: 0.1 }); },
    unlock(t) { [N.G4, N.C5, N.E5, N.G5, N.C6].forEach((f, i) => note(f, t + i * 0.06, 0.2, { type: 'triangle', vol: 0.24 })); },
    flip(t)   { note(N.A4, t, 0.06, { type: 'triangle', vol: 0.15, slide: 1.6 }); },
    pop(t)    { note(N.C5, t, 0.1, { type: 'sine', vol: 0.25, slide: 2 }); },
    victory(t) {
      const mel = [[N.C5, 0], [N.E5, .14], [N.G5, .28], [N.C6, .42], [N.G5, .62], [N.C6, .76]];
      mel.forEach(([f, d]) => note(f, t + d, 0.22, { type: 'triangle', vol: 0.3 }));
      [N.C5, N.E5, N.G5].forEach(f => note(f, t + 0.95, 0.9, { type: 'sine', vol: 0.18 }));
    },
    fanfare(t) { // bigger 3-star version
      SOUNDS.victory(t);
      [N.E5, N.G5, N.C6, N.E6].forEach((f, i) => note(f, t + 1.2 + i * 0.09, 0.3, { type: 'triangle', vol: 0.22 }));
      [N.C5, N.E5, N.G5, N.C6].forEach(f => note(f, t + 1.6, 1.2, { type: 'sine', vol: 0.14 }));
    }
  };

  function play(name) {
    if (!sfxEnabled()) return;
    init();
    if (!ctx || !SOUNDS[name]) return;
    try { SOUNDS[name](ctx.currentTime + 0.01); } catch (e) { /* ignore */ }
  }

  /* ---------------- Background music ----------------
     A simple, soft pentatonic melody + bass that loops forever.
     Scheduled a little ahead with a timer ("lookahead scheduler"). */
  const MELODY = ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', null,
                  'G4', 'A4', 'C5', 'A4', 'D5', 'C5', 'A4', 'G4', 'A4', 'C5', 'D5', 'E5', 'D5', 'C5', 'C5', null];
  const BASS = ['C4', 'C4', 'A4', 'A4', 'F4', 'F4', 'G4', 'G4'];
  const BEAT = 0.3; // seconds per eighth note

  function scheduler() {
    if (!ctx) return;
    while (nextNoteTime < ctx.currentTime + 0.5) {
      const m = MELODY[step % MELODY.length];
      if (m) note(N[m], nextNoteTime, BEAT * 0.9, { type: 'triangle', vol: 0.5, bus: musicBus });
      if (step % 4 === 0) note(N[BASS[(step / 4) % BASS.length]] / 2, nextNoteTime, BEAT * 3.6, { type: 'sine', vol: 0.45, bus: musicBus });
      nextNoteTime += BEAT;
      step++;
    }
  }
  function startMusic() {
    if (!ctx || musicTimer) return;
    nextNoteTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(scheduler, 120);
  }
  function stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  }
  function setMusic(on) {
    musicOn = !!on;
    if (musicOn) { init(); startMusic(); } else stopMusic();
  }

  /* ---------------- Read aloud (Web Speech API) ---------------- */
  const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  let voice = null;
  function pickVoice() {
    if (!canSpeak) return;
    const vs = speechSynthesis.getVoices() || [];
    voice = vs.find(v => /^en(-|_)/i.test(v.lang) && /female|samantha|zira|aria|jenny|google us/i.test(v.name)) ||
            vs.find(v => /^en(-|_)/i.test(v.lang)) || null;
  }
  if (canSpeak) { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { /* ignore */ } }

  /** Remove emoji & symbols so the voice reads naturally. */
  function clean(text) {
    return String(text)
      .replace(/<[^>]+>/g, ' ')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, ' ')
      .replace(/_+/g, ' blank ')
      .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ')
      .replace(/\s+/g, ' ').trim();
  }
  function speak(text) {
    if (!canSpeak || !KQ.State.data.settings.speech) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean(text));
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-US';
      u.rate = 0.92; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function stopSpeaking() { if (canSpeak) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

  KQ.Audio = { init, play, setMusic, speak, stopSpeaking, canSpeak, clean };
})();
