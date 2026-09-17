#!/usr/bin/env python3
"""Переводит картинку из генератора в честный пиксель-арт: вырезает зелёный фон, уменьшает до сетки буфера, сводит к палитре.

    python3 tools/pixelize.py вход.png выход.png --width 640 --colors 32 [--dither] [--green] [--crop x0,y0,x1,y1]

--width   ширина в пикселях буфера (высота по пропорции)
--colors  размер палитры после квантования
--dither  дизеринг Флойда-Стейнберга при квантовании (для неба и градиентов)
--green   вырезать ровный зелёный фон (#00ff00) в прозрачность, с подавлением зелёной каймы
--crop    вырезать область исходника (в долях 0..1) до обработки
"""
import argparse
from PIL import Image, ImageChops, ImageFilter, ImageMath

def thr(ch, v): return ch.point(lambda x: 255 if x > v else 0)

def key_green(im):
    r, g, b, _ = im.split()
    m = ImageChops.lighter(r, b)
    diff = ImageChops.subtract(g, m)
    bg = ImageChops.multiply(thr(g, 150), thr(diff, 70))
    alpha = ImageChops.invert(bg)
    # кайма: непрозрачные пиксели рядом с фоном, в которых зелёный заметно выше остальных
    near = bg.filter(ImageFilter.MaxFilter(7))
    spill = ImageChops.multiply(ImageChops.multiply(near, alpha), thr(diff, 25))
    g2 = Image.composite(m, g, spill)
    return Image.merge('RGBA', (r, g2, b, alpha))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--width', type=int, default=640)
    ap.add_argument('--colors', type=int, default=32)
    ap.add_argument('--dither', action='store_true')
    ap.add_argument('--green', action='store_true')
    ap.add_argument('--crop')
    o = ap.parse_args()
    im = Image.open(o.src).convert('RGBA')
    if o.crop:
        x0, y0, x1, y1 = [float(v) for v in o.crop.split(',')]
        im = im.crop((round(x0 * im.width), round(y0 * im.height), round(x1 * im.width), round(y1 * im.height)))
    if o.green: im = key_green(im)
    # уменьшение с предумноженной прозрачностью: края не тянут за собой цвет фона
    nh = max(1, round(im.height * o.width / im.width)); size = (o.width, nh)
    r, g, b, al = im.split()
    al2 = al.resize(size, Image.BOX)
    chans = []
    for c in (r, g, b):
        pm = ImageChops.multiply(c, al).resize(size, Image.BOX)
        chans.append(ImageMath.lambda_eval(lambda _: _['convert'](_['min'](_['c'] * 255 / _['max'](_['a'], 1), 255), 'L'), c=pm, a=al2))
    alpha = al2.point(lambda v: 255 if v >= 128 else 0)
    q = Image.merge('RGB', chans).quantize(colors=o.colors, method=Image.Quantize.MEDIANCUT, kmeans=3, dither=Image.Dither.FLOYDSTEINBERG if o.dither else Image.Dither.NONE).convert('RGB')
    out = q.convert('RGBA'); out.putalpha(alpha)
    out.save(o.dst, optimize=True)
    print(f'{o.dst}: {o.width}×{nh}, палитра {o.colors}')

if __name__ == '__main__':
    main()
