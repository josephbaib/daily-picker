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


# Промпты для обложек игр

Стиль общий для всех: `PlayStation 2 era video game box art, early 2000s painted illustration, dramatic lighting, cinematic composition, vertical 3:4, no text, no logos`. Персонажи: офисные сотрудники в белых рубашках с зелёными галстуками. Готовый файл: `assets/covers/<id>.jpg`, 420×560, и поле `cover` в файле игры.

- **Картинг** (`kart`): office workers racing go-karts around a corporate campus at dusk, seated drivers gripping steering wheels, traffic cones and spilled coffee cups on the track, a green glass office tower behind, motion blur, low camera angle.
- **Драка** (`brawl`): a boxing ring in a packed arena, office workers in loosened green ties brawling, one flying over the ropes, spotlight from above, cheering crowd in the dark, dynamic comic-book angle.
- **Крыши** (`rooftops`): ninja-style rooftop chase at night over a village of round tiled roofs and paper lanterns, office workers with forehead headbands leaping a gap between roofs, a huge carved mountain face and a red tower in the distance, full moon.
- **Полигон** (`training`): forest training ground at dusk with wooden posts, office workers in ninja headbands dodging a volley of shuriken, one puffing into smoke with a wooden log left behind, glowing red target mark hovering, fireball in the background.
- **Эльбрус** (`elbrus`): office workers in white shirts and green ties climbing a snowy zigzag trail up Mount Elbrus at dawn, ropes and ice axes, red Barrels huts and a cable car far below, an avalanche cloud on the slope, a green flag being planted on the summit, sea of clouds beneath.

## Фоновые плиты (схема из docs/BENCHMARK.md)

Общая часть каждого промпта: *16:9 pixel art background plate for a side-scrolling game, 1920×1080, crisp pixel clusters, limited palette of about 32 colors, no characters, no text, no watermark, seamless when scrolled horizontally.* Слои с прозрачностью просить на ровном зелёном фоне (#00ff00), затем `tools/pixelize.py --key '#00ff00'`.

**Крыши (`rooftops`), пилот.** Ночная деревня в духе Скрытого Листа.
1. *Sky plate:* deep indigo night sky with a huge full moon on the right, thin drifting clouds, scattered stars, faint glow band near the horizon, no ground.
2. *Far plate:* distant village silhouette on hills, carved mountain face with four faces (Hokage rock) in the middle, a red tower with pagoda roof, tiny warm windows; everything washed by blue haze, low contrast. Solid green background.
3. *Mid plate:* row of wooden houses with round tiled roofs, paper lanterns on wires between them, shop signs, balconies, ladders, water tanks, antennas, laundry lines, warm light spilling from windows onto walls. Solid green background above the roofline.
4. *Play plate:* the rooftops the runners run along: tiles with moss and broken pieces, chimneys, wooden planks bridging gaps, ropes, lantern posts at the edges; keep the top edge a clean walkable line. Solid green background.
5. *Foreground plate:* dark silhouettes in front of the camera: a lantern with glowing paper, hanging cloth banners, a tree branch with leaves, a rooftop railing; 20% of the frame, mostly empty. Solid green background.
6. *Props sheet:* 4-frame animations side by side on green: lantern flicker, flag wave, window with a moving silhouette, steam from a chimney, each frame 64×64.
