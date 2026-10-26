// Agregados al editor (Decap CMS 3.16 no permite sumar páginas propias al menú):
// un botón "Importar grupos" en la barra de arriba, al lado de "Contenido" y "Medios",
// que abre el importador (importar.html) adentro del editor, con la misma sesión.

(() => {
  const ID = "refadu-importar";

  function abrir() {
    if (document.getElementById(`${ID}-panel`)) return;
    const panel = document.createElement("div");
    panel.id = `${ID}-panel`;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Importar grupos desde un Excel");
    panel.innerHTML = `
      <div class="${ID}-barra">
        <button type="button" class="${ID}-volver">← Volver al editor</button>
        <span>Importar grupos desde un Excel</span>
      </div>
      <iframe src="/admin/importar.html?embebido" title="Importar grupos"></iframe>`;
    panel.querySelector("button").addEventListener("click", cerrar);
    document.body.append(panel);
    document.body.style.overflow = "hidden";
    panel.querySelector("button").focus();
  }

  let huboCambios = false;
  function cerrar() {
    document.getElementById(`${ID}-panel`)?.remove();
    document.body.style.overflow = "";
    // si se guardaron grupos, el editor se recarga para mostrarlos
    if (huboCambios) location.reload();
  }

  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin) return;
    if (e.data === "refadu-importar:guardado") huboCambios = true;
    if (e.data === "refadu-importar:cerrar") cerrar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.getElementById(`${ID}-panel`)) cerrar();
  });

  /** Pone el botón en la barra, copiando el estilo de "Medios". React la vuelve a dibujar, así que se vigila. */
  function sumarBoton() {
    if (document.getElementById(ID)) return;
    const medios = [...document.querySelectorAll("header li > button")].find((b) => /medios|media/i.test(b.textContent));
    if (!medios) return;
    const li = document.createElement("li");
    const boton = document.createElement("button");
    boton.id = ID;
    boton.type = "button";
    boton.className = medios.className;
    // el mismo envoltorio de ícono que "Medios", con un ícono de "subir planilla"
    const icono = medios.querySelector("span")?.cloneNode(false);
    if (icono) {
      icono.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5ZM12 10.5l-3.8 3.8 1.4 1.4 1.4-1.4V19h2v-4.7l1.4 1.4 1.4-1.4-3.8-3.8Z"/></svg>';
      boton.append(icono);
    }
    boton.append("Importar grupos");
    boton.addEventListener("click", abrir);
    li.append(boton);
    medios.parentElement.after(li);
  }
  new MutationObserver(sumarBoton).observe(document.body, { childList: true, subtree: true });

  const estilos = document.createElement("style");
  estilos.textContent = `
    #${ID}-panel { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: #E7DED3; }
    .${ID}-barra { display: flex; align-items: center; gap: 1rem; padding: 0.6rem 1rem; background: #231F20; color: #E7DED3; font: 600 15px/1.2 system-ui, sans-serif; }
    .${ID}-volver { border: 2px solid #E7DED3; border-radius: 999px; background: transparent; color: #E7DED3; padding: 0.35rem 0.9rem; font: inherit; cursor: pointer; }
    .${ID}-volver:hover { background: #E7DED3; color: #231F20; }
    #${ID}-panel iframe { flex: 1; width: 100%; border: 0; }
  `;
  document.head.append(estilos);
})();
