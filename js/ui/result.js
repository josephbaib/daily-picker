import { drawAvatar } from '../avatar.js';

// Финальный экран: имя первого крупно, полный порядок, конфетти.
export function mountResult(root, { onClose }) {
  root.innerHTML = `
    <div class="rbox">
      <div class="rkicker">Первым говорит</div>
      <div class="rwinner"><canvas class="rav" width="72" height="96"></canvas><div class="rname"></div></div>
      <ol class="rorder"></ol>
      <div class="rmemo"></div>
      <div class="rhint">Пробел или клик, чтобы закрыть</div>
    </div>
    <canvas class="rconf"></canvas>`;
  const conf = root.querySelector('.rconf');
  let raf = 0;

  function confetti() {
    conf.width = root.clientWidth; conf.height = root.clientHeight;
    const ctx = conf.getContext('2d');
    const colors = ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#f4ecd8', '#9650c8'];
    const ps = Array.from({ length: 160 }, () => ({
      x: Math.random() * conf.width, y: -20 - Math.random() * conf.height * 0.5,
      vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 160, s: 6 + Math.random() * 6,
      c: colors[Math.floor(Math.random() * colors.length)], r: Math.random() * 6,
    }));
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, conf.width, conf.height);
      let alive = 0;
      ps.forEach((p) => {
        p.x += p.vx * dt + Math.sin(now / 300 + p.r) * 20 * dt; p.y += p.vy * dt;
        if (p.y < conf.height + 20) alive++;
        ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s * 0.6);
      });
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  const close = () => { if (!root.hidden) { root.hidden = true; cancelAnimationFrame(raf); onClose(); } };
  root.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !root.hidden) { e.preventDefault(); close(); } });

  return {
    show(ordered, lastFirstName, note) {
      const first = ordered[0];
      root.querySelector('.rname').textContent = first.name;
      drawAvatar(root.querySelector('.rav').getContext('2d'), 0, 0, first.avatar, 6, 0);
      const ol = root.querySelector('.rorder');
      ol.innerHTML = '';
      ordered.slice(1).forEach((p, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 2} ${p.name}`;
        ol.append(li);
      });
      root.querySelector('.rmemo').textContent = note || (lastFirstName ? `Вчера первым был(а) ${lastFirstName}` : '');
      root.hidden = false;
      confetti();
    },
    hide: close,
  };
}
