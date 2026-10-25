# Cómo editar las correlativas

Hay un archivo por carrera. Los datos salen de los **cuadros de correlatividades oficiales de FADU**
(`material/correlativas/`). Si FADU cambia un cuadro, cambiá el archivo de esa carrera y nada más.

## Estructura

Cada archivo tiene **bloques** (CBC, Primer año, Segundo año…, con la numeración de los afiches de ReFADU:
"Primer año" es el primero después del CBC). Cada bloque tiene **materias**:

```json
{
  "codigo": "A2",
  "nombre": "Arquitectura II",
  "anual": true,
  "promocion": true,
  "finalesParaCursar": ["A1", "SRG"],
  "cursadasParaCursar": ["ITC"],
  "finalesParaRendir": []
}
```

- `anual`: `true` si es anual (fila violeta en el afiche); si no, es cuatrimestral (fila naranja).
- `promocion`: `true` si es de promoción directa (no tiene examen final).
- `optativa`: `true` si no es obligatoria (no cuenta para el avance ni para "todas las obligatorias").
- `finalesParaCursar`: finales que necesitás aprobados para **cursar**.
- `cursadasParaCursar`: materias que necesitás **cursadas** (TP aprobados) para **cursar**.
- `finalesParaRendir`: finales que necesitás aprobados para **rendir el final** (o, si es de promoción, para promocionarla).
- `nota`: texto corto opcional que se muestra en la materia.

Lo que va dentro de las listas puede ser:

| Escribís | Significa |
|---|---|
| `"A1"` | la materia con ese código |
| `"M2\|TIP2"` | una u otra (alcanza con cualquiera) |
| `"CBC"` | todo el CBC aprobado |
| `"año:1"` | todo el Primer año (en `finalesParaCursar`: con finales; en `cursadasParaCursar`: con TP) |
| `"obligatorias"` | todas las materias obligatorias de la carrera |

## Electivas y optativas

Ojo: **electivas y optativas no son lo mismo** (en Imagen y Sonido, por ejemplo, se cuentan por separado),
y no todas las carreras tienen las dos (Arquitectura tiene optativas, pero no electivas).

Un grupo de materias va adentro de un bloque, de una de estas dos formas:

**Por cantidad** ("elegís una de estas"):

```json
{ "grupo": "Electiva socio-humanística", "elegir": 1, "nota": "…", "materias": [ … ] }
```

**Por horas** (una cuatrimestral vale 60 hs y una anual 120 hs; si alguna vale otra cosa, ponele `"horas": 90`):

```json
{
  "grupo": "Materias no obligatorias",
  "horas": 480,
  "maximoHorasOptativas": 120,
  "minimoHorasSocioHumanisticas": 60,
  "materias": [ … ]
}
```

- Las materias del grupo con `"optativa": true` cuentan hasta `maximoHorasOptativas`.
- Las que tienen `"socioHumanistica": true` cuentan para `minimoHorasSocioHumanisticas`.
- Cuando las optativas son demasiadas para listarlas, se pone un casillero por cada una que se puede
  hacer ("Optativa 1", "Optativa 2"…), con las correlativas que piden todas.

(Fuera de un grupo, `"optativa": true` hace que la materia no cuente para el avance.)

## Antes de publicar

Corré `npm run verificar`: revisa que cada código que aparece en una lista exista en la carrera.
