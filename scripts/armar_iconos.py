# Arma los íconos del sitio a partir de la "imagen de perfil" del manual de marca (pág. 15):
# círculo negro con el logo vertical (RE naranja, FADU beige). Para la pestaña del navegador,
# donde el ícono mide 16 px, se usa la marca reducida del manual: solo "RE", en naranja.
#
# Uso: python scripts/armar_iconos.py   (necesita PyMuPDF y Pillow; antes, scripts/extraer_logos.py)
import io, pathlib, re
import pymupdf
from PIL import Image

LOGOS = pathlib.Path("assets/logos")
NEGRO, NARANJA, BEIGE = "#231F20", "#FF6E23", "#E7DED3"

vertical = (LOGOS / "refadu-vertical-oscuro.svg").read_text(encoding="utf-8")
x, y, w, h = (float(n) for n in re.search(r'viewBox="([^"]+)"', vertical).group(1).split())
trazos = re.findall(r'<path fill="([^"]+)" fill-rule="nonzero" d="([^"]+)"/>', vertical)
re_d, fadu_d = trazos[0][1], trazos[1][1]


def circulo(contenido, ancho_logo, alto_logo, proporcion):
    """El logo centrado en un círculo negro: el logo ocupa `proporcion` del diámetro (en el manual, 0,656)."""
    diametro = ancho_logo / proporcion
    cx, cy = x + ancho_logo / 2, y + alto_logo / 2
    vb = f"{cx - diametro / 2:.2f} {cy - diametro / 2:.2f} {diametro:.2f} {diametro:.2f}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">'
            f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{diametro / 2:.2f}" fill="{NEGRO}"/>{contenido}</svg>')


# imagen de perfil: el logo vertical completo, con las proporciones del manual
perfil = circulo(f'<path fill="{NARANJA}" d="{re_d}"/><path fill="{BEIGE}" d="{fadu_d}"/>', w, h, 0.656)
(LOGOS / "refadu-perfil.svg").write_text(perfil, encoding="utf-8")

# pestaña: solo "RE" (la mitad de arriba del logo vertical), más grande dentro del círculo
alto_re = h * 0.63
favicon = circulo(f'<path fill="{NARANJA}" d="{re_d}"/>', w, alto_re, 0.74)
(LOGOS / "favicon.svg").write_text(favicon, encoding="utf-8")


def png(svg, lado):
    doc = pymupdf.open(stream=svg.encode(), filetype="svg")
    escala = lado / doc[0].rect.width
    pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(escala, escala), alpha=True)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")


for lado, nombre in ((180, "apple-touch-icon.png"), (192, "icono-192.png"), (512, "icono-512.png")):
    imagen = png(perfil, lado)
    if nombre == "apple-touch-icon.png":
        # iOS no usa transparencia: el círculo va sobre beige
        fondo = Image.new("RGBA", imagen.size, BEIGE)
        fondo.alpha_composite(imagen)
        imagen = fondo
    imagen.save(LOGOS / nombre, optimize=True)

# favicon.ico (16, 32 y 48 px) en la raíz del sitio: lo piden los navegadores aunque no esté linkeado
png(favicon, 256).save("site/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("listo")
