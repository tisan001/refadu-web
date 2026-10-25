// Editor de contenido en tu compu: levanta el sitio (http://localhost:8080) y el servidor
// local de Decap CMS, que guarda los cambios directo en content/ (sin GitHub ni login).
// Abrí http://localhost:8080/admin/ y elegí "Trabajar con el repositorio local".
//
// Uso: npm run editor
import { spawn } from "node:child_process";
import { RAIZ } from "./paginas.mjs";

const decap = spawn("npx", ["--yes", "decap-server@3.11.3"], { cwd: RAIZ, stdio: "inherit", shell: true });
decap.on("exit", (codigo) => process.exit(codigo ?? 0));
process.on("SIGINT", () => decap.kill());

await import("./servir.mjs");
console.log("Editor en http://localhost:8080/admin/");
