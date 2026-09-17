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

**Эльбрус (`elbrus`).** Камера едет вверх, поэтому склон собран из четырёх плит, поставленных друг на друга. Стыки закрывают полосы облаков, сквозь которые проходят альпинисты.

Общая часть для плит склона (3–6): *16:9 pixel art plate for a vertical-scrolling game, 1920×1080, crisp pixel clusters, limited palette of about 32 colors, three-quarter top-down view of a snowy mountain slope like a 16-bit RPG overworld, up on the image means higher on the mountain, low morning sun from the upper right, cool blue shadows, warm highlights on snow, no characters, no text, no watermark. Keep the central vertical band (middle 55% of the width) as open walkable snow with only subtle texture: wind ridges, small cracks, footprints-free. All objects stay in the left 22% and the right 22%. Scale: a person would be about 1/7 of the image height.*

1. *Sky plate (full image):* high-altitude sky before sunrise, deep blue at the top fading to pale orange at the bottom, faint stars at the top, small sun disc with glow low on the right, no ground, no clouds.
2. *Far plate (solid green #00ff00 background above):* the Caucasus main ridge seen from above the clouds: sharp rocky snow peaks rising out of a flat sea of clouds, washed by blue haze, low contrast; the lower third is only the sea of clouds.
3. *Summit plate (solid green #00ff00 background around the mountain):* the top of the mountain as a snowy cone narrowing upward, its tip in the upper third of the image, with a small rocky summit outcrop, a stone marker, strings of colorful prayer flags, rime ice and wind-blown snow cornices; the cone widens to the full image width at the bottom edge.
4. *Saddle plate (full image, no sky):* the high saddle below the summit: hard wind-packed snow, bands of dark volcanic rocks on the left and right, a ruined small stone hut half buried in snow on the left, ice patches, fixed rope stakes along the sides.
5. *Glacier plate (full image, no sky):* glacier section: blue ice, long crevasses with deep blue insides on the left and right, blocky seracs, scattered dark rocks, snow bridges.
6. *Base plate (full image, no sky):* the base camp at the foot of the slope: on the left a cable car station with a green roof, cable towers and cables going up along the left edge; on the right a row of red-orange cylindrical mountain huts (barrels) with small windows and chimneys, a red snowcat parked nearby, ski fences and skis stuck in the snow; at the very bottom a road and dark green pine trees in snow.
7. *Cloud band plate (solid green #00ff00 background):* a wide horizontal band of fluffy white clouds with blue-grey undersides across the whole width, filling only the middle third of the image height, soft top and bottom edges, seamless horizontally.
8. *Foreground plate (solid green #00ff00 background):* dark near-camera silhouettes at the frame edges only: a rock outcrop with icicles in the lower left corner, a snow-covered boulder with a string of prayer flags in the lower right corner, an overhanging snow cornice with icicles along the top edge; the middle 60% of the image stays empty.
9. *Props sheet (solid green #00ff00 background):* four rows of 4-frame animations, each frame in a 128×128 cell, rows aligned in a grid: row 1 a small red flag on a bamboo wand waving in the wind; row 2 an eagle seen from above flapping its wings; row 3 an avalanche snow cloud billowing and growing; row 4 a red cable car cabin swaying (frames 1–2) and a red snowcat with a blinking orange beacon (frames 3–4).


## Лист эффектов (схема из docs/STAGE.md)

Один общий лист на все игры. Нужен прозрачный фон или ровный зелёный #00ff00.

*Pixel art sprite sheet for game visual effects, crisp pixel clusters, limited palette, no text, no watermark, transparent background (or solid green #00ff00). Eight rows of 6-frame animations, every frame inside its own 96×96 cell, cells aligned in a strict grid, each animation centered in its cell and progressing left to right from start to fade-out:*
*row 1 — small ground dust puff, grey-blue, kicked up by a footstep and dissolving;*
*row 2 — snow kick: a small burst of white snow chunks and powder from a step, dissolving;*
*row 3 — landing impact dust ring spreading sideways along the ground and fading;*
*row 4 — chimney smoke puff rising and thinning out, light grey;*
*row 5 — warm orange spark burst like a firework popping, fading embers;*
*row 6 — white-yellow hit flash star, sharp and short, shrinking to nothing;*
*row 7 — spinning steel shuriken, 6 rotation frames, with a subtle motion glint;*
*row 8 — fluttering leaf tumbling in the wind, green-to-orange, 6 rotation frames.*
