"""Спрайты персонажей 32x40: сетки, части, предпросмотр, генерация js/sprite-data.js.
Токены: . пусто, # контур, s/S/$ кожа, n тёмная линия лица (брови, веки), w белок, e зрачок, E блик,
m рот, l губы (помада), r румянец, t/T/+ верх, a акцент одежды, x второй акцент, p/P штаны, b/B обувь,
h/H/i волосы (база/тень/блик), f борода, g очки (оправа), G стекло тёмных очков, k металл/золото, c/C шапка."""
import json, sys
from PIL import Image

W, H = 32, 40
def R(*rows): return [r.ljust(W, '.')[:W] for r in rows]

# ---------- голова: анфас и профиль вправо ----------
HEAD_FRONT = R(
"..........############..........",
"........##ssssssssssss##........",
".......#ssssssssssssssss#.......",
"......#sssssssssssssss$s#.......",
"......#ssssssssssssss$$ss#......",
".....#ssssssssssssssss$ss#......",
".....#sssssssssssssssssss#......",
".....#ssnnnnssssssssnnnnss#.....",
".....#ssweewssssssssweewss#.....",
".....#sswEewsssssssswEewss#.....",
".....#ssnnnnssssssssnnnnss#.....",
".....#Sssssssssssssssssss#......",
".....#SrrssssssSSssssssrr#......",
".....#SrrssssssssssssssrrS#.....",
"......#SsssssmmmmmmsssssS#......",
"......#SSsssssssssssssSS#.......",
".......#SSSSssssssSSSS#.........",
"........##SSSSSSSSSS##..........",
"..........##ssssss##............",
)
HEAD_SIDE = R(
"..........############..........",
"........##ssssssssssss##........",
".......#ssssssssssssssss#.......",
"......#sssssssssssssss$s#.......",
"......#ssssssssssssss$$ss#......",
".....#ssssssssssssssss$ss#......",
".....#sssssssssssssssssss#......",
".....#sssssssnnnnsssnnnnss#.....",
".....#sssssssweewsssweew$s#.....",
".....#ssssssswEewssswEew$s#.....",
".....#sssssssnnnnsssnnnn$s#.....",
".....#Ssssssssssssssssss$#......",
".....#SssssssssssssSSsrr$#......",
".....#SsssssssssssssssrrS$#.....",
"......#SsssssssssmmmmmsS#.......",
"......#SSsssssssssssssSS#.......",
".......#SSSSssssssSSSS#.........",
"........##SSSSSSSSSS##..........",
"..........##ssssss##............",
)
# ---------- торс: анфас ----------
TORSO_IDLE = R(
"..........#tttttttttt#..........",
".......###tttttttttttt###.......",
"......#tttttttttttttttttt#......",
".....#ttttt#tttttttt#ttttt#.....",
".....#ttttt#tttttttt#ttttt#.....",
".....#tTttt#tttttttt#tttTt#.....",
".....#tTttt#tttttttt#tttTt#.....",
".....#tTTtt#TttttttT#ttTTt#.....",
".....#sssss#TttttttT#sssss#.....",
".....#sSSss#TTttttTT#ssSSs#.....",
"......###..#TTTTTTTT#..###......",
"...........#TTTTTTTT#...........",
"...........##########...........",
)
LEGS_IDLE = R(
"...........#pppppppp#...........",
"...........#ppp##ppp#...........",
"...........#ppp##ppp#...........",
"...........#Ppp##ppP#...........",
"...........#Ppp##ppP#...........",
"..........#bbbb##bbbb#..........",
"..........#BBBB##BBBB#..........",
"...........####..####...........",
)
# бег вправо: торс (руки качаются) и ноги
TORSO_RUN = [R(
"..........#tttttttttt#..........",
".......###tttttttttttt###.......",
"......#tttttttttttttttttt#......",
".....#ttt#tttttttttttt#ttt#.....",
".....#tT#tttttttttttttt#Tt#.....",
".....#s#tttttttttttttttt#s#.....",
".....##TTttttttttttttTT##.......",
"...........#TttttttT#...........",
"...........#TTttttTT#...........",
"...........#TTTTTTTT#...........",
"...........#TTTTTTTT#...........",
"...........##########...........",
"................................",
), R(
"..........#tttttttttt#..........",
".......###tttttttttttt###.......",
"......#tttttttttttttttttt#......",
".....#ttttt#tttttttt#ttttt#.....",
".....#tTttt#tttttttt#tttTt#.....",
".....#sssss#tttttttt#sssss#.....",
".....#sSSss#TttttttT#ssSSs#.....",
"......###..#TTttttTT#..###......",
"...........#TTTTTTTT#...........",
"...........#TTTTTTTT#...........",
"...........##########...........",
"................................",
"................................",
), R(
"..........#tttttttttt#..........",
".......###tttttttttttt###.......",
"......#tttttttttttttttttt#......",
"....#tt#tttttttttttttt#tttt#....",
"...#sT#ttttttttttttttt#Ttt#.....",
"...#Ss#tttttttttttttttt#ss#.....",
"....##TTttttttttttttTT#Ss#......",
"...........#TttttttT#.##........",
"...........#TTttttTT#...........",
"...........#TTTTTTTT#...........",
"...........#TTTTTTTT#...........",
"...........##########...........",
"................................",
), R(
"..........#tttttttttt#..........",
".......###tttttttttttt###.......",
"......#tttttttttttttttttt#......",
".....#ttttt#tttttttt#ttttt#.....",
".....#tTttt#tttttttt#tttTt#.....",
".....#sssss#tttttttt#sssss#.....",
".....#sSSss#TttttttT#ssSSs#.....",
"......###..#TTttttTT#..###......",
"...........#TTTTTTTT#...........",
"...........#TTTTTTTT#...........",
"...........##########...........",
"................................",
"................................",
)]
LEGS_RUN = [R(
"...........#pppppppp#...........",
"..........#pppp##pppp#..........",
".........#ppp#....#ppp#.........",
"........#ppP#......#Ppp#........",
".......#bbbb#......#bbbb#.......",
".......#BBBB#......#BBBB#.......",
"........####........####........",
"................................",
), R(
"...........#pppppppp#...........",
"...........#pppppppp#...........",
"...........#ppp##ppp#...........",
"...........#ppp#pppP#...........",
"..........#Ppp#bbbb#............",
"..........#bbbb#BBBB#...........",
"..........#BBBB#.####...........",
"...........####.................",
), R(
"...........#pppppppp#...........",
"..........#pppp##pppp#..........",
".........#ppp#....#ppp#.........",
"........#ppP#......#Ppp#........",
".......#bbbb#......#bbbb#.......",
".......#BBBB#......#BBBB#.......",
"........####........####........",
"................................",
), R(
"...........#pppppppp#...........",
"...........#pppppppp#...........",
"...........#ppp##ppp#...........",
"...........#Pppp#ppp#...........",
"............#bbbb#ppP#..........",
"...........#BBBB#bbbb#..........",
"...........####.#BBBB#..........",
".................####...........",
)]
TORSO_CHEER = R(
"....#ss#..#tttttttttt#..#ss#....",
"....#SS#.##tttttttttt##.#SS#....",
"....#tt#tttttttttttttttt#tt#....",
"....#ttttttttttttttttttttttt#...",
".....#tttttttttttttttttttttt#...",
"......#TTtt#tttttttt#ttTT#......",
".......###.#TttttttT#.###.......",
"...........#TttttttT#...........",
"...........#TTttttTT#...........",
"...........#TTTTTTTT#...........",
"...........#TTTTTTTT#...........",
"...........##########...........",
"................................",
)

