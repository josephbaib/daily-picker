"""Нарезка присланного листа персонажа в раскладку Universal LPC 832×1344 с чисткой под пиксель-арт.

Использование:
  python3 tools/slice-sheet.py <вход.png> <выход.png>            лист с сеткой на белом фоне
  python3 tools/slice-sheet.py <вход.png> <выход.png> --nogrid   лист без сетки на прозрачном фоне

Ряды источника по порядку: спиной, влево, анфас, вправо (по 9 кадров), удар (6), падение (6)
→ ряды LPC 8, 9, 10, 11, 15, 20. Чистка: жёсткая альфа, палитра 44 цвета, тёмный контур."""
import sys
from PIL import Image

NEED = [(8, 9), (9, 9), (10, 9), (11, 9), (15, 6), (20, 6)]
OUT_W, OUT_H = 832, 1344

def bands(flags, minGap):
    out = []; i = 0
    while i < len(flags):
        if flags[i]:
            j = i; gap = 0
            while j < len(flags) and gap < minGap:
                gap = 0 if flags[j] else gap + 1; j += 1
            out.append((i, j - gap)); i = j
        else: i += 1
    return out

def place(out, sp, lrow, c):
    lying = lrow == 20 and c >= 3
    maxh, maxw = (30, 60) if lying else (58, 46)
    k = min(maxh / sp.height, maxw / sp.width, 1.0)
    sp = sp.resize((max(1, round(sp.width * k)), max(1, round(sp.height * k))), Image.BOX if k < 0.85 else Image.NEAREST)
    out.alpha_composite(sp, (int(c * 64 + 32 - sp.width / 2), int(lrow * 64 + 61 - sp.height)))

