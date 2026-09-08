import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageEnhance

random.seed(7)
BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]

PEOPLE = [
    ("Юсуф", (240,200,160), (60,40,30),  (220,60,60),  (40,50,90)),
    ("Айдар",(230,190,150), (30,30,30),  (60,140,220), (50,50,60)),
    ("Лена", (245,210,175), (200,120,50),(120,200,90), (90,50,120)),
    ("Макс", (225,185,150), (110,70,40), (240,190,60), (40,40,40)),
    ("Оля",  (245,210,175), (230,80,140),(250,250,250),(60,90,160)),
    ("Дима", (230,190,150), (240,240,200),(150,80,200),(40,40,40)),
]
SPRITE = [
"....HHHH....",
"...HHHHHH...",
"...HHHHHH...",
"...HSSSSH...",
"...SESSES...",
"....SSSS....",
".....SS.....",
"...TTTTTT...",
"..TTTTTTTT..",
".STTTTTTTTS.",
"...TTTTTT...",
"...PPPPPP...",
"...PP..PP...",
"..PP....PP..",
".PP......PP.",
".BB......BB.",
]
def draw_sprite(img, x, y, person, scale=1, frame=0):
    name, skin, hair, shirt, pants = person
    px = img.load()
    rows = SPRITE
    for j,row in enumerate(rows):
        for i,ch in enumerate(row):
            if ch == '.': continue
            col = {'H':hair,'S':skin,'E':(20,20,30),'T':shirt,'P':pants,'B':(30,25,25)}[ch]
            dx = 0
            if frame and j >= 11: dx = (1 if j%2 else -1)
            for a in range(scale):
                for b in range(scale):
                    X, Y = x+(i+dx)*scale+a, y+j*scale+b
                    if 0 <= X < img.width and 0 <= Y < img.height:
                        px[X,Y] = col

def dither_gradient(img, y0, y1, stops):
    px = img.load()
    n = len(stops)-1
    for y in range(y0, y1):
        t = (y-y0)/max(1,(y1-y0-1)) * n
        k = min(int(t), n-1); f = t-k
        for x in range(img.width):
            th = (BAYER[y%4][x%4]+0.5)/16
            px[x,y] = stops[k+1] if f > th else stops[k]

def silhouette(img, pts, col):
    ImageDraw.Draw(img).polygon(pts, fill=col)

