# ReFADU · Sitio web

Sitio de ReFADU, agrupación estudiantil de FADU-UBA. Esta carpeta (`S:\REFADU WEB`) es la raíz del proyecto.

## Qué es
Un sitio para estudiantes de FADU y del CBC. Las 7 carreras son: Arquitectura, Diseño Gráfico, Diseño Industrial, Diseño de Indumentaria, Diseño Textil, Diseño de Imagen y Sonido y Lic. en Planificación y Diseño del Paisaje.

## Material de partida
Todo lo que necesitás está suelto en `material/`. **No tiene orden ni nombres claros: descubrí vos qué es cada archivo** (abrilo, leelo, miralo) y armá antes de empezar una tabla "archivo → qué es → para qué lo uso". Esperá que la confirme.

Lo que debería haber ahí, aunque puede faltar algo o venir con otro nombre:
- Manual de marca (PDF) y logos.
- Fuentes (Climate Crisis, DIN Condensed Bold y Light, Lemon).
- Los planes de estudio / cuadros de correlatividades de cada carrera (PDF).
- El simulador de correlativas actual (un HTML suelto).
- Otros archivos de apoyo.

Además, el compresor de PDF existe en `S:\PDF`. **No modifiques `S:\PDF`.** Trabajá siempre sobre una copia dentro de este proyecto.
- `web/`: la web del compresor.
- `calibracion/`, `muestras/`, `resultados/`: material de prueba y pruebas anteriores. Usalos para verificar que el compresor sigue funcionando después de rediseñarlo.
- `.claude/`: configuración del proyecto anterior. Leela, puede traer decisiones útiles.

## Pestañas
1. **Grupos de WhatsApp**
   - Grupos **generales por carrera** (uno por cada una de las 7 carreras).
   - Grupo(s) **de CBC**.
   - Grupos por año o por materia, si existen.
   - Cada grupo tiene nombre, descripción corta, tipo (`carrera`, `cbc`, `año`, `materia`) y link. Los links los cargo yo después en `content/grupos.json`: dejá datos de ejemplo claramente falsos.
2. **Recomendaciones**: un formulario y una carpeta de Drive por carrera, más los PDF de cada cuatrimestre. Datos en `content/recomendaciones.json`.
3. **Actividades**: tarjetas con fecha, lugar y link de inscripción.
4. **Calendario académico**: Google Calendar embebido, para que se actualice solo.
5. **Becas**: tarjetas con requisitos, fecha límite y link.
6. **Banco de apuntes**: links a Drive por carrera y materia, más un link a un formulario para subir material.
7. **Simulador de correlativas**: ver sección más abajo. Es el que está en `material/`, rediseñado.
8. **Compresor de PDF**: la web de `S:\PDF\web`, rediseñada. Ver sección más abajo.

## Reglas de trabajo
- Antes de escribir código: leé `material/` y esta guía, y mostrame un plan corto (páginas, diseño, cómo integrás el simulador y el compresor). Esperá mi OK.
- Sitio estático (HTML, CSS y JS simples, sin frameworks pesados), que se pueda alojar gratis en Cloudflare Pages o Netlify.
- Todo el contenido editable vive en archivos `content/*.json`. Un compañero tiene que poder cambiar un link o una fecha sin tocar código.
- Mobile first: la mayoría entra desde el celular.
- Español rioplatense, tono cercano, sin lenguaje institucional. Tuteo con "vos".
- Accesible: contraste suficiente, texto legible, navegación con teclado.
- Nada de datos personales de estudiantes en el repositorio.
- Una sola identidad visual en todo el sitio: el simulador y el compresor no pueden parecer herramientas pegadas de otro lado.

## Simulador de correlativas
El archivo del simulador actual está en `material/`. Es un HTML único con la lógica (qué materia se puede cursar o rendir según lo aprobado) y los datos de las 7 carreras. Hay que **incorporarlo al sitio y rediseñarlo** con la identidad de ReFADU.

