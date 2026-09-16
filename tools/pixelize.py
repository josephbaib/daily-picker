#!/usr/bin/env python3
"""Переводит картинку из генератора в честный пиксель-арт: уменьшает до сетки буфера, сводит к палитре, убирает ровный фон.

    python3 tools/pixelize.py вход.png выход.png --width 640 --colors 32 [--dither] [--key '#00ff00' --tol 60]

--width   ширина в пикселях буфера (высота по пропорции)
--colors  размер палитры после квантования
--dither  дизеринг Флойда-Стейнберга при квантовании (иначе плоские заливки)
--key     цвет ровного фона, который вырезать в прозрачность; --tol допуск по RGB
"""
import argparse
from PIL import Image

def hexrgb(s):
    s = s.lstrip('#'); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--width', type=int, default=640)
    ap.add_argument('--colors', type=int, default=32)
    ap.add_argument('--dither', action='store_true')
    ap.add_argument('--key'); ap.add_argument('--tol', type=int, default=60)
    a = ap.parse_args()
    im = Image.open(a.src).convert('RGBA')
    w, h = im.size
    nh = max(1, round(h * a.width / w))
    im = im.resize((a.width, nh), Image.BOX)  # усреднение по блокам даёт чистую сетку без «мыла»
    alpha = im.getchannel('A')
    if a.key:
        kr, kg, kb = hexrgb(a.key); px = im.load(); ap_ = alpha.load()
        for y in range(nh):
            for x in range(a.width):
                r, g, b, _ = px[x, y]
                if abs(r - kr) + abs(g - kg) + abs(b - kb) <= a.tol: ap_[x, y] = 0
    rgb = im.convert('RGB').quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG if a.dither else Image.Dither.NONE).convert('RGB')
    out = rgb.convert('RGBA'); out.putalpha(alpha.point(lambda v: 255 if v > 127 else 0))
    out.save(a.dst)
    print(f'{a.dst}: {a.width}×{nh}, палитра {a.colors}')

if __name__ == '__main__':
    main()
