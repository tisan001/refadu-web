import "./estilos.css";
import { downloadZip } from "client-zip";
import type { Aviso, Etapa, Progreso } from "./motor/comprimir.ts";
import { PRESETS, type NombrePreset } from "./motor/presets.ts";
import type { CodigoFalla, Pedido, Respuesta } from "./worker.ts";

type Estado = "esperando" | "procesando" | "listo" | "error";

interface Item {
  id: number;
  archivo: File;
  preset: NombrePreset;
  estado: Estado;
  progreso?: Progreso;
  resultado?: { blob: Blob; bytesFinal: number; avisos: Aviso[]; url: string };
  error?: CodigoFalla;
  worker?: Worker;
  nodo: HTMLLIElement;
}

const TEXTO_ETAPA: Record<Etapa, (p: Progreso) => string> = {
  abriendo: () => "Abriendo…",
  limpiando: () => "Sacando datos ocultos…",
  midiendo: () => "Midiendo las imágenes…",
  imagenes: (p) => `Comprimiendo imágenes (${Math.min(p.hecho + 1, p.total)} de ${p.total})…`,
  guardando: () => "Guardando…",
};

// Qué parte de la barra ocupa cada etapa
const TRAMO_ETAPA: Record<Etapa, [number, number]> = {
  abriendo: [0, 4],
  limpiando: [4, 8],
  midiendo: [8, 20],
  imagenes: [20, 92],
  guardando: [92, 100],
};

const TEXTO_ERROR: Record<CodigoFalla, string> = {
  "no-es-pdf": "Este archivo no es un PDF.",
  contrasena: "Tiene contraseña. Sacásela desde el programa con el que lo hiciste y probá de nuevo.",
  danado: "No pudimos leer este PDF: puede estar dañado.",
  memoria:
    "Tu dispositivo se quedó sin memoria con este archivo. Cerrá otras pestañas y probá de nuevo, o usá una compu.",
  inesperado: "Algo salió mal al comprimirlo. Probá de nuevo o con otro de los modos.",
};

// Errores en los que tiene sentido volver a intentar
const REINTENTABLE: CodigoFalla[] = ["memoria", "inesperado"];

const TEXTO_AVISO: Record<Aviso, string> = {
  firma: "Tenía firma digital: al comprimirlo, la firma deja de ser válida.",
  "ya-optimizado": "Ya estaba optimizado: te dejamos el original tal cual.",
};

