# ReFADU · sitio web

Sitio estático (HTML, CSS y JS, sin frameworks) para estudiantes de FADU y del CBC.

## Cambiar un link, una fecha o un texto

Todo el contenido está en `content/`. No hace falta tocar código.

| Archivo | Qué tiene |
|---|---|
| `content/grupos.json` | grupos de WhatsApp (tipo: `carrera`, `cbc`, `año` o `materia`) |
| `content/recomendaciones.json` | el cuatrimestre publicado y, por carrera, el formulario ("para compartir") y el link a las recomendaciones de ese cuatrimestre |
| `content/actividades.json` | actividades (fecha como `AAAA-MM-DD`) |
| `content/calendario.json` | ID del Google Calendar público y fechas clave |
| `content/becas.json` | becas con requisitos y fecha límite |
| `content/apuntes.json` | Drive por carrera y materia, y el formulario para subir material |
| `content/carreras.json` | las 7 carreras (su `id` lo usan los demás archivos) |
| `content/correlativas/*.json` | correlativas de cada carrera ([cómo editarlas](content/correlativas/LEEME.md)) |

Cada archivo empieza con un campo `_ayuda` que explica qué va en cada lugar. Los links que dicen
`EJEMPLO` son de mentira: el sitio los marca en pantalla como "link de ejemplo" hasta que se reemplacen.

Antes de publicar, corré `npm run verificar`: avisa si un JSON quedó mal escrito o si una correlativa
apunta a una materia que no existe.

## Editor de contenido (`/admin`)

En `/admin/` hay un editor con formularios ([Decap CMS](https://decapcms.org)) para:

- **Actividades** (con fecha, o del día X al día Y si dura varios días, lugar y link de inscripción)
- **Calendario académico** (el ID del calendario y las fechas clave, que también pueden durar varios días)
- **Grupos de WhatsApp** (en los de CBC, con su año; en los de materia, cuál; en los de año, de qué año).
  Para cargar muchos de una: **`/admin/importar.html`** recibe un Excel (con plantilla para bajar), revisa
  cada fila y los guarda con la misma sesión del editor.
- **Banco de apuntes** (formulario para subir material, y carpetas por carrera y por materia)
- **Becas**
- **Recomendaciones** (el cuatrimestre, el formulario y el link a las recomendaciones de cada carrera)

Cada cambio que se publica desde ahí se guarda como un commit en GitHub, y el sitio se actualiza solo en
uno o dos minutos. Las secciones se configuran en `site/admin/config.yml`.

**En tu compu**, sin login: `npm run editor`, abrí http://localhost:8080/admin/ y entrá. Los cambios se
guardan directo en `content/`.

**Online** (en https://refadu-web.sanrt2001.workers.dev/admin/) el login es con GitHub, a través del
Worker de `login-editor/worker.js`. Hace falta configurarlo una sola vez:

1. En Cloudflare: Workers & Pages → Create → Worker, nombre `refadu-login`, y pegá `worker.js`
   (o `npx wrangler deploy` desde `login-editor/`). Queda en `https://refadu-login.sanrt2001.workers.dev`,
   que es la dirección cargada en `backend.base_url` de `site/admin/config.yml`.
2. En GitHub (Settings → Developer settings → OAuth Apps → New OAuth App):
   - Homepage URL: `https://refadu-web.sanrt2001.workers.dev`
   - Authorization callback URL: `https://refadu-login.sanrt2001.workers.dev/callback`
3. En el Worker `refadu-login` (Settings → Variables and Secrets): `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET` (como *Secret*) y `ORIGENES` = `https://refadu-web.sanrt2001.workers.dev`
   (si después hay un dominio propio, se suma separado por coma).
4. Sumar como colaboradores del repositorio (con permiso de escritura) a quienes vayan a editar. Cada
   uno necesita su cuenta de GitHub.

## Verlo en tu compu

Necesitás [Node.js](https://nodejs.org) 22.18 o más nuevo.

```bash
npm run build   # la primera vez: compila el compresor
npm run dev     # http://localhost:8080
```

`npm run dev` muestra los cambios de `site/` y `content/` sin volver a compilar. El compresor se
edita aparte con `npm run dev --prefix compresor`.

## Publicar (gratis)

El sitio está en **Cloudflare Workers** (archivos estáticos), conectado al repositorio: cada push a
`main` se publica solo en https://refadu-web.sanrt2001.workers.dev.

- Build command: `npm run build` (arma `dist/`)
- Deploy command: `npx wrangler deploy` (publica `dist/`, según `wrangler.jsonc`)
- Versión de Node: 24 (está en `.node-version`)

No hace falta ningún servidor: el compresor también corre entero en el navegador. Si algún día se
pasa a Cloudflare Pages o a Netlify, alcanza con el mismo build y la carpeta `dist`.

## Qué hay en cada carpeta

```
content/     el contenido editable (JSON)
site/        las páginas, los estilos (css/) y el JS de cada sección (js/)
assets/      logos (SVG sacados del manual), fuentes de la marca, ilustraciones y fondos (WebP)
compresor/   copia de S:\PDF\web con la interfaz rediseñada (la compresión, en src/motor/, no se tocó)
scripts/     servidor local, verificador de contenido, build y preparación de logos e imágenes
material/    lo que vino de partida (no se publica)
```

## El simulador de correlativas

- Los datos salen de los cuadros de correlatividades oficiales de FADU (`material/correlativas/`).
- La lógica está en `site/js/correlativas-logica.js`. Es la del simulador original, más lo que hacía
  falta para representar los cuadros oficiales: requisitos con "o", promoción directa, año completo
  para rendir, CBC y electivas.
- El progreso se guarda por carrera en el navegador de cada persona (`localStorage`). No se manda a
  ningún lado.

## El compresor de PDF

Es AGPL-3.0, por MuPDF (licencia en `compresor/LICENSE`): la licencia pide que quien usa el compresor
pueda conseguir su código fuente. Este repositorio es público, pero desde el 26/10/2026 la página del
compresor ya no lo linkea (se decidió sacar el link "mirá el código"). Si hiciera falta cumplir la
licencia de forma visible, alcanza con volver a poner ese link en `compresor/index.html`.
