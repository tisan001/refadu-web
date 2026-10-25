// Inicio: muestra las próximas dos actividades, si hay.

(async () => {
  const datos = await ReFADU.contenido("actividades.json");
  const proximas = (datos?.actividades ?? [])
    .filter((a) => ReFADU.diasHasta(a.fecha) >= 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 2);
  if (!proximas.length) return;
  document.getElementById("lista-proximas").innerHTML = proximas
    .map((a) => ReFADU.tarjetaActividad(a, { color: "beige" }))
    .join("");
  document.getElementById("proximas").hidden = false;
})();