// Íconos propios (en la paleta de la marca), uno por estado
const ICONO = {
  esperando: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 3.2"/></svg>',
  procesando: '<svg class="girando" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 14 10l6.8 2-6.8 2-2 6.8-2-6.8-6.8-2 6.8-2Z" fill="currentColor"/></svg>',
  listo: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7 12.5 3.2 3.2L17.2 8.7" fill="none" stroke="var(--icono-contraste)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m8.3 8.3 7.4 7.4m0-7.4-7.4 7.4" stroke="var(--icono-contraste)" stroke-width="2.6" stroke-linecap="round"/></svg>',
};

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
function peso(bytes: number): string {
  const mb = bytes / 2 ** 20;
  return mb >= 1 ? `${numero.format(mb)} MB` : `${numero.format(Math.max(bytes / 1024, 0.1))} KB`;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const lista = $<HTMLUListElement>("lista");
const acciones = $<HTMLDivElement>("acciones");
const botonZip = $<HTMLButtonElement>("zip");
const entrada = $<HTMLInputElement>("entrada");
const zona = $<HTMLLabelElement>("zona");
const zonaTitulo = zona.querySelector<HTMLSpanElement>(".zona-titulo")!;

let presetActual: NombrePreset = "campus";
let proximoId = 1;
const items: Item[] = [];

// ---------------------------------------------------------------- presets

function armarPresets(): void {
  const contenedor = $<HTMLDivElement>("presets");
  for (const preset of Object.values(PRESETS)) {
    const opcion = document.createElement("label");
    opcion.className = `preset preset-${preset.nombre}`;
    opcion.innerHTML = `
      <input type="radio" name="preset" value="${preset.nombre}" ${preset.nombre === presetActual ? "checked" : ""} />
      <span class="preset-marca" aria-hidden="true"></span>
      <span class="preset-titulo"></span>
      <span class="preset-descripcion"></span>`;
    opcion.querySelector(".preset-titulo")!.textContent = preset.titulo;
    opcion.querySelector(".preset-descripcion")!.textContent = preset.descripcion;
    contenedor.append(opcion);
  }
  contenedor.addEventListener("change", (evento) => {
    presetActual = (evento.target as HTMLInputElement).value as NombrePreset;
    // lo ya comprimido con otro modo se vuelve a hacer con el nuevo
    for (const item of items) {
      if (item.preset === presetActual || item.error === "no-es-pdf") continue;
      detener(item);
      item.preset = presetActual;
      item.estado = "esperando";
      item.progreso = item.error = undefined;
      liberarResultado(item);
      dibujar(item);
    }
    procesarSiguiente();
  });
}

// ---------------------------------------------------------------- archivos

function esPdf(archivo: File): boolean {
  return archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
}

function agregar(archivos: Iterable<File>): void {
  for (const archivo of archivos) {
    const item: Item = {
      id: proximoId++,
      archivo,
      preset: presetActual,
      estado: esPdf(archivo) ? "esperando" : "error",
      error: esPdf(archivo) ? undefined : "no-es-pdf",
      nodo: document.createElement("li"),
    };
    item.nodo.className = "item";
    items.push(item);
    lista.append(item.nodo);
    dibujar(item);
  }
  actualizarAcciones();
  procesarSiguiente();
}

function procesarSiguiente(): void {
  if (items.some((i) => i.estado === "procesando")) return;
  const item = items.find((i) => i.estado === "esperando");
  if (!item) return;
  item.estado = "procesando";
  item.progreso = { etapa: "abriendo", hecho: 0, total: 1 };
  dibujar(item);

  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  item.worker = worker;
  worker.onmessage = (evento: MessageEvent<Respuesta>) => {
    const respuesta = evento.data;
    if (respuesta.tipo === "progreso") {
      item.progreso = respuesta.progreso;
    } else {
      if (respuesta.tipo === "listo") {
        const blob = respuesta.resultado.datos ?? item.archivo; // sin datos: se queda el original
        item.resultado = {
          blob,
          bytesFinal: respuesta.resultado.bytesFinal,
          avisos: respuesta.resultado.avisos,
          url: URL.createObjectURL(blob),
        };
        item.estado = "listo";
      } else {
        item.estado = "error";
        item.error = respuesta.codigo;
        console.error(`No se pudo comprimir ${item.archivo.name}:`, respuesta.mensaje);
      }
      terminar(item);
    }
    dibujar(item);
  };
  worker.onerror = (evento) => {
    // si el navegador mata el Worker, casi siempre es por memoria
    evento.preventDefault();
    item.estado = "error";
    item.error = "memoria";
    terminar(item);
    dibujar(item);
  };
  worker.postMessage({ archivo: item.archivo, preset: item.preset } satisfies Pedido);
}

function terminar(item: Item): void {
  item.worker?.terminate();
  item.worker = undefined;
  actualizarAcciones();
  procesarSiguiente();
}

function detener(item: Item): void {
  item.worker?.terminate();
  item.worker = undefined;
}

function liberarResultado(item: Item): void {
  if (item.resultado) URL.revokeObjectURL(item.resultado.url);
  item.resultado = undefined;
}

function quitar(item: Item): void {
  detener(item);
  liberarResultado(item);
  item.nodo.remove();
  items.splice(items.indexOf(item), 1);
  actualizarAcciones();
  procesarSiguiente();
}

function reintentar(item: Item): void {
  item.estado = "esperando";
  item.preset = presetActual;
  item.progreso = item.error = undefined;
  dibujar(item);
  procesarSiguiente();
}

// ---------------------------------------------------------------- dibujo

function dibujar(item: Item): void {
  const { archivo, estado } = item;
  item.nodo.dataset.estado = estado;
  item.nodo.innerHTML = `
    <div class="item-cabecera">
      <span class="item-icono">${ICONO[estado]}</span>
      <span class="item-nombre"></span>
      <button type="button" class="item-quitar" aria-label="Quitar">×</button>
    </div>
    <div class="item-cuerpo"></div>`;
  item.nodo.querySelector(".item-nombre")!.textContent = archivo.name;
  const quitarBoton = item.nodo.querySelector<HTMLButtonElement>(".item-quitar")!;
  quitarBoton.onclick = () => quitar(item);
  quitarBoton.setAttribute("aria-label", `Quitar ${archivo.name}`);
  const cuerpo = item.nodo.querySelector<HTMLDivElement>(".item-cuerpo")!;

  if (estado === "esperando") {
    cuerpo.innerHTML = `<p class="item-estado">${peso(archivo.size)} · en la fila, ya va</p>`;
  } else if (estado === "procesando" && item.progreso) {
    const p = item.progreso;
    const [desde, hasta] = TRAMO_ETAPA[p.etapa];
    const porcentaje = desde + ((hasta - desde) * p.hecho) / Math.max(p.total, 1);
    cuerpo.innerHTML = `
      <div class="barra" role="progressbar" aria-label="Comprimiendo ${archivo.name.replace(/"/g, "")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(porcentaje)}">
        <div class="barra-relleno" style="width:${porcentaje.toFixed(1)}%"></div>
      </div>
      <p class="item-estado">${peso(archivo.size)} · ${TEXTO_ETAPA[p.etapa](p)} <span class="item-pct">${Math.round(porcentaje)}%</span></p>`;
  } else if (estado === "listo" && item.resultado) {
    const { bytesFinal, avisos, url } = item.resultado;
    const sinCambios = avisos.includes("ya-optimizado");
    const ahorro = Math.round(100 * (1 - bytesFinal / archivo.size));
    const proporcion = Math.max(2, Math.min(100, (100 * bytesFinal) / archivo.size));
    cuerpo.innerHTML = `
      <div class="resultado">
        <div class="resultado-sello ${sinCambios ? "igual" : ""}" aria-hidden="true">
          <span class="resultado-pct">${sinCambios ? "0%" : `−${ahorro}%`}</span>
          <span class="resultado-pct-texto">${sinCambios ? "sin cambios" : "menos"}</span>
        </div>
        <div class="resultado-datos">
          <p class="solo-lectores">${sinCambios ? `Sin cambios: ${peso(archivo.size)}.` : `Antes ${peso(archivo.size)}, después ${peso(bytesFinal)}: ${ahorro}% menos.`}</p>
          <div class="comparacion" aria-hidden="true">
            <span class="comparacion-rotulo">Antes</span>
            <span class="comparacion-barra antes" style="width:100%"></span>
            <span class="comparacion-peso">${peso(archivo.size)}</span>
            <span class="comparacion-rotulo">Después</span>
            <span class="comparacion-barra despues" style="width:${proporcion.toFixed(1)}%"></span>
            <span class="comparacion-peso"><strong>${peso(bytesFinal)}</strong></span>
          </div>
          <a class="boton naranja chico" download></a>
        </div>
      </div>
      <ul class="avisos"></ul>`;
    const enlace = cuerpo.querySelector<HTMLAnchorElement>("a")!;
    enlace.href = url;
    enlace.download = archivo.name;
    enlace.textContent = "Descargar";
    enlace.setAttribute("aria-label", `Descargar ${archivo.name}`);
    const listaAvisos = cuerpo.querySelector("ul")!;
    for (const aviso of avisos) {
      const li = document.createElement("li");
      li.textContent = TEXTO_AVISO[aviso];
      listaAvisos.append(li);
    }
  } else if (estado === "error" && item.error) {
    cuerpo.innerHTML = `<p class="item-estado error"></p>`;
    cuerpo.querySelector("p")!.textContent = TEXTO_ERROR[item.error];
    if (REINTENTABLE.includes(item.error)) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton chico";
      boton.textContent = "Probar de nuevo";
      boton.onclick = () => reintentar(item);
      cuerpo.append(boton);
    }
  }
}

