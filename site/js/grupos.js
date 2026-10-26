// Grupos de WhatsApp: filtros por tipo y por carrera.

(async () => {
  const { t, link, esEjemplo } = ReFADU;
  const lista = document.getElementById("lista");
  const resultado = document.getElementById("resultado");
  const [datos, carrerasDatos] = await Promise.all([ReFADU.contenido("grupos.json"), ReFADU.contenido("carreras.json")]);
  if (!datos) return ReFADU.errorDeCarga(lista, "grupos.json");

  const carreras = Object.fromEntries((carrerasDatos?.carreras ?? []).map((c) => [c.id, c]));
  const TIPOS = { "": "Todos", carrera: "De carrera", cbc: "CBC", año: "Por año", materia: "Por materia" };
  const COLOR = { carrera: "violeta", cbc: "naranja", año: "beige", materia: "oscura" };
  let tipo = "";
  let carrera = "";

  // los de CBC van del año más nuevo al más viejo; el resto, en el orden del archivo
  const cbc = datos.grupos.filter((g) => g.tipo === "cbc").sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0));
  let siguienteCbc = 0;
  datos.grupos = datos.grupos.map((g) => (g.tipo === "cbc" ? cbc[siguienteCbc++] : g));

  const filtroTipo = document.getElementById("filtro-tipo");
  const hayTipo = new Set(datos.grupos.map((g) => g.tipo));
  for (const [valor, texto] of Object.entries(TIPOS)) {
    if (valor && !hayTipo.has(valor)) continue; // no mostrar filtros que darían vacío
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "chip";
    boton.textContent = texto;
    boton.setAttribute("aria-pressed", String(valor === tipo));
    boton.addEventListener("click", () => {
      tipo = valor;
      filtroTipo.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b === boton)));
      dibujar();
    });
    filtroTipo.append(boton);
  }

  const selector = document.getElementById("filtro-carrera");
  for (const c of Object.values(carreras)) selector.add(new Option(c.nombre, c.id));
  selector.addEventListener("change", () => {
    carrera = selector.value;
    dibujar();
  });

  function dibujar() {
    const visibles = datos.grupos.filter((g) => (!tipo || g.tipo === tipo) && (!carrera || g.carrera === carrera || g.tipo === "cbc"));
    resultado.textContent = visibles.length === 1 ? "1 grupo" : `${visibles.length} grupos`;
    lista.innerHTML = visibles.length
      ? visibles
          .map((g) => {
            const nombreCarrera = carreras[g.carrera]?.nombre;
            return `<article class="tarjeta ${COLOR[g.tipo] ?? ""}">
              <span class="etiqueta">${t(g.tipo === "cbc" && g.anio ? `CBC ${g.anio}` : (TIPOS[g.tipo] ?? g.tipo))}</span>
              <h2>${t(g.nombre)}</h2>
              ${nombreCarrera ? `<p class="dato">${t(nombreCarrera)}</p>` : ""}
              <p>${t(g.descripcion)}</p>
              <div class="acciones">
                <a class="boton" href="${t(link(g.link))}" target="_blank" rel="noopener">Unirme al grupo <span class="flecha" aria-hidden="true">→</span></a>
                ${esEjemplo(g.link) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}
              </div>
            </article>`;
          })
          .join("")
      : `<p class="vacio-estado">No hay grupos con esos filtros todavía.</p>`;
  }
  dibujar();
})();
