# Recorta el aire vacío de las ilustraciones de material/ASSETS y las pasa a WebP livianos.
# Uso: python scripts/preparar_imagenes.py  (necesita Pillow)
import pathlib, re
from PIL import Image

ORIGEN = pathlib.Path("material/ASSETS")
ILUS = pathlib.Path("assets/ilustraciones")
FONDOS = pathlib.Path("assets/fondos")

def nombre(f):
    m = re.match(r"(vector smart|asset|background)_(\d+)", f.stem)
    return {"vector smart": "ilus", "asset": "trazo", "background": "fondo"}[m.group(1)] + "-" + m.group(2) if m else f.stem

total = 0
for f in sorted(ORIGEN.glob("*.png")):
    im = Image.open(f)
    n = nombre(f)
    if n.startswith("fondo"):
        im = im.convert("RGB"); im.thumbnail((900, 1125))
        destino = FONDOS / f"{n}.webp"; im.save(destino, "WEBP", quality=72, method=6)
    elif n in ("noise", "textura"):
        im = im.convert("RGBA"); im.thumbnail((540, 675))
        destino = FONDOS / f"{n}.webp"; im.save(destino, "WEBP", quality=70, method=6)
    else:
        im = im.convert("RGBA")
        caja = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if caja: im = im.crop(caja)
        im.thumbnail((640, 640))
        destino = ILUS / f"{n}.webp"; im.save(destino, "WEBP", quality=82, method=6)
    total += destino.stat().st_size
print(f"{total/1024/1024:.1f} MB en total")
