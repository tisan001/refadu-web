// Tarjeta de una actividad: la usan el inicio y la página de actividades.

window.ReFADU.tarjetaActividad = function (a, { color = "beige" } = {}) {
  const { t, link, fecha, diasHasta, ICONOS, esEjemplo } = window.ReFADU;
  const dias = diasHasta(a.fecha);
  const paso = dias < 0;
  const etiqueta = paso ? "Ya pasó" : dias === 0 ? "Es hoy" : dias === 1 ? "Es mañana" : dias <= 7 ? `En ${dias} días` : "";
  const inscripcion =
    a.inscripcion && !paso
      ? `<div class="acciones"><a class="boton${color === "beige" ? "" : " naranja"}" href="${t(link(a.inscripcion))}" target="_blank" rel="noopener">
          Inscribirme <span class="flecha" aria-hidden="true">→</span></a>
          ${esEjemplo(a.inscripcion) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}</div>`
      : "";
  return `<article class="tarjeta ${paso ? "" : color} ${paso ? "pasada" : ""}">
      ${etiqueta ? `<span class="etiqueta">${t(etiqueta)}</span>` : ""}
      <h3>${t(a.titulo)}</h3>
      <p class="dato">${ICONOS.fecha}<span>${t(fecha(a.fecha))}${a.hora ? ` · ${t(a.hora)} h` : ""}</span></p>
      ${a.lugar ? `<p class="dato">${ICONOS.lugar}<span>${t(a.lugar)}</span></p>` : ""}
      ${a.descripcion ? `<p>${t(a.descripcion)}</p>` : ""}
      ${inscripcion}
    </article>`;
};