- **Conservá** la lógica: estados de cada materia (pendiente, cursando, cursada, final), cálculo de qué se puede cursar y qué se puede rendir, avance por carrera, filtros y botón de reiniciar.
- **Rediseñá todo lo visual** con la marca. El original usa otras fuentes (Space Grotesk, Inter, IBM Plex Mono) y colores ajenos (verde, ámbar, rojo): reemplazalos por la paleta y las tipografías de ReFADU. Resolvé los estados con la paleta de marca y sumá otro recurso (ícono, patrón, texto), para que no se distingan solo por el color.
- **Separá datos y código**: pasá los datos de correlativas a `content/correlativas.json` (un archivo por carrera o uno solo) para poder actualizarlos sin tocar el código.
- **Persistencia**: el original usa `window.storage`, que solo existe en un entorno de Claude y **no funciona en una web normal**. Reemplazalo por `localStorage`, con manejo de errores si no está disponible. Guardá el progreso **por carrera** (hoy se borra al cambiar de carrera).
- **Verificá los datos contra los planes de estudio** que están en `material/`. Sospecho que algunas carreras están desactualizadas o incompletas (por ejemplo, Diseño Gráfico y Paisaje). **No corrijas los datos por tu cuenta:** hacé una lista de diferencias (carrera, materia, qué dice el simulador, qué dice el plan) y mostramela.
- El logo del original está embebido en base64: usá los logos reales de `material/`.
- Mantené el aviso de que la herramienta es orientativa y hay que verificar con Dirección de Alumnos.

## Compresor de PDF
La web del compresor está en `S:\PDF\web`. Hay que **rediseñarla visualmente** con la marca y sumarla al sitio.

- Primero leé cómo funciona (dónde corre la compresión, qué tecnología usa, qué necesita para funcionar) y explicámelo en pocas líneas. **No cambies la lógica de compresión.**
- Después de rediseñarla, verificá con los archivos de `muestras/` y `calibracion/` que el resultado es el mismo (tamaño y calidad).
- Estados que tienen que tener diseño propio: vacío, arrastrando un archivo, comprimiendo, resultado (antes y después, con el porcentaje reducido), error.
- Si necesita un servidor o un programa local para funcionar, decímelo antes de integrarla: eso cambia dónde se puede alojar el sitio.
- Dejá claro en la pantalla qué pasa con el archivo del usuario (si se queda en su compu o se sube a un servidor).

## Estructura de carpetas sugerida
```
S:\REFADU WEB
├─ CLAUDE.md
├─ material/            (lo que puse yo, sin orden)
├─ content/             (grupos.json, recomendaciones.json, actividades.json, becas.json, apuntes.json, correlativas.json)
├─ assets/              (logos, fuentes y manual ya ordenados por vos a partir de material/)
├─ compresor/           (copia rediseñada de S:\PDF\web)
└─ site/
```

## Marca (obligatorio, del manual de marca)

### Colores
| Nombre | HEX | RGB |
|---|---|---|
| Naranja | `#FF6E23` | 255, 110, 35 |
| Beige | `#E7DED3` | 231, 222, 211 |
| Violeta | `#5B2757` | 91, 39, 87 |
| Violeta claro | `#70569A` | 112, 86, 154 |
| Negro | `#231F20` | 35, 31, 32 |

Usá solo estos colores. No agregues otros ni degradés ajenos a la marca. Para estados (éxito, error) usá combinaciones de la paleta y otro recurso, no verdes ni rojos nuevos.

### Tipografías
- **Climate Crisis** (`ClimateCrisis-Regular-VariableFont_YEAR.ttf`): títulos y logo. Siempre en pocas palabras, nunca en párrafos.
- **DIN Condensed Bold**: subtítulos y datos destacados.
- **DIN Condensed Light**: texto corrido.
- **Lemon**: solo para detalles puntuales, si el manual lo indica.
- Cargalas con `@font-face`. Si no se puede usar DIN Condensed en web por licencia, avisame y proponé **Barlow Condensed** como reemplazo.

### Logo
- Dos versiones: horizontal y vertical.
- Sobre fondo naranja, el logo lleva **RE en beige y FADU en violeta**.
- Respetá el aire alrededor del logo; no lo deformes ni lo recolorees por tu cuenta.
- Ante la duda, mirá las páginas 12 a 14 del manual.

### Estilo
- Fondos naranja, beige o violeta, con texto de alto contraste.
- Titulares grandes en Climate Crisis; el resto de la jerarquía se arma con DIN Condensed.
- Evitá las plantillas genéricas: nada de tarjetas grises, sombras suaves ni íconos de librería sin pasar por la paleta.
- Armá elementos propios con los colores de la marca antes de usar imágenes.

## Cuando termines algo
Resumí en pocas líneas qué hiciste y qué falta. Si algo del manual contradice una decisión tuya, gana el manual.
