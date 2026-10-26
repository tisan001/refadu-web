// Lo que usan todas las páginas: el menú del celu y cómo leer los content/*.json.

(() => {
  const boton = document.querySelector(".menu-boton");
  const menu = document.getElementById("menu");
  if (!boton || !menu) return;
  const cerrar = () => {
    menu.classList.remove("abierto");
    boton.setAttribute("aria-expanded", "false");
    boton.querySelector("span").textContent = "Menú";
    document.body.classList.remove("menu-abierto");
  };
  boton.addEventListener("click", () => {
    if (menu.classList.contains("abierto")) return cerrar();
    menu.classList.add("abierto");
    boton.setAttribute("aria-expanded", "true");
    boton.querySelector("span").textContent = "Cerrar";
    document.body.classList.add("menu-abierto");
    menu.querySelector("a")?.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("abierto")) {
      cerrar();
      boton.focus();
    }
  });
  matchMedia("(min-width: 64rem)").addEventListener("change", cerrar);
})();

/**
 * Títulos en caja (Climate Crisis): mide la palabra más larga de cada uno y la deja en --palabra,
 * para que el CSS calcule el tamaño de letra más grande con el que entra sin partir la palabra.
 */
async function ajustarCajas(raiz = document) {
  const cajas = [...raiz.querySelectorAll(".caja")];
  if (!cajas.length) return;
  try {
    await document.fonts.load('100px "Climate Crisis"');
  } catch {}
  const regla = document.createElement("span");
  regla.className = "caja";
  // sin el max-width de .caja: si no, nunca mediría más que el ancho de la pantalla
  regla.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;padding:0;border:0;margin:0;left:0;top:0;max-width:none;width:auto";
  document.body.append(regla);
  for (const caja of cajas) {
    // cada línea del título (los <span> de bloque) por separado; adentro, palabra por palabra
    const lineas = caja.querySelectorAll(".linea-alterna").length ? [...caja.childNodes].map((n) => n.textContent) : [caja.textContent];
    let maximo = 0;
    for (const palabra of lineas.join(" ").replace(/­/g, "").split(/\s+/).filter(Boolean)) {
      regla.textContent = palabra;
      maximo = Math.max(maximo, regla.getBoundingClientRect().width / 100);
    }
    if (maximo) caja.style.setProperty("--palabra", maximo.toFixed(2));
  }
  regla.remove();
}
ajustarCajas();

window.ReFADU = {
  ajustarCajas,

  /** Lee un archivo de content/. Si falla, devuelve null y la página muestra un aviso. */
  async contenido(nombre) {
    try {
      const r = await fetch(`/content/${nombre}`, { cache: "no-cache" });
      if (!r.ok) throw new Error(`${r.status}`);
      return await r.json();
    } catch (e) {
      console.error(`No se pudo leer content/${nombre}:`, e);
      return null;
    }
  },

  /** Escapa texto para meterlo en HTML. */
  t(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  },

  /** Solo deja pasar links http(s) y mailto: un link mal cargado no rompe nada. */
  link(url) {
    return /^(https?:|mailto:)/i.test(String(url ?? "").trim()) ? String(url).trim() : "#";
  },

  /** true si el link todavía es uno de ejemplo (para avisarlo en pantalla). */
  esEjemplo(url) {
    return /EJEMPLO/i.test(String(url ?? ""));
  },

  fecha(iso, opciones = { weekday: "long", day: "numeric", month: "long" }) {
    const [a, m, d] = String(iso).split("-").map(Number);
    if (!a || !m || !d) return iso;
    return new Date(a, m - 1, d).toLocaleDateString("es-AR", opciones);
  },

  /** Días desde hoy hasta la fecha (negativo si ya pasó). */
  diasHasta(iso) {
    const [a, m, d] = String(iso).split("-").map(Number);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((new Date(a, m - 1, d) - hoy) / 86_400_000);
  },

  errorDeCarga(contenedor, archivo) {
    contenedor.innerHTML = `<div class="aviso"><span class="estrella" aria-hidden="true"></span>
      <p>No pudimos cargar esta sección (<code>content/${archivo}</code>). Probá recargar la página en un ratito.</p></div>`;
  },

  ICONOS: {
    lugar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>',
    fecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Z"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.4 3.6 2.1-1 1.7L11 13V6h2v6.4Z"/></svg>',
  },
};
