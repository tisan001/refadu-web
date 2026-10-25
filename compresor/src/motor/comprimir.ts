/**
 * Motor de compresión: MuPDF (WebAssembly) reescribiendo solo las imágenes.
 * Corre igual en el navegador (Web Worker) y en Node (calibración).
 *
 * 1. Abre el PDF leyéndolo por partes: nunca se carga entero en memoria.
 * 2. Quita /PieceInfo (la copia oculta del .ai de Illustrator) y las miniaturas.
 * 3. Mide a qué resolución está colocada cada imagen en la hoja.
 * 4. Reduce y recomprime las imágenes según el preset, de a una. Los streams de
 *    contenido (vectores y texto) no se tocan, y cada imagen conserva su espacio
 *    de color (DeviceCMYK sigue siendo DeviceCMYK).
 * 5. Guarda deduplicando objetos y con object streams.
 * 6. Si no ahorra al menos 1%, se queda con el original (principio 4).
 */
import * as mupdf from "mupdf";
import type { AjustesImagenes, Preset } from "./presets.ts";

/** Acceso de lectura al PDF original, por partes. */
export interface Fuente {
  tamano: number;
  leer(destino: Uint8Array, desde: number, largo: number, posicion: number): number;
  cerrar?(): void;
}

export type Etapa = "abriendo" | "limpiando" | "midiendo" | "imagenes" | "guardando";

export interface Progreso {
  etapa: Etapa;
  hecho: number;
  total: number;
}

export type Aviso = "firma" | "ya-optimizado";

export interface Resultado {
  /** El PDF comprimido, o null si conviene quedarse con el original. */
  datos: Blob | null;
  bytesOriginal: number;
  bytesFinal: number;
  avisos: Aviso[];
  detalle: {
    datosIllustrator: number;
    imagenesReducidas: number;
    imagenesRecomprimidas: number;
    imagenesConError: number;
  };
}

export type CodigoError = "no-es-pdf" | "contrasena" | "danado";

