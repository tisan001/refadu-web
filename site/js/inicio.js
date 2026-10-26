// Inicio: "Se viene" junta las próximas actividades y las fechas clave del calendario,
// en orden de fecha (las 4 más cercanas).

(async () => {
  const { t, link, fecha, diasHasta, esEjemplo } = ReFADU;
  const CUANTAS = 4;
  const [actividades, calendario] = await Promise.all([ReFADU.contenido("actividades.json"), ReFADU.contenido("calendario.json")]);

  const items = [
    ...(actividades?.actividades ?? []).map((a) => ({ tipo: "actividad", fecha: a.fecha, a })),
    ...(calendario?.fechasClave ?? []).map((f) => ({ tipo: "fecha", fecha: f.fecha, f })),
  ]
    .filter((x) => diasHasta(x.fecha) >= 0)
    .sort((x, y) => x.fecha.localeCompare(y.fecha))
    .slice(0, CUANTAS);
  if (!items.length) return;

  const cuando = (iso) => {
    const dias = diasHasta(iso);
    return dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : dias <= 7 ? `En ${dias} días` : "";
  };

  document.getElementById("lista-proximas").innerHTML = items
    .map((x) => {
      const dia = fecha(x.fecha, { day: "numeric" });
      const mes = fecha(x.fecha, { month: "short" }).replace(".", "");
      const pronto = cuando(x.fecha);
      if (x.tipo === "fecha") {
        return `<li class="agenda-item fecha-clave">
          <p class="agenda-dia"><span>${t(dia)}</span> ${t(mes)}</p>
          <div class="agenda-cuerpo">
            <p class="agenda-tipo"><span class="etiqueta">Fecha clave</span>${pronto ? `<span class="etiqueta">${t(pronto)}</span>` : ""}</p>
            <h3>${t(x.f.texto)}</h3>
          </div>
        </li>`;
      }
      const a = x.a;
      return `<li class="agenda-item">
          <p class="agenda-dia"><span>${t(dia)}</span> ${t(mes)}</p>
          <div class="agenda-cuerpo">
            <p class="agenda-tipo"><span class="etiqueta">Actividad</span>${pronto ? `<span class="etiqueta">${t(pronto)}</span>` : ""}</p>
            <h3>${t(a.titulo)}</h3>
            <p class="agenda-datos">${t([a.hora ? `${a.hora} h` : null, a.lugar].filter(Boolean).join(" · "))}</p>
            ${
              a.inscripcion
                ? `<p class="agenda-acciones"><a class="boton chico" href="${t(link(a.inscripcion))}" target="_blank" rel="noopener">Inscribirme <span class="flecha" aria-hidden="true">→</span></a>
                   ${esEjemplo(a.inscripcion) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}</p>`
                : ""
            }
          </div>
        </li>`;
    })
    .join("");
  document.getElementById("proximas").hidden = false;
})();