function actualizarAcciones(): void {
  acciones.hidden = items.length === 0;
  zona.classList.toggle("con-archivos", items.length > 0);
  const listos = items.filter((i) => i.estado === "listo").length;
  botonZip.hidden = listos < 2;
  botonZip.disabled = items.some((i) => i.estado === "esperando" || i.estado === "procesando");
}

// ---------------------------------------------------------------- descargas

function nombreUnico(nombre: string, usados: Set<string>): string {
  let candidato = nombre;
  for (let n = 2; usados.has(candidato.toLowerCase()); n++) candidato = nombre.replace(/(\.pdf)?$/i, ` (${n})$1`);
  usados.add(candidato.toLowerCase());
  return candidato;
}

async function descargarZip(): Promise<void> {
  botonZip.disabled = true;
  const textoOriginal = botonZip.textContent;
  botonZip.textContent = "Armando el .zip…";
  try {
    const usados = new Set<string>();
    const archivos = items
      .filter((i) => i.estado === "listo" && i.resultado)
      .map((i) => ({ name: nombreUnico(i.archivo.name, usados), input: i.resultado!.blob, lastModified: new Date() }));
    const zip = await downloadZip(archivos).blob();
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(zip);
    enlace.download = "laminas-comprimidas.zip";
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 60_000);
  } finally {
    botonZip.textContent = textoOriginal;
    actualizarAcciones();
  }
}

// ---------------------------------------------------------------- eventos

entrada.addEventListener("change", () => {
  if (entrada.files) agregar(entrada.files);
  entrada.value = ""; // permite volver a elegir el mismo archivo
});

function arrastrando(si: boolean): void {
  zona.classList.toggle("arrastrando", si);
  zonaTitulo.textContent = (si ? zonaTitulo.dataset.arrastrando : zonaTitulo.dataset.normal) ?? "";
}
for (const tipo of ["dragenter", "dragover"] as const) {
  zona.addEventListener(tipo, (evento) => {
    evento.preventDefault();
    arrastrando(true);
  });
}
zona.addEventListener("dragleave", (evento) => {
  // solo cuando el puntero sale de la zona, no al pasar por encima de sus hijos
  if (!zona.contains(evento.relatedTarget as Node | null)) arrastrando(false);
});
zona.addEventListener("drop", (evento) => {
  evento.preventDefault();
  arrastrando(false);
  if (evento.dataTransfer?.files.length) agregar(evento.dataTransfer.files);
});
// que soltar un archivo fuera de la zona no abra el PDF en la pestaña
window.addEventListener("dragover", (evento) => evento.preventDefault());
window.addEventListener("drop", (evento) => evento.preventDefault());

botonZip.addEventListener("click", descargarZip);
$<HTMLButtonElement>("limpiar").addEventListener("click", () => {
  for (const item of [...items]) quitar(item);
});

window.addEventListener("beforeunload", (evento) => {
  if (items.some((i) => i.estado === "procesando" || i.estado === "esperando")) evento.preventDefault();
});

armarPresets();
