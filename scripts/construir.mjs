// Arma dist/, la carpeta que se publica (Cloudflare Pages o Netlify):
// 1. revisa content/ (si hay errores, no publica nada);
// 2. compila el compresor (compresor/ → compresor/dist);
// 3. copia site/ (con cabecera y pie), content/, assets/ y el compresor.
//
// Uso: npm run build
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { RAIZ, MONTAJES, armarPagina } from "./paginas.mjs";
import { verificar } from "./verificar-contenido.mjs";

const DIST = path.join(RAIZ, "dist");
const COMPRESOR = path.join(RAIZ, "compresor");

const { errores } = verificar();
if (errores.length) {
  console.error(`No se publica: hay ${errores.length} problema(s) en content/:\n- ${errores.join("\n- ")}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(COMPRESOR, "node_modules"))) {
  execSync("npm ci", { cwd: COMPRESOR, stdio: "inherit" });
}
execSync("npm run build", { cwd: COMPRESOR, stdio: "inherit" });

fs.rmSync(DIST, { recursive: true, force: true });
for (const [prefijo, carpeta] of [...MONTAJES].reverse()) {
  const destino = path.join(DIST, prefijo);
  fs.cpSync(carpeta, destino, {
    recursive: true,
    filter: (origen) => !origen.includes(`${path.sep}parciales`) && !origen.endsWith("LEEME.md"),
  });
}
// cabecera y pie en las páginas del sitio (el compresor ya los trae de su build)
for (const archivo of fs.readdirSync(DIST)) {
  if (!archivo.endsWith(".html")) continue;
  const ruta = path.join(DIST, archivo);
  fs.writeFileSync(ruta, armarPagina(fs.readFileSync(ruta, "utf8")));
}

fs.writeFileSync(
  path.join(DIST, "_headers"),
  `/assets/*
  Cache-Control: public, max-age=604800
/compresor/assets/*
  Cache-Control: public, max-age=31536000, immutable
/content/*
  Cache-Control: no-cache
`,
);

const peso = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((t, e) => t + (e.isDirectory() ? peso(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`\nListo: dist/ pesa ${(peso(DIST) / 2 ** 20).toFixed(1)} MB. Subí esa carpeta (o dejá que Cloudflare Pages corra "npm run build").`);
