// Lo que comparten el servidor de desarrollo, el build y el compresor:
// qué carpeta del proyecto se publica en qué ruta, y cómo se arman las páginas
// con la cabecera y el pie de site/parciales/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Ruta publicada → carpeta del proyecto. El orden importa: la primera que coincide gana. */
export const MONTAJES = [
  ["/content/", path.join(RAIZ, "content")],
  ["/assets/", path.join(RAIZ, "assets")],
  ["/compresor/", path.join(RAIZ, "compresor", "dist")],
  ["/", path.join(RAIZ, "site")],
];

function parcial(nombre) {
  return fs.readFileSync(path.join(RAIZ, "site", "parciales", `${nombre}.html`), "utf8");
}

/**
 * Reemplaza <!--#cabecera--> y <!--#pie--> por los parciales y marca en el menú
 * la página actual (la que dice <body data-pagina="...">).
 */
export function armarPagina(html) {
  const pagina = html.match(/<body[^>]*data-pagina="([^"]+)"/)?.[1];
  let cabecera = parcial("cabecera");
  if (pagina) cabecera = cabecera.replaceAll(`data-pagina="${pagina}"`, `data-pagina="${pagina}" aria-current="page"`);
  return html.replace("<!--#cabecera-->", cabecera).replace("<!--#pie-->", parcial("pie"));
}
