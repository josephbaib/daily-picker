import { spriteCanvas, portraitCanvas } from '../sprite.js?v=018888a-1722';

// Экран результата: первый крупно, порядок остальных, конфетти, кнопки «Ещё раз» и «В меню».
export function mountResult(root, { onAgain, onMenu }) {
  root.innerHTML = `
    <canvas class="rconf"></canvas>
    <div class="rbox">
      <div class="rkicker">Первым говорит</div>
      <div class="rwinner"><canvas class="rav"></canvas><div class="rname"></div></div>
      <ol class="rorder"></ol>
      <div class="rmemo"></div>
      <div class="rbtns"><button class="play again">Ещё раз</button><button class="secondary menu">В меню</button></div>
    </div>`;
  const conf = root.querySelector('.rconf');
  let raf = 0;

  function confetti() {
    conf.width = root.clientWidth; conf.height = root.clientHeight;
    const ctx = conf.getContext('2d');
    const colors = ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#f4ecd8', '#9650c8', '#ff8c42'];
    const ps = Array.from({ length: 220 }, () => ({
      x: Math.random() * conf.width, y: -20 - Math.random() * conf.height * 0.6,
      vx: (Math.random() - 0.5) * 80, vy: 140 + Math.random() * 180, s: 6 + Math.random() * 8,
      c: colors[Math.floor(Math.random() * colors.length)], r: Math.random() * 6, w: 0.5 + Math.random(),
    }));
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, conf.width, conf.height);
      let alive = 0;
      ps.forEach((p) => {
        p.x += p.vx * dt + Math.sin(now / 300 + p.r) * 30 * dt; p.y += p.vy * dt;
        if (p.y < conf.height + 20) alive++;
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s * Math.abs(Math.sin(now / 200 * p.w + p.r)) * 0.8 + 2);
      });
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  root.querySelector('.again').onclick = () => { hide(); onAgain(); };
  root.querySelector('.menu').onclick = () => { hide(); onMenu(); };
  document.addEventListener('keydown', (e) => {
    if (root.hidden) return;
    if (e.code === 'Escape') { hide(); onMenu(); }
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); hide(); onAgain(); }
  });

  function hide() { root.hidden = true; cancelAnimationFrame(raf); }

  return {
    show(ordered, memo) {
      const first = ordered[0];
      root.querySelector('.rname').textContent = first.name;
      const av = root.querySelector('.rav');
      const src = spriteCanvas(first.person, 'cheer', 4);
      av.width = src.width; av.height = src.height; av.getContext('2d').drawImage(src, 0, 0);
      const ol = root.querySelector('.rorder'); ol.innerHTML = '';
      ordered.slice(1).forEach((p, i) => {
        const li = document.createElement('li');
        const pc = portraitCanvas(p.person, 2);
        const cv = document.createElement('canvas'); cv.width = pc.width; cv.height = pc.height; cv.getContext('2d').drawImage(pc, 0, 0);
        const b = document.createElement('b'); b.textContent = String(i + 2);
        li.append(cv, b, document.createTextNode(p.name));
        ol.append(li);
      });
      root.querySelector('.rmemo').textContent = memo || '';
      root.hidden = false;
      confetti();
    },
    hide,
  };
}
