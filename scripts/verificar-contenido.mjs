// Revisa content/ antes de publicar: que cada JSON se pueda leer y que las correlativas
// apunten a materias que existen. El build no sigue si hay errores.
//
// Uso: npm run verificar
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RAIZ } from "./paginas.mjs";

const CONTENIDO = path.join(RAIZ, "content");
const LISTAS = ["finalesParaCursar", "cursadasParaCursar", "finalesParaRendir"];

function leer(archivo, errores) {
  try {
    return JSON.parse(fs.readFileSync(archivo, "utf8"));
  } catch (e) {
    errores.push(`${path.relative(RAIZ, archivo)}: no es un JSON válido (${e.message}). Revisá comas y comillas.`);
    return null;
  }
}

function materiasDe(bloque) {
  return bloque.materias.flatMap((m) => (m.grupo ? m.materias : [m]));
}

function verificarCorrelativas(archivo, datos, errores) {
  const donde = path.relative(RAIZ, archivo);
  const codigos = new Set();
  const bloques = new Set(datos.bloques.map((b) => b.id));
  for (const bloque of datos.bloques) {
    for (const m of materiasDe(bloque)) {
      if (!m.codigo || !m.nombre) errores.push(`${donde}: hay una materia sin "codigo" o sin "nombre" en ${bloque.titulo}.`);
      if (codigos.has(m.codigo)) errores.push(`${donde}: el código ${m.codigo} está repetido.`);
      codigos.add(m.codigo);
    }
    for (const g of bloque.materias.filter((m) => m.grupo)) {
      if (g.horas) {
        // con todas sus materias (y las optativas hasta el tope) tiene que poder llegar a las horas
        const horas = (m) => m.horas ?? (m.anual ? 120 : 60);
        const optativas = Math.min(g.materias.filter((m) => m.optativa).reduce((t, m) => t + horas(m), 0), g.maximoHorasOptativas ?? Infinity);
        const posibles = g.materias.filter((m) => !m.optativa).reduce((t, m) => t + horas(m), 0) + optativas;
        if (posibles < g.horas) errores.push(`${donde}: el grupo "${g.grupo}" pide ${g.horas} hs pero sus materias suman ${posibles} hs.`);
      } else if (!(g.elegir > 0) || g.elegir > g.materias.length) {
        errores.push(`${donde}: el grupo "${g.grupo}" necesita "elegir" (cuántas materias) o "horas", y que cierre con sus materias.`);
      }
    }
  }
  for (const bloque of datos.bloques) {
    for (const m of materiasDe(bloque)) {
      for (const lista of LISTAS) {
        for (const req of m[lista] ?? []) {
          if (req === "CBC" || req === "obligatorias") continue;
          if (req.startsWith("año:")) {
            if (!bloques.has(req.slice(4))) errores.push(`${donde}: ${m.codigo} pide "${req}", pero no hay un bloque con id "${req.slice(4)}".`);
            continue;
          }
          for (const alternativa of req.split("|")) {
            if (!codigos.has(alternativa)) errores.push(`${donde}: ${m.codigo} pide "${alternativa}" en ${lista}, y esa materia no existe en la carrera.`);
            if (alternativa === m.codigo) errores.push(`${donde}: ${m.codigo} se pide a sí misma.`);
          }
        }
      }
    }
  }
}

export function verificar() {
  const errores = [];
  const archivos = [
    ...fs.readdirSync(CONTENIDO).filter((f) => f.endsWith(".json")).map((f) => path.join(CONTENIDO, f)),
    ...fs.readdirSync(path.join(CONTENIDO, "correlativas")).filter((f) => f.endsWith(".json")).map((f) => path.join(CONTENIDO, "correlativas", f)),
  ];
  const carreras = new Set((leer(path.join(CONTENIDO, "carreras.json"), errores)?.carreras ?? []).map((c) => c.id));
  for (const archivo of archivos) {
    const datos = leer(archivo, errores);
    if (!datos) continue;
    // fechas: AAAA-MM-DD, y si dura varios días, el último no puede ser antes del primero
    const conFechas = { "actividades.json": ["actividades", "titulo"], "calendario.json": ["fechasClave", "texto"] }[path.basename(archivo)];
    if (conFechas) {
      const [lista, nombre] = conFechas;
      const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");
      for (const item of datos[lista] ?? []) {
        const donde = `content/${path.basename(archivo)}: "${item[nombre]}"`;
        if (!esFecha(item.fecha)) errores.push(`${donde} no tiene una fecha válida (va como AAAA-MM-DD).`);
        if (item.fechaFin && !esFecha(item.fechaFin)) errores.push(`${donde} tiene una fecha de fin que no es válida (va como AAAA-MM-DD).`);
        else if (item.fechaFin && item.fechaFin < item.fecha) errores.push(`${donde} termina (${item.fechaFin}) antes de empezar (${item.fecha}).`);
      }
    }
    if (path.basename(archivo) === "grupos.json") {
      for (const g of datos.grupos ?? []) {
        const donde = `content/grupos.json: el grupo "${g.nombre}"`;
        if (!["carrera", "cbc", "año", "materia"].includes(g.tipo)) errores.push(`${donde} tiene un tipo que no existe ("${g.tipo}").`);
        if (g.tipo === "cbc" && !Number.isInteger(g.anio)) errores.push(`${donde} es de CBC y no dice de qué año es (falta "anio", por ejemplo 2026).`);
        if (["carrera", "año", "materia"].includes(g.tipo) && !carreras.has(g.carrera)) errores.push(`${donde} no tiene una carrera válida ("${g.carrera ?? ""}").`);
        if (g.tipo === "materia" && !String(g.materia ?? "").trim()) errores.push(`${donde} es por materia y no dice qué materia es (falta "materia").`);
        if (g.tipo === "año" && !(Number(g.anioCursada) >= 1 && Number(g.anioCursada) <= 6)) errores.push(`${donde} es por año y no dice de qué año de la carrera es (falta "anioCursada", de 1 a 6).`);
        if (!/^https:\/\/chat\.whatsapp\.com\//.test(g.link ?? "")) errores.push(`${donde} no tiene un link de WhatsApp.`);
      }
    }
    if (archivo.includes(`${path.sep}correlativas${path.sep}`)) {
      if (!carreras.has(datos.carrera)) errores.push(`${path.relative(RAIZ, archivo)}: la carrera "${datos.carrera}" no está en carreras.json.`);
      verificarCorrelativas(archivo, datos, errores);
    }
  }
  for (const id of carreras) {
    if (!fs.existsSync(path.join(CONTENIDO, "correlativas", `${id}.json`))) errores.push(`Falta content/correlativas/${id}.json.`);
  }
  return { errores, archivos: archivos.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errores, archivos } = verificar();
  if (errores.length) {
    console.error(`Hay ${errores.length} problema(s) en content/:\n- ${errores.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`content/ está bien (${archivos} archivos revisados).`);
}
