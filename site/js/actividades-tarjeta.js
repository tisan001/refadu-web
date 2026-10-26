// Tarjeta de una actividad: la usa la página de actividades.
// Una actividad puede durar varios días (fecha + fechaFin): se muestra "del 11 al 15 de noviembre".

window.ReFADU.tarjetaActividad = function (a, { color = "beige" } = {}) {
  const { t, link, rango, estado, diasHasta, fin, ICONOS, esEjemplo } = window.ReFADU;
  const situacion = estado(a);
  const paso = situacion === "pasada";
  const dias = diasHasta(a.fecha);
  const etiqueta =
    situacion === "pasada"
      ? "Ya pasó"
      : situacion === "en-curso"
        ? diasHasta(fin(a)) === 0 && fin(a) !== a.fecha
          ? "Último día"
          : fin(a) !== a.fecha
            ? "En curso"
            : "Es hoy"
        : dias === 1
          ? "Es mañana"
          : dias <= 7
            ? `En ${dias} días`
            : "";
  const inscripcion =
    a.inscripcion && !paso
      ? `<div class="acciones"><a class="boton${color === "beige" ? "" : " naranja"}" href="${t(link(a.inscripcion))}" target="_blank" rel="noopener">
          Inscribirme <span class="flecha" aria-hidden="true">→</span></a>
          ${esEjemplo(a.inscripcion) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}</div>`
      : "";
  return `<article class="tarjeta ${paso ? "" : color} ${paso ? "pasada" : ""}">
      ${etiqueta ? `<span class="etiqueta">${t(etiqueta)}</span>` : ""}
      <h3>${t(a.titulo)}</h3>
      <p class="dato">${ICONOS.fecha}<span>${t(rango(a))}${a.hora ? ` · ${t(a.hora)} h` : ""}</span></p>
      ${a.lugar ? `<p class="dato">${ICONOS.lugar}<span>${t(a.lugar)}</span></p>` : ""}
      ${a.descripcion ? `<p>${t(a.descripcion)}</p>` : ""}
      ${inscripcion}
    </article>`;
};