def clean(sheet):
    """Жёсткая альфа, палитра из 44 цветов без размытия, тёмный контур в один пиксель."""
    px = sheet.load(); W2, H2 = sheet.size
    for y in range(H2):
        for x in range(W2):
            r, g, b, a = px[x, y]
            if a < 140 or (a < 255 and min(r, g, b) > 200): px[x, y] = (0, 0, 0, 0)
            else: px[x, y] = (r, g, b, 255)
    q = sheet.convert('RGB').quantize(colors=44, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB').load()
    for y in range(H2):
        for x in range(W2):
            if px[x, y][3]: px[x, y] = q[x, y] + (255,)
    outline = []
    for y in range(H2):
        for x in range(W2):
            if px[x, y][3]: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W2 and 0 <= ny < H2 and px[nx, ny][3] and nx // 64 == x // 64 and ny // 64 == y // 64: outline.append((x, y)); break
    for x, y in outline: px[x, y] = (34, 24, 38, 255)
    return sheet

# ---------- лист с сеткой на белом фоне ----------
def sliceGrid(src):
    W, H = src.size; px = src.load()
    dark = lambda p: p[3] > 0 and p[0] < 140 and p[1] < 140 and p[2] < 140
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
            if out and c - out[-1][0] < gap: pa = out[-1][1]; out[-1] = ((pa + b) // 2, pa, b)
            else: out.append((c, a, b))
        return out
    vl = merge(lines(colScore)); hl = merge(lines(rowScore))
    if not vl or vl[0][1] > 6: vl.insert(0, (0, 0, 1))
    if vl[-1][2] < W - 6: vl.append((W - 1, W - 1, W))
    if not hl or hl[0][1] > 6: hl.insert(0, (0, 0, 1))
    if hl[-1][2] < H - 6: hl.append((H - 1, H - 1, H))
    print('сетка: колонок', len(vl) - 1, 'строк', len(hl) - 1)
    def clearBg(im):
        p = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = p[x, y]
                if min(r, g, b) > 225 or (abs(r - g) < 12 and abs(g - b) < 12 and r > 140): p[x, y] = (0, 0, 0, 0)
        return im
    def cell(c, r):
        return clearBg(src.crop((vl[c][2] + 2, hl[r][2] + 2, vl[c + 1][1] - 2, hl[r + 1][1] - 2)).copy())
    # строки источника (индексы найденной сетки) и первая занятая колонка
    MAP = {4: 8, 5: 9, 6: 10, 7: 11, 11: 15, 14: 20}; COL0 = 1
    def rowSegments(r, maxN):
        y0, y1 = hl[r][2] + 2, hl[r + 1][1] - 2
        band = clearBg(src.crop((vl[0][2], y0, vl[-1][1], y1)).copy()); bp = band.load()
        occ = [any(bp[x, y][3] > 0 and max(bp[x, y][:3]) - min(bp[x, y][:3]) > 40 for y in range(band.height)) for x in range(band.width)]
        segs = [(a, b) for a, b in bands(occ, 8) if b - a >= 10]
        gridCols = set(); x_off = vl[0][2]
        for _, a, b in vl:
            for x in range(a - 3 - x_off, b + 3 - x_off): gridCols.add(x)
        for y in range(band.height):
            for x in range(band.width):
                r_, g, b_, a = bp[x, y]
                if a > 0 and abs(r_ - g) < 18 and abs(g - b_) < 18 and (x in gridCols or y < 3 or y > band.height - 4): bp[x, y] = (0, 0, 0, 0)
        if len(segs) != maxN and segs:
            a0, b0 = segs[0][0], segs[-1][1]; step = (b0 - a0) / maxN
            segs = [(int(a0 + i * step), int(a0 + (i + 1) * step)) for i in range(maxN)]
        return [band.crop((max(0, a - 2), 0, min(band.width, b + 2), band.height)) for a, b in segs]
    out = Image.new('RGBA', (OUT_W, OUT_H), (0, 0, 0, 0))
    for srow, (lrow, count) in zip(sorted(MAP), [(v, dict(NEED)[v]) for v in [MAP[k] for k in sorted(MAP)]]):
        frames = rowSegments(srow, count) if lrow in (15, 20) else [cell(c + COL0, srow) for c in range(count)]
        for c, im in enumerate(frames):
            bb = im.getbbox()
            if bb: place(out, im.crop(bb), lrow, c)
    return out

# ---------- лист без сетки на прозрачном фоне ----------
def sliceNoGrid(src):
    W, H = src.size; px = src.load()
    rows = bands([any(px[x, y][3] > 200 for x in range(0, W, 2)) for y in range(H)], 6)
    print('без сетки: рядов', len(rows))
    out = Image.new('RGBA', (OUT_W, OUT_H), (0, 0, 0, 0))
    for (y0, y1), (lrow, count) in zip(rows[:6], NEED):
        band = src.crop((0, y0, W, y1)).copy(); bp = band.load()
        occ = [any(bp[x, y][3] > 200 for y in range(band.height)) for x in range(band.width)]
        segs = [(a, b) for a, b in bands(occ, 6) if b - a >= 12]
        if len(segs) != count and segs:  # эффекты склеили или разорвали кадры: делим общий размах поровну
            a0, b0 = segs[0][0], segs[-1][1]; step = (b0 - a0) / count
            segs = [(int(a0 + i * step), int(a0 + (i + 1) * step)) for i in range(count)]
        for c, (a, b) in enumerate(segs):
            im = band.crop((a, 0, b, band.height)); ip = im.load()
            for yy in range(im.height):
                for xx in range(im.width):
                    if ip[xx, yy][3] < 200: ip[xx, yy] = (0, 0, 0, 0)
            bb = im.getbbox()
            if bb: place(out, im.crop(bb), lrow, c)
    return out

if __name__ == '__main__':
    src = Image.open(sys.argv[1]).convert('RGBA')
    out = sliceNoGrid(src) if '--nogrid' in sys.argv else sliceGrid(src)
    out = clean(out)
    out.save(sys.argv[2]); print('ok', sys.argv[2])
