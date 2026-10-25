// Servidor local para ver el sitio mientras se edita: sirve site/, content/ y assets/
// tal como quedan publicados, sin build. El compresor se sirve desde compresor/dist
// (correr antes `npm run build` una vez, o `npm run dev --prefix compresor` para editarlo).
//
// Uso: npm run dev   →   http://localhost:8080
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { MONTAJES, armarPagina } from "./paginas.mjs";

const PUERTO = Number(process.env.PORT) || 8080;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".ico": "image/x-icon",
};

function resolver(url) {
  const ruta = decodeURIComponent(new URL(url, "http://x").pathname);
  for (const [prefijo, carpeta] of MONTAJES) {
    if (!ruta.startsWith(prefijo)) continue;
    let archivo = path.join(carpeta, ruta.slice(prefijo.length));
    if (!archivo.startsWith(carpeta)) return null; // nada de ../
    if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, "index.html");
    if (!fs.existsSync(archivo) && !path.extname(archivo)) archivo += ".html";
    return fs.existsSync(archivo) ? archivo : null;
  }
  return null;
}

http
  .createServer((pedido, respuesta) => {
    const archivo = resolver(pedido.url);
    if (!archivo) {
      // como en Cloudflare Pages y Netlify: la página 404 propia
      respuesta.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      return respuesta.end(armarPagina(fs.readFileSync(path.join(MONTAJES.at(-1)[1], "404.html"), "utf8")));
    }
    const tipo = TIPOS[path.extname(archivo).toLowerCase()] ?? "application/octet-stream";
    respuesta.writeHead(200, { "content-type": tipo, "cache-control": "no-store" });
    if (tipo.startsWith("text/html") && !archivo.includes(`${path.sep}compresor${path.sep}`)) {
      respuesta.end(armarPagina(fs.readFileSync(archivo, "utf8")));
    } else {
      fs.createReadStream(archivo).pipe(respuesta);
    }
  })
  .listen(PUERTO, () => console.log(`ReFADU en http://localhost:${PUERTO}`));
