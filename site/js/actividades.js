// Actividades: las próximas agrupadas por mes (con atajos a cada mes si hay varios)
// y las que ya pasaron plegadas al final, de la más reciente a la más vieja.

(async () => {
  const { t, fecha, diasHasta } = ReFADU;
  const proximas = document.getElementById("proximas");
  const datos = await ReFADU.contenido("actividades.json");
  if (!datos) return ReFADU.errorDeCarga(proximas, "actividades.json");

  const todas = [...datos.actividades].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const futuras = todas.filter((a) => diasHasta(a.fecha) >= 0);
  const pasadas = todas.filter((a) => diasHasta(a.fecha) < 0).reverse();
  const colores = ["naranja", "violeta", "beige"];

  if (!futuras.length) {
    proximas.innerHTML = `<p class="vacio-estado">Por ahora no hay actividades programadas. ¡Volvé pronto!</p>`;
  } else {
    // un grupo por mes ("noviembre 2026"); el año solo se muestra si no es el actual
    const meses = new Map();
    for (const a of futuras) {
      const clave = a.fecha.slice(0, 7);
      if (!meses.has(clave)) meses.set(clave, []);
      meses.get(clave).push(a);
    }
    const anioActual = String(new Date().getFullYear());
    const nombreMes = (clave) => {
      const nombre = fecha(`${clave}-01`, { month: "long" });
      return clave.startsWith(anioActual) ? nombre : `${nombre} ${clave.slice(0, 4)}`;
    };
    let i = 0;
    proximas.innerHTML = [...meses]
      .map(
        ([clave, lista]) => `<section class="mes" id="mes-${clave}" aria-labelledby="titulo-mes-${clave}">
          <h3 class="mes-titulo" id="titulo-mes-${clave}">${t(nombreMes(clave))} <span class="mes-cuenta">${lista.length === 1 ? "1 actividad" : `${lista.length} actividades`}</span></h3>
          <div class="grilla">${lista.map((a) => ReFADU.tarjetaActividad(a, { color: colores[i++ % colores.length] })).join("")}</div>
        </section>`,
      )
      .join("");
    // con más de un mes, atajos arriba para saltar directo
    if (meses.size > 1) {
      const nav = document.getElementById("meses");
      nav.innerHTML = [...meses.keys()].map((clave) => `<a class="chip" href="#mes-${clave}">${t(nombreMes(clave))}</a>`).join("");
      nav.hidden = false;
    }
  }

  if (pasadas.length) {
    document.getElementById("pasadas").innerHTML = pasadas.map((a) => ReFADU.tarjetaActividad(a)).join("");
    document.getElementById("titulo-pasadas").textContent = `Ver las que ya pasaron (${pasadas.length})`;
    document.getElementById("bloque-pasadas").hidden = false;
  }
})();
