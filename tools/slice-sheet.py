"""Нарезка нарисованного листа с сеткой в раскладку Universal LPC 832×1344.
Использование: python3 tools/slice-sheet.py <вход.png> <выход.png>
Линии сетки находятся автоматически (тёмные линии через всю ширину/высоту).
Строки источника (по найденной сетке) → ряды LPC: 4→8 (спиной), 5→9 (влево), 6→10 (анфас), 7→11 (вправо), 11→15 (удар), 14→20 (падение)."""
import sys
from PIL import Image

src = Image.open(sys.argv[1]).convert('RGBA')
W, H = src.size; px = src.load()
def dark(p): return p[3] > 0 and p[0] < 140 and p[1] < 140 and p[2] < 140
colScore = [sum(1 for y in range(0, H, 3) if dark(px[x, y])) / (H / 3) for x in range(W)]
rowScore = [sum(1 for x in range(0, W, 3) if dark(px[x, y])) / (W / 3) for y in range(H)]
def lines(score, thresh=0.8):
    out = []; i = 0
    while i < len(score):
        if score[i] >= thresh:
            j = i
            while j < len(score) and score[j] >= thresh: j += 1
            out.append(((i + j) // 2, i, j)); i = j
        else: i += 1
    return out
def merge(ls, gap=14):
    out = []
    for c, a, b in ls:
        if out and c - out[-1][0] < gap: pc, pa, pb = out[-1]; out[-1] = ((pa + b) // 2, pa, b)
        else: out.append((c, a, b))
    return out
vl = merge(lines(colScore)); hl = merge(lines(rowScore))
if not vl or vl[0][1] > 6: vl.insert(0, (0, 0, 1))
if vl[-1][2] < W - 6: vl.append((W - 1, W - 1, W))
if not hl or hl[0][1] > 6: hl.insert(0, (0, 0, 1))
if hl[-1][2] < H - 6: hl.append((H - 1, H - 1, H))
print('колонок', len(vl) - 1, 'строк', len(hl) - 1)

def cell(c, r):
    x0, x1 = vl[c][2] + 2, vl[c + 1][1] - 2
    y0, y1 = hl[r][2] + 2, hl[r + 1][1] - 2
    im = src.crop((x0, y0, x1, y1)).copy(); p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r_, g, b, a = p[x, y]
            if min(r_, g, b) > 225 or (abs(r_ - g) < 12 and abs(g - b) < 12 and r_ > 140): p[x, y] = (0, 0, 0, 0)
    return im

# в присланном листе первая колонка пустая, кадры начинаются со второй; строки по факту нарезки
COL0 = 1
MAP = {4: 8, 5: 9, 6: 10, 7: 11, 11: 15, 14: 20}
COUNT = {8: 9, 9: 9, 10: 9, 11: 9, 15: 6, 20: 6}
# кадры падения шире клеток: режем полосу ряда по пустым промежуткам
def rowSegments(r, maxN):
    y0, y1 = hl[r][2] + 2, hl[r + 1][1] - 2
    band = src.crop((vl[0][2], y0, vl[-1][1], y1)).copy(); bp = band.load()
    for y in range(band.height):
        for x in range(band.width):
            r_, g, b, a = bp[x, y]
            if min(r_, g, b) > 225 or (abs(r_ - g) < 12 and abs(g - b) < 12 and r_ > 140): bp[x, y] = (0, 0, 0, 0)
    # колонки вертикальных линий сетки: нейтральные тёмные пиксели там считаем линией, а не кадром
    x_off = vl[0][2]
    gridCols = set()
    for _, a, b in vl:
        for x in range(a - 3 - x_off, b + 3 - x_off): gridCols.add(x)
    def isContent(x, y):
        r_, g, b, a = bp[x, y]
        if a == 0: return False
        return (max(r_, g, b) - min(r_, g, b)) > 40  # только цветные пиксели: линии сетки серые
    occ = [any(isContent(x, y) for y in range(band.height)) for x in range(band.width)]
    segs = []; x = 0
    while x < band.width:
        if occ[x]:
            j = x; gap = 0
            while j < band.width and gap < 8:
                gap = 0 if occ[j] else gap + 1; j += 1
            segs.append((x, j - gap)); x = j
        else: x += 1
    for y in range(band.height):
        for x in range(band.width):
            r_, g, b, a = bp[x, y]
            if a > 0 and abs(r_ - g) < 18 and abs(g - b) < 18 and (x in gridCols or y < 3 or y > band.height - 4): bp[x, y] = (0, 0, 0, 0)
    segs = [(a, b) for a, b in segs if b - a >= 10]  # обрывки линий не считаем кадрами
    frames = [band.crop((max(0, a - 2), 0, min(band.width, b + 2), band.height)) for a, b in segs][:maxN]
    while frames and len(frames) < maxN: frames.append(frames[-1])  # не хватило кадров: повторяем последний
    return frames

out = Image.new('RGBA', (832, 1344), (0, 0, 0, 0))
for srow, lrow in MAP.items():
    frames = rowSegments(srow, COUNT[lrow]) if lrow == 20 else [cell(c + COL0, srow) for c in range(COUNT[lrow])]
    for c, im in enumerate(frames):
        bb = im.getbbox()
        if not bb: print('пустая ячейка', srow, c); continue
        sp = im.crop(bb)
        lying = lrow == 20 and c >= 3
        maxh, maxw = (30, 60) if lying else (58, 46)
        k = min(maxh / sp.height, maxw / sp.width, 1.0)
        sp = sp.resize((max(1, round(sp.width * k)), max(1, round(sp.height * k))), Image.LANCZOS)
        out.alpha_composite(sp, (int(c * 64 + 32 - sp.width / 2), int(lrow * 64 + 61 - sp.height)))
out.save(sys.argv[2]); print('ok', sys.argv[2])
