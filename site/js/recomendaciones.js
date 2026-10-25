// Recomendaciones: por carrera, el formulario embebido, la carpeta de Drive y los PDF de cada cuatrimestre.

(async () => {
  const { t, link, esEjemplo } = ReFADU;
  const elegida = document.getElementById("elegida");
  const datos = await ReFADU.contenido("recomendaciones.json");
  if (!datos) return ReFADU.errorDeCarga(elegida, "recomendaciones.json");

  const CLAVE = "refadu.recomendaciones.carrera";
  let actual = null;
  try {
    actual = localStorage.getItem(CLAVE);
  } catch {}
  if (!datos.carreras.some((c) => c.carrera === actual)) actual = datos.carreras[0]?.carrera;

  const chips = document.getElementById("carreras");
  for (const c of datos.carreras) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = c.nombre;
    b.dataset.carrera = c.carrera;
    b.addEventListener("click", () => elegir(c.carrera));
    chips.append(b);
  }

  function urlEmbebida(url) {
    const u = link(url);
    if (u === "#") return null;
    return u + (u.includes("?") ? "&" : "?") + "embedded=true";
  }

  function elegir(id) {
    actual = id;
    try {
      localStorage.setItem(CLAVE, id);
    } catch {}
    chips.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.carrera === id)));
    const c = datos.carreras.find((x) => x.carrera === id);
    const form = urlEmbebida(c.formulario);
    const cuatrimestre = datos.cuatrimestreActual ?? "este cuatrimestre";
    elegida.innerHTML = `<div class="carrera-elegida">
        <div class="formulario">
          <div class="formulario-cabeza sobre-violeta">
            <h2>Contá tu experiencia</h2>
            <p>Completá el formulario de ${t(c.nombre)}: las respuestas se suman a las recomendaciones de la carrera.</p>
          </div>
          ${
            form
              ? `<iframe src="${t(form)}" title="Formulario de recomendaciones de ${t(c.nombre)}" loading="lazy">Cargando…</iframe>`
              : `<p class="vacio-estado">Todavía no hay formulario para esta carrera.</p>`
          }
        </div>
        <aside class="tarjeta oscura">
          <span class="etiqueta">${t(c.nombre)}</span>
          <h2>Lo que ya se recomendó</h2>
          ${
            c.recomendaciones
              ? `<p>Las recomendaciones del <strong>${t(cuatrimestre)}</strong>, armadas con lo que respondieron en el formulario.</p>
                 <a class="boton naranja recomendaciones-link" href="${t(link(c.recomendaciones))}" target="_blank" rel="noopener">
                   Clickeá acá para ver las recomendaciones del ${t(cuatrimestre)} <span class="flecha" aria-hidden="true">→</span></a>
                 ${esEjemplo(c.recomendaciones) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}`
              : `<p>Todavía no publicamos las recomendaciones del ${t(cuatrimestre)}. ¡Completá el formulario así salen antes!</p>`
          }
          ${form ? `<p><a href="${t(link(c.formulario))}" target="_blank" rel="noopener">¿No se ve el formulario? Abrilo aparte.</a></p>` : ""}
        </aside>
      </div>`;
  }
  elegir(actual);
})();
