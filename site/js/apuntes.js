// Banco de apuntes: un desplegable por carrera con buscador de materias.

(async () => {
  const { t, link, esEjemplo } = ReFADU;
  const lista = document.getElementById("lista");
  const [datos, carrerasDatos] = await Promise.all([ReFADU.contenido("apuntes.json"), ReFADU.contenido("carreras.json")]);
  if (!datos) return ReFADU.errorDeCarga(lista, "apuntes.json");
  const carreras = Object.fromEntries((carrerasDatos?.carreras ?? []).map((c) => [c.id, c]));

  if (datos.formularioSubir) {
    document.getElementById("subir-link").href = link(datos.formularioSubir);
    document.getElementById("subir").hidden = false;
  }

  lista.innerHTML = datos.carreras
    .map((c, i) => {
      const info = carreras[c.carrera] ?? { nombre: c.carrera };
      const materias = (c.materias ?? [])
        .map((m) => `<li data-nombre="${t(m.nombre.toLowerCase())}"><a href="${t(link(m.link))}" target="_blank" rel="noopener">${t(m.nombre)} <span aria-hidden="true">→</span></a></li>`)
        .join("");
      return `<details class="desplegable">
        <summary>${info.ilustracion ? `<img src="/assets/ilustraciones/${t(info.ilustracion)}.webp" alt="" width="48" height="48" loading="lazy" />` : ""}${t(info.nombre)}</summary>
        <div class="desplegable-cuerpo">
          ${(c.materias ?? []).length > 6 ? `<label class="buscador"><span>Buscar materia</span><input type="search" data-buscar="${i}" placeholder="Ej.: Morfología" /></label>` : ""}
          <ul class="lista-links" data-lista="${i}">${materias || "<li>Todavía no hay materias cargadas.</li>"}</ul>
          <div class="acciones" style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">
            <a class="boton" href="${t(link(c.drive))}" target="_blank" rel="noopener">Toda la carpeta de ${t(info.corto ?? info.nombre)} <span class="flecha" aria-hidden="true">→</span></a>
            ${esEjemplo(c.drive) ? '<span class="etiqueta">Links de ejemplo</span>' : ""}
          </div>
        </div>
      </details>`;
    })
    .join("");

  lista.addEventListener("input", (e) => {
    const i = e.target.dataset.buscar;
    if (i === undefined) return;
    const q = e.target.value.trim().toLowerCase();
    lista.querySelectorAll(`[data-lista="${i}"] li[data-nombre]`).forEach((li) => (li.hidden = !li.dataset.nombre.includes(q)));
  });
})();
