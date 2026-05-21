import { useState, useMemo, useRef, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// ... (CURRENCIES and CATEGORIES stay mostly the same)

export default function App() {
  // ... (all your state and logic remains the same)

  // Colors - slightly warmer & less "AI perfect"
  const bg = dark ? "#0A0A0F" : "#F8F7FF";
  const card = dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.97)";
  const solid = dark ? "#12121A" : "#FFFFFF";
  const border = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const txt = dark ? "#F0F0FF" : "#0F0F1A";
  const sub = dark ? "#77778A" : "#666688";

  const MAIN = "linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)"; // Slightly softer purple-pink

  // ... rest of your calculations stay the same

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: bg, color: txt, transition: "all 0.3s" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.65;transform:scale(.85)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .nav-btn:hover { transform: scale(1.04); }
        .logo { font-family: 'Georgia', serif; letter-spacing: -2px; }
      `}</style>

      {/* Background blobs - made slightly asymmetric */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -180, left: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,40,217,0.14) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: -140, right: -80, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(219,39,119,0.11) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header - less centered, more personal */}
        <div style={{ padding: "20px 20px 60px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 16, background: MAIN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 4px 20px rgba(109,40,217,0.4)" }}>
                💸
              </div>
              <div>
                <div className="logo" style={{ fontSize: 27, fontWeight: 800, color: txt }}>spendsmart</div>
                <div style={{ fontSize: 11, color: sub, marginTop: -2 }}>a tiny tracker i actually use</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={currency.code} onChange={e => setCurrency(CURRENCIES.find(c => c.code === e.target.value))} style={{ background: card, border: `1px solid ${border}`, color: txt, borderRadius: 12, padding: "8px 12px", fontSize: 13 }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
              </select>
              <button onClick={() => setDark(x => !x)} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${border}`, background: card, fontSize: 18 }}>
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </div>

        {/* Hero - more personal */}
        <div style={{ maxWidth: 720, margin: "-45px auto 0", padding: "0 20px" }}>
          <div style={{ borderRadius: 26, padding: "28px 30px", background: MAIN, boxShadow: "0 22px 65px rgba(109,40,217,0.45)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.75, fontWeight: 600 }}>Total spent this year</div>
                <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", letterSpacing: "-2.5px", lineHeight: 1, marginTop: 4 }}>
                  {fmtAmt(total, sym)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <button onClick={() => setConvertAll(x => !x)} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                  {convertAll ? "✅ Using Live Rates" : "💱 Convert All"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of your components remain mostly same, but with small text tweaks */}

        {/* Example: Recent Transactions title changed */}
        <div style={{ maxWidth: 720, margin: "20px auto", padding: "0 20px" }}>
          {view === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Budgets, Charts, etc. stay similar but with small copy changes */}

              {/* Recent Transactions */}
              <div style={{ ...cardStyle, padding: "24px 22px" }}>
                <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  Recent Expenses 
                  <span style={{ fontSize: 12, color: sub, fontWeight: 500 }}>(i keep forgetting to log coffee ☕)</span>
                </div>
                {/* ... rest same */}
              </div>
            </div>
          )}

          {/* Footer - much more human */}
          <div style={{ textAlign: "center", padding: "30px 20px 20px", color: sub, fontSize: 11, fontWeight: 500 }}>
            made with mild frustration and too much coffee in Dehradun • v0.9 "not perfect but works"
          </div>
        </div>
      </div>

      {/* Rest of your modals, chat, FABs remain mostly unchanged (I only cleaned a few texts) */}
      {/* ... (your existing modals, chat, etc.) */}
    </div>
  );
}