def compose(head, torso, legs, dy=0):
    rows = ['.' * W for _ in range(H)]
    def blit(grid, y0):
        for j, r in enumerate(grid):
            y = y0 + j
            if 0 <= y < H:
                row = list(rows[y])
                for i, ch in enumerate(r):
                    if ch != '.': row[i] = ch
                rows[y] = ''.join(row)
    blit(head, 0 + dy); blit(torso, 18); blit(legs, 31)
    return rows

BODY = {
    'idle':  compose(HEAD_FRONT, TORSO_IDLE, LEGS_IDLE),
    'run0':  compose(HEAD_SIDE, TORSO_RUN[0], LEGS_RUN[0]),
    'run1':  compose(HEAD_SIDE, TORSO_RUN[1], LEGS_RUN[1], 1),
    'run2':  compose(HEAD_SIDE, TORSO_RUN[2], LEGS_RUN[2]),
    'run3':  compose(HEAD_SIDE, TORSO_RUN[3], LEGS_RUN[3], 1),
    'cheer': compose(HEAD_FRONT, TORSO_CHEER, LEGS_IDLE),
}

# ---------- причёски: слой поверх головы, от строки 0 ----------
HAIR = {
'short': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhhiiihhhhh#......",
"......#hhhhhhhhhhhhhhhhhh#......",
".....#hhhhhhhhhhhhhhhhhhh#......",
".....#hHhhhhhhhhhhhhhhhHh#......",
".....#hh##............##hh#.....",
".....#H#................#H#.....",
"......#..................#......",
),
'buzz': R(
"..........############..........",
"........##HhhhhhhhhhhH##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhhhhhhhhh#.......",
"......#hH#............#Hh#......",
".....#H#................#H#.....",
),
'spiky': R(
".......#...#..#...#..#..........",
"......#h#.#h##h#.#h##h#.#.......",
"......#hh#hhhhhhhhhhhhh#h#......",
".......#hhhhhhhhhiiihhhhh#......",
"......#hhhhhhhhhhhhhhhhhh#......",
".....#hhhhhhhhhhhhhhhhhhh#......",
".....#hHhhhhhhhhhhhhhhhHh#......",
".....#hh##............##hh#.....",
".....#H#................#H#.....",
),
'naruto': R(
"....#..#.....#....#.....#..#....",
"...#h##h#...#h#..#h#...#h##h#...",
"...#hhhhh#.#hhh##hhh#.#hhhhh#...",
"....#hhhhh#hhhhhhhhhh#hhhhh#....",
".....#hhhhhhhhhiiihhhhhhhhh#....",
"....#aaaaaaaaakkkkkkaaaaaaaa#...",
"....#aaaaaaaakkkkkkkkaaaaaaa#...",
".....#hh#aaaaaaaaaaaaaa#hh#.....",
".....#H#................#H#.....",
"................................",
"................................",
"................................",
".....#Snnsss........sssnnS#.....",
".....#Snnsss........sssnnS#.....",
),
'side': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhhhhiihhhh#......",
"......#hhhhhhhhhhhhhhhhhhh#.....",
".....#hhhhhhhhhhhhhhhhhhhhh#....",
".....#hh###hhhhhhhhhhhhhhh#.....",
".....#hh#...##hHhhhhhhhhH#......",
".....#H#......#hhhhhhhhh#.......",
"................#hhhhhh#........",
".................######.........",
),
'medium': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhiihhhhhhh#......",
"......#hhhhhhhh#hhhhhhhhh#......",
".....#hhhhhhh#...#hhhhhhh#......",
".....#hhh###.......###hhh#......",
"....#hhh#.............#hhh#.....",
"....#hhh#.............#hhh#.....",
"....#Hhh#.............#hhH#.....",
"....#HH#...............#HH#.....",
".....##.................##......",
),
'curly': R(
"........##..######..##..........",
".......#hh##hhhhhh##hh#.........",
"......#hhhhhhhhhhhhhhhh#........",
".....#hhhhhhhhhiiihhhhhh#.......",
".....#hhhhhhhhhhhhhhhhhhh#......",
"....#hhHhhhhhhhhhhhhhhhHhh#.....",
"....#hhhhh#hhhhhhhhhh#hhhh#.....",
"....#hhhh#............#hhh#.....",
"....#hHh#..............#hH#.....",
".....#H#................#H#.....",
"......#..................#......",
),
'bob': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhiiihhhhhh#......",
"......#hhhhhhhhhhhhhhhhhh#......",
".....#hhh##############hhh#.....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hHh#..............#hHh#....",
"....#hHh#..............#hHh#....",
"....#HHH#..............#HHH#....",
".....###................###.....",
),
'long': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhiiihhhhhh#......",
"......#hhhhhhhhhhhhhhhhhh#......",
".....#hhh##############hhh#.....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hHh#..............#hHh#....",
"....#hHh#..............#hHh#....",
"....#hHh#..............#hHh#....",
"....#HHh#..............#hHH#....",
"....#HHH#..............#HHH#....",
".....###................###.....",
),
'longstraight': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhh#hhhhhhh#.......",
"......#hhhhhhhh#.#hhhhhhh#......",
"......#hhhhhh#.....#hhhhh#......",
".....#hhhh##.........##hhh#.....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hhh#..............#hhh#....",
"....#hHh#..............#hHh#....",
"....#hHh#..............#hHh#....",
"....#hHh#..............#hHh#....",
"....#HHh#..............#hHH#....",
"....#HHH#..............#HHH#....",
".....###................###.....",
),
'ponytail': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhiiihhhhhh#hh#...",
"......#hhhhhhhhhhhhhhhhhh#hhh#..",
".....#hhhhhhhhhhhhhhhhhhh#hhh#..",
".....#hHhhhhhhhhhhhhhhhHh#Hhh#..",
".....#hh##............##hh#Hh#..",
".....#H#................#H#Hh#..",
"..........................#hH#..",
"..........................#HH#..",
"...........................##...",
),
'bun': R(
"..............######............",
".............#hhhhhh#...........",
"............#hhhiihhh#..........",
".........####hhhhhhhh####.......",
".......##hhhhhhhhhhhhhhhh##.....",
"......#hhhhhhhhhhhhhhhhhhh#.....",
"......#hhhhhhhhhhhhhhhhhh#......",
".....#hhhhhhhhhhhhhhhhhhh#......",
".....#hHhhhhhhhhhhhhhhhHh#......",
".....#hh##............##hh#.....",
".....#H#................#H#.....",
),
'bangs': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhiiihhhhhh#......",
"......#hhhhhhhhhhhhhhhhhh#......",
".....#hhhhhhhhhhhhhhhhhhh#......",
".....#hhhhhhhhhhhhhhhhhhh#......",
".....#hHh#hHhh#hhHh#hhHhh#......",
".....#hh#.#hh#.#hh#.#hh#........",
".....#H#...##...##...##.........",
),
'wavy': R(
"..........############..........",
"........##hhhhhhhhhhhh##........",
".......#hhhhhhhhhhhhhhhh#.......",
"......#hhhhhhhhhiiihhhhhh#......",
"......#hhhhhhhhhhhhhhhhhh#......",
".....#hhh##############hhh#.....",
"....#hhh#..............#hhh#....",
"...#hhhh#..............#hhhh#...",
"...#hhHh#..............#hHhh#...",
"..#hhhhh#..............#hhhhh#..",
"..#hHhh#................#hhHh#..",
"...#hhh#................#hhh#...",
"...#HH#..................#HH#...",
"....##....................##....",
),
'bald': [],
}

