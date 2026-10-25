# Verificación del compresor rediseñado

Fecha: 25/10/2026. Se comprimieron las 11 láminas de `S:\PDF\muestras` con los 3 modos, con el motor
original (`S:\PDF\web`, sin modificarlo) y con la copia de esta carpeta (`compresor/`), usando el mismo
CLI que usa la calibración (`node src/motor/cli.ts`). También se comparó contra las salidas guardadas de
la calibración (`S:\PDF\resultados\salidas\web_*`).

**Resultado: la compresión es la misma.** El rediseño solo tocó `index.html`, `src/estilos.css`,
`src/main.ts` (lo que se dibuja en pantalla) y `vite.config.ts` (cabecera y estilos del sitio).
`src/motor/` y `src/worker.ts` quedaron iguales al original.

- MuPDF escribe un `/ID` al azar en cada archivo que guarda, así que dos corridas del mismo motor nunca
  dan el mismo hash. Por eso la comparación es byte a byte, aceptando solo esa diferencia.
- En 2 de los 33 casos el tamaño varió entre 1 y 8 bytes. Comparando objeto por objeto (páginas,
  imágenes, contenido decodificado), los PDF son iguales: la diferencia está solo en el índice del final
  del archivo. El motor original hace lo mismo (en la muestra 10, modo sin pérdida, la salida guardada de la
  calibración ya difería en 1 byte de una corrida nueva).
- Además se probó en el navegador la muestra 1 (modo campus): 98,6 MB → 4,3 MB, el mismo tamaño exacto
  (4.514.402 bytes) que el CLI y que la salida guardada.

| Muestra | Modo | Original | Copia | Comparación |
|---|---|---|---|---|
| Muestra 1 (lámina A3, 103 MB) | campus | 4.3 MB | 4.3 MB | idéntico salvo el /ID |
| Muestra 1 (lámina A3, 103 MB) | plotear | 6.4 MB | 6.4 MB | idéntico salvo el /ID |
| Muestra 1 (lámina A3, 103 MB) | sinperdida | 61.6 MB | 61.6 MB | idéntico |
| Muestra 2 (bitácora de morfología, 475 MB) | campus | 11.6 MB | 11.6 MB | idéntico salvo el /ID |
| Muestra 2 (bitácora de morfología, 475 MB) | plotear | 44.1 MB | 44.1 MB | idéntico salvo el /ID |
| Muestra 2 (bitácora de morfología, 475 MB) | sinperdida | 238.4 MB | 238.4 MB | idéntico salvo el /ID |
| Muestra 3 (esquicio exportado de Canva, 123 MB) | campus | 11.8 MB | 11.8 MB | idéntico salvo el /ID |
| Muestra 3 (esquicio exportado de Canva, 123 MB) | plotear | 19.5 MB | 19.5 MB | idéntico salvo el /ID |
| Muestra 3 (esquicio exportado de Canva, 123 MB) | sinperdida | 56.8 MB | 56.8 MB | idéntico salvo el /ID |
| Muestra 4 (lámina de análisis, 125 MB) | campus | 6.4 MB | 6.4 MB | idéntico salvo el /ID |
| Muestra 4 (lámina de análisis, 125 MB) | plotear | 11.7 MB | 11.7 MB | idéntico salvo el /ID |
| Muestra 4 (lámina de análisis, 125 MB) | sinperdida | 80.4 MB | 80.4 MB | idéntico |
| Muestra 5 (informe, 202 MB) | campus | 3.8 MB | 3.8 MB | equivalente (objetos iguales; 1-8 bytes en el índice) |
| Muestra 5 (informe, 202 MB) | plotear | 21.9 MB | 21.9 MB | idéntico salvo el /ID |
| Muestra 5 (informe, 202 MB) | sinperdida | 88.2 MB | 88.2 MB | idéntico |
| Muestra 6 (lámina, 138 MB) | campus | 12.7 MB | 12.7 MB | idéntico salvo el /ID |
| Muestra 6 (lámina, 138 MB) | plotear | 40.7 MB | 40.7 MB | idéntico salvo el /ID |
| Muestra 6 (lámina, 138 MB) | sinperdida | 131.4 MB | 131.4 MB | idéntico |
| Muestra 7 (manual de marca de ReFADU, 194 MB) | campus | 4.2 MB | 4.2 MB | idéntico salvo el /ID |
| Muestra 7 (manual de marca de ReFADU, 194 MB) | plotear | 17.5 MB | 17.5 MB | idéntico salvo el /ID |
| Muestra 7 (manual de marca de ReFADU, 194 MB) | sinperdida | 21.1 MB | 21.1 MB | idéntico |
| Muestra 8 (lámina de 955 MB) | campus | 12.7 MB | 12.7 MB | idéntico salvo el /ID |
| Muestra 8 (lámina de 955 MB) | plotear | 144.1 MB | 144.1 MB | idéntico salvo el /ID |
| Muestra 8 (lámina de 955 MB) | sinperdida | 488.9 MB | 488.9 MB | idéntico salvo el /ID |
| Muestra 9 (imágenes incrustadas, 195 MB) | campus | 1.2 MB | 1.2 MB | idéntico salvo el /ID |
| Muestra 9 (imágenes incrustadas, 195 MB) | plotear | 9.9 MB | 9.9 MB | idéntico salvo el /ID |
| Muestra 9 (imágenes incrustadas, 195 MB) | sinperdida | 43.8 MB | 43.8 MB | idéntico |
| Muestra 10 (lámina, 122 MB) | campus | 6.7 MB | 6.7 MB | idéntico salvo el /ID |
| Muestra 10 (lámina, 122 MB) | plotear | 12.2 MB | 12.2 MB | idéntico salvo el /ID |
| Muestra 10 (lámina, 122 MB) | sinperdida | 79.9 MB | 79.9 MB | idéntico salvo el /ID |
| Muestra 11 (presentación, 109 MB) | campus | 11.4 MB | 11.4 MB | idéntico salvo el /ID |
| Muestra 11 (presentación, 109 MB) | plotear | 15.4 MB | 15.4 MB | equivalente (objetos iguales; 1-8 bytes en el índice) |
| Muestra 11 (presentación, 109 MB) | sinperdida | 39.6 MB | 39.6 MB | idéntico salvo el /ID |

"Idéntico" quiere decir que los dos archivos coinciden byte a byte, incluido el `/ID` (pasa en algunos casos del modo sin pérdida).
