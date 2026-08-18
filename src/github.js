// ─── ALMACENAMIENTO EN GITHUB ───
// Guarda los registros como JSON en tu repositorio.
//
// Configura estas variables en Vercel → Settings → Environment Variables:
//   VITE_GITHUB_TOKEN  → tu Personal Access Token (scope: repo)
//   VITE_GITHUB_REPO   → usuario/repositorio (ej: paco/registros-comida-baloo)
//   VITE_GITHUB_FILE   → ruta del archivo (por defecto: data.json)
//
// Para generar el token:
//   GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
//   → Generate → Permisos: Contents (Read and write) sobre tu repo → Generate token

const TOKEN = import.meta.env.VITE_GITHUB_TOKEN || "";
const REPO = import.meta.env.VITE_GITHUB_REPO || "";
const FILE = import.meta.env.VITE_GITHUB_FILE || "data.json";
const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

export const isConfigured = Boolean(TOKEN && REPO && !TOKEN.startsWith("TU_"));

let cachedSha = null;

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

/** Lee los registros del JSON en GitHub */
export async function loadEntries() {
  if (!isConfigured) return [];
  try {
    const res = await fetch(API, { headers: headers(), cache: "no-store" });
    if (res.status === 404) {
      cachedSha = null;
      return [];
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    cachedSha = data.sha;
    const content = atob(data.content.replace(/\n/g, ""));
    return JSON.parse(content);
  } catch (e) {
    console.error("Error leyendo GitHub:", e);
    throw e;
  }
}

/** Escribe los registros al JSON en GitHub */
export async function saveEntries(entries) {
  if (!isConfigured) return;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(entries, null, 2))));
  const body = {
    message: `Actualizar registros Baloo – ${new Date().toLocaleString("es-ES")}`,
    content,
  };
  // Si tenemos SHA, es update; si no, es creación
  if (cachedSha) body.sha = cachedSha;

  const res = await fetch(API, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
  if (res.status === 409) {
    // Conflicto de SHA → refrescar y reintentar
    const fresh = await loadEntries();
    cachedSha = null;
    await saveEntries(entries);
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API ${res.status}`);
  }
  const data = await res.json();
  cachedSha = data.content.sha;
}