BEARD = {
'none': [],
'stubble': R(
".....#Sf.f.f.ffff.f.f.fS#.......",
"......#f.f.ffffffff.f.f#........",
".......#f.ffffffffff.f#.........",
),
'moustache': R(
".........ffffffffffff...........",
"..........ff......ff............",
),
'goatee': R(
".........ffffffffffff...........",
"..........ff......ff............",
"................................",
"...........ffffffffff...........",
"............ffffffff............",
".............ffffff.............",
),
'beard': R(
".....#fffssssssssssssssfff#.....",
".....#ffffssssssssssssffff#.....",
".....#ffffffssmmmmmmssffff#.....",
"......#ffffffffffffffffff#......",
".......#ffffffffffffffff#.......",
"........##ffffffffffff##........",
"..........##ffffffff##..........",
"............##ffff##............",
),
}
BEARD_Y = {'none': 0, 'stubble': 14, 'moustache': 13, 'goatee': 13, 'beard': 12}

GLASSES = {
'none': [],
'round': R(
".......ggggg.gg.gggggg..........",
".......g....ggg.g.....g.........",
".......g....g...g.....g.........",
".......g....g...g.....g.........",
"........gggg.....gggggg.........",
),
'square': R(
".......gggggg...gggggg..........",
".......g....gggggg....g.........",
".......g....g....g....g.........",
".......g....g....g....g.........",
".......gggggg....gggggg.........",
),
'sun': R(
".......gggggg...gggggg..........",
".......gGGGGgggggGGGGGg.........",
".......gGGGGg...gGGGGGg.........",
".......gGGGGg...gGGGGGg.........",
"........gggg.....ggggg..........",
),
}
GLASSES_Y = 7

