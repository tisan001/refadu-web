// Presets calibrados en la fase 0 (ver calibracion/RESULTADOS.md).
// Antes de cambiar un valor, medir contra el anterior con calibracion/calibrar.py.

export type NombrePreset = "campus" | "plotear" | "sinperdida";

export interface AjustesImagenes {
  /** Resolución a la que se reducen las imágenes, calculada sobre el tamaño colocado en la hoja. */
  dpi: number;
  /** Solo se reducen las que superan dpi × umbral. */
  umbral: number;
  /** Calidad JPEG (escala IJG, 1-100). */
  calidad: number;
  /** Recomprimir también los JPEG que no hace falta reducir (si quedan más livianos). */
  recomprimirJpeg: boolean;
}

export interface Preset {
  nombre: NombrePreset;
  titulo: string;
  descripcion: string;
  /** null: no se tocan las imágenes (solo limpieza estructural). */
  imagenes: AjustesImagenes | null;
}

export const PRESETS: Record<NombrePreset, Preset> = {
  campus: {
    nombre: "campus",
    titulo: "Para subir al campus o mandar por mail",
    descripcion: "Lo más liviano posible sin que se note en pantalla.",
    imagenes: { dpi: 150, umbral: 1.1, calidad: 80, recomprimirJpeg: true },
  },
  plotear: {
    nombre: "plotear",
    titulo: "Para plotear",
    descripcion: "Calidad de impresión: solo achica lo que sobra.",
    imagenes: { dpi: 300, umbral: 1.5, calidad: 92, recomprimirJpeg: false },
  },
  sinperdida: {
    nombre: "sinperdida",
    titulo: "Sin pérdida",
    descripcion: "No toca las imágenes: solo saca lo que sobra por dentro.",
    imagenes: null,
  },
};
