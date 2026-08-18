import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "baloo-feeding-log";

const FOOD_ITEMS = [
  { id: "pienso", label: "Pienso", emoji: "🥣", color: "#A67C52", unit: "g", presets: [10, 20, 30, 40, 50, 60], formatVal: (v) => `${v}g` },
  { id: "pure", label: "Puré", emoji: "🥫", color: "#D4763A", unit: "cucharas", presets: [1, 2, 3, 4, 5, 6], formatVal: (v) => v === 1 ? "1 cuchara" : `${v} cucharas` },
  { id: "caballo", label: "Caballo", emoji: "🥩", color: "#C0392B", unit: "puñados", presets: [1, 2, 3, 4, 5, 6], formatVal: (v) => v === 1 ? "1 puñado" : `${v} puñados` },
];

const CORTICOIDES_PRESETS = [0.25, 0.5, 0.75, 1];

function formatCorticoides(v) {
  if (v === 0) return "0";
  const map = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
  if (v <= 1) return map[v] || String(v);
  const whole = Math.floor(v);
  const frac = +(v - whole).toFixed(2);
  return frac > 0 ? `${whole} + ${map[frac]}` : String(whole);
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today - entry) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEntries(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

const EMPTY = { pienso: 0, pure: 0, caballo: 0, micofenolato: false, corticoides: 0 };

export default function App() {
  const [entries, setEntries] = useState(() => loadEntries());
  const [view, setView] = useState("log");
  const [current, setCurrent] = useState({ ...EMPTY });
  const [activeFoodId, setActiveFoodId] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { saveEntries(entries); }, [entries]);

  const handleFoodTap = (id, amount) => setCurrent(p => ({ ...p, [id]: p[id] + amount }));
  const handleFoodReset = (id) => setCurrent(p => ({ ...p, [id]: 0 }));
  const handleMedToggle = () => setCurrent(p => ({ ...p, micofenolato: !p.micofenolato }));
  const addCorticoides = (amt) => setCurrent(p => ({ ...p, corticoides: +(p.corticoides + amt).toFixed(2) }));
  const resetCorticoides = () => setCurrent(p => ({ ...p, corticoides: 0 }));

  const handleSave = () => {
    const hasFood = current.pienso > 0 || current.pure > 0 || current.caballo > 0;
    const hasMeds = current.micofenolato || current.corticoides > 0;
    if (!hasFood && !hasMeds) return;
    const entry = { ...current, timestamp: new Date().toISOString(), id: Date.now() };
    setEntries(prev => [entry, ...prev]);
    setCurrent({ ...EMPTY });
    setActiveFoodId(null);
    setSaveMsg("Toma registrada ✓");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const handleDelete = (id) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeleteConfirm(null);
  };

  const grouped = entries.reduce((acc, e) => {
    const key = formatDate(e.timestamp);
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const todayEntries = entries.filter(e => formatDate(e.timestamp) === "Hoy");
  const totals = todayEntries.reduce((t, e) => ({
    pienso: t.pienso + (e.pienso || 0),
    pure: t.pure + (e.pure || 0),
    caballo: t.caballo + (e.caballo || 0),
    micofenolato: t.micofenolato + (e.micofenolato ? 1 : 0),
    corticoides: +(t.corticoides + (e.corticoides || 0)).toFixed(2),
  }), { pienso: 0, pure: 0, caballo: 0, micofenolato: 0, corticoides: 0 });

  const hasAnything = current.pienso > 0 || current.pure > 0 || current.caballo > 0 || current.micofenolato || current.corticoides > 0;

  const chipLabel = (food, val) => {
    if (food.id === "pienso") return `${food.emoji} ${val}g`;
    if (food.id === "pure") return `${food.emoji} ${val} cuch.`;
    return `${food.emoji} ${val} puñ.`;
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAFAF8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        button { font-family: inherit; }
        button:active { transform: scale(0.96); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
        .pop { animation: pop 0.25s ease; }
      `}</style>
      <div style={S.container}>
        {/* Header */}
        <header style={S.header}>
          <div style={S.headerTop}>
            <span style={S.headerEmoji}>🐾</span>
            <h1 style={S.title}>Registros Comida Baloo</h1>
          </div>
          <div style={S.tabs}>
            <button style={view === "log" ? S.tabActive : S.tab} onClick={() => setView("log")}>Nueva toma</button>
            <button style={view === "history" ? S.tabActive : S.tab} onClick={() => setView("history")}>
              Historial {entries.length > 0 && <span style={S.badge}>{entries.length}</span>}
            </button>
          </div>
        </header>

        {view === "log" && (
          <main style={S.main}>
            {/* Today summary */}
            {todayEntries.length > 0 && (
              <div style={S.todaySummary}>
                <span style={S.summaryLabel}>Hoy</span>
                {totals.pienso > 0 && <span style={S.summaryChip}>🥣 {totals.pienso}g</span>}
                {totals.pure > 0 && <span style={S.summaryChip}>🥫 {totals.pure} cuch.</span>}
                {totals.caballo > 0 && <span style={S.summaryChip}>🥩 {totals.caballo} puñ.</span>}
                {totals.micofenolato > 0 && <span style={S.summaryChip}>💊 ×{totals.micofenolato}</span>}
                {totals.corticoides > 0 && <span style={S.summaryChip}>💉 {formatCorticoides(totals.corticoides)}</span>}
              </div>
            )}

            {/* Food */}
            <section style={S.section}>
              <h2 style={S.sectionTitle}>Alimentación</h2>
              {FOOD_ITEMS.map(food => {
                const isOpen = activeFoodId === food.id;
                const val = current[food.id];
                return (
                  <div key={food.id} style={S.card}>
                    <button style={{ ...S.cardHeader, borderLeft: `4px solid ${food.color}` }} onClick={() => setActiveFoodId(isOpen ? null : food.id)}>
                      <div style={S.cardLeft}>
                        <span style={S.cardEmoji}>{food.emoji}</span>
                        <span style={S.cardLabel}>{food.label}</span>
                      </div>
                      <div style={S.cardRight}>
                        {val > 0 && <span key={val} className="pop" style={{ ...S.cardAmount, color: food.color }}>{food.formatVal(val)}</span>}
                        <span style={S.chevron}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="fade-in" style={S.presetWrap}>
                        <div style={S.presetGrid}>
                          {food.presets.map(amt => (
                            <button key={amt} style={S.presetBtn} onClick={() => handleFoodTap(food.id, amt)}>
                              +{food.id === "pienso" ? `${amt}g` : amt}
                            </button>
                          ))}
                        </div>
                        {val > 0 && <button style={S.resetBtn} onClick={() => handleFoodReset(food.id)}>Borrar</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Meds */}
            <section style={S.section}>
              <h2 style={S.sectionTitle}>Medicación</h2>
              <div style={S.medsRow}>
                {/* Micofenolato */}
                <button
                  style={{
                    ...S.medBtn,
                    background: current.micofenolato ? "#6C5CE7" : "#F5F5F5",
                    color: current.micofenolato ? "#fff" : "#444",
                    boxShadow: current.micofenolato ? "0 4px 14px #6C5CE744" : "none",
                  }}
                  onClick={handleMedToggle}
                >
                  <span style={S.medEmoji}>💊</span>
                  <span style={S.medName}>Micofenolato</span>
                  <span style={S.medDose}>1 pastilla</span>
                  {current.micofenolato && <span style={S.medCheck}>✓</span>}
                </button>

                {/* Corticoides */}
                <div style={S.cortiBox}>
                  <div style={{
                    ...S.medBtn,
                    background: current.corticoides > 0 ? "#00B894" : "#F5F5F5",
                    color: current.corticoides > 0 ? "#fff" : "#444",
                    boxShadow: current.corticoides > 0 ? "0 4px 14px #00B89444" : "none",
                    cursor: "default",
                  }}>
                    <span style={S.medEmoji}>💉</span>
                    <span style={S.medName}>Corticoides</span>
                    <span key={current.corticoides} className="pop" style={S.medDose}>
                      {current.corticoides > 0 ? formatCorticoides(current.corticoides) : "—"}
                    </span>
                  </div>
                  <div style={S.cortiPresets}>
                    {CORTICOIDES_PRESETS.map(amt => (
                      <button key={amt} style={S.cortiBtn} onClick={() => addCorticoides(amt)}>
                        +{formatCorticoides(amt)}
                      </button>
                    ))}
                  </div>
                  {current.corticoides > 0 && (
                    <button style={{ ...S.resetBtn, marginTop: 4 }} onClick={resetCorticoides}>Borrar</button>
                  )}
                </div>
              </div>
            </section>

            {/* Save */}
            <button
              style={{ ...S.saveBtn, opacity: hasAnything ? 1 : 0.35 }}
              onClick={handleSave}
              disabled={!hasAnything}
            >
              Registrar toma
            </button>
            {saveMsg && <div className="fade-in" style={S.saveMsg}>{saveMsg}</div>}
          </main>
        )}

        {view === "history" && (
          <main style={S.main}>
            {entries.length === 0 ? (
              <div style={S.empty}>
                <span style={{ fontSize: 48 }}>📋</span>
                <p style={S.emptyText}>Aún no hay registros</p>
              </div>
            ) : (
              Object.entries(grouped).map(([day, dayEntries]) => (
                <div key={day} style={S.dayGroup}>
                  <h3 style={S.dayLabel}>{day}</h3>
                  {dayEntries.map(e => (
                    <div key={e.id} className="fade-in" style={S.histCard}>
                      <div style={S.histTime}>{formatTime(e.timestamp)}</div>
                      <div style={S.histContent}>
                        {e.pienso > 0 && <span style={S.histChip}>🥣 {e.pienso}g</span>}
                        {e.pure > 0 && <span style={S.histChip}>🥫 {e.pure} cuch.</span>}
                        {e.caballo > 0 && <span style={S.histChip}>🥩 {e.caballo} puñ.</span>}
                        {e.micofenolato && <span style={{ ...S.histChip, background: "#6C5CE711", color: "#6C5CE7" }}>💊 Micofenolato</span>}
                        {e.corticoides > 0 && <span style={{ ...S.histChip, background: "#00B89411", color: "#00B894" }}>💉 {formatCorticoides(e.corticoides)}</span>}
                      </div>
                      <button style={deleteConfirm === e.id ? S.delConfirm : S.delBtn} onClick={() => handleDelete(e.id)}>
                        {deleteConfirm === e.id ? "¿Seguro?" : "✕"}
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </main>
        )}
      </div>
    </>
  );
}

/* ── Styles ── */
const S = {
  container: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", color: "#2D2D2D" },
  header: { background: "#fff", borderBottom: "1px solid #E8E8E4", padding: "20px 20px 0", position: "sticky", top: 0, zIndex: 10 },
  headerTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  headerEmoji: { fontSize: 28 },
  title: { fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" },
  tabs: { display: "flex" },
  tab: { flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: "3px solid transparent", fontSize: 14, fontWeight: 500, color: "#999", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  tabActive: { flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: "3px solid #A67C52", fontSize: 14, fontWeight: 600, color: "#A67C52", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  badge: { background: "#A67C52", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 600 },
  main: { padding: "16px 20px 120px" },

  /* Today summary */
  todaySummary: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "10px 14px", background: "#FFF8F0", borderRadius: 12, marginBottom: 16, border: "1px solid #F0E6D6" },
  summaryLabel: { fontSize: 12, fontWeight: 700, color: "#A67C52", marginRight: 4 },
  summaryChip: { fontSize: 12, padding: "3px 8px", background: "#fff", borderRadius: 8, color: "#555", fontWeight: 500 },

  /* Section */
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0A898", marginBottom: 10 },

  /* Food cards */
  card: { marginBottom: 8, borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  cardHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#fff", border: "none", cursor: "pointer", fontSize: 15, borderLeft: "4px solid transparent" },
  cardLeft: { display: "flex", alignItems: "center", gap: 10 },
  cardEmoji: { fontSize: 22 },
  cardLabel: { fontWeight: 600, fontSize: 15 },
  cardRight: { display: "flex", alignItems: "center", gap: 10 },
  cardAmount: { fontWeight: 700, fontSize: 16 },
  chevron: { fontSize: 10, color: "#BBB" },
  presetWrap: { padding: "6px 14px 14px" },
  presetGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  presetBtn: { padding: "12px 0", borderRadius: 10, border: "none", background: "#F5F3EE", fontSize: 15, fontWeight: 600, color: "#555", cursor: "pointer", transition: "background 0.15s" },
  resetBtn: { width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: "#FEE2E2", fontSize: 13, fontWeight: 600, color: "#C0392B", cursor: "pointer", marginTop: 8 },

  /* Meds */
  medsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" },
  medBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "18px 12px", borderRadius: 14, border: "none", cursor: "pointer", transition: "all 0.2s", position: "relative", width: "100%" },
  medEmoji: { fontSize: 28 },
  medName: { fontSize: 12, fontWeight: 600, textAlign: "center" },
  medDose: { fontSize: 13, opacity: 0.8, fontWeight: 500 },
  medCheck: { position: "absolute", top: 8, right: 10, fontSize: 16, fontWeight: 700 },
  cortiBox: { display: "flex", flexDirection: "column", gap: 6 },
  cortiPresets: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 },
  cortiBtn: { padding: "8px 0", borderRadius: 8, border: "none", background: "#F5F3EE", fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer" },

  /* Save */
  saveBtn: { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #A67C52, #8B6540)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, transition: "opacity 0.2s", letterSpacing: "0.01em" },
  saveMsg: { textAlign: "center", marginTop: 12, color: "#27AE60", fontWeight: 600, fontSize: 14 },

  /* Empty */
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 8 },
  emptyText: { color: "#999", fontSize: 15 },

  /* History */
  dayGroup: { marginBottom: 20 },
  dayLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#A67C52", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #EEE" },
  histCard: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", borderRadius: 12, marginBottom: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  histTime: { fontSize: 13, fontWeight: 600, color: "#999", minWidth: 46 },
  histContent: { display: "flex", flexWrap: "wrap", gap: 5, flex: 1 },
  histChip: { fontSize: 12, padding: "3px 8px", background: "#F5F3EE", borderRadius: 8, color: "#555", fontWeight: 500 },
  delBtn: { background: "none", border: "none", fontSize: 14, color: "#CCC", cursor: "pointer", padding: "4px 8px", flexShrink: 0 },
  delConfirm: { background: "#FEE2E2", border: "none", fontSize: 11, color: "#C0392B", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontWeight: 600, flexShrink: 0 },
};