HAT = {
'none': [],
'cap': R(
"..........############..........",
"........##cccccccccccc##........",
".......#cccccccccccccccc#.......",
"......#cccccccccccccccccc#......",
"......#CCCCCCCCCCCCCCCCCC#######",
"......#CCCCCCCCCCCCCCCCCCCCCCCC#",
".......########################.",
),
'beanie': R(
"...........##########...........",
"..........#cccccccccc#..........",
".........#cccccccccccc#.........",
"........#cccccccccccccc#........",
".......#cccccccccccccccc#.......",
"......#cccccccccccccccccc#......",
"......#CcCcCcCcCcCcCcCcCc#......",
"......#cCcCcCcCcCcCcCcCcC#......",
"......#CCCCCCCCCCCCCCCCCC#......",
".......##################.......",
),
}

# одежда: оверлеи на торс (строка 18), анфас
TOP = {
'tshirt': [],
'tank': R(
"..........#ssssssssss#..........",
".......###ssssssssssss###.......",
"......#sssttttttttttttsss#......",
".....#ssss#tttttttttt#ssss#.....",
".....#ssss#tttttttttt#ssss#.....",
),
'hoodie': R(
"........###..........###........",
".......#ttt###ttttt##ttt#.......",
"......#tttt#ttttttttt#ttt#......",
".......#t+#tttxxtttttt#t#.......",
"...........#tt+x+ttt#...........",
"...........#ttttxtttt#..........",
"...........#TTaaaaTT#...........",
"...........#TTaaaaTT#...........",
),
'shirt': R(
"..........#++tttttt++#..........",
".......###t+#aaaaaa#+t###.......",
"......#tttt+#a....a#+ttt#.......",
".....#ttttt#+#a..a#+#tttt#......",
".....#ttttt#..#aa#..#tttt#......",
".....#tTttt#tttaattt#tttTt#.....",
".....#tTttt#tttxattt#tttTt#.....",
".....#tTTtt#TttaxttT#ttTTt#.....",
".....#sssss#TttxattT#sssss#.....",
),
'jacket': R(
"..........#tt+aaaa+tt#..........",
".......###ttt+aaaa+ttt###.......",
"......#tttttt+aaaa+ttttt#.......",
".....#ttttt#t+aaaa+t#ttttt#.....",
".....#ttttt#t+aaaa+t#ttttt#.....",
".....#tTttt#t+aaaa+t#tttTt#.....",
".....#tTttt#t+aaaa+t#tttTt#.....",
".....#tTTtt#T+aaaa+T#ttTTt#.....",
".....#sssss#T+aaaa+T#sssss#.....",
".....#sSSss#TT+aa+TT#ssSSs#.....",
),
'zip': R(
"..........#++++++++++#..........",
".......###t++tttttt++t###.......",
"......#ttttt+#tkkt#+tttt#.......",
".....#ttttt#t#tkkt#t#ttttt#.....",
".....#ttttt#tttkkttt#ttttt#.....",
".....#tTttt#tttkkttt#tttTt#.....",
".....#tTttt#tttkkttt#tttTt#.....",
".....#tTTtt#TtaaaatT#ttTTt#.....",
".....#sssss#TtaaaatT#sssss#.....",
),
'dress': R(
"..........#tttttttttt#..........",
".......###tttttttttttt###.......",
"......#tttttttttttttttttt#......",
".....#ttttt#tttttttt#ttttt#.....",
".....#ttttt#tttttttt#ttttt#.....",
".....#tTttt#tttttttt#tttTt#.....",
".....#tTttt#tttttttt#tttTt#.....",
".....#tTTtt#TttttttT#ttTTt#.....",
".....#sssss#TttttttT#sssss#.....",
".....#sSSss#TttttttT#ssSSs#.....",
"......###.#TtttttttT#..###......",
".........#TttttttttT#...........",
"........#TtttttttttT#...........",
".......#TTtttttttttTT#..........",
"......#TTTTTTTTTTTTTTT#.........",
"......#################.........",
"...........#bb##bb#.............",
"...........#BB##BB#.............",
),
}

