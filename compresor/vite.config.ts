import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
// @ts-expect-error: módulo JS del sitio, sin tipos
import { armarPagina, MONTAJES } from "../scripts/paginas.mjs";

/**
 * Integra el compresor al sitio de ReFADU sin tocar la compresión:
 * - le pone la cabecera y el pie del sitio y la hoja de estilos compartida
 *   (después de que Vite procesa el HTML, así esas rutas quedan tal cual);
 * - en desarrollo sirve /css, /js, /assets y /content desde el resto del proyecto.
 */
function sitioReFADU(): Plugin {
  return {
    name: "sitio-refadu",
    transformIndexHtml: {
      order: "post",
      // la hoja del sitio va primero, así los estilos propios del compresor la pueden ajustar
      handler: (html) => armarPagina(html).replace('<meta charset="utf-8" />', '$&\n    <link rel="stylesheet" href="/css/refadu.css" />'),
    },
    configureServer(server) {
      server.middlewares.use((pedido, respuesta, siguiente) => {
        const ruta = decodeURIComponent((pedido.url ?? "").split("?")[0]);
        if (!/^\/(css|js|assets|content)\//.test(ruta)) return siguiente();
        for (const [prefijo, carpeta] of MONTAJES as [string, string][]) {
          if (!ruta.startsWith(prefijo) || prefijo === "/compresor/") continue;
          const archivo = path.join(carpeta, ruta.slice(prefijo.length));
          if (fs.existsSync(archivo) && fs.statSync(archivo).isFile()) {
            const tipos: Record<string, string> = { ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".ttf": "font/ttf", ".json": "application/json" };
            respuesta.setHeader("content-type", tipos[path.extname(archivo)] ?? "application/octet-stream");
            return fs.createReadStream(archivo).pipe(respuesta);
          }
        }
        siguiente();
      });
    },
  };
}

export default defineConfig({
  // rutas relativas: la web funciona igual en la raíz de un dominio o en una subcarpeta (/compresor/)
  base: "./",
  build: { target: "es2022" }, // mupdf usa top-level await
  worker: { format: "es" },
  optimizeDeps: { exclude: ["mupdf"] }, // que Vite no lo reempaquete: carga su .wasm aparte
  // en desarrollo, poder cargar las láminas de ../muestras para probar (solo el servidor local)
  server: { fs: { allow: [".."] } },
  plugins: [sitioReFADU()],
});
