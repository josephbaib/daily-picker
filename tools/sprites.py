"""Спрайты персонажей: сетки 24x32, части, предпросмотр и генерация js/sprite-data.js.
Токены: . пусто, # контур, s/S/$ кожа (база/тень/блик), e глаз, m рот,
t/T/+ верх, p/P штаны, b/B обувь, h/H волосы, f борода, g очки, a акцент одежды, c/C шапка."""
import json, sys, os
from PIL import Image

W, H = 24, 32

# ---------- тело: кадры. Персонаж смотрит на зрителя (idle) или вправо (run). ----------
HEAD_FRONT = [
"......############......",
".....#ssssssssssss#.....",
".....#ssssssssssss#.....",
".....#ssssssssssss#.....",
".....#ssssssssssss#.....",
".....#sseesssseess#.....",
".....#sseesssseess#.....",
".....#sssssSSsssss#.....",
".....#ssssmmmmssss#.....",
".....#SssssssssssS#.....",
"......#SSSSSSSSSS#......",
".......##ssss##.........",
]
HEAD_SIDE = [
"......############......",
".....#ssssssssssss#.....",
".....#ssssssssssss#.....",
".....#ssssssssssss#.....",
".....#ssssssssssss#.....",
".....#ssssseessee$#.....",
".....#ssssseessee$#.....",
".....#ssssssssSSs$#.....",
".....#sssssssmmms$#.....",
".....#SsssssssssS$#.....",
"......#SSSSSSSSSS#......",
".......##ssss##.........",
]
TORSO_IDLE = [
"........#tttttt#........",
"......##tttttttt##......",
".....#tttttttttttt#.....",
"....#ttt#tttttt#ttt#....",
"....#ttt#tttttt#ttt#....",
"....#tTt#tttttt#tTt#....",
"....#tTt#TttttT#tTt#....",
"....#sss#TttttT#sss#....",
"....#sSs#TTTTTT#sSs#....",
]
LEGS_IDLE = [
".....##.#pppppp#.##.....",
"........#pppppp#........",
"........#pp##pp#........",
"........#pp##pp#........",
"........#Pp##pP#........",
"........#Pp##pP#........",
".......#bbb##bbb#.......",
".......#BBB##BBB#.......",
"........###..###........",
]
# бег вправо: 4 кадра (руки вдоль тела, качаются; ноги шагают)
TORSO_RUN = [
[
"........#tttttt#........",
"......##tttttttt##......",
".....#tttttttttttt#.....",
"....#tt#ttttttttt#t#....",
"....#tT#tttttttttT#s#...",
"....#sS#ttttttttt#sS#...",
".....##TtttttttTt#......",
"........#TTTTTT#........",
"........#TTTTTT#........",
],[
"........#tttttt#........",
"......##tttttttt##......",
".....#tttttttttttt#.....",
"....#ttt#ttttttt#tt#....",
"....#tTt#ttttttt#Tt#....",
"....#sss#ttttttt#ss#....",
"....#sSs#TtttttT#sS#....",
".....###TTTTTTT###......",
"........#TTTTTT#........",
],[
"........#tttttt#........",
"......##tttttttt##......",
".....#tttttttttttt#.....",
"....#t#tttttttttt#tt#...",
"...#s#TtttttttttT#Tt#...",
"...#Ss#ttttttttt#sss#...",
"....##TtttttttTt#sSs#...",
"........#TTTTTT#.###....",
"........#TTTTTT#........",
],[
"........#tttttt#........",
"......##tttttttt##......",
".....#tttttttttttt#.....",
"....#ttt#ttttttt#tt#....",
"....#tTt#ttttttt#Tt#....",
"....#sss#ttttttt#ss#....",
"....#sSs#TtttttT#sS#....",
".....###TTTTTTT###......",
"........#TTTTTT#........",
]]
LEGS_RUN = [
[
"........#pppppp#........",
".......#ppp##ppp#.......",
"......#ppp#..#ppp#......",
".....#ppP#....#Ppp#.....",
"....#bbb#......#bbb#....",
"....#BBB#......#BBB#....",
".....###........###.....",
"........................",
"........................",
],[
"........#pppppp#........",
"........#pppppp#........",
"........#pp##pp#........",
"........#pp#pP#.........",
".......#Pp#bbb#.........",
".......#bbb#BBB#........",
".......#BBB#.###........",
"........###.............",
"........................",
],[
"........#pppppp#........",
".......#ppp##ppp#.......",
"......#ppp#..#ppp#......",
".....#ppP#....#Ppp#.....",
"....#bbb#......#bbb#....",
"....#BBB#......#BBB#....",
".....###........###.....",
"........................",
"........................",
],[
"........#pppppp#........",
"........#pppppp#........",
"........#pp##pp#........",
".........#Pp#pp#........",
".........#bbb#pP#.......",
"........#BBB#bbb#.......",
"........###.#BBB#.......",
".............###........",
"........................",
]]
# радуется: руки вверх
TORSO_CHEER = [
"...#s#..#tttttt#..#s#...",
"...#s#.##tttttttt##s#...",
"...#t#tttttttttttt#t#...",
"...#ttttttttttttttttt#..",
"....#tttttttttttttttt#..",
".....#Tt#tttttt#tT#.....",
"........#TttttT#........",
"........#TttttT#........",
"........#TTTTTT#........",
]

