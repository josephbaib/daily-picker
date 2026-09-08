"""Ставит номер версии во все импорты модулей, стили и пути к картинкам, чтобы браузеры не держали старый кэш.
Запуск перед пушем: python3 tools/bump-version.py. Версия = короткий хэш последнего коммита плюс время."""
import re, subprocess, time, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
ver = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=root).stdout.strip() or 'dev'
ver += '-' + time.strftime('%H%M')
pat = re.compile(r"""(from\s+['"])(\.{1,2}/[\w/.-]+\.js)(\?v=[\w-]+)?(['"])""")
n = 0
for f in root.glob('js/**/*.js'):
    s = f.read_text(); t = pat.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={ver}{m.group(4)}", s)
    if t != s: f.write_text(t); n += 1
html = root / 'index.html'; s = html.read_text()
s = re.sub(r'(css/app\.css)(\?v=[\w-]+)?', rf'\1?v={ver}', s)
s = re.sub(r'(js/app\.js)(\?v=[\w-]+)?', rf'\1?v={ver}', s)
html.write_text(s)
vf = root / 'js/version.js'; vf.write_text(f"export const VERSION = '{ver}';\n")
print('версия', ver, 'файлов', n)
