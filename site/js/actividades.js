// Actividades: las próximas primero (por fecha) y las que ya pasaron al final.

(async () => {
  const proximas = document.getElementById("proximas");
  const datos = await ReFADU.contenido("actividades.json");
  if (!datos) return ReFADU.errorDeCarga(proximas, "actividades.json");

  const todas = [...datos.actividades].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const futuras = todas.filter((a) => ReFADU.diasHasta(a.fecha) >= 0);
  const pasadas = todas.filter((a) => ReFADU.diasHasta(a.fecha) < 0).reverse();
  const colores = ["naranja", "violeta", "beige"];

  proximas.innerHTML = futuras.length
    ? futuras.map((a, i) => ReFADU.tarjetaActividad(a, { color: colores[i % colores.length] })).join("")
    : `<p class="vacio-estado">Por ahora no hay actividades programadas. ¡Volvé pronto!</p>`;
  if (pasadas.length) {
    document.getElementById("pasadas").innerHTML = pasadas.map((a) => ReFADU.tarjetaActividad(a)).join("");
    document.getElementById("bloque-pasadas").hidden = false;
  }
})();
