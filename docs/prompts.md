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

## Плиты для семи остальных игр (порядок из docs/ROADMAP.md)

Общая часть для каждой плиты: *16:9 pixel art plate for a 2D game, 1920×1080, crisp pixel clusters, limited palette of about 32 colors, no characters, no people, no text, no letters, no watermark.* Слои с прозрачностью просить на ровном зелёном фоне #00ff00. Надписи (Сбер, B2Bсосы, табло) добавляются кодом, в картинках текста быть не должно: просить пустые баннеры и табло. Масштаб: человек ростом примерно 1/7 высоты картинки.

### 1. Забег (`race`) — стадион на закате, камера едет вправо
1. *Sky plate:* sunset sky over a stadium, purple to orange gradient, long thin clouds, first stars, no ground.
2. *Far plate (green background above):* the far side of a big stadium: curved roof, four tall floodlight towers with glowing lamps, city skyline behind, washed by warm haze, low contrast. Seamless horizontally.
3. *Stands plate (green background above):* a long grandstand seen from the track: rows of seats packed with a colorful cheering crowd drawn as small simple figures, railings, stairways, empty blank banners on the front wall, green and white flags. Seamless horizontally. Bottom edge is the wall where the track begins.
4. *Track plate (green background above):* side view of a red running track with white lane lines running left to right, inner grass edge at the top with small cones, shot-put circle and hurdles stacked aside; the track surface fills the lower 45% of the image and is clear of objects. Seamless horizontally.
5. *Finish plate (green background):* a finish gantry arch over the track with a blank banner, a digital clock board with a blank screen, a finish tape, two photographer platforms, side view.
6. *Foreground plate (green background):* dark near-camera silhouettes along the bottom edge only: TV camera on a tripod, backs of photographers' heads replaced by equipment only (no people): camera lenses, advertising board tops, a row of flags; upper 75% empty.
7. *Props sheet (green background), 4 rows × 4 frames in 128×128 cells:* row 1 waving green flag; row 2 camera flash burst; row 3 confetti cannon firing; row 4 stadium floodlight flicker.

### 2. Полигон (`training`) — лесная поляна в сумерках, камера стоит
1. *Sky plate:* dusk sky, teal to deep orange, a few clouds, early moon.
2. *Far plate (green background above):* forested mountains in layers fading into blue haze, a distant village gate silhouette.
3. *Mid plate (green background above):* edge of a forest clearing: big trees with thick trunks, three wooden training posts with rope wrapping, round straw targets with kunai stuck in them, a weapon rack, a stone lantern with warm light, a small shrine; everything stands in the upper 60%.
4. *Ground plate (green background above):* the clearing floor seen slightly from above: trampled earth with grass patches, fallen leaves, scorch marks, shuriken stuck in the ground near the edges; fills the lower 42% of the image, center kept open.
5. *Foreground plate (green background):* dark silhouettes at the edges only: a branch with leaves in the upper left, tall grass and a bush in the lower corners, a hanging rope with paper tags in the upper right; middle 60% empty.
6. *Props sheet (green background), 4 rows × 6 frames in 96×96 cells:* row 1 white smoke poof appearing and fading; row 2 a wooden log dropping and bouncing; row 3 a fireball flying with a trail; row 4 a shadow clone flickering in and out (generic faceless ninja silhouette).

### 3. Драка (`brawl`) — ринг в тёмном зале, камера стоит
1. *Arena plate (full image):* a dark indoor arena seen from ringside: tiers of a dim crowd drawn as tiny colored dots and shapes, light rigs with bright spotlights and light cones through haze, blank hanging banners, a blank scoreboard cube above.
2. *Ring plate (green background):* a boxing ring seen from the front, slightly from above: blue canvas floor with a blank circle in the middle, four corner posts with red and blue pads, only the BACK ropes, ring apron with a blank skirt, steps at the corner; the ring spans 76% of the width and the lower 60% of the height.
3. *Front ropes plate (green background):* only the three FRONT ropes and the two front corner posts of the same ring, matching position and perspective, everything else empty.
4. *Foreground plate (green background):* dark silhouettes along the bottom edge: judges' table with a bell and papers, a row of press cameras, a water bucket and stool at the left corner; upper 78% empty.
5. *Props sheet (green background), 4 rows × 4 frames in 128×128 cells:* row 1 comic hit star burst; row 2 spinning KO stars; row 3 ringing bell; row 4 photo flash in the crowd.