# аксессуары: серьги, цепочка, часы (анфас)
ACC = {
'earrings': (R(".....k..................k.......",), 11),
'necklace': (R("..........kkkkkkkkkk............", "...........k......k.............", "............kkkkkk..............", ".............k..k...............", "..............kk................"), 18),
'watch': (R("......kkk.......................",), 26),
'lipstick': (R("......#SsssssllllllsssssS#......",), 14),
}

def darken(c, k): return tuple(max(0, int(v * k)) for v in c)
def lighten(c, k): return tuple(min(255, int(v + (255 - v) * k)) for v in c)
hx = lambda s: tuple(int(s.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))

def palette(p):
    skin, hair, top, pants, shoes = map(hx, (p['skin'], p['hairColor'], p['topColor'], p['pantsColor'], p['shoesColor']))
    accent = hx(p.get('accent', '#ffffff')); accent2 = hx(p.get('accent2', p.get('accent', '#ffffff')))
    hat = hx(p.get('hatColor', '#333344')); beard = hx(p.get('beardColor', p['hairColor'])); lips = hx(p.get('lipColor', '#d83a4a'))
    return {
        '#': (24, 18, 36), 's': skin, 'S': darken(skin, .8), '$': lighten(skin, .3), 'n': darken(hair if p['hair'] != 'bald' else skin, .55),
        'w': (250, 250, 255), 'e': (34, 28, 48), 'E': (150, 170, 220), 'm': darken(skin, .6), 'l': lips, 'r': (240, 150, 140),
        't': top, 'T': darken(top, .72), '+': lighten(top, .3), 'a': accent, 'x': accent2,
        'p': pants, 'P': darken(pants, .7), 'b': shoes, 'B': darken(shoes, .65),
        'h': hair, 'H': darken(hair, .68), 'i': lighten(hair, .35), 'f': beard,
        'g': (44, 40, 60), 'G': (30, 28, 42), 'k': (240, 200, 90), 'c': hat, 'C': darken(hat, .72),
    }

