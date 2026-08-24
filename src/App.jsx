import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, X, Check, Pencil, Loader2, Flame, Home as HomeIcon,
  BookOpen, TrendingUp, MessageCircle, ChevronRight, ChevronLeft,
  Trash2, Send, Mic, ScanLine, Scale, Sparkles, ArrowUp, ArrowDown
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────
   TOKENS
   Background  #FAF7F1  warm oat
   Surface     #FFFFFF
   Ink         #262420  charcoal
   Ink-soft    #8A8478
   Line        #E8E2D4
   Sage        #6E8B6A  (protein / primary accent)
   Dune        #C9A876  (carbs)
   Sky         #8CA6BE  (fat)
   Clay        #C0714F  (over-target / warm warning)
   Display type: "Fraunces"  Body/UI: "Inter"
   ──────────────────────────────────────────────────────────────────────── */

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,340;9..144,480;9..144,600&family=Inter:wght@400;500;600;700&display=swap');";

const STYLES = `
${FONT_IMPORT}
.nt-root{
  --bg:#FAF7F1; --surface:#FFFFFF; --ink:#262420; --ink-soft:#8A8478;
  --line:#E8E2D4; --sage:#6E8B6A; --sage-soft:#E4EBE1; --dune:#C9A876;
  --dune-soft:#F3EADA; --sky:#8CA6BE; --sky-soft:#E7EDF3; --clay:#C0714F;
  --clay-soft:#F5E6DE;
  background:var(--bg); color:var(--ink); font-family:'Inter',sans-serif;
  height:100dvh; width:100%; max-width:560px; margin:0 auto; position:relative; overflow:hidden;
  box-sizing:border-box;
}
.nt-root *{ box-sizing:border-box; }
.nt-display{ font-family:'Fraunces',serif; }
.nt-scroll{ height:100%; overflow-y:auto; -webkit-overflow-scrolling:touch; }
.nt-scroll::-webkit-scrollbar{ width:0; }
.nt-card{ background:var(--surface); border:1px solid var(--line); border-radius:18px; }
.nt-btn{ font-family:'Inter',sans-serif; font-weight:600; border:none; cursor:pointer; transition:transform .15s ease, opacity .15s ease; }
.nt-btn:active{ transform:scale(0.97); }
.nt-btn-primary{ background:var(--ink); color:var(--bg); }
.nt-btn-primary:disabled{ opacity:.4; cursor:not-allowed; }
.nt-btn-ghost{ background:transparent; color:var(--ink-soft); }
.nt-input{ font-family:'Inter',sans-serif; border:1px solid var(--line); border-radius:12px; background:var(--surface); color:var(--ink); outline:none; }
.nt-input:focus{ border-color:var(--sage); }
.nt-fade-in{ animation:ntFadeIn .35s ease both; }
@keyframes ntFadeIn{ from{ opacity:0; transform:translateY(6px);} to{ opacity:1; transform:translateY(0);} }
.nt-pop{ animation:ntPop .4s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes ntPop{ from{ opacity:0; transform:scale(.9);} to{ opacity:1; transform:scale(1);} }
.nt-spin{ animation:ntSpin 1s linear infinite; }
@keyframes ntSpin{ to{ transform:rotate(360deg);} }
.nt-navbtn{ display:flex; flex-direction:column; align-items:center; gap:3px; background:none; border:none; cursor:pointer; padding:6px 10px; color:var(--ink-soft); }
.nt-navbtn.active{ color:var(--ink); }
.nt-bar-track{ background:var(--line); border-radius:999px; overflow:hidden; }
.nt-bar-fill{ height:100%; border-radius:999px; transition:width .5s ease; }
@media (prefers-reduced-motion: reduce){ .nt-fade-in,.nt-pop,.nt-bar-fill{ animation:none !important; transition:none !important; } }
`;

/* ── constants ─────────────────────────────────────────────────────── */

