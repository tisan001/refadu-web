// Importar grupos de WhatsApp desde un Excel (o CSV) a content/grupos.json.
// Lee la primera hoja, revisa cada fila con las mismas reglas que scripts/verificar-contenido.mjs
// y guarda en GitHub con la sesión del editor (/admin): el token que Decap deja en este navegador.
// Sin sesión (por ejemplo, en la compu con `npm run editor`), permite bajar el grupos.json armado.

(async () => {
  const { t } = window.ReFADU;
  const $ = (id) => document.getElementById(id);
  const sinTildes = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const clave = (s) => sinTildes(s).replace(/[^a-z0-9]/g, "");

  // ------------------------------------------------------------ datos de referencia
  const carrerasDatos = await window.ReFADU.contenido("carreras.json");
  const carreras = carrerasDatos?.carreras ?? [];
  const aliasCarrera = new Map();
  for (const c of carreras) {
    const nombre = sinTildes(c.nombre);
    for (const a of [c.id, c.id.replace(/-/g, " "), nombre, nombre.replace(/^lic\. en /, ""), nombre.replace(/^diseno (de |del )?/, ""), c.corto]) {
      if (a) aliasCarrera.set(clave(a), c.id);
    }
  }
  const nombreCarrera = Object.fromEntries(carreras.map((c) => [c.id, c.corto ?? c.nombre]));

  const config = await fetch("/admin/config.yml").then((r) => r.text()).catch(() => "");
  const REPO = config.match(/^\s*repo:\s*([^\s#]+)/m)?.[1];
  const RAMA = config.match(/^\s*branch:\s*([^\s#]+)/m)?.[1] ?? "main";
  const ARCHIVO = "content/grupos.json";

  // ------------------------------------------------------------ columnas de la planilla
  const COLUMNAS = {
    nombre: ["nombre", "grupo", "nombredelgrupo"],
    descripcion: ["descripcion", "descripcioncorta"],
    tipo: ["tipo", "tipodegrupo"],
    carrera: ["carrera"],
    anio: ["anocbc", "aniocbc", "anodelcbc", "cbcano"],
    materia: ["materia"],
    anioCursada: ["anodelacarrera", "anocarrera", "anodecursada", "anocursada", "ano"],
    link: ["link", "linkdewhatsapp", "linkdeinvitacion", "enlace", "url", "invitacion"],
  };
  const ENCABEZADOS = ["Nombre", "Descripción", "Tipo", "Carrera", "Año CBC", "Materia", "Año de la carrera", "Link de WhatsApp"];

  function campoDeColumna(encabezado) {
    const k = clave(encabezado);
    for (const [campo, nombres] of Object.entries(COLUMNAS)) if (nombres.includes(k)) return campo;
    return null;
  }

  const TIPOS = { carrera: "De carrera", cbc: "CBC", año: "Por año", materia: "Por materia" };
  function tipoDe(valor) {
    const v = sinTildes(valor);
    if (!v) return "";
    if (v.includes("materia")) return "materia";
    if (v.includes("cbc")) return "cbc";
    if (v === "ano" || v.includes("por ano") || v === "anio") return "año";
    if (v.includes("carrera") || v.includes("general")) return "carrera";
    return null;
  }
  const PALABRAS = { primero: 1, primer: 1, segundo: 2, tercero: 3, tercer: 3, cuarto: 4, quinto: 5, sexto: 6 };
  function anioCarreraDe(valor) {
    const v = sinTildes(valor);
    if (!v) return null;
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 6) return n;
    for (const [palabra, num] of Object.entries(PALABRAS)) if (v.startsWith(palabra)) return num;
    return NaN;
  }
  const limpiarLink = (s) => String(s ?? "").trim().split(/[?#]/)[0];
  const identidad = (g) => [g.tipo, g.carrera ?? "", g.anio ?? "", g.anioCursada ?? "", sinTildes(g.materia), g.link].join("|");

  // ------------------------------------------------------------ revisar una fila
  function revisar(fila) {
    const crudo = {};
    for (const [encabezado, valor] of Object.entries(fila)) {
      const campo = campoDeColumna(encabezado);
      if (campo && String(valor).trim() !== "") crudo[campo] = String(valor).trim();
    }
    if (!Object.keys(crudo).length) return null; // renglón vacío
    const errores = [];
    const g = { nombre: crudo.nombre ?? "" };
    if (crudo.descripcion) g.descripcion = crudo.descripcion;
    const tipo = tipoDe(crudo.tipo);
    if (!tipo) errores.push(crudo.tipo ? `tipo "${crudo.tipo}" no existe (carrera, cbc, año o materia)` : "falta el tipo");
    g.tipo = tipo || crudo.tipo || "";
    if (crudo.carrera) {
      const id = aliasCarrera.get(clave(crudo.carrera));
      if (id) g.carrera = id;
      else errores.push(`no reconozco la carrera "${crudo.carrera}"`);
    } else g.carrera = "";
    if (tipo && tipo !== "cbc" && !g.carrera && !errores.some((e) => e.includes("carrera"))) errores.push("falta la carrera");
    if (tipo === "cbc") {
      const anio = parseInt(crudo.anio, 10);
      if (anio >= 2020 && anio <= 2100) g.anio = anio;
      else errores.push("falta el año del CBC (por ejemplo 2026)");
    }
    if (tipo === "materia") {
      if (crudo.materia) g.materia = crudo.materia;
      else errores.push("falta la materia");
    }
    if (tipo === "año") {
      const n = anioCarreraDe(crudo.anioCursada);
      if (n >= 1 && n <= 6) g.anioCursada = n;
      else errores.push("falta el año de la carrera (1 a 6)");
    }
    if (!g.nombre) {
      // si no tiene nombre, se arma uno con lo que hay
      const partes = [g.materia ?? (g.anioCursada ? `${g.anioCursada}º año` : null), g.carrera ? nombreCarrera[g.carrera] : null, tipo === "cbc" ? `CBC ${g.anio ?? ""}`.trim() : null];
      g.nombre = partes.filter(Boolean).join(" · ");
      if (!g.nombre) errores.push("falta el nombre");
    }
    g.link = limpiarLink(crudo.link);
    if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(g.link)) errores.push(crudo.link ? "el link no es una invitación de WhatsApp" : "falta el link");
    return { g, errores };
  }

  // ------------------------------------------------------------ estado de la página
  let existentes = (await window.ReFADU.contenido("grupos.json")) ?? { grupos: [] };
  let filas = [];

  function sesion() {
    for (const k of ["decap-cms-user", "netlify-cms-user"]) {
      try {
        const u = JSON.parse(localStorage.getItem(k) ?? "null");
        if (u?.token) return u.token;
      } catch {}
    }
    return null;
  }

  function nuevos(modo) {
    const vistos = new Set(modo === "agregar" ? existentes.grupos.map(identidad) : []);
    const salida = [];
    for (const f of filas) {
      f.repetido = false;
      if (f.errores.length) continue;
      const id = identidad(f.g);
      if (vistos.has(id)) {
        f.repetido = true;
        continue;
      }
      vistos.add(id);
      salida.push(f.g);
    }
    return salida;
  }

  const modo = () => document.querySelector('input[name="modo"]:checked').value;

  function dibujar() {
    const lista = nuevos(modo());
    const conError = filas.filter((f) => f.errores.length).length;
    const repetidos = filas.filter((f) => f.repetido).length;
    $("filas").innerHTML = filas
      .map((f) => {
        const estado = f.errores.length ? `✕ ${f.errores.join("; ")}` : f.repetido ? "Ya está: no se agrega" : "✦ Lista";
        const detalle = f.g.tipo === "materia" ? f.g.materia : f.g.tipo === "año" && f.g.anioCursada ? `${f.g.anioCursada}º año` : f.g.tipo === "cbc" ? f.g.anio ?? "" : "";
        return `<tr class="${f.errores.length ? "con-error" : f.repetido ? "repetida" : "lista"}">
          <td>${f.numero}</td><td>${t(estado)}</td><td>${t(f.g.nombre)}</td><td>${t(TIPOS[f.g.tipo] ?? f.g.tipo)}</td>
          <td>${t(nombreCarrera[f.g.carrera] ?? f.g.carrera ?? "")}</td><td>${t(detalle ?? "")}</td><td class="link">${t(f.g.link)}</td></tr>`;
      })
      .join("");
    const partes = [`${lista.length} ${lista.length === 1 ? "grupo listo" : "grupos listos"} para ${modo() === "agregar" ? "agregar" : "guardar"}`];
    if (repetidos) partes.push(`${repetidos} que ya estaban`);
    if (conError) partes.push(`${conError} con errores (no se van a cargar: corregilos en la planilla y volvé a subirla)`);
    $("resumen").textContent = partes.join(" · ") + ".";
    const hay = modo() === "reemplazar" ? lista.length > 0 : lista.length > 0;
    $("guardar").disabled = !hay || !sesion() || !REPO;
    $("descargar").disabled = !hay;
    $("nota-login").textContent = sesion()
      ? `Se guarda en GitHub (${REPO}) con tu sesión del editor. En uno o dos minutos aparece en el sitio.`
      : "Para guardar directo en el sitio, primero entrá al editor (/admin) con tu cuenta de GitHub en esta misma pestaña y volvé acá. Si no, podés bajar el grupos.json armado.";
    $("paso-revisar").hidden = false;
  }

  function armar(modoElegido) {
    const lista = nuevos(modoElegido);
    const base = modoElegido === "agregar" ? existentes.grupos : [];
    return { ...existentes, grupos: [...base, ...lista] };
  }

  // ------------------------------------------------------------ leer el archivo
  async function leer(archivo) {
    $("error").hidden = true;
    $("ok").hidden = true;
    try {
      const libro = window.XLSX.read(await archivo.arrayBuffer(), { type: "array" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const datos = window.XLSX.utils.sheet_to_json(hoja, { defval: "", raw: false });
      const columnas = Object.keys(datos[0] ?? {});
      if (!columnas.some((c) => campoDeColumna(c) === "link")) {
        throw new Error("No encontré la columna del link. Usá la plantilla, o poné encabezados como Nombre, Tipo, Carrera, Materia y Link.");
      }
      filas = datos
        .map((fila, i) => ({ numero: i + 2, ...revisar(fila) }))
        .filter((f) => f.g); // sin los renglones vacíos
      if (!filas.length) throw new Error("La planilla no tiene grupos cargados.");
      dibujar();
    } catch (e) {
      $("error").textContent = e.message || "No pude leer el archivo. Probá guardarlo como .xlsx.";
      $("error").hidden = false;
      $("paso-revisar").hidden = true;
    }
  }

  $("archivo").addEventListener("change", (e) => e.target.files[0] && leer(e.target.files[0]));
  const zona = $("zona");
  zona.addEventListener("dragover", (e) => {
    e.preventDefault();
    zona.classList.add("arrastrando");
  });
  zona.addEventListener("dragleave", () => zona.classList.remove("arrastrando"));
  zona.addEventListener("drop", (e) => {
    e.preventDefault();
    zona.classList.remove("arrastrando");
    if (e.dataTransfer.files[0]) leer(e.dataTransfer.files[0]);
  });
  document.querySelectorAll('input[name="modo"]').forEach((r) => r.addEventListener("change", () => filas.length && dibujar()));

  // ------------------------------------------------------------ guardar
  const aBase64 = (texto) => {
    const bytes = new TextEncoder().encode(texto);
    let binario = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binario);
  };
  const deBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  $("guardar").addEventListener("click", async () => {
    const token = sesion();
    const boton = $("guardar");
    boton.disabled = true;
    boton.textContent = "Guardando…";
    try {
      const api = `https://api.github.com/repos/${REPO}/contents/${ARCHIVO}`;
      const cabeceras = { authorization: `token ${token}`, accept: "application/vnd.github+json" };
      // siempre sobre la versión más nueva de GitHub, por si alguien cargó algo desde el editor
      const actual = await fetch(`${api}?ref=${RAMA}`, { headers: cabeceras });
      if (!actual.ok) throw new Error(actual.status === 401 ? "La sesión del editor venció: volvé a entrar a /admin." : `GitHub respondió ${actual.status}.`);
      const { sha, content } = await actual.json();
      existentes = JSON.parse(deBase64(content));
      const final = armar(modo());
      const cuantos = final.grupos.length - (modo() === "agregar" ? existentes.grupos.length : 0);
      const respuesta = await fetch(api, {
        method: "PUT",
        headers: { ...cabeceras, "content-type": "application/json" },
        body: JSON.stringify({
          message: modo() === "agregar" ? `Importar ${cuantos} grupos desde una planilla` : `Reemplazar los grupos por los de una planilla (${final.grupos.length})`,
          content: aBase64(JSON.stringify(final, null, 2) + "\n"),
          sha,
          branch: RAMA,
        }),
      });
      if (!respuesta.ok) throw new Error(`GitHub no aceptó el cambio (${respuesta.status}). ¿Tenés permiso de escritura en el repositorio?`);
      existentes = final;
      $("ok").textContent = `Listo: ${modo() === "agregar" ? `se agregaron ${cuantos} grupos` : `quedaron ${final.grupos.length} grupos`}. En uno o dos minutos aparecen en el sitio.`;
      $("ok").hidden = false;
      dibujar();
    } catch (e) {
      $("error").textContent = e.message;
      $("error").hidden = false;
    } finally {
      boton.textContent = "Guardar en el sitio";
      boton.disabled = !sesion();
    }
  });

  $("descargar").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(armar(modo()), null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "grupos.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  });

  // ------------------------------------------------------------ plantilla
  $("plantilla").addEventListener("click", () => {
    const X = window.XLSX;
    const grupos = X.utils.aoa_to_sheet([ENCABEZADOS]);
    grupos["!cols"] = [30, 40, 14, 26, 10, 26, 18, 48].map((wch) => ({ wch }));
    const ayuda = X.utils.aoa_to_sheet([
      ["Columna", "Qué va", "Ejemplo"],
      ["Nombre", "Cómo se llama el grupo (si lo dejás vacío, se arma solo)", "Morfología 1 · Gráfico"],
      ["Descripción", "Opcional: una línea sobre el grupo", "Para dudas de la cursada"],
      ["Tipo", "carrera, cbc, año o materia", "materia"],
      ["Carrera", "Una de las 7 (no hace falta en los de CBC)", "Diseño Gráfico"],
      ["Año CBC", "Solo en los de CBC: de qué año es el grupo", "2026"],
      ["Materia", "Solo en los de materia", "Morfología 1"],
      ["Año de la carrera", "Solo en los de año: del 1 al 6", "2"],
      ["Link de WhatsApp", "La invitación al grupo", "https://chat.whatsapp.com/..."],
      [],
      ["Carreras que se pueden poner"],
      ...carreras.map((c) => [c.nombre]),
    ]);
    ayuda["!cols"] = [{ wch: 22 }, { wch: 55 }, { wch: 32 }];
    const libro = X.utils.book_new();
    X.utils.book_append_sheet(libro, grupos, "Grupos");
    X.utils.book_append_sheet(libro, ayuda, "Cómo completarla");
    X.writeFile(libro, "plantilla-grupos-refadu.xlsx");
  });
})();
