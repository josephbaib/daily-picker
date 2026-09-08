// Звук через Web Audio: шум, фильтры, огибающие. Файлов нет. Всё продублировано визуально.
let ctx = null;
let enabled = false;
let noiseBuf = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

function env(node, t0, vol, attack, decay) {
  const g = ac().createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  node.connect(g).connect(ac().destination);
  return g;
}

function tone(freq, { type = 'sine', vol = 0.1, attack = 0.005, decay = 0.2, when = 0, slide = null, detune = 0 } = {}) {
  if (!enabled) return;
  const a = ac(), t0 = a.currentTime + when;
  const o = a.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + attack + decay);
  env(o, t0, vol, attack, decay);
  o.start(t0); o.stop(t0 + attack + decay + 0.05);
}

function noise({ vol = 0.1, attack = 0.01, decay = 0.2, when = 0, filter = 'bandpass', freq = 1000, q = 1, sweep = null } = {}) {
  if (!enabled) return;
  const a = ac(), t0 = a.currentTime + when;
  const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + attack + decay);
  src.connect(f);
  env(f, t0, vol, attack, decay);
  src.start(t0); src.stop(t0 + attack + decay + 0.05);
}

export const sound = {
  get enabled() { return enabled; },
  setEnabled(v) { enabled = v; if (v) ac(); },
  // отсчёт: мягкий деревянный щелчок
  tick() { tone(720, { type: 'sine', vol: 0.12, decay: 0.09 }); noise({ vol: 0.05, decay: 0.03, freq: 2500 }); },
  // старт: двойной колокольчик
  go() { tone(660, { type: 'triangle', vol: 0.14, decay: 0.35 }); tone(990, { type: 'triangle', vol: 0.12, decay: 0.6, when: 0.12 }); },
  // выбывание: глухой удар и короткий шум
  pop() { tone(140, { type: 'sine', vol: 0.2, decay: 0.25, slide: 45 }); noise({ vol: 0.12, decay: 0.12, freq: 600, filter: 'lowpass' }); },
  // свист пролёта
  whoosh() { noise({ vol: 0.12, attack: 0.05, decay: 0.3, freq: 400, sweep: 2400, q: 0.7 }); },
  // звонок лифта
  ding() { tone(1319, { type: 'sine', vol: 0.12, decay: 0.9 }); tone(2637, { type: 'sine', vol: 0.05, decay: 0.6 }); },
  // аплодисменты: много коротких шумовых хлопков
  applause(dur = 1.6) {
    for (let i = 0; i < dur * 22; i++) noise({ vol: 0.05 + Math.random() * 0.05, decay: 0.03, when: Math.random() * dur, freq: 1200 + Math.random() * 1500, q: 2 });
  },
  step() {},
  rollStart() {}, rollStop() {},
  // финал: аккорд трубами и аплодисменты
  fanfare() {
    [[523, 0], [659, 0], [784, 0], [1047, 0.18]].forEach(([f, w]) => {
      tone(f, { type: 'sawtooth', vol: 0.05, attack: 0.02, decay: 0.7, when: w, detune: -6 });
      tone(f, { type: 'triangle', vol: 0.07, attack: 0.02, decay: 0.7, when: w, detune: 6 });
    });
    this.applause(1.8);
  },
};