def compose(head, torso, legs, head_dy=0):
    rows = ['.'*W for _ in range(H)]
    def blit(grid, y0):
        for j, r in enumerate(grid):
            y = y0 + j
            if 0 <= y < H:
                row = list(rows[y])
                for i, ch in enumerate(r):
                    if ch != '.': row[i] = ch
                rows[y] = ''.join(row)
    blit(head, 1 + head_dy); blit(torso, 13); blit(legs, 22)
    return rows

BODY = {
    'idle':  compose(HEAD_FRONT, TORSO_IDLE, LEGS_IDLE),
    'run0':  compose(HEAD_SIDE, TORSO_RUN[0], LEGS_RUN[0]),
    'run1':  compose(HEAD_SIDE, TORSO_RUN[1], LEGS_RUN[1], head_dy=1),
    'run2':  compose(HEAD_SIDE, TORSO_RUN[2], LEGS_RUN[2]),
    'run3':  compose(HEAD_SIDE, TORSO_RUN[3], LEGS_RUN[3], head_dy=1),
    'cheer': compose(HEAD_FRONT, TORSO_CHEER, LEGS_IDLE),
}

# ---------- причёски: слой поверх головы (строки 0..12 спрайта) ----------
HAIR = {
'short': [
".......##########.......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
".....#hHhhhhhhhhHh#.....",
".....#hh#......#hh#.....",
".....#H#........#H#.....",
],
'buzz': [
".......##########.......",
"......#HhhhhhhhhH#......",
".....#hhhhhhhhhhhh#.....",
".....#hh........hh#.....",
".....#H#........#H#.....",
],
'spiky': [
"....#..#.#...#.#..#.....",
"....#h#hh#hh#hh#hh#.....",
".....#hhhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
".....#hH#......#Hh#.....",
".....#H#........#H#.....",
],
'side': [
".......##########.......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhhh#....",
".....#hh###hhhhhhhh#....",
".....#h#....#HhhhH#.....",
".....#H#.....#hhh#......",
"..............###.......",
],
'curly': [
"......##.####.##........",
".....#hh#hhhh#hh#.......",
"....#hhhhhhhhhhhh#......",
"....#hhhhhhhhhhhhh#.....",
"....#hHhhhhhhhhhHh#.....",
"....#hh#hhhhhhh#hh#.....",
"....#hh#......#hh#......",
".....#H#......#H#.......",
".....##........##.......",
],
'bob': [
".......##########.......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
"....#hhh#......#hhh#....",
"....#hhh#......#hhh#....",
"....#hhh#......#hhh#....",
"....#hHh#......#hHh#....",
"....#HHH#......#HHH#....",
".....###........###.....",
],
'long': [
".......##########.......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
"....#hhh#......#hhh#....",
"....#hhh#......#hhh#....",
"....#hhh#......#hhh#....",
"....#hhh#......#hhh#....",
"....#hHh#......#hHh#....",
"....#hHh#......#hHh#....",
"....#HHH#......#HHH#....",
"....#HHH#......#HHH#....",
".....###........###.....",
],
'ponytail': [
".......##########.......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#hh#..",
".....#hhhhhhhhhhhh#hh#..",
".....#hHhhhhhhhhHh#Hh#..",
".....#hh#......#hh#Hh#..",
".....#H#........#H#hH#..",
"...................#H#..",
"....................##..",
],
'bun': [
"..........#####.........",
".........#hhhhh#........",
".......###hHhhH###......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
".....#hh#......#hh#.....",
".....#H#........#H#.....",
],
'bangs': [
".......##########.......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
".....#hH#hHh#hHh#h#.....",
".....#H#..#.#..#.#......",
],
'wavy': [
".......##########.......",
"......#hhhhhhhhhh#......",
".....#hhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhh#.....",
"....#hhh#......#hhh#....",
"....#hhhh#....#hhhh#....",
"...#hhHhh#....#hhHhh#...",
"...#hHhhh#....#hhhHh#...",
"....#HHH#......#HHH#....",
".....##..........##.....",
],
'bald': [],
}

