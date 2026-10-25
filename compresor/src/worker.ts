// Web Worker: comprime un PDF con MuPDF sin congelar la página.
// Cada archivo usa un Worker nuevo: la memoria de WebAssembly no se devuelve al
// sistema, así que terminarlo al final es la forma de liberarla.
import urlWasm from "../node_modules/mupdf/dist/mupdf-wasm.wasm?url";
import type { CodigoError, Fuente, Progreso, Resultado } from "./motor/comprimir.ts";
import type { NombrePreset } from "./motor/presets.ts";

export interface Pedido {
  archivo: File;
  preset: NombrePreset;
}

export type CodigoFalla = CodigoError | "memoria" | "inesperado";

export type Respuesta =
  | { tipo: "progreso"; progreso: Progreso }
  | { tipo: "listo"; resultado: Resultado }
  | { tipo: "error"; codigo: CodigoFalla; mensaje: string };

// mupdf busca su .wasm junto a su propio archivo; con Vite hay que decirle dónde quedó
globalThis.$libmupdf_wasm_Module = { locateFile: () => urlWasm };

const responder = (respuesta: Respuesta) => postMessage(respuesta);

/**
 * Lee el archivo por bloques de 1 MB con FileReaderSync, guardando los últimos en
 * memoria: MuPDF pide muchos pedazos chicos y a veces vuelve sobre los mismos.
 */
function fuenteDeArchivo(archivo: File): Fuente {
  const BLOQUE = 1 << 20;
  const MAX_BLOQUES = 32;
  const lector = new FileReaderSync();
  const bloques = new Map<number, Uint8Array>();
  const bloque = (indice: number): Uint8Array => {
    let datos = bloques.get(indice);
    if (datos) {
      bloques.delete(indice); // al final: el más recién usado
    } else {
      const desde = indice * BLOQUE;
      datos = new Uint8Array(lector.readAsArrayBuffer(archivo.slice(desde, Math.min(desde + BLOQUE, archivo.size))));
      if (bloques.size >= MAX_BLOQUES) bloques.delete(bloques.keys().next().value!);
    }
    bloques.set(indice, datos);
    return datos;
  };
  return {
    tamano: archivo.size,
    leer(destino, desde, largo, posicion) {
      let copiados = 0;
      while (copiados < largo && posicion + copiados < archivo.size) {
        const actual = posicion + copiados;
        const indice = Math.floor(actual / BLOQUE);
        const datos = bloque(indice);
        const dentro = actual - indice * BLOQUE;
        const n = Math.min(largo - copiados, datos.length - dentro);
        destino.set(datos.subarray(dentro, dentro + n), desde + copiados);
        copiados += n;
      }
      return copiados;
    },
  };
}

function clasificar(error: unknown): { codigo: CodigoFalla; mensaje: string } {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && "codigo" in error) return { codigo: error.codigo as CodigoError, mensaje };
  if (error instanceof RangeError || /memory|OOM|malloc|allocat/i.test(mensaje)) return { codigo: "memoria", mensaje };
  return { codigo: "inesperado", mensaje };
}

self.onmessage = async (evento: MessageEvent<Pedido>) => {
  const { archivo, preset } = evento.data;
  try {
    // se importa acá, después de decirle a mupdf dónde está su .wasm
    const { comprimir } = await import("./motor/comprimir.ts");
    const { PRESETS } = await import("./motor/presets.ts");
    let ultimoAviso = 0;
    const resultado = comprimir(fuenteDeArchivo(archivo), PRESETS[preset], (progreso) => {
      const ahora = performance.now();
      if (ahora - ultimoAviso > 80 || progreso.hecho === progreso.total) {
        ultimoAviso = ahora;
        responder({ tipo: "progreso", progreso });
      }
    });
    responder({ tipo: "listo", resultado }); // el Blob viaja por referencia, sin copiar los datos
  } catch (error) {
    responder({ tipo: "error", ...clasificar(error) });
  }
};
