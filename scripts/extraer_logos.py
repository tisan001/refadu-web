# Saca el logotipo en vectores del manual de marca y lo guarda como SVG.
# Uso: python scripts/extraer_logos.py  (necesita PyMuPDF)
import pymupdf, pathlib

MANUAL = "material/MANUAL DE MARCA_REFADU.pdf"
SALIDA = pathlib.Path("assets/logos")
NARANJA, BEIGE, VIOLETA = "#FF6E23", "#E7DED3", "#5B2757"
# versiones de color del manual (págs. 6 y 7): [RE, FADU]
VERSIONES = {"color": (NARANJA, VIOLETA), "naranja": (BEIGE, VIOLETA), "oscuro": (NARANJA, BEIGE)}

def f(n): return f"{n:.2f}".rstrip("0").rstrip(".")

def trazo(dibujo):
    partes, fin = [], None
    for it in dibujo["items"]:
        tipo, pts = it[0], it[1:]
        if tipo == "re":
            r = pts[0]; partes.append(f"M{f(r.x0)} {f(r.y0)}H{f(r.x1)}V{f(r.y1)}H{f(r.x0)}Z"); fin = None; continue
        ini = pts[0]
        if fin is None or abs(ini.x - fin.x) > .01 or abs(ini.y - fin.y) > .01:
            if partes: partes.append("Z")
            partes.append(f"M{f(ini.x)} {f(ini.y)}")
        if tipo == "l": partes.append(f"L{f(pts[1].x)} {f(pts[1].y)}"); fin = pts[1]
        elif tipo == "c": partes.append("C" + " ".join(f"{f(p.x)} {f(p.y)}" for p in pts[1:])); fin = pts[3]
    partes.append("Z")
    return "".join(partes)

def glifos(pagina):
    # los 6 glifos (R, E, F, A, D, U): rellenos naranja o violeta
    return [d for d in pagina.get_drawings()
            if d.get("fill") and d["rect"].width > 20 and d["rect"].width < 200 and d["fill"][0] in (1.0, 0.3569999933242798)]

doc = pymupdf.open(MANUAL)
for nombre, num in (("horizontal", 1), ("vertical", 3)):
    gs = glifos(doc[num])
    assert len(gs) == 6, (nombre, len(gs))
    caja = gs[0]["rect"]
    for g in gs[1:]: caja |= g["rect"]
    re_ = [g for g in gs if g["fill"][0] == 1.0]
    fadu = [g for g in gs if g["fill"][0] != 1.0]
    vb = f"{f(caja.x0)} {f(caja.y0)} {f(caja.width)} {f(caja.height)}"
    for version, (c_re, c_fadu) in VERSIONES.items():
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="ReFADU">'
               f'<path fill="{c_re}" fill-rule="nonzero" d="{"".join(trazo(g) for g in re_)}"/>'
               f'<path fill="{c_fadu}" fill-rule="nonzero" d="{"".join(trazo(g) for g in fadu)}"/></svg>')
        (SALIDA / f"refadu-{nombre}-{version}.svg").write_text(svg, encoding="utf-8")
    print(nombre, vb, [g.get("even_odd") for g in gs])
