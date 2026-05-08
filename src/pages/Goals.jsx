import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function mkey(d) { const dt = new Date(d); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"); }

const CATS = ["Food","Travel","Shopping","Entertainment","Course","Electronics","Health","Utilities","Rent","Fuel","Other"];
const CAT_ICONS = {Food:"🍔",Travel:"✈️",Shopping:"🛍️",Entertainment:"🎬",Course:"📚",Electronics:"💻",Health:"💊",Utilities:"⚡",Rent:"🏠",Fuel:"⛽",Other:"💡"};

const card = { background:"linear-gradient(145deg,#1A2333,#0F172A)", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 30px rgba(0,0,0,0.4)", borderRadius:"16px" };
const inp  = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", padding:"13px 16px", color:"#E5E7EB", fontSize:"14px", outline:"none", transition:"border-color .2s", fontFamily:"inherit", boxSizing:"border-box" };

// ── Add Budget Panel ───────────────────────────────────────────
function AddBudgetPanel({ open, onClose, onSave }) {
  const [category, setCategory] = useState("Food");
  const [limit,    setLimit]    = useState("");
  const [saving,   setSaving]   = useState(false);
  useEffect(() => { if (open) { setCategory("Food"); setLimit(""); } }, [open]);
  async function save() {
    if (!limit || isNaN(limit)) return alert("Enter a valid amount");
    setSaving(true);
    try { await onSave({ category, limit: parseFloat(limit) }); onClose(); }
    catch (e) { alert("Failed: " + e.message); }
    setSaving(false);
  }
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 style={{color:"white",fontWeight:"700",fontSize:"16px"}}>Set Budget Goal</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(251,191,36,0.15)",color:"#FBBF24",border:"1px solid rgba(251,191,36,0.2)"}}>Budget</span>
        </div>
        <div className="px-5 pt-4 pb-4 space-y-3">
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{...inp,background:"#0F172A"}}>
              {CATS.map(c=><option key={c} style={{background:"#0F172A"}}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Monthly Limit (₹)</label>
            <input type="number" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="e.g. 5000" style={inp}
              onFocus={e=>e.target.style.borderColor="#FBBF24"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(251,191,36,0.4)":"linear-gradient(135deg,#FBBF24,#D97706)",border:"none",borderRadius:"12px",color:"#1a1a00",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"Saving...":"Set Budget"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Add Savings Panel ──────────────────────────────────────────
function AddSavingsPanel({ open, onClose, onSave }) {
  const [name,   setName]   = useState("");
  const [target, setTarget] = useState("");
  const [saved,  setSaved]  = useState("");
  const [emoji,  setEmoji]  = useState("🎯");
  const [saving, setSaving] = useState(false);
  const EMOJIS = ["🎯","📱","✈️","🏠","🚗","💻","📚","👟","💍","🎸","🏋️","🌴"];
  useEffect(() => { if (open) { setName(""); setTarget(""); setSaved(""); setEmoji("🎯"); } }, [open]);
  async function save() {
    if (!name.trim() || !target) return alert("Fill all fields");
    setSaving(true);
    try { await onSave({ name:name.trim(), target:parseFloat(target), saved:parseFloat(saved)||0, emoji }); onClose(); }
    catch (e) { alert("Failed: " + e.message); }
    setSaving(false);
  }
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 style={{color:"white",fontWeight:"700",fontSize:"16px"}}>New Savings Goal</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(52,211,153,0.15)",color:"#34D399",border:"1px solid rgba(52,211,153,0.2)"}}>Goal</span>
        </div>
        <div className="px-5 pt-4 pb-4 space-y-3">
          {/* Emoji picker */}
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Pick Icon</label>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {EMOJIS.map(e=>(
                <button key={e} onClick={()=>setEmoji(e)} style={{fontSize:"22px",padding:"4px 8px",borderRadius:"8px",border:`1px solid ${emoji===e?"rgba(52,211,153,0.5)":"rgba(255,255,255,0.08)"}`,background:emoji===e?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)",cursor:"pointer"}}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Goal Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. New iPhone, Travel to Goa" style={inp}
              onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Target Amount (₹)</label>
            <input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="e.g. 50000" style={inp}
              onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Already Saved (₹) — optional</label>
            <input type="number" value={saved} onChange={e=>setSaved(e.target.value)} placeholder="0" style={inp}
              onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(52,211,153,0.4)":"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"12px",color:"#022C22",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"Saving...":"Create Goal"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Update Saved Amount Panel ──────────────────────────────────
function UpdateSavedPanel({ open, goal, onClose, onUpdate }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setAmount(""); }, [open]);
  async function save() {
    if (!amount) return;
    setSaving(true);
    try { await onUpdate(goal.id, (goal.saved || 0) + parseFloat(amount)); onClose(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }
  if (!goal) return null;
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="px-5 pb-3 pt-2" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <h3 style={{color:"white",fontWeight:"700",fontSize:"16px"}}>{goal.emoji} Add to "{goal.name}"</h3>
          <p style={{color:"#6B7280",fontSize:"12px",marginTop:"3px"}}>Currently saved: {fmt(goal.saved||0)} / {fmt(goal.target)}</p>
        </div>
        <div className="px-5 pt-4 pb-4">
          <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Amount to Add (₹)</label>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 1000" style={inp}
            onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
        </div>
        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(52,211,153,0.4)":"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"12px",color:"#022C22",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"Saving...":"Add Amount"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function Goals({ firestoreData, user }) {
  const [tab,           setTab]           = useState("budget");
  const [budgets,       setBudgets]       = useState([]);
  const [savings,       setSavings]       = useState([]);
  const [showBudget,    setShowBudget]    = useState(false);
  const [showSavings,   setShowSavings]   = useState(false);
  const [updateGoal,    setUpdateGoal]    = useState(null);
  const [vis,           setVis]           = useState(false);

  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const uid = user?.uid;

  // ── Listen to budgets from Firestore ──
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "budgets"),
      snap => setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error(err)
    );
    return () => unsub();
  }, [uid]);

  // ── Listen to savings goals from Firestore ──
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "savingsGoals"),
      snap => setSavings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error(err)
    );
    return () => unsub();
  }, [uid]);

  // ── Firestore actions ──
  const addBudget = useCallback(async (data) => {
    await addDoc(collection(db, "users", uid, "budgets"), { ...data, createdAt: serverTimestamp() });
  }, [uid]);

  const deleteBudget = useCallback(async (id) => {
    await deleteDoc(doc(db, "users", uid, "budgets", id));
  }, [uid]);

  const addSavingsGoal = useCallback(async (data) => {
    await addDoc(collection(db, "users", uid, "savingsGoals"), { ...data, createdAt: serverTimestamp() });
  }, [uid]);

  const deleteSavingsGoal = useCallback(async (id) => {
    await deleteDoc(doc(db, "users", uid, "savingsGoals", id));
  }, [uid]);

  const updateSaved = useCallback(async (id, newSaved) => {
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", uid, "savingsGoals", id), { saved: newSaved });
  }, [uid]);

  // ── Current month spendings ──
  const { spendings = [] } = firestoreData || {};
  const cm = mkey(new Date().toISOString());
  const monthSpendings = spendings.filter(e => mkey(e.date) === cm);

  return (
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Goals</h1>
          <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>Budget limits & savings targets</p>
        </div>
        <button onClick={()=>tab==="budget"?setShowBudget(true):setShowSavings(true)}
          className="flex items-center justify-center rounded-full transition-all hover:scale-110"
          style={{width:"44px",height:"44px",background:tab==="budget"?"linear-gradient(135deg,#FBBF24,#D97706)":"linear-gradient(135deg,#34D399,#059669)",border:"none",color:tab==="budget"?"#1a1a00":"#022C22",fontSize:"22px",cursor:"pointer",boxShadow:tab==="budget"?"0 6px 16px rgba(251,191,36,0.4)":"0 6px 16px rgba(52,211,153,0.4)"}}>
          +
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        {[["budget","🎯 Budget Goals"],["savings","💰 Savings Goals"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab===id ? (id==="budget"?"rgba(251,191,36,0.15)":"rgba(52,211,153,0.15)") : "rgba(255,255,255,0.04)",
              border: tab===id ? (id==="budget"?"1px solid rgba(251,191,36,0.3)":"1px solid rgba(52,211,153,0.3)") : "1px solid rgba(255,255,255,0.08)",
              color: tab===id ? (id==="budget"?"#FBBF24":"#34D399") : "#6B7280",
              cursor:"pointer",fontFamily:"inherit",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ BUDGET GOALS TAB ══ */}
      {tab === "budget" && (
        <>
          {budgets.length === 0 ? (
            <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
              <p style={{fontSize:"40px",marginBottom:"10px"}}>🎯</p>
              <p style={{fontSize:"15px",color:"#E5E7EB",fontWeight:"600",marginBottom:"6px"}}>No Budget Goals Yet</p>
              <p style={{fontSize:"13px"}}>Set monthly spending limits to stay on track</p>
              <button onClick={()=>setShowBudget(true)} style={{marginTop:"16px",padding:"10px 24px",background:"linear-gradient(135deg,#FBBF24,#D97706)",border:"none",borderRadius:"10px",color:"#1a1a00",fontWeight:"700",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                + Set First Budget
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map(goal => {
                const spent = monthSpendings.filter(e => e.type === goal.category).reduce((s,e)=>s+e.amount,0);
                const pct   = goal.limit > 0 ? Math.min(Math.round((spent/goal.limit)*100), 100) : 0;
                const over  = spent > goal.limit;
                const warn  = pct >= 80 && !over;
                const color = over ? "#F87171" : warn ? "#FBBF24" : "#34D399";
                const remaining = goal.limit - spent;
                return (
                  <div key={goal.id} style={{...card,padding:"18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        <span style={{fontSize:"24px"}}>{CAT_ICONS[goal.category]||"💡"}</span>
                        <div>
                          <p style={{color:"#E5E7EB",fontSize:"15px",fontWeight:"600"}}>{goal.category}</p>
                          <p style={{color:"#6B7280",fontSize:"11px",fontFamily:"monospace"}}>Limit: {fmt(goal.limit)} / month</p>
                        </div>
                      </div>
                      <button onClick={()=>deleteBudget(goal.id)}
                        style={{color:"#4B5563",background:"none",border:"none",cursor:"pointer",fontSize:"16px",padding:"2px 6px"}}
                        onMouseEnter={e=>e.currentTarget.style.color="#F87171"}
                        onMouseLeave={e=>e.currentTarget.style.color="#4B5563"}>✕</button>
                    </div>
                    <div style={{height:"8px",background:"rgba(255,255,255,0.06)",borderRadius:"99px",overflow:"hidden",marginBottom:"8px"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:"99px",transition:"width .5s ease"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <p style={{fontSize:"12px",color,fontWeight:"600"}}>
                        {over ? `⚠️ Over by ${fmt(Math.abs(remaining))}` : warn ? `⚡ ${fmt(remaining)} left` : `✅ ${fmt(remaining)} left`}
                      </p>
                      <p style={{fontSize:"11px",color:"#6B7280",fontFamily:"monospace"}}>{fmt(spent)} / {fmt(goal.limit)} · {pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ SAVINGS GOALS TAB ══ */}
      {tab === "savings" && (
        <>
          {savings.length === 0 ? (
            <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
              <p style={{fontSize:"40px",marginBottom:"10px"}}>💰</p>
              <p style={{fontSize:"15px",color:"#E5E7EB",fontWeight:"600",marginBottom:"6px"}}>No Savings Goals Yet</p>
              <p style={{fontSize:"13px"}}>Create a target and track your progress</p>
              <button onClick={()=>setShowSavings(true)} style={{marginTop:"16px",padding:"10px 24px",background:"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"10px",color:"#022C22",fontWeight:"700",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                + Create First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {savings.map(goal => {
                const pct  = goal.target > 0 ? Math.min(Math.round((goal.saved/goal.target)*100), 100) : 0;
                const done = pct >= 100;
                const color = done ? "#FBBF24" : "#34D399";
                return (
                  <div key={goal.id} style={{...card,padding:"18px",border:done?"1px solid rgba(251,191,36,0.2)":"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                        <span style={{fontSize:"28px"}}>{goal.emoji||"🎯"}</span>
                        <div>
                          <p style={{color:"#E5E7EB",fontSize:"15px",fontWeight:"600"}}>{goal.name}</p>
                          <p style={{color:"#6B7280",fontSize:"11px",fontFamily:"monospace"}}>
                            {fmt(goal.saved||0)} / {fmt(goal.target)} saved
                          </p>
                        </div>
                      </div>
                      <button onClick={()=>deleteSavingsGoal(goal.id)}
                        style={{color:"#4B5563",background:"none",border:"none",cursor:"pointer",fontSize:"16px",padding:"2px 6px"}}
                        onMouseEnter={e=>e.currentTarget.style.color="#F87171"}
                        onMouseLeave={e=>e.currentTarget.style.color="#4B5563"}>✕</button>
                    </div>
                    <div style={{height:"10px",background:"rgba(255,255,255,0.06)",borderRadius:"99px",overflow:"hidden",marginBottom:"10px"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:done?"linear-gradient(90deg,#FBBF24,#F59E0B)":"linear-gradient(90deg,#34D399,#059669)",borderRadius:"99px",transition:"width .5s ease"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <p style={{fontSize:"12px",color,fontWeight:"600"}}>
                        {done ? "🎉 Goal Achieved!" : `${pct}% complete · ${fmt(goal.target-(goal.saved||0))} to go`}
                      </p>
                      {!done && (
                        <button onClick={()=>setUpdateGoal(goal)}
                          style={{padding:"5px 12px",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:"8px",color:"#34D399",fontSize:"11px",fontWeight:"600",cursor:"pointer",fontFamily:"inherit"}}>
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <AddBudgetPanel  open={showBudget}  onClose={()=>setShowBudget(false)}  onSave={addBudget}/>
      <AddSavingsPanel open={showSavings} onClose={()=>setShowSavings(false)} onSave={addSavingsGoal}/>
      <UpdateSavedPanel open={!!updateGoal} goal={updateGoal} onClose={()=>setUpdateGoal(null)} onUpdate={updateSaved}/>
    </div>
  );
}
