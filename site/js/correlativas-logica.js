// Lógica del simulador de correlativas: qué se puede cursar y qué se puede rendir.
// Es la del simulador original, ampliada para representar los cuadros oficiales:
// requisitos con "o" (A|B), año completo también para rendir, promoción directa,
// el CBC como bloque y grupos de electivas u optativas, por cantidad ("elegir") o por horas.
// No toca la página: se puede probar con Node.
//
// Estados de cada materia: 0 pendiente, 1 cursando, 2 cursada (TP aprobados), 3 aprobada (final o promoción).

(function (raiz) {
  const PENDIENTE = 0;
  const CURSANDO = 1;
  const CURSADA = 2;
  const APROBADA = 3;

  /** Prepara los datos de una carrera (content/correlativas/<id>.json). */
  function preparar(datos) {
    const materias = new Map();
    const bloques = datos.bloques.map((b) => {
      const grupos = [];
      const sueltas = [];
      for (const item of b.materias) {
        if (item.grupo) {
          // cada materia de un grupo vale 60 hs si es cuatrimestral y 120 si es anual, salvo que diga otra cosa
          const conHoras = (m) => ({ ...m, bloque: b.id, grupo: item.grupo, horas: m.horas ?? (m.anual ? 120 : 60) });
          const grupo = { ...item, bloque: b.id, materias: item.materias.map(conHoras) };
          grupo.materias.forEach((m) => materias.set(m.codigo, m));
          grupos.push(grupo);
        } else {
          const m = { ...item, bloque: b.id };
          materias.set(m.codigo, m);
          sueltas.push(m);
        }
      }
      return { ...b, sueltas, grupos };
    });
    return { ...datos, bloques, materias };
  }

  function crear(carrera, estados) {
    const est = (codigo) => estados[codigo] || PENDIENTE;
    const minimo = (tipo) => (tipo === "final" ? APROBADA : CURSADA);

    /**
     * Horas que suma un grupo "por horas" con las materias que cumplen:
     * las optativas cuentan hasta el tope del grupo, y aparte se suman las socio-humanísticas.
     */
    function horasGrupo(g, tipo = "final") {
      const cumplen = g.materias.filter((m) => est(m.codigo) >= minimo(tipo));
      const suma = (ms) => ms.reduce((t, m) => t + m.horas, 0);
      const optativas = Math.min(suma(cumplen.filter((m) => m.optativa)), g.maximoHorasOptativas ?? Infinity);
      const total = suma(cumplen.filter((m) => !m.optativa)) + optativas;
      return { total, optativas, socioHumanisticas: suma(cumplen.filter((m) => m.socioHumanistica)) };
    }

    // Un grupo está completo cuando tiene "elegir" materias que cumplen, o cuando llega a sus horas.
    function grupoCompleto(g, tipo) {
      if (!g.horas) return g.materias.filter((m) => est(m.codigo) >= minimo(tipo)).length >= g.elegir;
      const h = horasGrupo(g, tipo);
      return h.total >= g.horas && h.socioHumanisticas >= (g.minimoHorasSocioHumanisticas ?? 0);
    }

    function bloqueCompleto(id, tipo) {
      const b = carrera.bloques.find((x) => x.id === id);
      if (!b) return true;
      return b.sueltas.every((m) => m.optativa || est(m.codigo) >= minimo(tipo)) && b.grupos.every((g) => grupoCompleto(g, tipo));
    }

    function obligatoriasCompletas(propia) {
      return carrera.bloques.every(
        (b) => b.sueltas.every((m) => m.optativa || m.codigo === propia || est(m.codigo) >= APROBADA) && b.grupos.every((g) => grupoCompleto(g, "final")),
      );
    }

    /** ¿Se cumple un requisito? tipo: "final" o "cursada". */
    function cumple(req, tipo, propia) {
      if (req === "CBC") return bloqueCompleto("cbc", "final");
      if (req === "obligatorias") return obligatoriasCompletas(propia);
      if (req.startsWith("año:")) return bloqueCompleto(req.slice(4), tipo);
      return req.split("|").some((codigo) => est(codigo) >= minimo(tipo));
    }

    const lista = (m, campo, tipo) => (m[campo] ?? []).map((req) => ({ req, tipo, ok: cumple(req, tipo, m.codigo) }));

    /** Requisitos para cursar, cada uno con ok: true/false. */
    function paraCursar(m) {
      return [...lista(m, "finalesParaCursar", "final"), ...lista(m, "cursadasParaCursar", "cursada")];
    }
    /** Requisitos para rendir el final (o para promocionar). */
    function paraRendir(m) {
      return lista(m, "finalesParaRendir", "final");
    }

    const puedeCursar = (m) => paraCursar(m).every((r) => r.ok);
    const puedeRendir = (m) => paraRendir(m).every((r) => r.ok);

    /** bloqueada, disponible, cursando, cursada o aprobada */
    function situacion(m) {
      const e = est(m.codigo);
      if (e === APROBADA) return "aprobada";
      if (e === CURSADA) return "cursada";
      if (e === CURSANDO) return "cursando";
      return puedeCursar(m) ? "disponible" : "bloqueada";
    }

    /** Los estados por los que pasa una materia al tocar el casillero. */
    function ciclo(m) {
      return m.promocion ? [PENDIENTE, CURSANDO, APROBADA] : [PENDIENTE, CURSANDO, CURSADA, APROBADA];
    }
    function siguiente(m) {
      const c = ciclo(m);
      const i = c.indexOf(est(m.codigo));
      return c[(i + 1) % c.length];
    }
    /** Como en el original: sin las correlativas, no se puede marcar como cursando, cursada ni aprobada. */
    const sePuedeMarcar = (m) => est(m.codigo) > PENDIENTE || puedeCursar(m);

    function avance() {
      let total = 0;
      let aprobadas = 0;
      const cuentas = { aprobada: 0, cursada: 0, cursando: 0, disponible: 0, bloqueada: 0 };
      for (const b of carrera.bloques) {
        for (const m of b.sueltas) {
          cuentas[situacion(m)]++;
          if (m.optativa) continue;
          total++;
          if (est(m.codigo) === APROBADA) aprobadas++;
        }
        for (const g of b.grupos) {
          g.materias.forEach((m) => cuentas[situacion(m)]++);
          if (g.horas) {
            // los grupos por horas cuentan en materias de 60 hs
            total += g.horas / 60;
            aprobadas += Math.floor(Math.min(g.horas, horasGrupo(g).total) / 60);
          } else {
            total += g.elegir;
            aprobadas += Math.min(g.elegir, g.materias.filter((m) => est(m.codigo) === APROBADA).length);
          }
        }
      }
      return { total, aprobadas, porcentaje: total ? Math.round((100 * aprobadas) / total) : 0, cuentas };
    }

    return { est, cumple, paraCursar, paraRendir, puedeCursar, puedeRendir, situacion, ciclo, siguiente, sePuedeMarcar, avance, horasGrupo, grupoCompleto };
  }

  /** Texto de un requisito para mostrar ("final de A1", "todo Primer año con TP"…). */
  function describir(carrera, req, tipo) {
    if (req === "CBC") return "CBC completo";
    if (req === "obligatorias") return "todas las obligatorias aprobadas";
    if (req.startsWith("año:")) {
      const b = carrera.bloques.find((x) => x.id === req.slice(4));
      return `todo ${b ? b.titulo : req.slice(4)} ${tipo === "final" ? "con finales" : "con TP"}`;
    }
    const partes = req.split("|");
    const nombres = partes.join(" o ");
    if (tipo !== "final") return `cursada de ${nombres}`;
    // las de promoción directa no tienen final: se piden aprobadas
    return partes.every((c) => carrera.materias.get(c)?.promocion) ? `${nombres} aprobada` : `final de ${nombres}`;
  }

  /** Versión corta, para las celdas del layout del afiche. */
  function corto(carrera, req) {
    if (req === "CBC") return "CBC";
    if (req === "obligatorias") return "Todas las obligatorias";
    if (req.startsWith("año:")) {
      const id = req.slice(4);
      return /^\d+$/.test(id) ? `Todo ${id}º año` : `Todo ${carrera.bloques.find((x) => x.id === id)?.titulo ?? id}`;
    }
    return req.split("|").join(" ó ");
  }

  const api = { preparar, crear, describir, corto, PENDIENTE, CURSANDO, CURSADA, APROBADA };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.CorrelativasLogica = api;
})(typeof window !== "undefined" ? window : globalThis);