def layers(p, frame):
    rows = [list(r) for r in BODY[frame]]
    side = frame.startswith('run')
    dy = 1 if frame in ('run1', 'run3') else 0
    def blit(grid, y0, dx=0):
        for j, r in enumerate(grid):
            y = y0 + j
            if not (0 <= y < H): continue
            for i, ch in enumerate(r):
                x = i + dx
                if ch != '.' and 0 <= x < W: rows[y][x] = ch
    if not side:
        blit(TOP.get(p['top'], []), 18)
        for name in p.get('acc', []):
            g, y0 = ACC[name]; blit(g, y0)
    sx = 3 if side else 0
    blit(BEARD[p['beard']], BEARD_Y[p['beard']] + dy, sx)
    blit(GLASSES[p['glasses']], GLASSES_Y + dy, sx)
    blit(HAIR[p['hair']], dy, 1 if side else 0)
    if p['hat'] != 'none': blit(HAT[p['hat']], dy, 1 if side else 0)
    return [''.join(r) for r in rows]

def render(p, frame, scale=3):
    pal = palette(p)
    img = Image.new('RGBA', (W * scale, H * scale), (0, 0, 0, 0))
    px = img.load()
    for j, r in enumerate(layers(p, frame)):
        for i, ch in enumerate(r):
            if ch == '.': continue
            col = pal.get(ch, (255, 0, 255)) + (255,)
            for a in range(scale):
                for b in range(scale): px[i * scale + a, j * scale + b] = col
    return img

