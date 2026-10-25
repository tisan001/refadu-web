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

En `/admin/` hay un editor con formularios para **Actividades**, **Calendario académico** y **Grupos de
WhatsApp** ([Decap CMS](https://decapcms.org)). Cada cambio que se publica desde ahí se guarda como un
commit en GitHub, y el sitio se actualiza solo en uno o dos minutos. Para sumar otra sección
(becas, apuntes, recomendaciones), se agrega en `site/admin/config.yml`.

**En tu compu**, sin login: `npm run editor`, abrí http://localhost:8080/admin/ y entrá. Los cambios se
guardan directo en `content/`.

**Online** hace falta, una sola vez:

1. Poner la cuenta y el nombre del repositorio en `backend.repo` de `site/admin/config.yml`.
2. Configurar el login con GitHub:
   - **En Netlify** (lo más simple): crear una *OAuth App* en GitHub (Settings → Developer settings →
     OAuth Apps) con la URL de callback `https://api.netlify.com/auth/done`, y cargar su Client ID y
     su secreto en Netlify (Site configuration → Access & security → OAuth → Install provider → GitHub).
   - **En Cloudflare Pages** (lo que usamos): el puente del login es el Worker de `login-editor/worker.js`.
     1. En Cloudflare: Workers & Pages → Create → Worker, nombre `refadu-login`, y pegá `worker.js`
        (o `npx wrangler deploy` desde `login-editor/`).
     2. En GitHub: una *OAuth App* con *Authorization callback URL*
        `https://refadu-login.<tu-subdominio>.workers.dev/callback`.
     3. En el Worker (Settings → Variables and Secrets): `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
        (como *Secret*) y `ORIGENES` con la dirección del sitio (por ejemplo `https://refadu.pages.dev`).
     4. La dirección del Worker va en `backend.base_url` de `site/admin/config.yml`.
3. Sumar como colaboradores del repositorio (con permiso de escritura) a quienes vayan a editar. Cada
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

**Cloudflare Pages** o **Netlify**, conectados al repositorio:

- Comando de build: `npm run build`
- Carpeta para publicar: `dist`
- Versión de Node: 24 (está en `.node-version`)

No hace falta ningún servidor: el compresor también corre entero en el navegador.

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

Es AGPL-3.0, por MuPDF (licencia en `compresor/LICENSE`): su código tiene que estar publicado. Por eso
este repositorio es público y la página del compresor lo linkea.