export class ErrorCompresion extends Error {
  codigo: CodigoError;
  constructor(codigo: CodigoError, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

/** Ahorro mínimo para devolver el archivo comprimido en lugar del original. */
const AHORRO_MINIMO = 0.01;

/** Opciones de guardado de MuPDF: deduplicar objetos (nivel 4), object streams y comprimir streams. */
const OPCIONES_GUARDADO = "garbage=4,compress,objstms=yes";

export function comprimir(fuente: Fuente, preset: Preset, alProgresar: (p: Progreso) => void = () => {}): Resultado {
  alProgresar({ etapa: "abriendo", hecho: 0, total: 1 });
  const doc = abrir(fuente);
  try {
    const avisos: Aviso[] = [];
    if (tieneFirma(doc)) avisos.push("firma");

    alProgresar({ etapa: "limpiando", hecho: 0, total: 1 });
    const datosIllustrator = quitarDatosOcultos(doc);

    const detalle = { datosIllustrator, imagenesReducidas: 0, imagenesRecomprimidas: 0, imagenesConError: 0 };
    if (preset.imagenes) {
      const colocadas = medirImagenes(doc, alProgresar);
      reescribirImagenes(doc, colocadas, preset.imagenes, detalle, alProgresar);
    }

    alProgresar({ etapa: "guardando", hecho: 0, total: 1 });
    const buffer = doc.saveToBuffer(OPCIONES_GUARDADO);
    try {
      const vista = buffer.asUint8Array(); // apunta a la memoria de WebAssembly: vale hasta destruir el buffer
      alProgresar({ etapa: "guardando", hecho: 1, total: 1 });
      if (vista.length > fuente.tamano * (1 - AHORRO_MINIMO)) {
        avisos.push("ya-optimizado");
        return { datos: null, bytesOriginal: fuente.tamano, bytesFinal: fuente.tamano, avisos, detalle };
      }
      // un Blob en vez de otra copia en memoria: el navegador puede guardarlo en disco si es grande
      const datos = new Blob([vista as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      return { datos, bytesOriginal: fuente.tamano, bytesFinal: vista.length, avisos, detalle };
    } finally {
      buffer.destroy();
    }
  } finally {
    doc.destroy();
    mupdf.emptyStore();
  }
}

function abrir(fuente: Fuente): mupdf.PDFDocument {
  const stream = new mupdf.Stream({
    fileSize: () => fuente.tamano,
    read: (memoria, desde, largo, posicion) => fuente.leer(memoria, desde, largo, posicion),
    close: () => fuente.cerrar?.(),
  });
  let doc: mupdf.Document;
  try {
    doc = mupdf.Document.openDocument(stream, "application/pdf");
  } catch (e) {
    throw new ErrorCompresion("danado", `MuPDF no pudo abrir el archivo: ${e instanceof Error ? e.message : e}`);
  }
  const pdf = doc.asPDF();
  if (!pdf) throw new ErrorCompresion("no-es-pdf", "El archivo no es un PDF.");
  if (pdf.needsPassword()) throw new ErrorCompresion("contrasena", "El PDF está protegido con contraseña.");
  return pdf;
}

function tieneFirma(doc: mupdf.PDFDocument): boolean {
  const acroform = doc.getTrailer().get("Root", "AcroForm");
  if (acroform.isNull()) return false;
  const flags = acroform.get("SigFlags");
  if (flags.isNumber() && (flags.asNumber() & 1) !== 0) return true;
  let firma = false;
  acroform.get("Fields").forEach((campo) => {
    const tipo = campo.get("FT");
    if (tipo.isName() && tipo.asName() === "Sig") firma = true;
  });
  return firma;
}

/** Quita /PieceInfo de todos los objetos y las miniaturas de página. Devuelve cuántos /PieceInfo había. */
function quitarDatosOcultos(doc: mupdf.PDFDocument): number {
  let quitados = 0;
  for (let i = 1; i < doc.countObjects(); i++) {
    const obj = doc.newIndirect(i);
    if (!obj.isDictionary()) continue; // los streams también son diccionarios
    if (!obj.get("PieceInfo").isNull()) {
      obj.delete("PieceInfo");
      quitados++;
    }
  }
  for (let p = 0; p < doc.countPages(); p++) {
    const pagina = doc.findPage(p);
    if (!pagina.get("Thumb").isNull()) pagina.delete("Thumb");
  }
  return quitados;
}

// ---------------------------------------------------------------- medición

interface Colocada {
  /** Resolución efectiva de la colocación más grande (la que manda). */
  dpi: number;
  /** Número de objeto de la imagen de la que esta es la máscara (/SMask), si lo es. */
  mascaraDe?: number;
}

/** Imágenes (por número de objeto) que se dibujan desde estos recursos, incluidas las de formularios y patrones. */
function imagenesDeRecursos(recursos: mupdf.PDFObject, destino: Map<number, mupdf.PDFObject>, visto: Set<number>): void {
  if (!recursos.isDictionary()) return;
  const recorrer = (obj: mupdf.PDFObject) => {
    if (!obj.isIndirect()) return;
    const num = obj.asIndirect();
    if (visto.has(num)) return;
    visto.add(num);
    const tipo = obj.get("Subtype");
    if (tipo.isName() && tipo.asName() === "Image") destino.set(num, obj);
    else imagenesDeRecursos(obj.get("Resources"), destino, visto); // formularios y patrones de mosaico
  };
  recursos.get("XObject").forEach(recorrer);
  recursos.get("Pattern").forEach(recorrer);
  recursos.get("ExtGState").forEach((estado) => {
    const grupo = estado.get("SMask", "G"); // máscaras suaves: su grupo puede dibujar imágenes
    if (grupo.isIndirect()) recorrer(grupo);
  });
}

function imagenesDePagina(doc: mupdf.PDFDocument, indice: number): Map<number, mupdf.PDFObject> {
  const pagina = doc.findPage(indice);
  const imagenes = new Map<number, mupdf.PDFObject>();
  const visto = new Set<number>();
  imagenesDeRecursos(pagina.getInheritable("Resources"), imagenes, visto);
  pagina.get("Annots").forEach((anotacion) => {
    const apariencia = anotacion.get("AP", "N");
    if (apariencia.isStream()) imagenesDeRecursos(apariencia.get("Resources"), imagenes, visto);
    else apariencia.forEach((estado) => imagenesDeRecursos(estado.get("Resources"), imagenes, visto));
  });
  return imagenes;
}

/**
 * Recorre cada página con un Device que anota el tamaño al que se dibuja cada imagen.
 * Las imágenes de la página se cargan antes para reconocerlas por su puntero: MuPDF
 * reutiliza el mismo fz_image mientras siga cargado.
 */
function medirImagenes(doc: mupdf.PDFDocument, alProgresar: (p: Progreso) => void): Map<number, Colocada> {
  const colocadas = new Map<number, Colocada>();
  const paginas = doc.countPages();
  for (let p = 0; p < paginas; p++) {
    alProgresar({ etapa: "midiendo", hecho: p, total: paginas });
    const porPuntero = new Map<number, number>();
    const cargadas: mupdf.Image[] = [];
    for (const [num, obj] of imagenesDePagina(doc, p)) {
      const imagen = doc.loadImage(obj);
      cargadas.push(imagen);
      porPuntero.set(Number(imagen.pointer), num);
    }
    const anotar = (imagen: mupdf.Image, ctm: mupdf.Matrix) => {
      const num = porPuntero.get(Number(imagen.pointer));
      if (num === undefined) return;
      const anchoPt = Math.hypot(ctm[0], ctm[1]);
      const altoPt = Math.hypot(ctm[2], ctm[3]);
      if (anchoPt < 1 || altoPt < 1) return;
      const dpi = Math.sqrt(((imagen.getWidth() * 72) / anchoPt) * ((imagen.getHeight() * 72) / altoPt));
      const previa = colocadas.get(num);
      if (!previa || dpi < previa.dpi) colocadas.set(num, { dpi });
    };
    const device = new mupdf.Device({
      fillImage: anotar,
      fillImageMask: anotar,
      clipImageMask: anotar,
    });
    const pagina = doc.loadPage(p);
    pagina.run(device, mupdf.Matrix.identity);
    device.close();
    device.destroy();
    pagina.destroy();
    for (const imagen of cargadas) imagen.destroy();
  }

  // Las máscaras suaves no se dibujan solas: heredan la colocación de su imagen
  for (const [num, colocada] of [...colocadas]) {
    const imagen = doc.newIndirect(num);
    const mascara = imagen.get("SMask");
    if (!mascara.isIndirect()) continue;
    const anchoImagen = imagen.get("Width").asNumber();
    const anchoMascara = mascara.get("Width").asNumber();
    if (anchoImagen > 0 && anchoMascara > 0) {
      colocadas.set(mascara.asIndirect(), { dpi: (colocada.dpi * anchoMascara) / anchoImagen, mascaraDe: num });
    }
  }
  alProgresar({ etapa: "midiendo", hecho: paginas, total: paginas });
  return colocadas;
}

// ---------------------------------------------------------------- reescritura

const FILTROS_CON_PERDIDA = new Set(["DCTDecode", "JPXDecode"]);
const FILTROS_SIN_REESCRIBIR = new Set(["JBIG2Decode", "CCITTFaxDecode"]); // imágenes de 1 bit

function filtros(obj: mupdf.PDFObject): string[] {
  const filtro = obj.get("Filter");
  if (filtro.isName()) return [filtro.asName()];
  const lista: string[] = [];
  filtro.forEach((f) => {
    if (f.isName()) lista.push(f.asName());
  });
  return lista;
}

/** Si la imagen se puede reescribir sin cambiar cómo se ve; si no, se deja como está. */
function reescribible(obj: mupdf.PDFObject, imagen: mupdf.Image): boolean {
  if (imagen.getImageMask()) return false; // máscaras de 1 bit (dibujos de un solo color)
  if (obj.get("BitsPerComponent").asNumber() === 1) return false;
  if (obj.get("Mask").isArray()) return false; // máscara por color: JPEG la rompería
  if (filtros(obj).some((f) => FILTROS_SIN_REESCRIBIR.has(f))) return false;
  const smaskEnDatos = obj.get("SMaskInData");
  if (smaskEnDatos.isNumber() && smaskEnDatos.asNumber() !== 0) return false;
  const espacio = imagen.getColorSpace();
  // indexadas (QR, logos), tintas planas, Lab: se dejan como están
  return !!espacio && (espacio.isGray() || espacio.isRGB() || espacio.isCMYK()) && !espacio.isIndexed();
}

/** Pixmap de la imagen (sin aplicar su máscara) al tamaño pedido, reducido con el escalador de MuPDF. */
function pixmapReducido(imagen: mupdf.Image, ancho: number, alto: number): mupdf.Pixmap {
  const original = imagen.toPixmap();
  if (ancho >= original.getWidth() && alto >= original.getHeight()) return original;
  const espacio = original.getColorSpace();
  if (!espacio) return original;
  const sinMascara = new mupdf.Image(original); // así la máscara no se mezcla con el color
  const reducido = new mupdf.Pixmap(espacio, [0, 0, ancho, alto], false);
  const device = new mupdf.DrawDevice(mupdf.Matrix.identity, reducido);
  device.fillImage(sinMascara, [ancho, 0, 0, alto, 0, 0], 1);
  device.close();
  device.destroy();
  sinMascara.destroy();
  original.destroy();
  return reducido;
}

function reescribirImagenes(
  doc: mupdf.PDFDocument,
  colocadas: Map<number, Colocada>,
  ajustes: AjustesImagenes,
  detalle: Resultado["detalle"],
  alProgresar: (p: Progreso) => void,
): void {
  const total = colocadas.size;
  let hecho = 0;
  for (const [num, colocada] of colocadas) {
    alProgresar({ etapa: "imagenes", hecho: hecho++, total });
    const obj = doc.newIndirect(num);
    try {
      if (colocada.mascaraDe !== undefined) reescribirMascara(doc, obj, colocada, ajustes, detalle);
      else reescribirImagen(doc, obj, colocada, ajustes, detalle);
    } catch {
      detalle.imagenesConError++; // la imagen queda como estaba
    }
    mupdf.shrinkStore(50);
  }
  alProgresar({ etapa: "imagenes", hecho: total, total });
}

function reescribirImagen(
  doc: mupdf.PDFDocument,
  obj: mupdf.PDFObject,
  colocada: Colocada,
  ajustes: AjustesImagenes,
  detalle: Resultado["detalle"],
): void {
  const reducir = colocada.dpi > ajustes.dpi * ajustes.umbral;
  const conPerdida = filtros(obj).some((f) => FILTROS_CON_PERDIDA.has(f));
  if (!reducir && conPerdida && !ajustes.recomprimirJpeg) return;

  const imagen = doc.loadImage(obj);
  try {
    if (!reescribible(obj, imagen)) return;
    const escala = reducir ? ajustes.dpi / colocada.dpi : 1;
    const ancho = Math.max(1, Math.round(imagen.getWidth() * escala));
    const alto = Math.max(1, Math.round(imagen.getHeight() * escala));
    const pixmap = pixmapReducido(imagen, ancho, alto);
    try {
      const jpeg = pixmap.asJPEG(ajustes.calidad, false);
      if (jpeg.length >= obj.get("Length").asNumber()) return; // solo si queda más liviana
      obj.writeRawStream(jpeg);
      obj.put("Filter", "DCTDecode");
      obj.delete("DecodeParms");
      obj.delete("Decode"); // el pixmap ya viene con el Decode aplicado
      obj.put("Width", pixmap.getWidth());
      obj.put("Height", pixmap.getHeight());
      obj.put("BitsPerComponent", 8);
      if (reducir) detalle.imagenesReducidas++;
      else detalle.imagenesRecomprimidas++;
    } finally {
      pixmap.destroy();
    }
  } finally {
    imagen.destroy();
  }
}

/** Las máscaras de transparencia se reducen como la imagen, pero sin pérdida: JPEG dejaría halos en los bordes. */
function reescribirMascara(
  doc: mupdf.PDFDocument,
  obj: mupdf.PDFObject,
  colocada: Colocada,
  ajustes: AjustesImagenes,
  detalle: Resultado["detalle"],
): void {
  if (colocada.dpi <= ajustes.dpi * ajustes.umbral) return;
  const imagen = doc.loadImage(obj);
  try {
    const espacio = imagen.getColorSpace();
    if (!espacio?.isGray() || obj.get("BitsPerComponent").asNumber() !== 8) return;
    const escala = ajustes.dpi / colocada.dpi;
    const ancho = Math.max(1, Math.round(imagen.getWidth() * escala));
    const alto = Math.max(1, Math.round(imagen.getHeight() * escala));
    const pixmap = pixmapReducido(imagen, ancho, alto);
    try {
      const filas = pixmap.getPixels();
      const stride = pixmap.getStride();
      const gris = new Uint8Array(ancho * alto);
      for (let y = 0; y < alto; y++) gris.set(filas.subarray(y * stride, y * stride + ancho), y * ancho);
      obj.writeStream(gris); // sin comprimir: MuPDF lo comprime con Flate al guardar
      obj.delete("Decode");
      obj.put("Width", ancho);
      obj.put("Height", alto);
      detalle.imagenesReducidas++;
    } finally {
      pixmap.destroy();
    }
  } finally {
    imagen.destroy();
  }
}