BEARD = {
'none': [],
'stubble': [
".....#f.ff.ff.ff.f#.....",
"......#f.ff..ff.f#......",
],
'moustache': [
".....#ssssffffssss#.....",
],
'goatee': [
".....#ssssffffssss#.....",
".....#ssssssssssss#.....",
"......#ssssffffss#......",
".......##sffffs##.......",
],
'beard': [
".....#sffssssssffs#.....",
".....#fffssssssfff#.....",
".....#ffffffffffff#.....",
"......#ffffffffff#......",
".......##ffffff##.......",
"........##ffff##........",
],
}
# борода накладывается со строки 9 (усы) — смещения:
BEARD_Y = {'none': 0, 'stubble': 10, 'moustache': 9, 'goatee': 9, 'beard': 9}

GLASSES = {
'none': [],
'round': [
".....#gggg#g#gggg#......",
".....#geegggggeeg#......",
".....#geegsssgeeg#......",
".....#gggg###gggg#......",
],
'square': [
".....#gggggggggggg#.....",
".....#geeggsssgeeg#.....",
".....#geeggsssgeeg#.....",
".....#gggg#ss#gggg#.....",
],
}
GLASSES_Y = 5

HAT = {
'none': [],
'cap': [
".......##########.......",
"......#cccccccccc#......",
".....#cccccccccccc#.....",
".....#CCCCCCCCCCCC#####.",
".....#CCCCCCCCCCCCCCCC#.",
"......################..",
],
'beanie': [
"........########........",
".......#cccccccc#.......",
"......#cccccccccc#......",
".....#cccccccccccc#.....",
".....#CcCcCcCcCcCc#.....",
".....#cCcCcCcCcCcC#.....",
".....#CCCCCCCCCCCC#.....",
"......############......",
],
}

