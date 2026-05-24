import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function mkey(d) { const dt = new Date(d); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"); }
function fmtDate(s) { 
  const d = new Date(s); 
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function daysBetween(d1, d2) {
  return Math.ceil((new Date(d2) - new Date(d1)) / 86400000);
}

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
              {CATS.map(c=><option key={c} style={{background:"#0F172A",color:"#E5E7EB",fontFamily:"system-ui, -apple-system, sans-serif",fontStyle:"normal",fontWeight:"normal"}}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Monthly Limit (₹)</label>
            <input type="number" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="e.g. 5000" style={inp}/>
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
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"85vh",overflowY:"auto"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 style={{color:"white",fontWeight:"700",fontSize:"16px"}}>New Savings Goal</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(52,211,153,0.15)",color:"#34D399",border:"1px solid rgba(52,211,153,0.2)"}}>Goal</span>
        </div>
        <div className="px-5 pt-4 pb-4 space-y-3">
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Pick Icon</label>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {EMOJIS.map(e=>(
                <button key={e} onClick={()=>setEmoji(e)} style={{fontSize:"22px",padding:"4px 8px",borderRadius:"8px",border:`1px solid ${emoji===e?"rgba(52,211,153,0.5)":"rgba(255,255,255,0.08)"}`,background:emoji===e?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)",cursor:"pointer"}}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Goal Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. New iPhone" style={inp}/>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Target Amount (₹)</label>
            <input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="e.g. 50000" style={inp}/>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Already Saved (₹) — optional</label>
            <input type="number" value={saved} onChange={e=>setSaved(e.target.value)} placeholder="0" style={inp}/>
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
          <p style={{color:"#6B7280",fontSize:"12px",marginTop:"3px"}}>Currently: {fmt(goal.saved||0)} / {fmt(goal.target)}</p>
        </div>
        <div className="px-5 pt-4 pb-4">
          <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Amount to Add (₹)</label>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 1000" style={inp}/>
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

// ✨ NEW: Create Spending Pool Panel
function CreatePoolPanel({ open, onClose, onSave, allCategories }) {
  const [name,      setName]      = useState("");
  const [amount,    setAmount]    = useState("");
  const [days,      setDays]      = useState("");
  const [trackType, setTrackType] = useState("all"); // "all" or "category"
  const [category,  setCategory]  = useState("Food");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setAmount(""); setDays("");
      setTrackType("all"); setCategory("Food");
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  async function save() {
    if (!name.trim() || !amount || !days) return alert("Fill all fields");
    if (parseInt(days) < 1 || parseInt(days) > 365) return alert("Days must be 1-365");
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        amount: parseFloat(amount),
        days: parseInt(days),
        trackType,                                  // "all" or "category"
        category: trackType === "category" ? category : null,
        startDate,
        active: true,
      });
      onClose();
    } catch (e) { alert("Failed: " + e.message); }
    setSaving(false);
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"90vh",overflowY:"auto"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 style={{color:"white",fontWeight:"700",fontSize:"16px"}}>💸 Create Spending Pool</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(139,92,246,0.15)",color:"#8B5CF6",border:"1px solid rgba(139,92,246,0.2)"}}>Pool</span>
        </div>
        <div className="px-5 pt-4 pb-4 space-y-3">
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Pool Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Goa Trip, Monthly Food" style={inp}/>
          </div>

          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Amount (₹)</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 10000" style={inp}/>
          </div>

          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Duration (Days)</label>
            <input type="number" value={days} onChange={e=>setDays(e.target.value)} placeholder="e.g. 15" style={inp}/>
            <p style={{color:"#4B5563",fontSize:"11px",marginTop:"4px"}}>
              💡 Try: 7 (week), 15 (half-month), 30 (month)
            </p>
          </div>

          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Track Spending From</label>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>setTrackType("all")} style={{
                flex:1, padding:"10px", borderRadius:"10px", cursor:"pointer", fontFamily:"inherit",
                background: trackType==="all" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                border: trackType==="all" ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: trackType==="all" ? "#8B5CF6" : "#9CA3AF",
                fontSize:"12px", fontWeight:600,
              }}>
                🌐 All Categories
              </button>
              <button onClick={()=>setTrackType("category")} style={{
                flex:1, padding:"10px", borderRadius:"10px", cursor:"pointer", fontFamily:"inherit",
                background: trackType==="category" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                border: trackType==="category" ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: trackType==="category" ? "#8B5CF6" : "#9CA3AF",
                fontSize:"12px", fontWeight:600,
              }}>
                🎯 Specific
              </button>
            </div>
          </div>

          {trackType === "category" && (
            <div>
              <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Category</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} style={{...inp, background:"#0F172A"}}>
                {[...CATS, ...allCategories.map(c => c.name).filter(n => !CATS.includes(n))].map(c => (
                  <option key={c} style={{background:"#0F172A",color:"#E5E7EB",fontStyle:"normal",fontWeight:"normal"}}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Start Date</label>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inp}/>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(139,92,246,0.4)":"linear-gradient(135deg,#8B5CF6,#6D28D9)",border:"none",borderRadius:"12px",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"Creating...":"Create Pool"}
          </button>
        </div>
      </div>
    </>
  );
}

// ✨ NEW: Pool Card Component
function PoolCard({ pool, spendings, onDelete }) {
  const startDate = new Date(pool.startDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + pool.days);

  const daysElapsed = Math.max(0, Math.min(daysBetween(startDate, today), pool.days));
  const daysLeft = Math.max(0, pool.days - daysElapsed);
  const isExpired = today >= endDate;

  // Filter spendings within pool date range AND optionally by category
  const poolSpendings = spendings.filter(s => {
    const sDate = new Date(s.date);
    if (sDate < startDate || sDate > endDate) return false;
    if (pool.trackType === "category" && pool.category) {
      return s.type === pool.category;
    }
    return true;
  });

  const spent = poolSpendings.reduce((sum, s) => sum + Number(s.amount), 0);
  const remaining = pool.amount - spent;
  const pctUsed = Math.min(100, Math.round((spent / pool.amount) * 100));
  const isOver = spent > pool.amount;

  // Daily average + projection
  const dailyAvg = daysElapsed > 0 ? spent / daysElapsed : 0;
  const projectedTotal = dailyAvg * pool.days;
  const willOverspend = !isExpired && projectedTotal > pool.amount && daysElapsed > 0;
  const projectedOverBy = Math.max(0, projectedTotal - pool.amount);

  // Determine status color
  let statusColor = "#34D399"; // green = good
  let statusMsg = "✅ On track";
  if (isExpired) {
    if (isOver) { statusColor = "#F87171"; statusMsg = `❌ Overspent by ${fmt(spent - pool.amount)}`; }
    else { statusColor = "#FBBF24"; statusMsg = `🏁 Completed · Saved ${fmt(remaining)}`; }
  } else if (isOver) {
    statusColor = "#F87171"; statusMsg = `🔴 Over budget by ${fmt(spent - pool.amount)}`;
  } else if (willOverspend) {
    statusColor = "#FBBF24"; statusMsg = `⚠️ Will exceed by ${fmt(projectedOverBy)}`;
  } else if (pctUsed >= 80) {
    statusColor = "#FBBF24"; statusMsg = `⚡ ${pctUsed}% used`;
  }

  return (
    <div style={{...card, padding:"16px", border:`1px solid ${statusColor}20`, marginBottom:"12px", opacity: isExpired ? 0.85 : 1}}>
      
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px"}}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px"}}>
            <span style={{fontSize:"18px"}}>{pool.trackType==="category" ? (CAT_ICONS[pool.category]||"💡") : "💸"}</span>
            <p style={{color:"#E5E7EB", fontSize:"15px", fontWeight:700}}>{pool.name}</p>
            {isExpired && <span style={{padding:"2px 8px", background:"rgba(107,114,128,0.2)", borderRadius:"10px", fontSize:"10px", color:"#9CA3AF"}}>Ended</span>}
          </div>
          <p style={{color:"#6B7280", fontSize:"11px", fontFamily:"monospace"}}>
            {fmt(pool.amount)} for {pool.days} days
            {pool.trackType === "category" && ` · ${pool.category} only`}
          </p>
        </div>
        <button onClick={()=>onDelete(pool.id)} style={{color:"#4B5563", background:"none", border:"none", cursor:"pointer", fontSize:"16px", padding:"2px 6px"}}
          onMouseEnter={e=>e.currentTarget.style.color="#F87171"}
          onMouseLeave={e=>e.currentTarget.style.color="#4B5563"}>✕</button>
      </div>

      {/* Progress bar */}
      <div style={{height:"10px", background:"rgba(255,255,255,0.06)", borderRadius:"99px", overflow:"hidden", marginBottom:"10px"}}>
        <div style={{height:"100%", width:`${Math.min(100, pctUsed)}%`, background:isOver?"#F87171":statusColor, borderRadius:"99px", transition:"all .5s ease"}}/>
      </div>

      {/* Stats row */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px", fontFamily:"monospace", fontSize:"11px"}}>
        <span style={{color:"#9CA3AF"}}>{fmt(spent)} spent</span>
        <span style={{color: statusColor, fontWeight:700}}>{pctUsed}%</span>
        <span style={{color:"#9CA3AF"}}>{isOver ? "0" : fmt(remaining)} left</span>
      </div>

      {/* Status banner */}
      <div style={{padding:"10px 12px", borderRadius:"10px", background:`${statusColor}10`, border:`1px solid ${statusColor}25`, marginBottom:"10px"}}>
        <p style={{color: statusColor, fontSize:"12px", fontWeight:600, marginBottom:"4px"}}>{statusMsg}</p>
        {!isExpired && (
          <div style={{display:"flex", justifyContent:"space-between", color:"#6B7280", fontSize:"10px", fontFamily:"monospace"}}>
            <span>⏰ {daysLeft} {daysLeft===1?"day":"days"} left</span>
            <span>📊 Daily avg: {fmt(Math.round(dailyAvg))}</span>
          </div>
        )}
      </div>

      {/* Date range */}
      <p style={{color:"#4B5563", fontSize:"10px", fontFamily:"monospace", textAlign:"center"}}>
        {fmtDate(pool.startDate)} → {fmtDate(endDate.toISOString())}
      </p>

      {/* Recent entries preview */}
      {poolSpendings.length > 0 && (
        <div style={{marginTop:"12px", paddingTop:"12px", borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <p style={{color:"#6B7280", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px"}}>
            Latest entries ({poolSpendings.length} total)
          </p>
          {poolSpendings.slice(0, 3).map(s => (
            <div key={s.id} style={{display:"flex", justifyContent:"space-between", fontSize:"11px", marginBottom:"3px"}}>
              <span style={{color:"#9CA3AF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1}}>
                {CAT_ICONS[s.type]||"💡"} {s.name}
              </span>
              <span style={{color:"#F87171", fontFamily:"monospace", marginLeft:"8px", flexShrink:0}}>{fmt(s.amount)}</span>
            </div>
          ))}
          {poolSpendings.length > 3 && (
            <p style={{color:"#6B7280", fontSize:"10px", textAlign:"center", marginTop:"4px"}}>
              +{poolSpendings.length - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Goals({ firestoreData, user }) {
  const [tab,         setTab]         = useState("budget");
  const [budgets,     setBudgets]     = useState([]);
  const [savings,     setSavings]     = useState([]);
  const [showBudget,  setShowBudget]  = useState(false);
  const [showSavings, setShowSavings] = useState(false);
  const [showPool,    setShowPool]    = useState(false); // ✨ NEW
  const [updateGoal,  setUpdateGoal]  = useState(null);
  const [vis,         setVis]         = useState(false);

  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const uid = user?.uid;

  // Use pools from firestoreData hook (added in File 3)
  const { spendings = [], pools = [], categories = [] } = firestoreData || {};

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "budgets"),
      snap => setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error(err)
    );
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "savingsGoals"),
      snap => setSavings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error(err)
    );
    return () => unsub();
  }, [uid]);

  // ✨ Close panels when leaving this page
  useEffect(() => {
    return () => {
      setShowBudget(false);
      setShowSavings(false);
      setShowPool(false);
      setUpdateGoal(null);
    };
  }, []);

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
    await updateDoc(doc(db, "users", uid, "savingsGoals", id), { saved: newSaved });
  }, [uid]);

  // ✨ NEW: Pool actions
  const addPool = useCallback(async (data) => {
    await addDoc(collection(db, "users", uid, "pools"), { ...data, createdAt: serverTimestamp() });
  }, [uid]);

  const deletePool = useCallback(async (id) => {
    if (!confirm("Delete this pool? Your entries are safe — only the pool will be removed.")) return;
    await deleteDoc(doc(db, "users", uid, "pools", id));
  }, [uid]);

  const cm = mkey(new Date().toISOString());
  const monthSpendings = spendings.filter(e => mkey(e.date) === cm);

  // Sort pools: active first, then by start date
  const sortedPools = [...pools].sort((a, b) => {
    const aEnd = new Date(a.startDate); aEnd.setDate(aEnd.getDate() + a.days);
    const bEnd = new Date(b.startDate); bEnd.setDate(bEnd.getDate() + b.days);
    const aExpired = new Date() >= aEnd;
    const bExpired = new Date() >= bEnd;
    if (aExpired !== bExpired) return aExpired ? 1 : -1;
    return new Date(b.startDate) - new Date(a.startDate);
  });

  return (
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Goals</h1>
          <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>Budget · Savings · Pools</p>
        </div>
        <button onClick={()=>{
          if (tab==="budget") setShowBudget(true);
          else if (tab==="savings") setShowSavings(true);
          else if (tab==="pool") setShowPool(true);
        }}
          className="flex items-center justify-center rounded-full transition-all hover:scale-110"
          style={{
            width:"44px",height:"44px",
            background: tab==="budget" ? "linear-gradient(135deg,#FBBF24,#D97706)" :
                        tab==="savings" ? "linear-gradient(135deg,#34D399,#059669)" :
                        "linear-gradient(135deg,#8B5CF6,#6D28D9)",
            border:"none",
            color: tab==="budget" ? "#1a1a00" : tab==="savings" ? "#022C22" : "#fff",
            fontSize:"22px",cursor:"pointer",
            boxShadow: tab==="budget" ? "0 6px 16px rgba(251,191,36,0.4)" :
                       tab==="savings" ? "0 6px 16px rgba(52,211,153,0.4)" :
                       "0 6px 16px rgba(139,92,246,0.4)",
          }}>
          +
        </button>
      </div>

      {/* ✨ MODIFIED: 3 Tabs now */}
      <div className="flex gap-2 mb-5" style={{overflowX:"auto", paddingBottom:"4px"}}>
        {[
          ["budget","🎯 Budget","#FBBF24","251,191,36"],
          ["savings","💰 Savings","#34D399","52,211,153"],
          ["pool","💸 Pool","#8B5CF6","139,92,246"],
        ].map(([id,label,color,rgb])=>(
          <button key={id} onClick={()=>setTab(id)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab===id ? `rgba(${rgb},0.15)` : "rgba(255,255,255,0.04)",
              border: tab===id ? `1px solid rgba(${rgb},0.3)` : "1px solid rgba(255,255,255,0.08)",
              color: tab===id ? color : "#6B7280",
              cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0,
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
                      <button onClick={()=>deleteBudget(goal.id)} style={{color:"#4B5563",background:"none",border:"none",cursor:"pointer",fontSize:"16px",padding:"2px 6px"}}>✕</button>
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
                      <button onClick={()=>deleteSavingsGoal(goal.id)} style={{color:"#4B5563",background:"none",border:"none",cursor:"pointer",fontSize:"16px",padding:"2px 6px"}}>✕</button>
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

      {/* ══ ✨ NEW: POOL TAB ══ */}
      {tab === "pool" && (
        <>
          {pools.length === 0 ? (
            <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
              <p style={{fontSize:"40px",marginBottom:"10px"}}>💸</p>
              <p style={{fontSize:"15px",color:"#E5E7EB",fontWeight:"600",marginBottom:"6px"}}>No Active Pools</p>
              <p style={{fontSize:"13px",lineHeight:1.5}}>Set a budget for X days<br/>and track remaining + projection</p>
              
              <div style={{marginTop:"16px", padding:"12px", background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)", borderRadius:"10px", textAlign:"left"}}>
                <p style={{color:"#9CA3AF", fontSize:"11px", marginBottom:"8px"}}>💡 Example uses:</p>
                <p style={{color:"#6B7280", fontSize:"11px", lineHeight:1.5}}>
                  • <span style={{color:"#8B5CF6"}}>Goa Trip</span> — ₹25,000 for 7 days<br/>
                  • <span style={{color:"#8B5CF6"}}>Monthly Food</span> — ₹10,000 for 30 days (Food only)<br/>
                  • <span style={{color:"#8B5CF6"}}>Half Salary</span> — ₹15,000 for 15 days
                </p>
              </div>

              <button onClick={()=>setShowPool(true)} style={{marginTop:"16px",padding:"10px 24px",background:"linear-gradient(135deg,#8B5CF6,#6D28D9)",border:"none",borderRadius:"10px",color:"#fff",fontWeight:"700",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                + Create First Pool
              </button>
            </div>
          ) : (
            <div>
              {sortedPools.map(pool => (
                <PoolCard key={pool.id} pool={pool} spendings={spendings} onDelete={deletePool}/>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals — conditional render (fixes ghost panel) */}
      {showBudget  && <AddBudgetPanel   open={showBudget}  onClose={()=>setShowBudget(false)}  onSave={addBudget}/>}
      {showSavings && <AddSavingsPanel  open={showSavings} onClose={()=>setShowSavings(false)} onSave={addSavingsGoal}/>}
      {showPool    && <CreatePoolPanel  open={showPool}    onClose={()=>setShowPool(false)}    onSave={addPool}    allCategories={categories}/>}
      {updateGoal  && <UpdateSavedPanel open={!!updateGoal} goal={updateGoal} onClose={()=>setUpdateGoal(null)} onUpdate={updateSaved}/>}
    </div>
  );
}