const ACTIVITY = [
  { id: "sedentary", label: "Sedentary", hint: "Little to no exercise", mult: 1.2 },
  { id: "light", label: "Lightly active", hint: "Exercise 1–3 days/week", mult: 1.375 },
  { id: "moderate", label: "Moderately active", hint: "Exercise 3–5 days/week", mult: 1.55 },
  { id: "very", label: "Very active", hint: "Exercise 6–7 days/week", mult: 1.725 },
  { id: "extreme", label: "Extremely active", hint: "Physical job or 2x/day training", mult: 1.9 },
];

const GOALS = [
  { id: "lose", label: "Lose weight", adj: -0.2, protein: 2.0 },
  { id: "maintain", label: "Maintain", adj: 0, protein: 1.6 },
  { id: "gain_muscle", label: "Gain muscle", adj: 0.12, protein: 2.0 },
  { id: "gain_weight", label: "Gain weight", adj: 0.18, protein: 1.7 },
  { id: "recomp", label: "Recomposition", adj: -0.08, protein: 2.1 },
];

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-workout", "Post-workout", "Other"];
const MACRO_COLOR = { protein: "var(--sage)", carbs: "var(--dune)", fat: "var(--sky)" };
const MACRO_SOFT = { protein: "var(--sage-soft)", carbs: "var(--dune-soft)", fat: "var(--sky-soft)" };

const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

function computeTargets(p) {
  const w = parseFloat(p.weight), h = parseFloat(p.height), a = parseFloat(p.age);
  if (!w || !h || !a) return null;
  const bmr = p.sex === "female" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;
  const activity = ACTIVITY.find((x) => x.id === p.activity) || ACTIVITY[1];
  const goal = GOALS.find((x) => x.id === p.goal) || GOALS[1];
  const tdee = bmr * activity.mult;
  const calories = Math.round((tdee * (1 + goal.adj)) / 10) * 10;
  const protein = Math.round(w * goal.protein);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

// Both endpoints are serverless functions (see /api) that hold the Anthropic
// API key server-side and call claude-sonnet-4-6 on the frontend's behalf.
async function parseFoodWithAI(text) {
  const res = await fetch("/api/parse-food", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("parse-food failed");
  return res.json(); // { items, clarify }
}

async function askCoach(messages, context) {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });
  if (!res.ok) throw new Error("coach failed");
  const data = await res.json();
  return data.reply;
}

/* ── small UI atoms ────────────────────────────────────────────────── */

function Ring({ pct, size = 168, stroke = 12, over }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={over ? "var(--clay)" : "var(--ink)"} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
        style={{ transition: "stroke-dashoffset .6s ease, stroke .3s ease" }}
      />
    </svg>
  );
}

function MacroBar({ label, unit = "g", consumed, target, color, soft }) {
  const remaining = target - consumed;
  const over = remaining < 0;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  return (
    <div className="nt-card nt-fade-in" style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
        <span>{label}</span>
        <span>{consumed}{unit} / {target}{unit}</span>
      </div>
      <div className="nt-bar-track" style={{ height: 8, background: soft }}>
        <div className="nt-bar-fill" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <div style={{ fontSize: 11.5, marginTop: 6, color: over ? "var(--clay)" : "var(--ink-soft)", fontWeight: 500 }}>
        {over ? `${Math.abs(remaining)}${unit} over` : `${remaining}${unit} remaining`}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--ink-soft)" }}>
      <Icon size={26} strokeWidth={1.5} style={{ marginBottom: 10, opacity: 0.6 }} />
      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14.5 }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

