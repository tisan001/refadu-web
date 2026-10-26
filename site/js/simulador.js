// Simulador de correlativas: la hoja 2 de los afiches de ReFADU, interactiva.
// Los datos salen de content/correlativas/<carrera>.json y la lógica de correlativas-logica.js.
// El progreso se guarda por carrera en el navegador (localStorage).

(async () => {
  const L = window.CorrelativasLogica;
  const { t } = ReFADU;
  const app = document.getElementById("simulador");
  const chips = document.getElementById("carreras");
  const anuncio = document.getElementById("anuncio");

  // ------------------------------------------------------------ guardado
  const CLAVE = "refadu.correlativas.v1";
  const almacen = (() => {
    try {
      localStorage.setItem(`${CLAVE}.prueba`, "1");
      localStorage.removeItem(`${CLAVE}.prueba`);
      return localStorage;
    } catch {
      return null;
    }
  })();
  if (!almacen) {
    document.getElementById("aviso-guardado").textContent =
      "Tu navegador no nos deja guardar datos (puede ser una ventana privada): lo que marques se pierde al cerrar la pestaña.";
  }
  function cargarEstados(id) {
    try {
      const guardado = JSON.parse(almacen?.getItem(`${CLAVE}.${id}`) ?? "null");
      return guardado?.estados && typeof guardado.estados === "object" ? guardado.estados : {};
    } catch {
      return {};
    }
  }
  let flashT;
  function guardar() {
    if (!almacen || !carreraId) return;
    try {
      almacen.setItem(`${CLAVE}.${carreraId}`, JSON.stringify({ estados, guardado: new Date().toISOString() }));
      almacen.setItem(`${CLAVE}.ultima`, carreraId);
      const f = document.getElementById("flash");
      f.classList.add("visible");
      clearTimeout(flashT);
      flashT = setTimeout(() => f.classList.remove("visible"), 1200);
    } catch (e) {
      console.error("No se pudo guardar el progreso:", e);
    }
  }

  // ------------------------------------------------------------ estado
  const carrerasDatos = await ReFADU.contenido("carreras.json");
  if (!carrerasDatos) return ReFADU.errorDeCarga(app, "carreras.json");
  const carreras = carrerasDatos.carreras;
  const cache = new Map();
  let carreraId = null;
  let carrera = null;
  let estados = {};
  let filtro = "todas";
  const abiertas = new Set();

  async function datosDe(id) {
    if (!cache.has(id)) {
      const d = await ReFADU.contenido(`correlativas/${id}.json`);
      cache.set(id, d ? L.preparar(d) : null);
    }
    return cache.get(id);
  }

  // ------------------------------------------------------------ dibujos

  const SVG_CANDADO = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10V7a5 5 0 0 1 10 0v3h1.5v12h-13V10H7Zm2.5 0h5V7a2.5 2.5 0 0 0-5 0v3Z"/></svg>';
  const SVG_FLECHA = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 10.5h11.2l-4.6-4.6L12.7 4 21 12l-8.3 8-2.1-1.9 4.6-4.6H4v-3Z"/></svg>';
  const ESTRELLA = "M12 3.2 14 10l6.8 2-6.8 2-2 6.8-2-6.8-6.8-2 6.8-2Z";

  /** El círculo del afiche, según el estado. */
  function casilleroSvg(e, bloqueada) {
    const base = '<circle cx="12" cy="12" r="10" fill="var(--beige)" stroke="var(--negro)" stroke-width="2.5"/>';
    let dentro = "";
    if (e === L.APROBADA) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="var(--negro)" stroke="var(--negro)" stroke-width="2"/><path d="${ESTRELLA}" fill="var(--naranja)"/></svg>`;
    }
    if (e === L.CURSANDO) dentro = '<path d="M12 3.2a8.8 8.8 0 0 0 0 17.6Z" fill="var(--violeta)"/>';
    else if (e === L.CURSADA) dentro = '<circle cx="12" cy="12" r="5.2" fill="var(--violeta)"/>';
    else if (bloqueada) dentro = '<path d="M9.3 11V9.6a2.7 2.7 0 0 1 5.4 0V11h.9v5.3H8.4V11h.9Zm1.3 0h2.8V9.6a1.4 1.4 0 0 0-2.8 0V11Z" fill="var(--negro)"/>';
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${base}${dentro}</svg>`;
  }

  const NOMBRE_ESTADO = { 0: "pendiente", 1: "cursando", 2: "cursada", 3: "aprobada" };

  function nombreEstado(m, e) {
    if (e === L.APROBADA) return m.bloque === "cbc" ? "aprobada" : m.promocion ? "promocionada" : "final aprobado";
    return NOMBRE_ESTADO[e];
  }

  function textoSituacion(s, m) {
    const sit = s.situacion(m);
    if (sit === "bloqueada") return "Bloqueada";
    if (sit === "disponible") return "Podés cursarla";
    if (sit === "cursando") return "Cursando";
    if (sit === "cursada") return s.puedeRendir(m) ? "Cursada · podés rendir el final" : "Cursada · todavía no podés rendir";
    return m.bloque === "cbc" ? "Aprobada" : m.promocion ? "Promocionada" : "Final aprobado";
  }

  function lineasTitulo(nombre) {
    if (nombre.startsWith("Lic.")) return ["Lic. en Planificación", "y Diseño del Paisaje"];
    let m = nombre.match(/^(Diseño de) (.+)$/);
    if (m) return [m[1], m[2]];
    m = nombre.match(/^(Diseño) (.+)$/);
    if (m) return [m[1], m[2]];
    return [null, nombre];
  }

  function celdaReqs(lista, vacio = "") {
    if (!lista.length) return vacio;
    return lista
      .map(
        (r) =>
          `<span class="req ${r.ok ? "ok" : "falta"}" title="${t(L.describir(carrera, r.req, r.tipo))}"><span class="solo-lectores">${r.ok ? "cumplido:" : "falta:"} </span>${t(L.corto(carrera, r.req))}</span>`,
      )
      .join("");
  }

  function fila(s, m) {
    const e = s.est(m.codigo);
    const sit = s.situacion(m);
    const cursar = s.paraCursar(m);
    const rendir = s.paraRendir(m);
    const finales = cursar.filter((r) => r.tipo === "final");
    const tps = cursar.filter((r) => r.tipo === "cursada");
    const abierta = abiertas.has(m.codigo);
    const idDetalle = `detalle-${m.codigo}`;
    const esCbc = m.bloque === "cbc";
    const faltan = sit === "bloqueada" ? cursar.filter((r) => !r.ok).map((r) => L.describir(carrera, r.req, r.tipo)) : [];
    const icono = sit === "bloqueada" ? SVG_CANDADO : sit === "disponible" ? SVG_FLECHA : "";

    const finalCelda = m.promocion
      ? `${celdaReqs(rendir)}<span class="req promo">Promoción</span>`
      : celdaReqs(rendir, '<span class="req nada" aria-hidden="true">—</span>');

    return `<li class="materia ${m.anual ? "anual" : "cuatri"} ${sit}" data-codigo="${t(m.codigo)}">
      <div class="materia-fila">
        <button type="button" class="materia-nombre" aria-expanded="${abierta}" aria-controls="${idDetalle}" data-abrir="${t(m.codigo)}" data-foco="abrir-${t(m.codigo)}">
          ${icono}
          <span class="materia-texto">
            <span class="materia-titulo"><span class="codigo">${t(m.codigo)}.</span> ${t(m.nombre)}</span>
            <span class="materia-estado">${t([textoSituacion(s, m), m.optativa ? "Optativa" : null, m.socioHumanistica ? "Socio-humanística" : null].filter(Boolean).join(" · "))}</span>
          </span>
        </button>
        ${
          esCbc
            ? ""
            : `<div class="celda finales"><span class="celda-rotulo">Finales</span>${celdaReqs(finales, '<span class="req nada" aria-hidden="true">—</span>')}</div>
               <div class="celda tps"><span class="celda-rotulo">TP</span>${celdaReqs(tps, '<span class="req nada" aria-hidden="true">—</span>')}</div>
               <div class="celda final"><span class="celda-rotulo">Final</span>${finalCelda}</div>`
        }
        <span class="casillero" aria-hidden="true">${casilleroSvg(e, sit === "bloqueada")}</span>
      </div>
      <div class="materia-pie">
        ${faltan.length ? `<p class="materia-falta">Te falta: ${t(faltan.join(", "))}</p>` : ""}
        ${botonera(s, m)}
      </div>
      <div class="materia-detalle" id="${idDetalle}" ${abierta ? "" : "hidden"}>${abierta ? detalle(s, m) : ""}</div>
    </li>`;
  }

  const NOMBRE_BOTON = { 0: "Pendiente", 1: "Cursando", 2: "Cursada", 3: "Final" };

  /** Todas las opciones a la vista: se toca la que corresponde. Sin correlativas, solo "Pendiente". */
  function botonera(s, m) {
    const e = s.est(m.codigo);
    const marcable = s.sePuedeMarcar(m);
    const opciones = s
      .ciclo(m)
      .map((v) => {
        const texto = v === L.APROBADA && (m.promocion || m.bloque === "cbc") ? (m.promocion ? "Promocionada" : "Aprobada") : NOMBRE_BOTON[v];
        const deshabilitado = !marcable && v !== L.PENDIENTE;
        return `<button type="button" class="estado-opcion" data-poner="${t(m.codigo)}" data-valor="${v}" data-foco="poner-${t(m.codigo)}-${v}" aria-pressed="${e === v}" ${deshabilitado ? "disabled" : ""}>
          ${casilleroSvg(v)}<span>${t(texto)}</span></button>`;
      })
      .join("");
    return `<div class="estados estados-${s.ciclo(m).length}" role="group" aria-label="Cómo tenés ${t(m.nombre)}">${opciones}</div>`;
  }

  function listaDetalle(lista, vacio) {
    if (!lista.length) return `<p>${t(vacio)}</p>`;
    return `<ul class="detalle-reqs">${lista
      .map((r) => `<li class="${r.ok ? "ok" : "falta"}"><span class="marca" aria-hidden="true">${r.ok ? "✦" : "✕"}</span>${r.ok ? "" : "Te falta: "}${t(L.describir(carrera, r.req, r.tipo))}</li>`)
      .join("")}</ul>`;
  }

  function detalle(s, m) {
    const datos = [
      m.anual ? "Anual" : "Cuatrimestral",
      m.horas ? `${m.horas} hs` : null,
      m.promocion ? "Promoción directa" : null,
      m.optativa ? "Optativa" : null,
      m.socioHumanistica ? "Electiva socio-humanística" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return `<p class="detalle-datos">${t(m.nombre)} · ${t(datos)}</p>
      ${m.nota ? `<p class="detalle-nota">${t(m.nota)}</p>` : ""}
      ${m.bloque === "cbc" ? "" : `<h4>Para cursarla</h4>${listaDetalle(s.paraCursar(m), "No tiene correlativas.")}`}
      ${
        m.bloque === "cbc"
          ? ""
          : `<h4>${m.promocion ? "Para promocionarla" : "Para rendir el final"}</h4>${listaDetalle(s.paraRendir(m), m.promocion ? "Alcanza con aprobar la cursada." : "Solo necesitás tenerla cursada.")}`
      }`;
  }

  function visible(s, m) {
    if (filtro === "disponibles") return s.situacion(m) === "disponible";
    if (filtro === "rendir") return s.situacion(m) === "cursada" && s.puedeRendir(m);
    if (filtro === "pendientes") return s.est(m.codigo) < L.APROBADA;
    return true;
  }

  function bloque(s, b) {
    const sueltas = b.sueltas.filter((m) => visible(s, m));
    const grupos = b.grupos.map((g) => ({ g, ms: g.materias.filter((m) => visible(s, m)) })).filter((x) => x.ms.length);
    if (!sueltas.length && !grupos.length) return "";
    const encabezado =
      b.id === "cbc"
        ? ""
        : `<div class="sim-columnas" aria-hidden="true">
            <span></span><span class="col-cursar">Para cursar<small>Finales</small></span><span class="col-tp"><small>TP</small></span><span class="col-final">Para final<small>Examen final</small></span><span></span>
          </div>`;
    const htmlGrupos = grupos
      .map(({ g, ms }) => {
        const completo = s.grupoCompleto(g, "final");
        let contador;
        let cuentas = "";
        if (g.horas) {
          const h = s.horasGrupo(g);
          contador = `${Math.min(h.total, g.horas)} de ${g.horas} hs`;
          const lineas = [];
          if (g.maximoHorasOptativas)
            lineas.push(`Optativas: ${h.optativas} hs de ${g.maximoHorasOptativas} hs como máximo (podés no hacer ninguna)`);
          if (g.minimoHorasSocioHumanisticas) {
            const ok = h.socioHumanisticas >= g.minimoHorasSocioHumanisticas;
            lineas.push(`${ok ? "✦ " : ""}Socio-humanísticas: ${h.socioHumanisticas} de ${g.minimoHorasSocioHumanisticas} hs como mínimo`);
          }
          if (lineas.length) cuentas = `<ul class="sim-grupo-cuentas">${lineas.map((l) => `<li>${t(l)}</li>`).join("")}</ul>`;
        } else {
          const hechas = g.materias.filter((m) => s.est(m.codigo) === L.APROBADA).length;
          contador = `${Math.min(hechas, g.elegir)} de ${g.elegir}`;
        }
        return `<div class="sim-grupo ${completo ? "completo" : ""}">
          <p class="sim-grupo-titulo"><span>${t(g.grupo)}</span> <span class="contador">${completo ? "✦ " : ""}${t(contador)}</span></p>
          ${g.nota ? `<p class="sim-nota">${t(g.nota)}</p>` : ""}
          ${cuentas}
          <ul class="sim-lista">${ms.map((m) => fila(s, m)).join("")}</ul>
        </div>`;
      })
      .join("");
    return `<section class="sim-bloque" aria-labelledby="bloque-${t(b.id)}">
      <h3 class="bloque-titulo" id="bloque-${t(b.id)}"><span class="estrella" aria-hidden="true"></span>${t(b.titulo)}</h3>
      ${b.nota ? `<p class="sim-nota">${t(b.nota)}</p>` : ""}
      ${encabezado}
      ${sueltas.length ? `<ul class="sim-lista">${sueltas.map((m) => fila(s, m)).join("")}</ul>` : ""}
      ${htmlGrupos}
    </section>`;
  }

  const FILTROS = { todas: "Ver todas", disponibles: "Podés cursar", rendir: "Podés rendir", pendientes: "Pendientes" };

  function dibujar() {
    chips.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.carrera === carreraId)));
    if (!carreraId) {
      app.innerHTML = `<div class="contenedor"><p class="vacio-estado">Elegí tu carrera para empezar. Lo que marques queda guardado en tu dispositivo.</p></div>`;
      return;
    }
    if (!carrera) {
      return ReFADU.errorDeCarga(app, `correlativas/${carreraId}.json`);
    }
    const foco = document.activeElement?.dataset?.foco;
    const s = L.crear(carrera, estados);
    const av = s.avance();
    const [l1, l2] = lineasTitulo(carrera.nombre);
    const bloques = carrera.bloques.map((b) => bloque(s, b)).join("");

    app.innerHTML = `
      <section class="sim-cabeza sobre-oscuro con-grano">
        <div class="contenedor sim-ancho">
          <h2 class="caja sim-caja">${l1 ? `<span class="linea-alterna">${t(l1)}</span>` : ""}${t(l2)}</h2>
          <p class="sim-fuente">${t(carrera.fuente)}</p>
        </div>
      </section>

      <section class="contenedor sim-ancho sim-panel" aria-label="Tu avance">
        <div class="sim-avance sobre-violeta">
          <p class="sim-pct"><span>${av.porcentaje}%</span></p>
          <div>
            <p class="sim-pct-texto">${av.aprobadas} de ${av.total} materias aprobadas</p>
            <div class="sim-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${av.porcentaje}" aria-label="Avance de la carrera"><span style="width:${av.porcentaje}%"></span></div>
            <ul class="sim-cuentas">
              <li>${casilleroSvg(L.APROBADA)}<span>Aprobadas: <strong>${av.cuentas.aprobada}</strong></span></li>
              <li>${casilleroSvg(L.CURSADA)}<span>Cursadas: <strong>${av.cuentas.cursada}</strong></span></li>
              <li>${casilleroSvg(L.CURSANDO)}<span>Cursando: <strong>${av.cuentas.cursando}</strong></span></li>
              <li>${casilleroSvg(L.PENDIENTE)}<span>Podés cursar: <strong>${av.cuentas.disponible}</strong></span></li>
            </ul>
          </div>
        </div>
        <details class="sim-leyenda">
          <summary>Cómo se usa</summary>
          <div>
            <p>Debajo de cada materia tocá cómo la tenés: <strong>Pendiente, Cursando, Cursada o Final</strong>. El círculo de la derecha muestra el estado. Tocá el <strong>nombre</strong> para ver todas sus correlativas.</p>
            <ul>
              <li>${casilleroSvg(L.PENDIENTE)} Pendiente</li>
              <li>${casilleroSvg(L.CURSANDO)} Cursando</li>
              <li>${casilleroSvg(L.CURSADA)} Cursada (TP aprobados)</li>
              <li>${casilleroSvg(L.APROBADA)} Aprobada (final o promoción)</li>
              <li>${SVG_CANDADO} Bloqueada: te faltan correlativas</li>
              <li>${SVG_FLECHA} Ya la podés cursar</li>
              <li><span class="muestra anual"></span> Anual · <span class="muestra cuatri"></span> Cuatrimestral</li>
              <li><span class="req ok">A1</span> correlativa que ya tenés · <span class="req falta">A1</span> la que te falta</li>
            </ul>
          </div>
        </details>
        <div class="sim-herramientas">
          <div class="chips" role="group" aria-label="Filtrar materias">
            ${Object.entries(FILTROS)
              .map(([v, txt]) => `<button type="button" class="chip" data-filtro="${v}" data-foco="filtro-${v}" aria-pressed="${filtro === v}">${t(txt)}</button>`)
              .join("")}
          </div>
          <button type="button" class="boton vacio chico" id="reiniciar" data-foco="reiniciar">Reiniciar</button>
        </div>
      </section>

      <div class="contenedor sim-ancho">
        <div class="afiche">${bloques || '<p class="vacio-estado">No hay materias con este filtro.</p>'}</div>
        ${
          carrera.notas?.length
            ? `<div class="sim-notas"><h3 class="subtitulo">A tener en cuenta</h3><ul>${carrera.notas.map((n) => `<li>${t(n)}</li>`).join("")}</ul></div>`
            : ""
        }
      </div>`;

    ReFADU.ajustarCajas(app);
    if (foco) app.querySelector(`[data-foco="${CSS.escape(foco)}"]`)?.focus();
  }

  // ------------------------------------------------------------ acciones

  function avisar(texto) {
    anuncio.textContent = "";
    requestAnimationFrame(() => (anuncio.textContent = texto));
  }

  function poner(codigo, valor) {
    const m = carrera.materias.get(codigo);
    if (valor === L.PENDIENTE) delete estados[codigo];
    else estados[codigo] = valor;
    guardar();
    dibujar();
    avisar(`${m.nombre}: ${nombreEstado(m, valor)}.`);
  }

  app.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !carrera) return;
    if (b.dataset.poner) return poner(b.dataset.poner, Number(b.dataset.valor));
    if (b.dataset.abrir) {
      const c = b.dataset.abrir;
      abiertas.has(c) ? abiertas.delete(c) : abiertas.add(c);
      return dibujar();
    }
    if (b.dataset.filtro) {
      filtro = b.dataset.filtro;
      return dibujar();
    }
    if (b.id === "reiniciar") {
      if (confirm("¿Seguro que querés borrar todo tu progreso de esta carrera?")) {
        estados = {};
        abiertas.clear();
        guardar();
        dibujar();
        avisar("Borraste el progreso de esta carrera.");
      }
    }
  });

  async function elegir(id) {
    if (!carreras.some((c) => c.id === id)) return;
    carreraId = id;
    carrera = await datosDe(id);
    estados = cargarEstados(id); // cada carrera guarda su propio progreso
    filtro = "todas";
    abiertas.clear();
    try {
      almacen?.setItem(`${CLAVE}.ultima`, id);
    } catch {}
    history.replaceState(null, "", `#${id}`);
    dibujar();
  }

  for (const c of carreras) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("role", "radio");
    b.dataset.carrera = c.id;
    b.textContent = c.corto ?? c.nombre;
    b.addEventListener("click", () => elegir(c.id));
    chips.append(b);
  }

  let inicial = location.hash.slice(1);
  if (!carreras.some((c) => c.id === inicial)) {
    try {
      inicial = almacen?.getItem(`${CLAVE}.ultima`);
    } catch {
      inicial = null;
    }
  }
  if (inicial && carreras.some((c) => c.id === inicial)) await elegir(inicial);
  else dibujar();
  window.addEventListener("hashchange", () => elegir(location.hash.slice(1)));
})();
