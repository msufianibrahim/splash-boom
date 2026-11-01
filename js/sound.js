'use strict';
// All sounds are synthesised with WebAudio — no audio files needed.
const Sound = (() => {
  let ctx = null, noiseBuf = null, on = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = ctx.sampleRate * 1.5;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(g, t, attack, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = 0) {
    if (!on) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(g, t, 0.01, vol, dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, type, f1, f2, vol, when = 0) {
    if (!on) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); env(g, t, 0.005, vol, dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const boom = () => { noise(1.1, 'lowpass', 2400, 70, 0.9); tone(110, 0.7, 'sine', 0.7, 0, 35); };
  const bubbles = (when) => { for (let i = 0; i < 7; i++) tone(300 + Math.random() * 500, 0.08, 'sine', 0.12, when + i * 0.09, 1000); };

  return {
    unlock: ac,
    get on() { return on; },
    set on(v) { on = v; },
    tap() { tone(700, 0.07, 'triangle', 0.15); },
    tick() { tone(1200, 0.04, 'square', 0.04); },
    whistle() { tone(1500, 0.5, 'sine', 0.07, 0, 380); },
    splash() { noise(0.6, 'bandpass', 3000, 500, 0.55); tone(480, 0.25, 'sine', 0.12, 0.05, 160); bubbles(0.25); },
    boom,
    sunk() {
      [523, 440, 349, 262].forEach((f, i) => tone(f, 0.28, 'square', 0.07, 0.15 + i * 0.2, f * 0.9));
      bubbles(1.0);
    },
    fanfare() {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.7 : 0.18, 'triangle', 0.22, i * 0.16));
      [262, 330, 392].forEach(f => tone(f, 1.2, 'sine', 0.08, 0.8));
    },
    sad() { [392, 349, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, i * 0.25)); },
    rotate() { tone(500, 0.12, 'triangle', 0.14, 0, 900); },
    place() { tone(350, 0.08, 'triangle', 0.16); tone(520, 0.1, 'triangle', 0.14, 0.06); },
    shuffle() { for (let i = 0; i < 5; i++) tone(400 + i * 120, 0.06, 'triangle', 0.1, i * 0.05); },
    wrong() { tone(180, 0.18, 'square', 0.07); },
  };
})();
