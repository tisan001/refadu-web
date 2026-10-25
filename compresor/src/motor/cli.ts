// Comprime un PDF desde la línea de comandos con el mismo motor que usa la web.
// Lo usa calibracion/calibrar.py para medir el motor de la web contra la fase 0.
//
// Uso: node src/motor/cli.ts entrada.pdf salida.pdf campus|plotear|sinperdida
import fs from "node:fs";
import { comprimir, ErrorCompresion } from "./comprimir.ts";
import { PRESETS, type NombrePreset } from "./presets.ts";

const [entrada, salida, nombre] = process.argv.slice(2);
if (!entrada || !salida || !(nombre in PRESETS)) {
  console.error("Uso: node src/motor/cli.ts entrada.pdf salida.pdf campus|plotear|sinperdida");
  process.exit(2);
}

const fd = fs.openSync(entrada, "r");
const inicio = performance.now();
try {
  const resultado = comprimir(
    {
      tamano: fs.fstatSync(fd).size,
      leer: (destino, desde, largo, posicion) => fs.readSync(fd, destino, desde, largo, posicion),
    },
    PRESETS[nombre as NombrePreset],
  );
  if (resultado.datos) fs.writeFileSync(salida, new Uint8Array(await resultado.datos.arrayBuffer()));
  else fs.copyFileSync(entrada, salida); // principio 4: el original
  console.log(
    JSON.stringify({
      ...resultado,
      datos: undefined,
      devuelveOriginal: resultado.datos === null,
      segundos: +((performance.now() - inicio) / 1000).toFixed(2),
      memoriaPicoMB: Math.round(process.resourceUsage().maxRSS / 1024),
    }),
  );
} catch (e) {
  const codigo = e instanceof ErrorCompresion ? e.codigo : "inesperado";
  console.error(JSON.stringify({ error: codigo, mensaje: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
} finally {
  fs.closeSync(fd);
}