# состав по фото. Ключи: имя в списке участников.
ROSTER = {
 'Юсуф': dict(skin='#e6b98f', hair='naruto', hairColor='#f2c235', beard='stubble', beardColor='#5a3a1a', glasses='none', hat='none', top='jacket', topColor='#f07a1a', accent='#2a3a8a', accent2='#ffffff', pantsColor='#f07a1a', shoesColor='#2a3a8a'),
 'фото1': dict(skin='#f0cdb0', hair='long', hairColor='#2a1a14', beard='none', glasses='none', hat='none', top='tank', topColor='#1a1a22', pantsColor='#2a2a34', shoesColor='#1a1a1a', acc=['necklace', 'earrings']),
 'фото2': dict(skin='#f6d6bd', hair='medium', hairColor='#e8c86a', beard='none', glasses='round', hat='none', top='shirt', topColor='#7a7a4a', accent='#f4e8c0', accent2='#d8d0a0', pantsColor='#2a2a34', shoesColor='#4a3a2a'),
 'фото3': dict(skin='#e8bb95', hair='short', hairColor='#4a3020', beard='beard', beardColor='#3a2418', glasses='sun', hat='none', top='tshirt', topColor='#f4f4f4', pantsColor='#26304a', shoesColor='#ffffff'),
 'фото4': dict(skin='#f4d0b8', hair='longstraight', hairColor='#3a2418', beard='none', glasses='none', hat='none', top='jacket', topColor='#c8a070', accent='#f4ece0', accent2='#e8d8c0', pantsColor='#3a3a4a', shoesColor='#2a2a2a', acc=['lipstick'], lipColor='#e8302a'),
 'фото5': dict(skin='#f4d2b3', hair='wavy', hairColor='#a87848', beard='none', glasses='none', hat='none', top='zip', topColor='#f4f0e8', accent='#c83a2a', accent2='#c83a2a', pantsColor='#4a5a7a', shoesColor='#ffffff', acc=['earrings']),
 'фото6': dict(skin='#f2d0b5', hair='side', hairColor='#2e1e14', beard='none', glasses='none', hat='none', top='jacket', topColor='#9a9aa0', accent='#f8f8f8', accent2='#e0e0e0', pantsColor='#2a2a34', shoesColor='#3a2a1a', acc=['watch']),
}
SAMPLES = list(ROSTER.values()) + [
 dict(skin='#d9a878', hair='bob', hairColor='#1e1a1a', beard='none', glasses='none', hat='beanie', hatColor='#e0b040', top='tshirt', topColor='#8a4fd0', pantsColor='#2a3a5a', shoesColor='#ffffff'),
 dict(skin='#f0c8a0', hair='curly', hairColor='#3a2410', beard='goatee', glasses='none', hat='none', top='hoodie', topColor='#404050', accent='#ff8c42', accent2='#ffffff', pantsColor='#1e1e28', shoesColor='#c8c8c8'),
 dict(skin='#c88a5a', hair='spiky', hairColor='#101010', beard='none', glasses='square', hat='cap', hatColor='#d03a3a', top='tshirt', topColor='#2bd4c8', pantsColor='#3a3a3a', shoesColor='#ffffff'),
 dict(skin='#f4d2b3', hair='ponytail', hairColor='#e8d080', beard='none', glasses='none', hat='none', top='dress', topColor='#d24a6a', pantsColor='#26304a', shoesColor='#2a2a2a'),
 dict(skin='#e6b98f', hair='bald', hairColor='#3a2a1a', beard='moustache', glasses='round', hat='none', top='shirt', topColor='#3c8cdc', accent='#ffffff', accent2='#e0e0ff', pantsColor='#2a2a2a', shoesColor='#4a2a1a'),
 dict(skin='#e0b48c', hair='bangs', hairColor='#4a3a8a', beard='none', glasses='none', hat='none', top='hoodie', topColor='#78c85a', accent='#ffffff', accent2='#2a6a2a', pantsColor='#2f2f3a', shoesColor='#2a2a2a'),
 dict(skin='#e6b98f', hair='buzz', hairColor='#2a2a2a', beard='stubble', glasses='none', hat='none', top='tshirt', topColor='#dc3c3c', pantsColor='#26304a', shoesColor='#f2f2f2'),
 dict(skin='#d9a878', hair='bun', hairColor='#2a1a10', beard='none', glasses='none', hat='none', top='dress', topColor='#2bd4c8', pantsColor='#3a3a4a', shoesColor='#ffffff'),
]

def sheet(path, scale=3):
    frames = ['idle', 'run0', 'run1', 'run2', 'run3', 'cheer']
    img = Image.new('RGBA', (len(frames) * (W * scale + 8) + 8, len(SAMPLES) * (H * scale + 8) + 8), (34, 28, 50, 255))
    for r, p in enumerate(SAMPLES):
        for c, f in enumerate(frames):
            im = render(p, f, scale); img.paste(im, (8 + c * (W * scale + 8), 8 + r * (H * scale + 8)), im)
    img.save(path)

def emit_js(path):
    data = dict(W=W, H=H, BODY=BODY, HAIR=HAIR, BEARD=BEARD, BEARD_Y=BEARD_Y, GLASSES=GLASSES, GLASSES_Y=GLASSES_Y, HAT=HAT, TOP=TOP,
                ACC={k: {'grid': v[0], 'y': v[1]} for k, v in ACC.items()}, ROSTER=ROSTER)
    with open(path, 'w') as f:
        f.write('// Сгенерировано tools/sprites.py. Руками не править.\n')
        f.write('export default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

if __name__ == '__main__':
    for name, grid in [('HEAD_FRONT', HEAD_FRONT), ('HEAD_SIDE', HEAD_SIDE), ('TORSO_IDLE', TORSO_IDLE), ('LEGS_IDLE', LEGS_IDLE), ('TORSO_CHEER', TORSO_CHEER)]:
        assert all(len(r) == W for r in grid), name
    out = sys.argv[1] if len(sys.argv) > 1 else 'sheet.png'
    sheet(out)
    if len(sys.argv) > 2: emit_js(sys.argv[2])
    print('ok')
