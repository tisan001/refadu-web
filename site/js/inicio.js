// Inicio: "Se viene" junta las próximas actividades y las fechas clave del calendario,
// en orden de fecha (las 4 más cercanas). Algo que dura varios días se ve hasta su último día.

(async () => {
  const { t, link, fecha, diasHasta, esEjemplo, estado, fin } = ReFADU;
  const CUANTAS = 4;
  const [actividades, calendario] = await Promise.all([ReFADU.contenido("actividades.json"), ReFADU.contenido("calendario.json")]);

  const items = [
    ...(actividades?.actividades ?? []).map((a) => ({ tipo: "actividad", d: a })),
    ...(calendario?.fechasClave ?? []).map((f) => ({ tipo: "fecha", d: f })),
  ]
    .filter((x) => estado(x.d) !== "pasada")
    .sort((x, y) => x.d.fecha.localeCompare(y.d.fecha))
    .slice(0, CUANTAS);
  if (!items.length) return;

  const cuando = (d) => {
    const e = estado(d);
    const varios = fin(d) !== d.fecha;
    if (e === "en-curso") return varios ? (diasHasta(fin(d)) === 0 ? "Último día" : "En curso") : "Hoy";
    const dias = diasHasta(d.fecha);
    return dias === 1 ? "Mañana" : dias <= 7 ? `En ${dias} días` : "";
  };

  const mes = (iso) => fecha(iso, { month: "short" }).replace(".", "");

  /** El cuadro con la fecha: el día grande; si dura varios días, abajo "al 15 nov". */
  function cuadroFecha(d) {
    const hasta = fin(d);
    if (hasta === d.fecha) return `<p class="agenda-dia"><span>${t(fecha(d.fecha, { day: "numeric" }))}</span> ${t(mes(d.fecha))}</p>`;
    const mismoMes = d.fecha.slice(0, 7) === hasta.slice(0, 7);
    return `<p class="agenda-dia varios" aria-label="${t(ReFADU.rango(d))}">
        <span>${t(fecha(d.fecha, { day: "numeric" }))}</span>${mismoMes ? "" : ` ${t(mes(d.fecha))}`}
        <small>al ${t(fecha(hasta, { day: "numeric" }))} ${t(mes(hasta))}</small></p>`;
  }

  const etiquetas = (tipo, d) => {
    const pronto = cuando(d);
    return `<p class="agenda-tipo"><span class="etiqueta">${tipo}</span>${pronto ? `<span class="etiqueta">${t(pronto)}</span>` : ""}</p>`;
  };

  document.getElementById("lista-proximas").innerHTML = items
    .map(({ tipo, d }) => {
      if (tipo === "fecha") {
        return `<li class="agenda-item fecha-clave">
          ${cuadroFecha(d)}
          <div class="agenda-cuerpo">
            ${etiquetas("Fecha clave", d)}
            <h3>${t(d.texto)}</h3>
          </div>
        </li>`;
      }
      return `<li class="agenda-item">
          ${cuadroFecha(d)}
          <div class="agenda-cuerpo">
            ${etiquetas("Actividad", d)}
            <h3>${t(d.titulo)}</h3>
            <p class="agenda-datos">${t([d.hora ? `${d.hora} h` : null, d.lugar].filter(Boolean).join(" · "))}</p>
            ${
              d.inscripcion
                ? `<p class="agenda-acciones"><a class="boton chico" href="${t(link(d.inscripcion))}" target="_blank" rel="noopener">Inscribirme <span class="flecha" aria-hidden="true">→</span></a>
                   ${esEjemplo(d.inscripcion) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}</p>`
                : ""
            }
          </div>
        </li>`;
    })
    .join("");
  document.getElementById("proximas").hidden = false;
})();
