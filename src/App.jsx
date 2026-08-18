import { useState, useEffect, useCallback } from "react";
import { isConfigured, loadEntries, saveEntries } from "./github";

/* ── Config ── */
const FOOD_ITEMS = [
  { id: "pienso", label: "Pienso", emoji: "🥣", color: "#A67C52", presets: [5, 10, 20, 30, 40, 50], fmtVal: v => `${v}g`, fmtShort: v => `${v}g`, fmtBtn: v => `+${v}g` },
  { id: "pure", label: "Puré", emoji: "🥫", color: "#D4763A", presets: [1, 2, 3, 4, 5, 6], fmtVal: v => v === 1 ? "1 cuchara" : `${v} cucharas`, fmtShort: v => `${v} cuch.`, fmtBtn: v => `+${v}` },
  { id: "caballo", label: "Caballo", emoji: "🥩", color: "#C0392B", presets: [1, 2, 3, 4, 5, 6], fmtVal: v => v === 1 ? "1 puñado" : `${v} puñados`, fmtShort: v => `${v} puñ.`, fmtBtn: v => `+${v}` },
];

const TOGGLE_MEDS = [
  { id: "micofenolato", label: "Micofenolato", dose: "1 pastilla", emoji: "💊", color: "#6C5CE7" },
  { id: "promax", label: "Promax", dose: "1 toma", emoji: "🩹", color: "#E17055" },
];

const CORTI_PRESETS = [0.25, 0.5, 0.75, 1];
function fmtCorti(v) {
  if (v === 0) return "—";
  const m = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
  if (v <= 1) return m[v] || String(v);
  const w = Math.floor(v), f = +(v - w).toFixed(2);
  return f > 0 ? `${w} + ${m[f]}` : String(w);
}

function fmtDate(iso) {
  const d = new Date(iso), now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today - entry) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const EMPTY = { pienso: 0, pure: 0, caballo: 0, micofenolato: false, promax: false, corticoides: 0 };

