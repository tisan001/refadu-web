// Becas: abiertas primero (la que cierra antes, arriba), después las de todo el año y al final las cerradas.

(async () => {
  const { t, link, esEjemplo, diasHasta, fecha, ICONOS } = ReFADU;
  const lista = document.getElementById("lista");
  const datos = await ReFADU.contenido("becas.json");
  if (!datos) return ReFADU.errorDeCarga(lista, "becas.json");

  const orden = (b) => (!b.fechaLimite ? 1e6 : diasHasta(b.fechaLimite) < 0 ? 2e6 : diasHasta(b.fechaLimite));
  const becas = [...datos.becas].sort((a, b) => orden(a) - orden(b));
  const colores = ["naranja", "beige", "violeta"];

  lista.innerHTML = becas.length
    ? becas
        .map((b, i) => {
          const dias = b.fechaLimite ? diasHasta(b.fechaLimite) : null;
          const cerrada = dias !== null && dias < 0;
          const estado =
            dias === null ? "Todo el año" : cerrada ? "Cerrada" : dias === 0 ? "Cierra hoy" : dias === 1 ? "Queda 1 día" : `Quedan ${dias} días`;
          return `<article class="tarjeta ${cerrada ? "pasada" : colores[i % colores.length]}">
            <span class="etiqueta">${t(estado)}</span>
            <h2>${t(b.nombre)}</h2>
            ${b.organismo ? `<p class="dato">${t(b.organismo)}</p>` : ""}
            ${b.descripcion ? `<p>${t(b.descripcion)}</p>` : ""}
            ${
              b.requisitos?.length
                ? `<div><h3 class="subtitulo" style="font-size:1.1rem;margin-bottom:.4rem">Requisitos</h3>
                   <ul class="requisitos">${b.requisitos.map((r) => `<li>${t(r)}</li>`).join("")}</ul></div>`
                : ""
            }
            <p class="plazo">${ICONOS.fecha.replace("<svg", '<svg width="18" height="18"')}
              <span>Fecha límite:</span>
              <strong>${b.fechaLimite ? t(fecha(b.fechaLimite, { day: "numeric", month: "long", year: "numeric" })) : "sin fecha"}</strong></p>
            <div class="acciones">
              <a class="boton" href="${t(link(b.link))}" target="_blank" rel="noopener">${cerrada ? "Ver la beca" : "Anotarme"} <span class="flecha" aria-hidden="true">→</span></a>
              ${esEjemplo(b.link) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}
            </div>
          </article>`;
        })
        .join("")
    : `<p class="vacio-estado">No hay becas cargadas por ahora.</p>`;
})();