# ---------- A: 16-bit platformer race ----------
def scene_a():
    W,H = 320,180
    img = Image.new('RGB',(W,H))
    dither_gradient(img, 0, 120, [(16,10,44),(54,22,80),(118,40,88),(196,86,72),(238,156,92)])
    d = ImageDraw.Draw(img)
    for _ in range(60):
        x,y = random.randrange(W), random.randrange(70)
        d.point((x,y), fill=(230,220,255) if random.random()<.3 else (140,120,200))
    d.ellipse((238,28,272,62), fill=(255,226,170)); d.ellipse((246,30,270,54), fill=(255,238,200))
    # far mountains
    pts=[(0,120)]; x=0
    while x<W:
        x+=random.randint(18,40); pts.append((x, random.randint(70,100)))
    pts += [(W,120)]
    silhouette(img, pts, (52,28,80))
    # mid: ruined towers
    mid=(34,20,58)
    for bx in [20,70,150,210,270]:
        h=random.randint(30,60); w=random.randint(14,26)
        d.rectangle((bx,120-h,bx+w,125), fill=mid)
        for tx in range(bx, bx+w, 6): d.rectangle((tx,120-h-4,tx+3,120-h), fill=mid)
        for wy in range(120-h+8,118,10):
            for wx in range(bx+3,bx+w-3,7):
                if random.random()<.5: d.rectangle((wx,wy,wx+1,wy+2), fill=(255,190,90))
    # near trees
    near=(22,12,40)
    for tx in range(-10,W,22):
        th=random.randint(20,40)
        d.polygon([(tx,132),(tx+11,132-th),(tx+22,132)], fill=near)
        d.polygon([(tx+3,132),(tx+11,120-th//2),(tx+19,132)], fill=near)
    # ground
    d.rectangle((0,132,W,H), fill=(38,30,52))
    for y in range(136,H,8):
        off = 6 if (y//8)%2 else 0
        for x in range(-off,W,12):
            d.rectangle((x,y,x+10,y+6), fill=(58,46,76), outline=(30,22,44))
    for x in range(W):
        gh = 2 + (BAYER[x%4][0]>8)
        d.line((x,130,x,132+gh), fill=(70,150,70) if x%3 else (110,200,90))
    # torches
    for tx in [40,140,240]:
        d.rectangle((tx,112,tx+1,132), fill=(90,60,40))
        for r,col in [(14,(120,50,30)),(9,(200,100,40)),(4,(255,200,90))]:
            for yy in range(-r,r+1):
                for xx in range(-r,r+1):
                    if xx*xx+yy*yy<=r*r and BAYER[(yy)%4][(xx)%4] < (r*0.9):
                        X,Y=tx+xx,108+yy
                        if 0<=X<W and 0<=Y<H and Y<131: img.putpixel((X,Y),col)
        d.rectangle((tx-1,106,tx+2,111), fill=(255,230,120))
    # finish
    d.rectangle((300,96,301,132), fill=(220,220,220))
    for yy in range(96,116,4):
        for xx in range(302,318,4):
            d.rectangle((xx,yy,xx+3,yy+3), fill=(20,20,20) if ((xx//4+yy//4)%2) else (240,240,240))
    # runners
    order=[3,0,5,1,4,2]
    xs=[]
    for k,i in enumerate(order):
        x = 250 - k*36 - random.randint(0,8)
        y = 132-16
        # dust
        for j in range(4): d.point((x-3-j*2, 131-random.randint(0,2)), fill=(120,100,120))
        draw_sprite(img, x, y, PEOPLE[i], 1, frame=k%2)
        xs.append((PEOPLE[i][0], x, y))
    return img, xs

# ---------- B: HD-2D night plaza ----------
def scene_b():
    W,H = 400,225
    img = Image.new('RGB',(W,H),(14,16,34))
    d = ImageDraw.Draw(img)
    dither_gradient(img, 0, 90, [(10,10,30),(20,22,52),(36,34,70)])
    for _ in range(50): d.point((random.randrange(W),random.randrange(80)), fill=(200,200,240))
    # back buildings with warm windows
    for bx,bw,bh,col in [(0,70,80,(40,36,60)),(70,50,60,(52,44,70)),(120,90,95,(36,32,56)),(210,60,70,(48,40,66)),(270,80,88,(40,34,58)),(350,60,66,(50,42,68))]:
        d.rectangle((bx,110-bh,bx+bw,112), fill=col)
        d.rectangle((bx,110-bh-6,bx+bw,110-bh), fill=(28,22,44))
        for wy in range(110-bh+8,104,11):
            for wx in range(bx+5,bx+bw-5,9):
                lit = random.random()<.55
                d.rectangle((wx,wy,wx+3,wy+4), fill=(255,196,110) if lit else (24,20,40))
    # cobblestone plaza in perspective
    y=112; row=0
    while y<H:
        sh = 3+row; sw = 8+row*2
        off = (row%2)*(sw//2)
        for x in range(-off, W, sw):
            c = 60+random.randint(-8,8)
            d.rectangle((x,y,x+sw-2,y+sh-1), fill=(c,c-4,c+12), outline=(30,28,44))
        y+=sh; row+=1
    # fountain
    d.ellipse((160,150,240,190), fill=(70,66,90), outline=(40,38,58))
    d.ellipse((170,155,230,183), fill=(60,110,150))
    d.rectangle((197,120,203,160), fill=(90,84,110)); d.ellipse((188,114,212,126), fill=(100,94,120))
    # lamps
    lamps=[(60,132),(340,132),(120,168),(280,168)]
    for lx,ly in lamps:
        d.rectangle((lx,ly-40,lx+1,ly), fill=(30,28,40))
        d.rectangle((lx-3,ly-46,lx+4,ly-40), fill=(255,220,150))
    # characters in a row
    xs=[]
    for k,p in enumerate(PEOPLE):
        x = 40 + k*60 + random.randint(-4,4); y=150+random.randint(-6,10)
        d.ellipse((x-2,y+30,x+26,y+36), fill=(20,18,34))
        draw_sprite(img, x, y, p, 2)
        xs.append((p[0],x,y))
    big = img.resize((W*3,H*3), Image.NEAREST)
    # bloom from bright pixels
    bright = big.point(lambda v: max(0, v-170)*3)
    bloom = bright.filter(ImageFilter.GaussianBlur(18))
    big = ImageChops.add(big, bloom)
    # tilt-shift: blur top and bottom
    blurred = big.filter(ImageFilter.GaussianBlur(5))
    mask = Image.new('L', big.size, 0)
    md = ImageDraw.Draw(mask)
    for yy in range(big.height):
        t = yy/big.height
        v = int(255*max(0, (0.32-t)/0.32)) if t<0.32 else int(255*max(0,(t-0.78)/0.22)) if t>0.78 else 0
        md.line((0,yy,big.width,yy), fill=v)
    big = Image.composite(blurred, big, mask)
    # vignette + warm grade
    vig = Image.new('L', big.size, 0)
    ImageDraw.Draw(vig).ellipse((-big.width*0.2,-big.height*0.3,big.width*1.2,big.height*1.3), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(120))
    big = Image.composite(big, Image.new('RGB',big.size,(6,6,16)), vig)
    big = ImageEnhance.Contrast(big).enhance(1.08)
    return big, xs

# ---------- C: PS1 low-poly ----------
def scene_c():
    W,H = 320,240
    img = Image.new('RGB',(W,H),(96,92,120))
    FOG=(96,92,120)
    cam_y, f = 1.6, 260
    def proj(p):
        x,y,z = p
        z = max(z, 0.3)
        sx = W/2 + f*x/z; sy = H/2 + f*(cam_y-y)/z
        return (int(sx), int(sy)), z   # integer snapping = PS1 jitter
    tris=[]
    def quad(a,b,c,d_,col):
        tris.append((a,b,c,col)); tris.append((a,c,d_,col))
    def box(x0,y0,z0,x1,y1,z1,col):
        s=lambda c,k: tuple(max(0,min(255,int(v*k))) for v in c)
        quad((x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),s(col,1.0))   # front
        quad((x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1),s(col,0.9))
        quad((x0,y0,z0),(x0,y0,z1),(x0,y1,z1),(x0,y1,z0),s(col,0.72))  # left
        quad((x1,y0,z0),(x1,y0,z1),(x1,y1,z1),(x1,y1,z0),s(col,0.72))
        quad((x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1),s(col,1.15))  # top
    # road + sidewalks
    for z in range(1,40,2):
        for (x0,x1,col) in [(-3,3,(70,68,88)),(-5,-3,(120,116,130)),(3,5,(120,116,130))]:
            c = col if ((z//2)%2==0) else tuple(v-8 for v in col)
            quad((x0,0,z),(x1,0,z),(x1,0,z+2),(x0,0,z+2),c)
    # buildings
    for z in range(2,40,7):
        for side in (-1,1):
            h=random.choice([3,4,5,6]); w=random.choice([2,3])
            base=random.choice([(150,120,110),(110,120,140),(140,140,120),(120,100,130)])
            x0 = side*5; x1 = side*(5+w)
            box(min(x0,x1),0,z,max(x0,x1),h,z+5,base)
            for wy in range(1,h):
                for wz in range(z+1,z+5,2):
                    lit = random.random()<.4
                    col=(250,220,140) if lit else (40,40,60)
                    xw = side*5.01
                    quad((xw,wy,wz),(xw,wy,wz+1),(xw,wy+0.6,wz+1),(xw,wy+0.6,wz),col)
    # runners
    xs=[]
    for k,p in enumerate(PEOPLE):
        z = 6.5 + k*2.0 + random.random()
        x = -2.4 + (k%4)*1.6 + random.random()*0.4
        name, skin, hair, shirt, pants = p
        leg = 0.35*math.sin(k)
        box(x-0.15,0,z,x+0.05,0.75,z+0.2,pants)
        box(x+0.15,0,z+leg,x+0.35,0.75,z+0.2+leg,pants)
        box(x-0.25,0.75,z,x+0.45,1.5,z+0.25,shirt)
        box(x-0.45,0.9,z,x-0.25,1.45,z+0.2,skin)
        box(x+0.45,0.9,z,x+0.65,1.45,z+0.2,skin)
        box(x-0.15,1.5,z-0.05,x+0.35,1.95,z+0.3,skin)
        box(x-0.18,1.85,z-0.08,x+0.38,2.05,z+0.33,hair)
        sp,_ = proj((x+0.1,2.3,z))
        xs.append((name, sp[0], sp[1], z))
    # painter's sort
    def depth(t): return -(t[0][2]+t[1][2]+t[2][2])/3
    tris.sort(key=depth)
    d = ImageDraw.Draw(img)
    for a,b,c,col in tris:
        (pa,za),(pb,zb),(pc,zc) = proj(a),proj(b),proj(c)
        zavg=(za+zb+zc)/3
        fog = min(1.0, max(0.0, (zavg-4)/30))
        col2 = tuple(int(col[i]*(1-fog)+FOG[i]*fog) for i in range(3))
        d.polygon([pa,pb,pc], fill=col2)
    # sky band above fog
    px=img.load()
    # ordered dither posterize to 5 bits
    for y in range(H):
        for x in range(W):
            r,g,b = px[x,y]
            th = BAYER[y%4][x%4]/16*8
            px[x,y] = tuple(min(255, int((v+th)//8*8)) for v in (r,g,b))
    return img.resize((W*3,H*3), Image.NEAREST), xs

a,xa = scene_a(); a.resize((1280,720), Image.NEAREST).save('scene_a.png')
b,xb = scene_b(); b.resize((1200,675), Image.LANCZOS).save('scene_b.jpg', quality=82)
c,xc = scene_c(); c.save('scene_c.png')
print('A', xa); print('B', xb); print('C', xc)
