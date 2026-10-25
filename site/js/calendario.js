// Calendario: el Google Calendar embebido (vista agenda en el celu) y las fechas clave.

(async () => {
  const { t } = ReFADU;
  const caja = document.getElementById("calendario");
  const datos = await ReFADU.contenido("calendario.json");
  if (!datos) return ReFADU.errorDeCarga(caja, "calendario.json");

  const id = String(datos.calendarioId ?? "").trim();
  if (!id || ReFADU.esEjemplo(id)) {
    caja.innerHTML = `<div class="aviso violeta"><span class="estrella" aria-hidden="true"></span>
      <p><strong>Acá va el calendario.</strong> Todavía no cargamos el ID del Google Calendar en <code>content/calendario.json</code>.</p></div>`;
  } else {
    const celu = matchMedia("(max-width: 47.99rem)").matches;
    const parametros = new URLSearchParams({
      src: id,
      ctz: datos.zonaHoraria || "America/Argentina/Buenos_Aires",
      mode: celu ? "AGENDA" : "MONTH",
      wkst: "2",
      hl: "es",
      showTitle: "0",
      showPrint: "0",
      showCalendars: "0",
      showTz: "0",
      bgcolor: "#E7DED3",
    });
    caja.innerHTML = `<div class="calendario-marco">
        <iframe src="https://calendar.google.com/calendar/embed?${t(parametros.toString())}" title="Calendario académico de ReFADU" loading="lazy"></iframe>
      </div>
      <p><a class="boton vacio" href="https://calendar.google.com/calendar/r?cid=${t(encodeURIComponent(id))}" target="_blank" rel="noopener">Sumalo a tu Google Calendar <span class="flecha" aria-hidden="true">→</span></a></p>`;
  }

  const fechas = (datos.fechasClave ?? []).filter((f) => ReFADU.diasHasta(f.fecha) >= 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (fechas.length) {
    document.getElementById("fechas").innerHTML = fechas
      .map(
        (f) => `<li><span class="dia">${t(ReFADU.fecha(f.fecha, { day: "numeric", month: "short" }))}</span>
          <span>${t(f.texto)}</span></li>`,
      )
      .join("");
    document.getElementById("bloque-fechas").hidden = false;
  }
})();
