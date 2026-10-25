// Login con GitHub para el editor de contenido (/admin, Decap CMS), como Cloudflare Worker.
// Hace de puente entre el editor y GitHub: GitHub entrega un permiso (token) y el Worker se lo pasa
// a la ventana del editor, solo si el editor está en uno de los sitios permitidos.
//
// Variables del Worker (Settings → Variables and Secrets):
//   GITHUB_CLIENT_ID      Client ID de la OAuth App de GitHub
//   GITHUB_CLIENT_SECRET  su secreto (cargalo como "Secret", no como texto)
//   ORIGENES              sitios donde está el editor, separados por coma
//                         (por ejemplo: https://refadu.pages.dev,https://refadu.org)
//   ALCANCE               opcional. "public_repo" (repo público, el default) o "repo" (repo privado)

export default {
  async fetch(pedido, env) {
    const url = new URL(pedido.url);
    if (url.pathname === "/auth") return iniciar(url, env);
    if (url.pathname === "/callback") return volver(pedido, url, env);
    return new Response("Login del editor de ReFADU.", { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};

/** Manda a la persona a GitHub a dar permiso. */
function iniciar(url, env) {
  if (url.searchParams.get("provider") !== "github") return new Response("Solo GitHub.", { status: 400 });
  const estado = crypto.randomUUID();
  const github = new URL("https://github.com/login/oauth/authorize");
  github.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  github.searchParams.set("redirect_uri", `${url.origin}/callback`);
  github.searchParams.set("scope", env.ALCANCE || "public_repo");
  github.searchParams.set("state", estado);
  return new Response(null, {
    status: 302,
    headers: {
      location: github.toString(),
      // el "estado" vuelve con GitHub: así sabemos que el pedido salió de acá
      "set-cookie": `estado_login=${estado}; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

/** GitHub vuelve con un código: se cambia por el token y se le pasa a la ventana del editor. */
async function volver(pedido, url, env) {
  const cookie = pedido.headers.get("cookie") ?? "";
  const esperado = cookie.match(/(?:^|;\s*)estado_login=([^;]+)/)?.[1];
  if (!esperado || esperado !== url.searchParams.get("state")) return pagina("error", { mensaje: "El login venció o no salió de este sitio. Probá de nuevo." }, env);

  const respuesta = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get("code") }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!datos.access_token) return pagina("error", { mensaje: datos.error_description || "GitHub no dio el permiso." }, env);
  return pagina("success", { token: datos.access_token, provider: "github" }, env);
}

/**
 * Página que se abre en la ventanita del login. Sigue el protocolo de Decap:
 * avisa "authorizing:github", espera la respuesta del editor y le manda el resultado
 * solo si el editor está en un sitio permitido.
 */
function pagina(resultado, contenido, env) {
  const origenes = (env.ORIGENES || "").split(",").map((o) => o.trim()).filter(Boolean);
  const mensaje = `authorization:github:${resultado}:${JSON.stringify(contenido)}`;
  const html = `<!doctype html><meta charset="utf-8"><title>Login del editor</title>
<p>${resultado === "success" ? "Listo, ya podés cerrar esta ventana." : "No se pudo entrar: " + escapar(contenido.mensaje)}</p>
<script>
  const permitidos = ${JSON.stringify(origenes)};
  const mensaje = ${JSON.stringify(mensaje)};
  window.addEventListener("message", (e) => {
    if (!permitidos.includes(e.origin)) return;
    window.opener.postMessage(mensaje, e.origin);
    setTimeout(() => window.close(), 300);
  });
  if (window.opener) window.opener.postMessage("authorizing:github", "*");
</script>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": "estado_login=; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
