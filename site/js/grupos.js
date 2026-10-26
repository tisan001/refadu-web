// Grupos de WhatsApp: filtros por tipo y por carrera, y un buscador (por nombre, materia o carrera).
// Orden: de carrera, CBC (del año más nuevo al más viejo), por año (1º a 6º) y por materia (A-Z).

(async () => {
  const { t, link, esEjemplo } = ReFADU;
  const lista = document.getElementById("lista");
  const resultado = document.getElementById("resultado");
  const [datos, carrerasDatos] = await Promise.all([ReFADU.contenido("grupos.json"), ReFADU.contenido("carreras.json")]);
  if (!datos) return ReFADU.errorDeCarga(lista, "grupos.json");

  const carreras = Object.fromEntries((carrerasDatos?.carreras ?? []).map((c) => [c.id, c]));
  const ordenCarrera = Object.fromEntries(Object.keys(carreras).map((id, i) => [id, i]));
  const TIPOS = { "": "Todos", carrera: "De carrera", cbc: "CBC", año: "Por año", materia: "Por materia" };
  const ORDEN_TIPO = { carrera: 0, cbc: 1, año: 2, materia: 3 };
  const COLOR = { carrera: "violeta", cbc: "naranja", año: "beige", materia: "oscura" };
  let tipo = "";
  let carrera = "";
  let busqueda = "";

  const anioCarrera = (n) => `${n}º año`;
  const sinTildes = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const grupos = [...datos.grupos].sort(
    (a, b) =>
      (ORDEN_TIPO[a.tipo] ?? 9) - (ORDEN_TIPO[b.tipo] ?? 9) ||
      (a.tipo === "cbc" ? (b.anio ?? 0) - (a.anio ?? 0) : 0) ||
      (ordenCarrera[a.carrera] ?? 99) - (ordenCarrera[b.carrera] ?? 99) ||
      (a.anioCursada ?? 0) - (b.anioCursada ?? 0) ||
      String(a.materia ?? a.nombre).localeCompare(String(b.materia ?? b.nombre), "es"),
  );
  // texto en el que busca el buscador
  for (const g of grupos) g._texto = sinTildes([g.nombre, g.materia, g.descripcion, carreras[g.carrera]?.nombre, g.anio].join(" "));

  const filtroTipo = document.getElementById("filtro-tipo");
  const hayTipo = new Set(grupos.map((g) => g.tipo));
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

  const buscador = document.getElementById("buscar-grupo");
  buscador.addEventListener("input", () => {
    busqueda = sinTildes(buscador.value.trim());
    dibujar();
  });

  function datosDelGrupo(g) {
    const partes = [carreras[g.carrera]?.nombre];
    if (g.tipo === "año" && g.anioCursada) partes.push(anioCarrera(g.anioCursada));
    if (g.tipo === "materia" && g.materia) partes.push(g.materia);
    return partes.filter(Boolean).join(" · ");
  }

  function dibujar() {
    const visibles = grupos.filter(
      (g) =>
        (!tipo || g.tipo === tipo) &&
        (!carrera || g.carrera === carrera || g.tipo === "cbc") &&
        (!busqueda || busqueda.split(/\s+/).every((p) => g._texto.includes(p))),
    );
    resultado.textContent = visibles.length === 1 ? "1 grupo" : `${visibles.length} grupos`;
    lista.innerHTML = visibles.length
      ? visibles
          .map((g) => {
            const etiqueta =
              g.tipo === "cbc" && g.anio ? `CBC ${g.anio}` : g.tipo === "materia" ? "Materia" : g.tipo === "año" ? "Por año" : TIPOS[g.tipo] ?? g.tipo;
            const datosGrupo = datosDelGrupo(g);
            return `<article class="tarjeta ${COLOR[g.tipo] ?? ""}">
              <span class="etiqueta">${t(etiqueta)}</span>
              <h2>${t(g.nombre)}</h2>
              ${datosGrupo ? `<p class="dato">${t(datosGrupo)}</p>` : ""}
              ${g.descripcion ? `<p>${t(g.descripcion)}</p>` : ""}
              <div class="acciones">
                <a class="boton" href="${t(link(g.link))}" target="_blank" rel="noopener">Unirme al grupo <span class="flecha" aria-hidden="true">→</span></a>
                ${esEjemplo(g.link) ? '<span class="etiqueta">Link de ejemplo</span>' : ""}
              </div>
            </article>`;
          })
          .join("")
      : `<p class="vacio-estado">No encontramos grupos con esos filtros. ¿Conocés uno que falte? Avisanos.</p>`;
  }
  dibujar();
})();