/* ── onboarding ────────────────────────────────────────────────────── */

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ name: "", weight: "", height: "", age: "", sex: "female", activity: "light", goal: "lose", target: "" });
  const totalSteps = 8;
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));

  const canNext = () => {
    if (step === 0) return p.name.trim().length > 0;
    if (step === 1) return parseFloat(p.weight) > 0;
    if (step === 2) return parseFloat(p.height) > 0;
    if (step === 3) return parseFloat(p.age) > 0;
    return true;
  };

  const targets = computeTargets(p);

  return (
    <div className="nt-scroll" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 5, padding: "22px 24px 0" }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? "var(--ink)" : "var(--line)", transition: "background .3s" }} />
        ))}
      </div>

      <div className="nt-fade-in" key={step} style={{ flex: 1, padding: "36px 26px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {step === 0 && (
          <>
            <div className="nt-display" style={{ fontSize: 26, marginBottom: 8 }}>Welcome. What should we call you?</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>We'll use this to greet you each day.</div>
            <input className="nt-input" style={{ padding: "14px 16px", fontSize: 16 }} placeholder="Your name" value={p.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </>
        )}
        {step === 1 && (
          <>
            <div className="nt-display" style={{ fontSize: 26, marginBottom: 8 }}>What's your current weight?</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>In kilograms.</div>
            <input className="nt-input" type="number" style={{ padding: "14px 16px", fontSize: 16 }} placeholder="e.g. 68" value={p.weight} onChange={(e) => set("weight", e.target.value)} />
          </>
        )}
        {step === 2 && (
          <>
            <div className="nt-display" style={{ fontSize: 26, marginBottom: 8 }}>What's your height?</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>In centimeters.</div>
            <input className="nt-input" type="number" style={{ padding: "14px 16px", fontSize: 16 }} placeholder="e.g. 165" value={p.height} onChange={(e) => set("height", e.target.value)} />
          </>
        )}
        {step === 3 && (
          <>
            <div className="nt-display" style={{ fontSize: 26, marginBottom: 8 }}>What's your age?</div>
            <input className="nt-input" type="number" style={{ padding: "14px 16px", fontSize: 16, marginTop: 14 }} placeholder="e.g. 27" value={p.age} onChange={(e) => set("age", e.target.value)} />
          </>
        )}
        {step === 4 && (
          <>
            <div className="nt-display" style={{ fontSize: 26, marginBottom: 16 }}>Sex</div>
            <div style={{ display: "flex", gap: 10 }}>
              {["female", "male"].map((s) => (
                <button key={s} className="nt-btn" onClick={() => set("sex", s)} style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: `1.5px solid ${p.sex === s ? "var(--ink)" : "var(--line)"}`, background: p.sex === s ? "var(--ink)" : "var(--surface)", color: p.sex === s ? "var(--bg)" : "var(--ink)", textTransform: "capitalize" }}>{s}</button>
              ))}
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <div className="nt-display" style={{ fontSize: 26, marginBottom: 16 }}>How active are you?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACTIVITY.map((a) => (
                <button key={a.id} className="nt-btn" onClick={() => set("activity", a.id)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${p.activity === a.id ? "var(--ink)" : "var(--line)"}`, background: p.activity === a.id ? "var(--sage-soft)" : "var(--surface)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{a.hint}</div>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 6 && (
          <>
            <div className="nt-display" style={{ fontSize: 26, marginBottom: 16 }}>What's your goal?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GOALS.map((g) => (
                <button key={g.id} className="nt-btn" onClick={() => set("goal", g.id)} style={{ textAlign: "left", padding: "13px 14px", borderRadius: 12, border: `1.5px solid ${p.goal === g.id ? "var(--ink)" : "var(--line)"}`, background: p.goal === g.id ? "var(--sage-soft)" : "var(--surface)", fontWeight: 600, fontSize: 14 }}>{g.label}</button>
              ))}
            </div>
          </>
        )}
        {step === 7 && (
          <>
            <div className="nt-display" style={{ fontSize: 24, marginBottom: 6 }}>Your daily target</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 18 }}>Based on your details — you can adjust anytime as you see real-world progress.</div>
            {targets && (
              <div className="nt-card nt-pop" style={{ padding: 20, textAlign: "center" }}>
                <div className="nt-display" style={{ fontSize: 40 }}>{targets.calories.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600, marginBottom: 16 }}>kcal / day</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {[["Protein", targets.protein, MACRO_COLOR.protein], ["Carbs", targets.carbs, MACRO_COLOR.carbs], ["Fat", targets.fat, MACRO_COLOR.fat]].map(([l, v, c]) => (
                    <div key={l} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, background: "var(--bg)" }}>
                      <div style={{ width: 8, height: 8, borderRadius: 99, background: c, margin: "0 auto 6px" }} />
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{v}g</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 14, lineHeight: 1.5 }}>
              These are estimates for general fitness tracking, not medical advice. Adjust based on how your weight actually trends.
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 24px 26px" }}>
        {step > 0 && (
          <button className="nt-btn nt-btn-ghost" onClick={() => setStep((s) => s - 1)} style={{ padding: "14px 18px", borderRadius: 12, display: "flex", alignItems: "center" }}>
            <ChevronLeft size={18} />
          </button>
        )}
        <button
          className="nt-btn nt-btn-primary"
          disabled={!canNext()}
          onClick={() => (step === totalSteps - 1 ? onDone({ ...p, ...targets }) : setStep((s) => s + 1))}
          style={{ flex: 1, padding: "14px 0", borderRadius: 12, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {step === totalSteps - 1 ? "Start tracking" : "Continue"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── add food modal ───────────────────────────────────────────────── */

function AddFoodModal({ onClose, onAdd }) {
  const [meal, setMeal] = useState("Breakfast");
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("input"); // input | loading | review | error
  const [parsed, setParsed] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const parse = async () => {
    if (!text.trim()) return;
    setPhase("loading");
    try {
      const json = await parseFoodWithAI(text);
      setParsed(json);
      setPhase("review");
    } catch (e) {
      setErrMsg("Couldn't reach the AI just now. You can try again, or enter values manually.");
      setPhase("error");
    }
  };

  const updateItem = (i, field, val) => {
    setParsed((p) => {
      const items = [...p.items];
      items[i] = { ...items[i], [field]: field === "name" || field === "unit" ? val : parseFloat(val) || 0 };
      return { ...p, items };
    });
  };
  const removeItem = (i) => setParsed((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const totals = parsed ? parsed.items.reduce((a, it) => ({
    calories: a.calories + (it.calories || 0), protein: a.protein + (it.protein || 0),
    carbs: a.carbs + (it.carbs || 0), fat: a.fat + (it.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }) : null;

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(38,36,32,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 }} onClick={onClose}>
      <div className="nt-pop" onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", width: "100%", maxHeight: "88%", borderRadius: "22px 22px 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
          <div className="nt-display" style={{ fontSize: 17 }}>Add food</div>
          <button className="nt-btn nt-btn-ghost" onClick={onClose} style={{ padding: 6 }}><X size={19} /></button>
        </div>

        <div className="nt-scroll" style={{ padding: 18, flex: 1 }}>
          {phase === "input" && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>MEAL TYPE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                {MEAL_TYPES.map((m) => (
                  <button key={m} className="nt-btn" onClick={() => setMeal(m)} style={{ padding: "7px 12px", borderRadius: 999, fontSize: 12.5, border: `1px solid ${meal === m ? "var(--ink)" : "var(--line)"}`, background: meal === m ? "var(--ink)" : "transparent", color: meal === m ? "var(--bg)" : "var(--ink)" }}>{m}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>WHAT DID YOU EAT?</div>
              <textarea
                className="nt-input" rows={4} autoFocus
                placeholder="e.g. 150g grilled chicken, one cup of rice and some vegetables"
                style={{ width: "100%", padding: 14, fontSize: 14.5, resize: "none" }}
                value={text} onChange={(e) => setText(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="nt-btn" style={{ padding: 10, borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}><Mic size={14} /> Voice</button>
                <button className="nt-btn" style={{ padding: 10, borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}><ScanLine size={14} /> Scan label</button>
              </div>
            </>
          )}

          {phase === "loading" && (
            <div style={{ textAlign: "center", padding: "50px 0", color: "var(--ink-soft)" }}>
              <Loader2 className="nt-spin" size={26} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13.5 }}>Estimating nutrition…</div>
            </div>
          )}

          {phase === "error" && (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--ink-soft)", fontSize: 13.5 }}>{errMsg}</div>
          )}

          {phase === "review" && parsed && (
            <div className="nt-fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--sage)", marginBottom: 10 }}>
                <Sparkles size={13} /> AI ESTIMATE — I understood this as
              </div>
              {parsed.clarify && (
                <div className="nt-card" style={{ padding: 12, marginBottom: 12, background: "var(--dune-soft)", border: "none", fontSize: 13 }}>{parsed.clarify}</div>
              )}
              {parsed.items.map((it, i) => (
                <div key={i} className="nt-card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <input className="nt-input" value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} style={{ flex: 1, padding: "7px 9px", fontSize: 13, fontWeight: 600 }} />
                    <button onClick={() => removeItem(i)} className="nt-btn nt-btn-ghost" style={{ padding: 6 }}><Trash2 size={14} /></button>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="nt-input" type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} style={{ width: 56, padding: "6px 7px", fontSize: 12 }} />
                    <input className="nt-input" value={it.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} style={{ width: 44, padding: "6px 7px", fontSize: 12 }} />
                    {["calories", "protein", "carbs", "fat"].map((f) => (
                      <input key={f} className="nt-input" type="number" value={it[f]} onChange={(e) => updateItem(i, f, e.target.value)} title={f} style={{ width: 48, padding: "6px 5px", fontSize: 12 }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)", marginTop: 4 }}>qty · unit · kcal · protein · carbs · fat</div>
                </div>
              ))}
              <div className="nt-card" style={{ padding: 14, marginTop: 4, background: "var(--bg)", border: "none" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>ESTIMATED TOTAL</div>
                <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                  <b>{Math.round(totals.calories)} kcal</b>
                  <span style={{ color: "var(--ink-soft)" }}>{Math.round(totals.protein)}g P · {Math.round(totals.carbs)}g C · {Math.round(totals.fat)}g F</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
          {phase === "input" && (
            <button className="nt-btn nt-btn-primary" disabled={!text.trim()} onClick={parse} style={{ flex: 1, padding: "14px 0", borderRadius: 12, fontSize: 14.5 }}>Estimate nutrition</button>
          )}
          {phase === "error" && (
            <button className="nt-btn nt-btn-primary" onClick={parse} style={{ flex: 1, padding: "14px 0", borderRadius: 12, fontSize: 14.5 }}>Try again</button>
          )}
          {phase === "review" && (
            <>
              <button className="nt-btn" onClick={() => setPhase("input")} style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid var(--line)", background: "transparent", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}><Pencil size={14} /> Edit text</button>
              <button className="nt-btn nt-btn-primary" onClick={() => onAdd({ meal, items: parsed.items, totals, time: new Date() })} style={{ flex: 1, padding: "14px 0", borderRadius: 12, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={16} /> Add to diary</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── home ──────────────────────────────────────────────────────────── */

function Home({ profile, entries, name }) {
  const today = todayStr();
  const todays = entries.filter((e) => e.date === today);
  const consumed = todays.reduce((a, e) => ({
    calories: a.calories + e.totals.calories, protein: a.protein + e.totals.protein,
    carbs: a.carbs + e.totals.carbs, fat: a.fat + e.totals.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const remaining = profile.calories - consumed.calories;
  const over = remaining < 0;
  const pct = consumed.calories / profile.calories;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "22px 20px 100px" }}>
      <div className="nt-display" style={{ fontSize: 21 }}>{greeting}, {name}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>

      <div className="nt-card nt-fade-in" style={{ marginTop: 20, padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ring pct={pct} over={over} />
          <div style={{ position: "absolute", textAlign: "center" }}>
            <div className="nt-display" style={{ fontSize: 30 }}>{Math.round(consumed.calories)}</div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>/ {profile.calories} kcal</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 13.5, fontWeight: 600, color: over ? "var(--clay)" : "var(--ink)", display: "flex", alignItems: "center", gap: 4 }}>
          {over ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {over ? `${Math.abs(remaining)} kcal over` : `${remaining} kcal remaining`}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <MacroBar label="Protein" consumed={Math.round(consumed.protein)} target={profile.protein} color={MACRO_COLOR.protein} soft={MACRO_SOFT.protein} />
        <MacroBar label="Carbs" consumed={Math.round(consumed.carbs)} target={profile.carbs} color={MACRO_COLOR.carbs} soft={MACRO_SOFT.carbs} />
        <MacroBar label="Fat" consumed={Math.round(consumed.fat)} target={profile.fat} color={MACRO_COLOR.fat} soft={MACRO_SOFT.fat} />
      </div>

      <div style={{ marginTop: 26, marginBottom: 10, fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", letterSpacing: 0.3 }}>TODAY'S MEALS</div>
      {todays.length === 0 ? (
        <EmptyState icon={Flame} title="Nothing logged yet" sub="Tap the + button to add your first meal today." />
      ) : (
        todays.slice().reverse().map((e) => (
          <div key={e.id} className="nt-card nt-fade-in" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{e.meal}</span>
              <span>{new Date(e.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
            </div>
            <div style={{ fontSize: 13.5 }}>{e.items.map((i) => i.name).join(", ")}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>{Math.round(e.totals.calories)} kcal · {Math.round(e.totals.protein)}g P · {Math.round(e.totals.carbs)}g C · {Math.round(e.totals.fat)}g F</div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── diary ─────────────────────────────────────────────────────────── */

function Diary({ entries, onDelete }) {
  const byDate = {};
  entries.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <div style={{ padding: "22px 20px 100px" }}>
      <div className="nt-display" style={{ fontSize: 21, marginBottom: 16 }}>Diary</div>
      {dates.length === 0 && <EmptyState icon={BookOpen} title="Your diary is empty" sub="Everything you log will show up here, organized by day." />}
      {dates.map((d) => {
        const dayEntries = byDate[d];
        const dayTotal = dayEntries.reduce((a, e) => a + e.totals.calories, 0);
        return (
          <div key={d} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8 }}>
              <span>{d === todayStr() ? "Today" : new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
              <span>{Math.round(dayTotal)} kcal</span>
            </div>
            {dayEntries.map((e) => (
              <div key={e.id} className="nt-card nt-fade-in" style={{ padding: 14, marginBottom: 8, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{e.meal}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{new Date(e.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                    <button className="nt-btn nt-btn-ghost" onClick={() => onDelete(e.id)} style={{ padding: 2 }}><Trash2 size={13} /></button>
                  </div>
                </div>
                {e.items.map((it, idx) => (
                  <div key={idx} style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{it.name} — {it.quantity}{it.unit}</div>
                ))}
                <div style={{ fontSize: 12, marginTop: 6, fontWeight: 500 }}>{Math.round(e.totals.calories)} kcal · {Math.round(e.totals.protein)}g protein · {Math.round(e.totals.carbs)}g carbs · {Math.round(e.totals.fat)}g fat</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ── progress ──────────────────────────────────────────────────────── */

function Progress({ profile, weightEntries, onAddWeight, entries }) {
  const [val, setVal] = useState("");
  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0]?.weight ?? parseFloat(profile.weight);
  const current = sorted[sorted.length - 1]?.weight ?? parseFloat(profile.weight);
  const target = parseFloat(profile.target) || current;
  const change = current - start;

  const last7 = entries.filter((e) => {
    const d = new Date(e.date); const diff = (new Date() - d) / 86400000; return diff <= 7;
  });
  const days7 = new Set(last7.map((e) => e.date)).size || 1;
  const avgCal = Math.round(last7.reduce((a, e) => a + e.totals.calories, 0) / days7);
  const avgProtein = Math.round(last7.reduce((a, e) => a + e.totals.protein, 0) / days7);

  const chartW = 280, chartH = 90;
  const weights = sorted.length ? sorted.map((s) => s.weight) : [current];
  const min = Math.min(...weights, target) - 1, max = Math.max(...weights, target) + 1;
  const pts = sorted.map((s, i) => {
    const x = sorted.length > 1 ? (i / (sorted.length - 1)) * chartW : chartW / 2;
    const y = chartH - ((s.weight - min) / (max - min || 1)) * chartH;
    return `${x},${y}`;
  });

  return (
    <div style={{ padding: "22px 20px 100px" }}>
      <div className="nt-display" style={{ fontSize: 21, marginBottom: 16 }}>Progress</div>

      <div className="nt-card" style={{ padding: 18, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Starting</div><div style={{ fontWeight: 700 }}>{start} kg</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Current</div><div className="nt-display" style={{ fontWeight: 700, fontSize: 17 }}>{current} kg</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Goal</div><div style={{ fontWeight: 700 }}>{target} kg</div></div>
        </div>
        {sorted.length > 1 && (
          <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} height={chartH} style={{ marginTop: 6 }}>
            <polyline points={pts.join(" ")} fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {sorted.map((s, i) => {
              const [x, y] = pts[i].split(",");
              return <circle key={i} cx={x} cy={y} r={3} fill="var(--sage)" />;
            })}
          </svg>
        )}
        <div style={{ fontSize: 12, color: change <= 0 ? "var(--sage)" : "var(--clay)", fontWeight: 600, marginTop: 6 }}>
          {change === 0 ? "No change yet" : `${change > 0 ? "+" : ""}${change.toFixed(1)} kg since you started`}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input className="nt-input" type="number" placeholder="Log today's weight (kg)" value={val} onChange={(e) => setVal(e.target.value)} style={{ flex: 1, padding: "10px 12px", fontSize: 13 }} />
          <button className="nt-btn nt-btn-primary" onClick={() => { if (parseFloat(val) > 0) { onAddWeight(parseFloat(val)); setVal(""); } }} style={{ padding: "0 16px", borderRadius: 10, fontSize: 13 }}>Log</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <div className="nt-card" style={{ flex: 1, padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}>7-DAY AVG CALORIES</div>
          <div className="nt-display" style={{ fontSize: 22, marginTop: 4 }}>{avgCal || "—"}</div>
        </div>
        <div className="nt-card" style={{ flex: 1, padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}>7-DAY AVG PROTEIN</div>
          <div className="nt-display" style={{ fontSize: 22, marginTop: 4 }}>{avgProtein || "—"}g</div>
        </div>
      </div>
    </div>
  );
}

/* ── coach ─────────────────────────────────────────────────────────── */

function Coach({ profile, entries, name }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hi ${name}, I'm your nutrition coach. Ask me anything about today's food, your targets, or what to eat next.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    const next = [...messages, { role: "user", text: userMsg }];
    setMessages(next); setInput(""); setLoading(true);

    const today = todayStr();
    const todays = entries.filter((e) => e.date === today);
    const consumed = todays.reduce((a, e) => ({
      calories: a.calories + e.totals.calories, protein: a.protein + e.totals.protein,
      carbs: a.carbs + e.totals.carbs, fat: a.fat + e.totals.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const context = {
      goal: profile.goal,
      targets: { calories: profile.calories, protein: profile.protein, carbs: profile.carbs, fat: profile.fat },
      consumed: {
        calories: Math.round(consumed.calories), protein: Math.round(consumed.protein),
        carbs: Math.round(consumed.carbs), fat: Math.round(consumed.fat),
      },
      todaysMeals: todays.map((e) => `${e.meal}: ${e.items.map((i) => i.name).join(", ")}`),
    };

    try {
      const reply = await askCoach(next, context);
      setMessages((m) => [...m, { role: "assistant", text: reply || "Sorry, I didn't catch that — could you rephrase?" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "I couldn't connect just now — mind trying again in a moment?" }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["What should I eat for dinner?", "Am I eating enough protein today?", "Give me a high-protein snack idea"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="nt-display" style={{ fontSize: 21, padding: "22px 20px 4px" }}>AI Coach</div>
      <div ref={scrollRef} className="nt-scroll" style={{ flex: 1, padding: "10px 20px" }}>
        {messages.map((m, i) => (
          <div key={i} className="nt-fade-in" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: 16, fontSize: 13.5, lineHeight: 1.5, background: m.role === "user" ? "var(--ink)" : "var(--surface)", color: m.role === "user" ? "var(--bg)" : "var(--ink)", border: m.role === "user" ? "none" : "1px solid var(--line)" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div className="nt-card" style={{ padding: "10px 14px" }}><Loader2 className="nt-spin" size={15} /></div>
          </div>
        )}
        {messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {suggestions.map((s) => (
              <button key={s} className="nt-btn" onClick={() => setInput(s)} style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--line)", background: "transparent", fontSize: 12 }}>{s}</button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 16px 96px", borderTop: "1px solid var(--line)" }}>
        <input className="nt-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask your coach…" style={{ flex: 1, padding: "12px 14px", fontSize: 13.5 }} />
        <button className="nt-btn nt-btn-primary" onClick={send} disabled={loading} style={{ width: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><Send size={16} /></button>
      </div>
    </div>
  );
}

/* ── root app ──────────────────────────────────────────────────────── */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [weightEntries, setWeightEntries] = useState([]);
  const [tab, setTab] = useState("home");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem("nt_profile");
      if (p) setProfile(JSON.parse(p));
    } catch (e) { /* no profile yet */ }
    try {
      const f = localStorage.getItem("nt_foodEntries");
      if (f) setEntries(JSON.parse(f));
    } catch (e) { /* none yet */ }
    try {
      const w = localStorage.getItem("nt_weightEntries");
      if (w) setWeightEntries(JSON.parse(w));
    } catch (e) { /* none yet */ }
    setLoading(false);
  }, []);

  const persist = useCallback((key, value) => {
    try { localStorage.setItem(`nt_${key}`, JSON.stringify(value)); } catch (e) { /* best effort, e.g. private browsing */ }
  }, []);

  const finishOnboarding = (p) => { setProfile(p); persist("profile", p); };

  const addEntry = (data) => {
    const entry = { id: uid(), date: todayStr(), time: data.time, meal: data.meal, items: data.items, totals: data.totals };
    const next = [...entries, entry];
    setEntries(next); persist("foodEntries", next); setShowAdd(false);
  };
  const deleteEntry = (id) => { const next = entries.filter((e) => e.id !== id); setEntries(next); persist("foodEntries", next); };
  const addWeight = (weight) => {
    const next = [...weightEntries.filter((w) => w.date !== todayStr()), { date: todayStr(), weight }];
    setWeightEntries(next); persist("weightEntries", next);
  };

  if (loading) {
    return (
      <div className="nt-root"><style>{STYLES}</style>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 className="nt-spin" size={22} color="#8A8478" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="nt-root">
        <style>{STYLES}</style>
        <Onboarding onDone={finishOnboarding} />
      </div>
    );
  }

  const NAV = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "diary", label: "Diary", icon: BookOpen },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "coach", label: "Coach", icon: MessageCircle },
  ];

  return (
    <div className="nt-root">
      <style>{STYLES}</style>
      <div className="nt-scroll" style={{ height: "100%" }}>
        {tab === "home" && <Home profile={profile} entries={entries} name={profile.name} />}
        {tab === "diary" && <Diary entries={entries} onDelete={deleteEntry} />}
        {tab === "progress" && <Progress profile={profile} weightEntries={weightEntries} onAddWeight={addWeight} entries={entries} />}
        {tab === "coach" && <Coach profile={profile} entries={entries} name={profile.name} />}
      </div>

      {tab !== "coach" && (
        <button
          className="nt-btn nt-btn-primary nt-pop"
          onClick={() => setShowAdd(true)}
          style={{ position: "absolute", right: 20, bottom: 84, width: 54, height: 54, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(38,36,32,0.25)" }}
        >
          <Plus size={22} />
        </button>
      )}

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "var(--surface)", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-around", padding: "8px 0 calc(10px + env(safe-area-inset-bottom))" }}>
        {NAV.map((n) => (
          <button key={n.id} className={`nt-navbtn ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
            <n.icon size={19} strokeWidth={tab === n.id ? 2.3 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: tab === n.id ? 700 : 500 }}>{n.label}</span>
          </button>
        ))}
      </div>

      {showAdd && <AddFoodModal onClose={() => setShowAdd(false)} onAdd={addEntry} />}
    </div>
  );
}