# одежда: оверлеи поверх торса (строка 13 спрайта) — только для idle/front; для бега используются те же цвета
TOP = {
'tshirt': [],
'hoodie': [
"......###......###......",
".....#ttt######ttt#.....",
"......#tt+tttt+tt#......",
".......#ttaaaatt#.......",
"........#TaaaaT#........",
"........#TTTTTT#........",
],
'shirt': [
".......#+#....#+#.......",
"........#+a..a+#........",
".........#a..a#.........",
"..........#aa#..........",
"...........a............",
"...........a............",
"...........a............",
],
'jacket': [
"........................",
"........................",
".........#....#.........",
"........#+#..#+#........",
"........#+#..#+#........",
"........#+#..#+#........",
"........#+#..#+#........",
"........#+#..#+#........",
"........#+####+#........",
],
'dress': [
"........................",
"........................",
"........................",
"........................",
"........................",
"........................",
"........................",
"........................",
"........#tttttt#........",
".......#tTttttTt#.......",
"......#ttTttttTtt#......",
".....#tttTttttTttt#.....",
".....#TTTTTTTTTTTT#.....",
],
}

def darken(c, k): return tuple(max(0, int(v*k)) for v in c)
def lighten(c, k): return tuple(min(255, int(v + (255-v)*k)) for v in c)

def palette(person):
    hx = lambda s: tuple(int(s.lstrip('#')[i:i+2], 16) for i in (0,2,4))
    skin, hair, top, pants, shoes = map(hx, (person['skin'], person['hairColor'], person['topColor'], person['pantsColor'], person['shoesColor']))
    accent = hx(person.get('accent', '#ffffff')); hat = hx(person.get('hatColor', '#333344'))
    beard = hx(person.get('beardColor', person['hairColor']))
    return {
        '#': (26, 20, 40), 's': skin, 'S': darken(skin, .78), '$': lighten(skin, .25),
        'e': (30, 24, 40), 'm': darken(skin, .6),
        't': top, 'T': darken(top, .72), '+': lighten(top, .28), 'a': accent,
        'p': pants, 'P': darken(pants, .7), 'b': shoes, 'B': darken(shoes, .65),
        'h': hair, 'H': darken(hair, .7), 'f': beard, 'g': (40, 36, 60),
        'c': hat, 'C': darken(hat, .72),
    }

def layers(person, frame):
    rows = [list(r) for r in BODY[frame]]
    side = frame.startswith('run')
    def blit(grid, y0, dx=0):
        for j, r in enumerate(grid):
            y = y0 + j
            if not (0 <= y < H): continue
            for i, ch in enumerate(r):
                x = i + dx
                if ch != '.' and 0 <= x < W: rows[y][x] = ch
    dy = 1 if frame in ('run1', 'run3') else 0
    if not side:
        blit(TOP.get(person['top'], []), 13)
    blit(BEARD[person['beard']], 1 + BEARD_Y[person['beard']] + dy, 2 if side else 0)
    blit(GLASSES[person['glasses']], 1 + GLASSES_Y + dy, 2 if side else 0)
    if person['hat'] == 'none':
        blit(HAIR[person['hair']], 1 + dy, 1 if side else 0)
    else:
        blit(HAIR[person['hair']], 1 + dy, 1 if side else 0)
        blit(HAT[person['hat']], dy, 1 if side else 0)
    return [''.join(r) for r in rows]

def render(person, frame, scale=4):
    pal = palette(person)
    img = Image.new('RGBA', (W*scale, H*scale), (0,0,0,0))
    px = img.load()
    for j, r in enumerate(layers(person, frame)):
        for i, ch in enumerate(r):
            if ch == '.': continue
            col = pal.get(ch, (255, 0, 255)) + (255,)
            for a in range(scale):
                for b in range(scale): px[i*scale+a, j*scale+b] = col
    return img