/* ── App ── */
export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("log");
  const [cur, setCur] = useState({ ...EMPTY });
  const [openFood, setOpenFood] = useState(null);
  const [toast, setToast] = useState("");
  const [delId, setDelId] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  /* Load on mount */
  const refresh = useCallback(async () => {
    if (!isConfigured) { setError("SETUP"); setLoading(false); return; }
    try {
      const data = await loadEntries();
      setEntries(data);
      setError(null);
      setLastSync(new Date());
    } catch (e) {
      setError("No se pudo conectar a GitHub. Revisa el token y el repositorio.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* Auto-refresh every 30s */
  useEffect(() => {
    if (!isConfigured) return;
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const persistAndRefresh = async (newEntries) => {
    setSaving(true);
    try {
      await saveEntries(newEntries);
      setEntries(newEntries);
      setLastSync(new Date());
      setSaving(false);
      return true;
    } catch (e) {
      setSaving(false);
      setToast("Error al guardar ✕");
      setTimeout(() => setToast(""), 3000);
      return false;
    }
  };

  const addFood = (id, amt) => setCur(p => ({ ...p, [id]: p[id] + amt }));
  const resetFood = (id) => setCur(p => ({ ...p, [id]: 0 }));
  const toggleMed = (id) => setCur(p => ({ ...p, [id]: !p[id] }));
  const addCorti = (amt) => setCur(p => ({ ...p, corticoides: +(p.corticoides + amt).toFixed(2) }));
  const resetCorti = () => setCur(p => ({ ...p, corticoides: 0 }));

  const save = async () => {
    const hasFood = cur.pienso > 0 || cur.pure > 0 || cur.caballo > 0;
    const hasMeds = cur.micofenolato || cur.promax || cur.corticoides > 0;
    if (!hasFood && !hasMeds) return;
    const entry = { ...cur, timestamp: new Date().toISOString(), id: Date.now() };
    const newEntries = [entry, ...entries];
    const ok = await persistAndRefresh(newEntries);
    if (ok) {
      setCur({ ...EMPTY });
      setOpenFood(null);
      setToast("Toma registrada ✓");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const del = async (id) => {
    if (delId !== id) { setDelId(id); return; }
    const newEntries = entries.filter(e => e.id !== id);
    await persistAndRefresh(newEntries);
    setDelId(null);
  };

  /* Totals */
  const todayList = entries.filter(e => fmtDate(e.timestamp) === "Hoy");
  const tot = todayList.reduce((t, e) => ({
    pienso: t.pienso + (e.pienso || 0),
    pure: t.pure + (e.pure || 0),
    caballo: t.caballo + (e.caballo || 0),
    micofenolato: t.micofenolato + (e.micofenolato ? 1 : 0),
    promax: t.promax + (e.promax ? 1 : 0),
    corticoides: +(t.corticoides + (e.corticoides || 0)).toFixed(2),
  }), { pienso: 0, pure: 0, caballo: 0, micofenolato: 0, promax: 0, corticoides: 0 });

  const grouped = entries.reduce((a, e) => {
    const k = fmtDate(e.timestamp);
    (a[k] = a[k] || []).push(e);
    return a;
  }, {});

  const hasAny = cur.pienso > 0 || cur.pure > 0 || cur.caballo > 0 || cur.micofenolato || cur.promax || cur.corticoides > 0;

  /* ── Render ── */
  if (loading) return <div style={S.loadScreen}><span style={{ fontSize: 48 }}>🐾</span><p style={{ color: "#999", marginTop: 12 }}>Cargando registros de Baloo...</p></div>;

  if (error === "SETUP") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px", fontFamily: "'Inter',-apple-system,sans-serif", color: "#2D2D2D" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 48 }}>🐾</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>Registros Comida Baloo</h1>
        <p style={{ color: "#A67C52", fontSize: 14, marginTop: 4 }}>Configuración inicial</p>
      </div>
      <div style={{ background: "#FFF8F0", borderRadius: 14, padding: 20, border: "1px solid #F0E6D6", lineHeight: 1.8, fontSize: 14 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Configura estas variables de entorno en Vercel:</p>
        <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, fontFamily: "monospace", lineHeight: 2 }}>
          <div><strong>VITE_GITHUB_TOKEN</strong> = tu token</div>
          <div><strong>VITE_GITHUB_REPO</strong> = usuario/repo</div>
          <div><strong>VITE_GITHUB_FILE</strong> = data.json</div>
        </div>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Pasos:</p>
        <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>En GitHub → Settings → Developer settings → <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener" style={{ color: "#A67C52" }}>Fine-grained tokens</a></li>
          <li>Generate new token → selecciona solo tu repo → permiso <strong>Contents: Read and write</strong></li>
          <li>Copia el token</li>
          <li>En <a href="https://vercel.com" target="_blank" rel="noopener" style={{ color: "#A67C52" }}>Vercel</a> → tu proyecto → Settings → Environment Variables</li>
          <li>Añade las 3 variables de arriba</li>
          <li>Redeploy (Deployments → ⋮ → Redeploy)</li>
        </ol>
      </div>
    </div>
  );

  if (error) return <div style={S.loadScreen}><span style={{ fontSize: 48 }}>⚠️</span><p style={{ color: "#C0392B", marginTop: 12, padding: "0 24px", textAlign: "center", lineHeight: 1.5 }}>{error}</p><button style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, border: "none", background: "#A67C52", color: "#fff", fontWeight: 600, cursor: "pointer" }} onClick={refresh}>Reintentar</button></div>;

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#FAFAF8;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
        button{font-family:inherit}
        button:active{transform:scale(0.96)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn .2s ease}
        @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
        .pop{animation:pop .25s ease}
      `}</style>
      <div style={S.container}>
        {/* Header */}
        <header style={S.header}>
          <div style={S.headerTop}>
            <span style={{ fontSize: 28 }}>🐾</span>
            <div>
              <h1 style={S.title}>Registros Comida Baloo</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: saving ? "#E17055" : "#27AE60", fontWeight: 600 }}>
                  {saving ? "● Guardando..." : "● Sincronizado"}
                </span>
                {lastSync && <span style={{ fontSize: 10, color: "#BBB" }}>{fmtTime(lastSync.toISOString())}</span>}
                <button style={{ background: "none", border: "none", fontSize: 12, color: "#A67C52", cursor: "pointer", padding: 0, fontWeight: 600 }} onClick={refresh}>↻</button>
              </div>
            </div>
          </div>
          <div style={S.tabs}>
            <button style={view === "log" ? S.tabOn : S.tabOff} onClick={() => setView("log")}>Nueva toma</button>
            <button style={view === "history" ? S.tabOn : S.tabOff} onClick={() => setView("history")}>
              Historial {entries.length > 0 && <span style={S.badge}>{entries.length}</span>}
            </button>
          </div>
        </header>

        {/* ── LOG VIEW ── */}
        {view === "log" && (
          <main style={S.main}>
            {todayList.length > 0 && (
              <div style={S.todayBar}>
                <span style={S.todayLabel}>Hoy</span>
                {tot.pienso > 0 && <span style={S.chip}>🥣 {tot.pienso}g</span>}
                {tot.pure > 0 && <span style={S.chip}>🥫 {tot.pure} cuch.</span>}
                {tot.caballo > 0 && <span style={S.chip}>🥩 {tot.caballo} puñ.</span>}
                {tot.micofenolato > 0 && <span style={S.chip}>💊 ×{tot.micofenolato}</span>}
                {tot.promax > 0 && <span style={S.chip}>🩹 ×{tot.promax}</span>}
                {tot.corticoides > 0 && <span style={S.chip}>💉 {fmtCorti(tot.corticoides)}</span>}
              </div>
            )}

            <section style={S.sec}>
              <h2 style={S.secTitle}>Alimentación</h2>
              {FOOD_ITEMS.map(f => {
                const isOpen = openFood === f.id;
                const val = cur[f.id];
                return (
                  <div key={f.id} style={S.card}>
                    <button style={{ ...S.cardHead, borderLeft: `4px solid ${f.color}` }} onClick={() => setOpenFood(isOpen ? null : f.id)}>
                      <div style={S.row}><span style={{ fontSize: 22 }}>{f.emoji}</span><span style={S.cardName}>{f.label}</span></div>
                      <div style={S.row}>
                        {val > 0 && <span key={val} className="pop" style={{ fontWeight: 700, fontSize: 16, color: f.color }}>{f.fmtVal(val)}</span>}
                        <span style={{ fontSize: 10, color: "#BBB" }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="fi" style={S.presetWrap}>
                        <div style={S.presetGrid}>
                          {f.presets.map(a => (
                            <button key={a} style={S.presetBtn} onClick={() => addFood(f.id, a)}>{f.fmtBtn(a)}</button>
                          ))}
                        </div>
                        {val > 0 && <button style={S.resetBtn} onClick={() => resetFood(f.id)}>Borrar</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section style={S.sec}>
              <h2 style={S.secTitle}>Medicación</h2>
              <div style={S.medsRow}>
                {TOGGLE_MEDS.map(m => {
                  const on = cur[m.id];
                  return (
                    <button key={m.id} style={{
                      ...S.medBtn,
                      background: on ? m.color : "#F5F5F5",
                      color: on ? "#fff" : "#444",
                      boxShadow: on ? `0 4px 14px ${m.color}44` : "none",
                    }} onClick={() => toggleMed(m.id)}>
                      <span style={{ fontSize: 28 }}>{m.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center" }}>{m.label}</span>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>{m.dose}</span>
                      {on && <span style={S.medCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <div style={S.cortiWrap}>
                <div style={{ ...S.cortiHeader, background: cur.corticoides > 0 ? "#00B894" : "#F5F5F5", color: cur.corticoides > 0 ? "#fff" : "#444" }}>
                  <span style={{ fontSize: 24 }}>💉</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Corticoides</span>
                  <span key={cur.corticoides} className="pop" style={{ fontSize: 18, fontWeight: 700 }}>{fmtCorti(cur.corticoides)}</span>
                </div>
                <div style={S.cortiGrid}>
                  {CORTI_PRESETS.map(a => (
                    <button key={a} style={S.cortiBtn} onClick={() => addCorti(a)}>+{fmtCorti(a)}</button>
                  ))}
                </div>
                {cur.corticoides > 0 && <button style={{ ...S.resetBtn, marginTop: 4 }} onClick={resetCorti}>Borrar</button>}
              </div>
            </section>

            <button
              style={{ ...S.saveBtn, opacity: hasAny && !saving ? 1 : 0.35 }}
              onClick={save}
              disabled={!hasAny || saving}
            >
              {saving ? "Guardando..." : "Registrar toma"}
            </button>
            {toast && <div className="fi" style={S.toast}>{toast}</div>}
          </main>
        )}

        {/* ── HISTORY VIEW ── */}
        {view === "history" && (
          <main style={S.main}>
            {entries.length === 0 ? (
              <div style={S.empty}><span style={{ fontSize: 48 }}>📋</span><p style={{ color: "#999", marginTop: 8 }}>Aún no hay registros</p></div>
            ) : Object.entries(grouped).map(([day, list]) => (
              <div key={day} style={{ marginBottom: 20 }}>
                <h3 style={S.dayLabel}>{day}</h3>
                {list.map(e => (
                  <div key={e.id} className="fi" style={S.histCard}>
                    <div style={S.histTime}>{fmtTime(e.timestamp)}</div>
                    <div style={S.histChips}>
                      {e.pienso > 0 && <span style={S.hChip}>🥣 {e.pienso}g</span>}
                      {e.pure > 0 && <span style={S.hChip}>🥫 {e.pure} cuch.</span>}
                      {e.caballo > 0 && <span style={S.hChip}>🥩 {e.caballo} puñ.</span>}
                      {e.micofenolato && <span style={{ ...S.hChip, background: "#6C5CE711", color: "#6C5CE7" }}>💊 Micofen.</span>}
                      {e.promax && <span style={{ ...S.hChip, background: "#E1705511", color: "#E17055" }}>🩹 Promax</span>}
                      {e.corticoides > 0 && <span style={{ ...S.hChip, background: "#00B89411", color: "#00B894" }}>💉 {fmtCorti(e.corticoides)}</span>}
                    </div>
                    <button style={delId === e.id ? S.delYes : S.delBtn} onClick={() => del(e.id)}>
                      {delId === e.id ? "¿Seguro?" : "✕"}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </main>
        )}
      </div>
    </>
  );
}

/* ── Styles ── */
const S = {
  container: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", color: "#2D2D2D" },
  loadScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" },
  header: { background: "#fff", borderBottom: "1px solid #E8E8E4", padding: "20px 20px 0", position: "sticky", top: 0, zIndex: 10 },
  headerTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
  tabs: { display: "flex" },
  tabOff: { flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: "3px solid transparent", fontSize: 14, fontWeight: 500, color: "#999", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  tabOn: { flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: "3px solid #A67C52", fontSize: 14, fontWeight: 600, color: "#A67C52", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  badge: { background: "#A67C52", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 600 },
  main: { padding: "16px 20px 120px" },
  todayBar: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "10px 14px", background: "#FFF8F0", borderRadius: 12, marginBottom: 16, border: "1px solid #F0E6D6" },
  todayLabel: { fontSize: 12, fontWeight: 700, color: "#A67C52", marginRight: 4 },
  chip: { fontSize: 12, padding: "3px 8px", background: "#fff", borderRadius: 8, color: "#555", fontWeight: 500 },
  sec: { marginBottom: 24 },
  secTitle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0A898", marginBottom: 10 },
  card: { marginBottom: 8, borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  cardHead: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#fff", border: "none", cursor: "pointer", fontSize: 15 },
  row: { display: "flex", alignItems: "center", gap: 10 },
  cardName: { fontWeight: 600, fontSize: 15 },
  presetWrap: { padding: "6px 14px 14px" },
  presetGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  presetBtn: { padding: "12px 0", borderRadius: 10, border: "none", background: "#F5F3EE", fontSize: 15, fontWeight: 600, color: "#555", cursor: "pointer" },
  resetBtn: { width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: "#FEE2E2", fontSize: 13, fontWeight: 600, color: "#C0392B", cursor: "pointer", marginTop: 8 },
  medsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  medBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "18px 12px", borderRadius: 14, border: "none", cursor: "pointer", transition: "all 0.2s", position: "relative", width: "100%" },
  medCheck: { position: "absolute", top: 8, right: 10, fontSize: 16, fontWeight: 700 },
  cortiWrap: { background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  cortiHeader: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 12px", borderRadius: 10, marginBottom: 8, transition: "all 0.2s" },
  cortiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 },
  cortiBtn: { padding: "10px 0", borderRadius: 8, border: "none", background: "#F5F3EE", fontSize: 14, fontWeight: 600, color: "#555", cursor: "pointer" },
  saveBtn: { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #A67C52, #8B6540)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, transition: "opacity 0.2s" },
  toast: { textAlign: "center", marginTop: 12, color: "#27AE60", fontWeight: 600, fontSize: 14 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0" },
  dayLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#A67C52", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #EEE" },
  histCard: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", borderRadius: 12, marginBottom: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  histTime: { fontSize: 13, fontWeight: 600, color: "#999", minWidth: 46, flexShrink: 0 },
  histChips: { display: "flex", flexWrap: "wrap", gap: 5, flex: 1 },
  hChip: { fontSize: 12, padding: "3px 8px", background: "#F5F3EE", borderRadius: 8, color: "#555", fontWeight: 500 },
  delBtn: { background: "none", border: "none", fontSize: 14, color: "#CCC", cursor: "pointer", padding: "4px 8px", flexShrink: 0 },
  delYes: { background: "#FEE2E2", border: "none", fontSize: 11, color: "#C0392B", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontWeight: 600, flexShrink: 0 },
};
