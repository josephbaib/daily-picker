// Чиптюн через Web Audio. Файлов нет. Всё продублировано визуально, звук только бонус.
let ctx = null;
let enabled = false;
let rollTimer = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, dur, type = 'square', vol = 0.08, when = 0) {
  if (!enabled) return;
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + when);
  o.stop(a.currentTime + when + dur + 0.02);
}

export const sound = {
  get enabled() { return enabled; },
  setEnabled(v) { enabled = v; if (v) ac(); },
  tick() { beep(880, 0.08); },
  go() { beep(1320, 0.25, 'square', 0.1); },
  pop() { beep(220, 0.12, 'sawtooth', 0.09); beep(110, 0.2, 'square', 0.06, 0.03); },
  step() { beep(440 + Math.random() * 200, 0.03, 'square', 0.02); },
  rollStart() {
    if (rollTimer || !enabled) return;
    rollTimer = setInterval(() => beep(160 + Math.random() * 40, 0.04, 'triangle', 0.05), 70);
  },
  rollStop() { clearInterval(rollTimer); rollTimer = null; },
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'square', 0.09, i * 0.12));
    beep(1046, 0.5, 'square', 0.1, 0.5);
  },
};
