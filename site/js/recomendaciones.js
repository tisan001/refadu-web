// Recomendaciones: por carrera, dos opciones con el mismo peso (ver las recomendaciones del
// cuatrimestre y dar la tuya) y el formulario embebido. Sin link todavía, dice "Próximamente".

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
    // dos opciones con el mismo peso: ver las recomendaciones y dar la tuya
    const ver = c.recomendaciones
      ? `<p>Las recomendaciones de ${t(c.nombre)} del <strong>${t(cuatrimestre)}</strong>, armadas con lo que respondieron en el formulario.</p>
         <div class="acciones">
           <a class="boton" href="${t(link(c.recomendaciones))}" target="_blank" rel="noopener">Ver las recomendaciones <span class="flecha" aria-hidden="true">→</span></a>
           ${esEjemplo(c.recomendaciones) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}
         </div>`
      : `<p>Estamos juntando las respuestas de ${t(c.nombre)}. Apenas estén las recomendaciones, las vas a encontrar acá.</p>
         <div class="acciones"><span class="boton proximamente" aria-disabled="true">Próximamente</span></div>`;
    elegida.innerHTML = `
      <div class="reco-opciones">
        <article class="reco-opcion sobre-naranja">
          <span class="etiqueta">${t(cuatrimestre)}</span>
          <h2 class="titulo">Mirá</h2>
          <p class="reco-bajada">Qué cátedra elegir, contado por quienes ya cursaron.</p>
          ${ver}
        </article>
        <article class="reco-opcion sobre-violeta">
          <span class="etiqueta">${t(c.nombre)}</span>
          <h2 class="titulo">Contá</h2>
          <p class="reco-bajada">Tu experiencia le sirve al que viene atrás.</p>
          <p>Completá el formulario de ${t(c.nombre)}: con las respuestas armamos las recomendaciones.</p>
          <div class="acciones">
            ${form ? `<a class="boton naranja" href="#formulario">Completar el formulario <span class="flecha" aria-hidden="true">↓</span></a>` : ""}
          </div>
        </article>
      </div>
      <div class="formulario" id="formulario">
        <div class="formulario-cabeza sobre-violeta">
          <h2>Formulario de ${t(c.nombre)}</h2>
          ${form ? `<p><a href="${t(link(c.formulario))}" target="_blank" rel="noopener">¿No se ve el formulario? Abrilo aparte.</a></p>` : ""}
        </div>
        ${
          form
            ? `<iframe src="${t(form)}" title="Formulario de recomendaciones de ${t(c.nombre)}" loading="lazy">Cargando…</iframe>`
            : `<p class="vacio-estado">Todavía no hay formulario para esta carrera.</p>`
        }
      </div>`;
  }
  elegir(actual);
})();