SAMPLES = [
 dict(name='Юсуф', skin='#e6b98f', hair='short', hairColor='#2a1a10', beard='stubble', glasses='none', hat='none', top='hoodie', topColor='#3c5aa0', accent='#ffffff', pantsColor='#26304a', shoesColor='#f2f2f2'),
 dict(name='Юля', skin='#f4d2b3', hair='long', hairColor='#c8703a', beard='none', glasses='round', hat='none', top='dress', topColor='#d24a6a', pantsColor='#3a3a4a', shoesColor='#2a2a2a'),
 dict(name='Макс', skin='#e0b48c', hair='side', hairColor='#6b4a2a', beard='beard', glasses='square', hat='none', top='shirt', topColor='#f0f0f0', accent='#5a6aa0', pantsColor='#2f2f3a', shoesColor='#6b3a2a'),
 dict(name='Нина', skin='#d9a878', hair='bob', hairColor='#1e1a1a', beard='none', glasses='none', hat='beanie', hatColor='#e0b040', top='tshirt', topColor='#8a4fd0', pantsColor='#2a3a5a', shoesColor='#ffffff'),
 dict(name='Миша', skin='#f0c8a0', hair='curly', hairColor='#3a2410', beard='goatee', glasses='none', hat='none', top='jacket', topColor='#404050', accent='#ff8c42', pantsColor='#1e1e28', shoesColor='#c8c8c8'),
 dict(name='Женя', skin='#c88a5a', hair='spiky', hairColor='#101010', beard='none', glasses='none', hat='cap', hatColor='#d03a3a', top='tshirt', topColor='#2bd4c8', pantsColor='#3a3a3a', shoesColor='#ffffff'),
 dict(name='Оля', skin='#f4d2b3', hair='ponytail', hairColor='#e8d080', beard='none', glasses='none', hat='none', top='hoodie', topColor='#78c85a', accent='#ffffff', pantsColor='#26304a', shoesColor='#2a2a2a'),
 dict(name='Дима', skin='#e6b98f', hair='bald', hairColor='#3a2a1a', beard='beard', glasses='round', hat='none', top='shirt', topColor='#3c8cdc', accent='#ffffff', pantsColor='#2a2a2a', shoesColor='#4a2a1a'),
 dict(name='Аня', skin='#f0c8a0', hair='wavy', hairColor='#8a2a2a', beard='none', glasses='none', hat='none', top='tshirt', topColor='#f0be3c', pantsColor='#5a3278', shoesColor='#ffffff'),
 dict(name='Саша', skin='#e0b48c', hair='bangs', hairColor='#4a3a8a', beard='none', glasses='square', hat='none', top='jacket', topColor='#8a2a4a', accent='#f0d0a0', pantsColor='#2f2f3a', shoesColor='#2a2a2a'),
 dict(name='Петя', skin='#e6b98f', hair='buzz', hairColor='#2a2a2a', beard='moustache', glasses='none', hat='none', top='tshirt', topColor='#dc3c3c', pantsColor='#26304a', shoesColor='#f2f2f2'),
 dict(name='Вера', skin='#d9a878', hair='bun', hairColor='#2a1a10', beard='none', glasses='none', hat='none', top='dress', topColor='#2bd4c8', pantsColor='#3a3a4a', shoesColor='#ffffff'),
]

def sheet(path, scale=4):
    frames = ['idle', 'run0', 'run1', 'run2', 'run3', 'cheer']
    cols = len(frames); rows = len(SAMPLES)
    img = Image.new('RGBA', (cols*(W*scale+8)+8, rows*(H*scale+8)+8), (30, 24, 44, 255))
    for r, p in enumerate(SAMPLES):
        for c, f in enumerate(frames):
            img.paste(render(p, f, scale), (8 + c*(W*scale+8), 8 + r*(H*scale+8)), render(p, f, scale))
    img.save(path)

def emit_js(path):
    data = dict(W=W, H=H, BODY=BODY, HAIR=HAIR, BEARD=BEARD, BEARD_Y=BEARD_Y, GLASSES=GLASSES, GLASSES_Y=GLASSES_Y, HAT=HAT, TOP=TOP)
    with open(path, 'w') as f:
        f.write('// Сгенерировано tools/sprites.py. Руками не править.\n')
        f.write('export default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'sheet.png'
    sheet(out)
    if len(sys.argv) > 2: emit_js(sys.argv[2])
    print('ok')