### 4. Особняк (`horror`) — зал старого дома, камера стоит
1. *Hall plate (full image):* the grand hall of an old haunted mansion seen from the front: double staircase at the back, tall arched windows with a stormy night outside, portraits in heavy frames with blank dark canvases, a grandfather clock, candelabra with lit candles, peeling wallpaper, cobwebs; a wide wooden floor with a worn carpet fills the lower 35% and is kept clear.
2. *Lightning plate (full image):* the same hall layout lit by a lightning flash: hard blue-white light from the windows, long shadows on the floor (used as a flash overlay).
3. *Chandelier plate (green background):* a large crystal chandelier with candles on a chain, front view.
4. *Foreground plate (green background):* dark silhouettes at the edges: a banister post and cobweb in the lower left, a candelabra in the lower right, a torn curtain along the top edge; middle 60% empty.
5. *Props sheet (green background), 4 rows × 4 frames in 128×128 cells:* row 1 a pale ghost floating and fading; row 2 shadowy hands rising from the floor; row 3 candle flame flickering and going out; row 4 a monster shadow with glowing eyes opening its jaws.

### 5. Стулья (`chairs`) — офисный коридор, камера едет вправо
1. *Window plate (full image):* a city skyline at daytime seen through a long row of floor-to-ceiling office windows, light haze, distant towers, a few clouds. Seamless horizontally.
2. *Office plate (green background above):* a long open-space office seen from the corridor: desks with monitors, office chairs, plants, a whiteboard with blank sticky notes, a coffee point, a printer, a glass meeting booth, pendant lamps; no people. Seamless horizontally.
3. *Corridor plate (green background above):* the corridor itself in side view: a low glass partition with a handrail at the top, grey-blue carpet tiles with a subtle pattern filling the lower 45%, clear of objects. Seamless horizontally.
4. *Finish plate (green background):* a glass meeting room at the end of the corridor with an open door, a long table, a big blank screen on the wall, a blank door sign.
5. *Foreground plate (green background):* near-camera silhouettes along the bottom and edges: a big potted ficus at the left, a water cooler at the right, the top of a reception desk along the bottom; middle 60% empty.
6. *Props sheet (green background), 4 rows × 4 frames in 128×128 cells:* row 1 an empty office chair in side view with wheels spinning (grey, so it can be tinted); row 2 papers flying off a desk; row 3 coffee cup spilling; row 4 a monitor screen flickering.

### 6. Лифт (`elevator`) — здание в разрезе, камера едет вверх
Общая часть: *cutaway cross-section of an office building, front view, an empty elevator shaft 22% of the width running vertically through the exact center, rooms to the left and right of the shaft, floor slabs at the top and bottom edges so plates stack vertically.*
1. *Lobby plate (full image):* ground floor: reception desk, turnstiles, plants, sofa, revolving door, blank logo wall.
2. *Office floor plate A (full image):* open-space desks on the left, kitchen with coffee machine on the right.
3. *Office floor plate B (full image):* server racks with blinking lights on the left, a lounge with beanbags and a foosball table on the right.
4. *Top floor plate (full image):* a big glass meeting room with a long table and a blank screen on the left, a terrace door with sky on the right.
5. *Cabin plate (green background):* an open-front elevator cabin seen from the front: steel walls, handrail, floor indicator panel with a blank display, ceiling lamp, empty inside; plus, next to it, the closed doors of the same cabin as a separate object.
6. *Props sheet (green background), 3 rows × 4 frames in 128×128 cells:* row 1 elevator doors opening; row 2 an overload warning lamp blinking red; row 3 a cable pulley wheel spinning.

### 7. Картинг (`kart`) — кольцо вокруг офиса, вид сбоку, камера едет вправо
1. *Sky plate:* bright morning sky with soft clouds.
2. *Far plate (green background above):* a city business district with one tall green-glass tower in the middle, trees, haze. Seamless horizontally.
3. *Zone plate "parking" (green background above):* an office parking lot: parked cars, barrier gate, lamp posts, bike rack. Seamless horizontally; bottom edge is where the road begins.
4. *Zone plate "corridor" (green background above):* an indoor office corridor wall: doors, notice boards with blank sheets, plants, glass walls. Seamless horizontally.
5. *Zone plate "canteen" (green background above):* an office canteen: serving line, tables and chairs, vending machines, trays. Seamless horizontally.
6. *Zone plate "server room" (green background above):* rows of server racks with blinking lights, cable trays, cold blue light. Seamless horizontally.
7. *Road plate (green background above):* a go-kart track in side view: dark asphalt with red-white curbs, tire barriers along the far edge, painted arrows; fills the lower 40%, clear of objects. Seamless horizontally.
8. *Props sheet (green background), 4 rows × 4 frames in 128×128 cells:* row 1 an empty go-kart in side view with spinning wheels (light grey body, so it can be tinted); row 2 a traffic cone being knocked over; row 3 a boost pad glowing; row 4 a small jump ramp and a puddle of spilled coffee (two frames each).
