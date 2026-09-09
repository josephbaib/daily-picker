# Промпты для заказа персонажей

Лист заказывается в любом генераторе картинок или у художника. Формат важнее стиля: без него лист не встанет в игру.

```
Pixel-art character spritesheet for a web game, 16-bit RPG style.

Format strictly Universal LPC Spritesheet (layout reference:
github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator):
PNG 832×1344, transparent background, 64×64 frames, 13 columns × 21 rows.
Required rows: 8–11 walk (up, left, down, right, 9 frames each: first frame standing),
15 slash right (6 frames), 20 hurt (6 frames). Other rows may stay empty.
Character body about 32×56 px inside the frame, feet on the same baseline as LPC base
bodies. Match LPC proportions and palette so it blends with other LPC characters.

Character: <описание внешности>
```

Готовый файл кладётся в `assets/lpc/custom/` и нарезается: `python3 tools/slice-sheet.py <вход.png> assets/lpc/custom/<имя>.png`. Затем в `js/roster.js`: `'Имя': { sheet: 'custom/<имя>.png' }`.
