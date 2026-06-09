import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, serverTimestamp, setDoc, getDoc,
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

// ✨ NEW: savings goal status from target date + progress
function goalStatus(goal) {
  const saved  = Number(goal.saved) || 0;
  const target = Number(goal.target) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const done = pct >= 100;
  const remaining = Math.max(0, target - saved);

  if (done) return { pct, done, remaining, hasDate:false, label:"Achieved", color:"#FBBF24" };
  if (!goal.deadline) return { pct, done, remaining, hasDate:false, label:null, color:"#34D399" };

  const today = new Date(); today.setHours(0,0,0,0);
  const end   = new Date(goal.deadline); end.setHours(0,0,0,0);
  const daysLeft = Math.ceil((end - today) / 86400000);

  if (daysLeft <= 0) {
    return { pct, done, remaining, hasDate:true, daysLeft:0, perDay:0, perMonth:0,
             label:"Date passed", color:"#F87171", overdue:true };
  }

  const perDay   = remaining / daysLeft;
  const perMonth = perDay * 30;

  // are they on track? expected progress by now vs actual
  // simple check: required daily pace is reasonable if remaining/daysLeft isn't huge vs target
  const monthsLeft = daysLeft / 30;
  let label = "On Track", color = "#34D399";
  // If they'd need to save more than 60% of target in remaining time and time is short -> behind
  if (monthsLeft < 1 && remaining > target * 0.5) { label = "Way Behind"; color = "#F87171"; }
  else if (perMonth > 0 && remaining > target * 0.8 && monthsLeft < 3) { label = "Behind"; color = "#FB923C"; }

  return { pct, done, remaining, hasDate:true, daysLeft, perDay, perMonth, label, color };
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
// ── Add Savings Panel (full build: templates + target date) ──────
function AddSavingsPanel({ open, onClose, onSave }) {
  const SUGGESTED = [
    { name:"Emergency Fund", emoji:"🛡️", target:"" },
    { name:"Goa Trip",       emoji:"🌴", target:"30000" },
    { name:"New iPhone",     emoji:"📱", target:"80000" },
    { name:"New Laptop",     emoji:"💻", target:"60000" },
    { name:"Bike / Car",     emoji:"🚗", target:"" },
    { name:"Wedding",        emoji:"💍", target:"" },
  ];
  const EMOJIS = ["🎯","📱","✈️","🏠","🚗","💻","📚","👟","💍","🎸","🏋️","🌴","🛡️","🎓","💸","🐶","🎮","💰"];
  const [name,   setName]   = useState("");
  const [target, setTarget] = useState("");
  const [saved,  setSaved]  = useState("");
  const [emoji,  setEmoji]  = useState("🎯");
  const [deadline, setDeadline] = useState(""); // ✨ NEW target date
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(""); setTarget(""); setSaved(""); setEmoji("🎯"); setDeadline(""); } }, [open]);

  function applyTemplate(t) {
    setName(t.name); setEmoji(t.emoji);
    if (t.target) setTarget(t.target);
  }

  async function save() {
    if (!name.trim() || !target) return alert("Fill goal name and target amount");
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        target: parseFloat(target),
        saved: parseFloat(saved) || 0,
        emoji,
        deadline: deadline || null,   // ✨ optional target date
      });
      onClose();
    }
    catch (e) { alert("Failed: " + e.message); }
    setSaving(false);
  }
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"88vh",overflowY:"auto"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 style={{color:"white",fontWeight:"700",fontSize:"16px"}}>New Savings Goal</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(52,211,153,0.15)",color:"#34D399",border:"1px solid rgba(52,211,153,0.2)"}}>Goal</span>
        </div>
        <div className="px-5 pt-4 pb-4 space-y-3">
          {/* ✨ Suggested templates */}
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Quick start (optional)</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {SUGGESTED.map(t=>(
                <button key={t.name} onClick={()=>applyTemplate(t)}
                  style={{padding:"7px 10px",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",
                    background: name===t.name ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                    border: name===t.name ? "1px solid rgba(52,211,153,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: name===t.name ? "#34D399" : "#9CA3AF"}}>
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
          </div>

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
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Target Date — optional</label>
            <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} min={new Date().toISOString().split("T")[0]} style={inp}/>
            <p style={{color:"#4B5563",fontSize:"11px",marginTop:"5px",lineHeight:1.4}}>Add a date to see how much to save per day/month.</p>
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

// ✨ NEW v1.8: Emergency Fund setup panel
function EmergencyPanel({ open, onClose, onSave, current }) {
  const [fund,   setFund]   = useState("");
  const [months, setMonths] = useState(6);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFund(current?.fund != null ? String(current.fund) : "");
      setMonths(current?.targetMonths || 6);
    }
  }, [open, current]);

  async function save() {
    if (fund === "" || isNaN(fund) || parseFloat(fund) < 0) return alert("Enter your current emergency fund amount");
    setSaving(true);
    try {
      await onSave({ fund: parseFloat(fund), targetMonths: months });
      onClose();
    } catch (e) { alert("Failed: " + e.message); }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"85vh",overflowY:"auto"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 style={{color:"white",fontWeight:"700",fontSize:"16px"}}>🛡️ Emergency Fund</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(96,165,250,0.15)",color:"#60A5FA",border:"1px solid rgba(96,165,250,0.2)"}}>Safety</span>
        </div>
        <div className="px-5 pt-4 pb-4 space-y-4">
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Current Emergency Fund (₹)</label>
            <input type="number" value={fund} onChange={e=>setFund(e.target.value)} placeholder="e.g. 100000" style={inp}/>
            <p style={{color:"#4B5563",fontSize:"11px",marginTop:"5px",lineHeight:1.4}}>How much you've set aside for emergencies (savings, FD, liquid funds).</p>
          </div>
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Target (months of expenses)</label>
            <div style={{display:"flex",gap:"8px"}}>
              {[3,6,12].map(m=>(
                <button key={m} onClick={()=>setMonths(m)} style={{
                  flex:1,padding:"12px",borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:600,
                  background: months===m ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)",
                  border: months===m ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: months===m ? "#60A5FA" : "#9CA3AF",
                }}>{m} months</button>
              ))}
            </div>
            <p style={{color:"#4B5563",fontSize:"11px",marginTop:"6px",lineHeight:1.4}}>💡 6 months is the recommended safety buffer for India.</p>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(96,165,250,0.4)":"linear-gradient(135deg,#60A5FA,#2563EB)",border:"none",borderRadius:"12px",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"Saving...":"Save"}
          </button>
        </div>
      </div>
    </>
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
  const [showEmergency, setShowEmergency] = useState(false); // ✨ NEW v1.8
  const [emergency,     setEmergency]     = useState(null);  // ✨ NEW v1.8 {fund, targetMonths}
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

  // ✨ NEW v1.8: Emergency fund listener (single doc)
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid, "settings", "emergencyFund"),
      snap => setEmergency(snap.exists() ? snap.data() : null),
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
      setShowEmergency(false);
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

  // ✨ NEW v1.8: Save emergency fund settings
  const saveEmergency = useCallback(async (data) => {
    await setDoc(doc(db, "users", uid, "settings", "emergencyFund"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  }, [uid]);

  const cm = mkey(new Date().toISOString());
  const monthSpendings = spendings.filter(e => mkey(e.date) === cm);

  // ✨ NEW v1.8: Emergency fund math — avg monthly expense from last 3 completed months
  const emMonths = [...new Set(spendings.map(e => mkey(e.date)))].sort((a,b)=>b<a?-1:1);
  const last3 = emMonths.filter(m => m !== cm).slice(0, 3); // skip current (incomplete) month
  const last3Totals = last3.map(m => spendings.filter(e => mkey(e.date) === m).reduce((s,e)=>s+Number(e.amount),0));
  const avgMonthlyExpense = last3Totals.length > 0
    ? Math.round(last3Totals.reduce((s,v)=>s+v,0) / last3Totals.length)
    : 0;
  const emFund    = emergency?.fund || 0;
  const emTargetM = emergency?.targetMonths || 6;
  const emTarget  = avgMonthlyExpense * emTargetM;
  const emMonthsCovered = avgMonthlyExpense > 0 ? (emFund / avgMonthlyExpense) : 0;
  const emPct     = emTarget > 0 ? Math.min(100, Math.round((emFund / emTarget) * 100)) : 0;
  const emGap     = Math.max(0, emTarget - emFund);
  // status
  let emStatus = { label: "Building", color: "#FBBF24", emoji: "🟡" };
  if (emMonthsCovered >= emTargetM)      emStatus = { label: "Excellent", color: "#34D399", emoji: "🟢" };
  else if (emMonthsCovered >= 3)         emStatus = { label: "Good", color: "#34D399", emoji: "🟢" };
  else if (emMonthsCovered >= 1)         emStatus = { label: "Building", color: "#FBBF24", emoji: "🟡" };
  else                                   emStatus = { label: "Critical", color: "#F87171", emoji: "🔴" };

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
          else if (tab==="emergency") setShowEmergency(true);
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
          ["emergency","🛡️ Emergency","#60A5FA","96,165,250"],
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
      {/* ══ ✨ NEW v1.8: EMERGENCY TAB ══ */}
      {tab === "emergency" && (
        <>
          {!emergency ? (
            <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
              <p style={{fontSize:"40px",marginBottom:"10px"}}>🛡️</p>
              <p style={{fontSize:"15px",color:"#E5E7EB",fontWeight:"600",marginBottom:"6px"}}>Set Up Emergency Fund</p>
              <p style={{fontSize:"13px",lineHeight:1.5}}>Track how many months of expenses<br/>you have saved for emergencies</p>
              <button onClick={()=>setShowEmergency(true)} style={{marginTop:"16px",padding:"10px 24px",background:"linear-gradient(135deg,#60A5FA,#2563EB)",border:"none",borderRadius:"10px",color:"#fff",fontWeight:"700",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                + Set Up Now
              </button>
            </div>
          ) : avgMonthlyExpense === 0 ? (
            <div style={{...card,padding:"24px",textAlign:"center"}}>
              <p style={{fontSize:"32px",marginBottom:"10px"}}>📊</p>
              <p style={{color:"#E5E7EB",fontSize:"14px",fontWeight:600,marginBottom:"6px"}}>Need spending data first</p>
              <p style={{color:"#9CA3AF",fontSize:"12px",lineHeight:1.5}}>Add some spending entries so we can work out your average monthly expense. Then your emergency buffer (in months) will show here.</p>
              <button onClick={()=>setShowEmergency(true)} style={{marginTop:"14px",padding:"8px 18px",background:"rgba(96,165,250,0.12)",border:"1px solid rgba(96,165,250,0.25)",borderRadius:"10px",color:"#60A5FA",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Edit Fund
              </button>
            </div>
          ) : (
            <>
              {/* Main gauge card */}
              <div className="p-6 mb-4 relative overflow-hidden" style={{...card,border:`1px solid ${emStatus.color}25`}}>
                <div style={{position:"absolute",top:"-50px",right:"-50px",width:"180px",height:"180px",borderRadius:"50%",background:`radial-gradient(circle,${emStatus.color}18,transparent 70%)`,pointerEvents:"none"}}/>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{color:"#6B7280"}}>Emergency Buffer</p>
                  <span style={{padding:"3px 10px",borderRadius:"99px",background:`${emStatus.color}18`,border:`1px solid ${emStatus.color}40`,color:emStatus.color,fontSize:"11px",fontWeight:700}}>
                    {emStatus.emoji} {emStatus.label}
                  </span>
                </div>
                <p className="text-4xl font-bold mb-1" style={{color:emStatus.color}}>
                  {emMonthsCovered.toFixed(1)} <span style={{fontSize:"18px",color:"#6B7280"}}>/ {emTargetM} months</span>
                </p>
                <div style={{height:"10px",background:"rgba(255,255,255,0.06)",borderRadius:"99px",overflow:"hidden",margin:"14px 0 6px"}}>
                  <div style={{height:"100%",width:`${emPct}%`,background:emStatus.color,borderRadius:"99px",transition:"width .6s ease"}}/>
                </div>
                <p className="text-xs" style={{color:"#6B7280"}}>{emPct}% of your {emTargetM}-month target</p>
              </div>

              {/* Breakdown */}
              <div style={{...card,padding:"18px",marginBottom:"16px"}} className="space-y-3">
                {[
                  ["Monthly expense (avg)", fmt(avgMonthlyExpense), "#9CA3AF"],
                  ["Current fund", fmt(emFund), "#60A5FA"],
                  ["Target", fmt(emTarget), "#E5E7EB"],
                  ["Gap to target", emGap > 0 ? fmt(emGap) : "Reached! 🎉", emGap > 0 ? "#F87171" : "#34D399"],
                ].map(([label,val,col])=>(
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm" style={{color:"#9CA3AF"}}>{label}</span>
                    <span className="text-sm font-bold font-mono" style={{color:col}}>{val}</span>
                  </div>
                ))}
                <p style={{color:"#4B5563",fontSize:"10px",lineHeight:1.5,paddingTop:"4px"}}>
                  Monthly expense is your average spending over the last {last3.length || 0} completed {last3.length===1?"month":"months"}.
                </p>
              </div>

              {/* Suggestion */}
              {emGap > 0 && (
                <div className="p-4 mb-4" style={{...card,border:"1px solid rgba(96,165,250,0.15)"}}>
                  <p style={{color:"#60A5FA",fontSize:"13px",fontWeight:600,lineHeight:1.5}}>
                    💡 Save {fmt(Math.ceil(emGap / 12))} per month to reach your {emTargetM}-month goal in about a year.
                  </p>
                </div>
              )}

              <button onClick={()=>setShowEmergency(true)} style={{width:"100%",padding:"13px",background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.25)",borderRadius:"12px",color:"#60A5FA",fontWeight:700,fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>
                ✏️ Update Fund Amount
              </button>
            </>
          )}
        </>
      )}

      {/* Modals — conditional render (fixes ghost panel) */}
      {showBudget  && <AddBudgetPanel   open={showBudget}  onClose={()=>setShowBudget(false)}  onSave={addBudget}/>}
      {showSavings && <AddSavingsPanel  open={showSavings} onClose={()=>setShowSavings(false)} onSave={addSavingsGoal}/>}
      {showPool    && <CreatePoolPanel  open={showPool}    onClose={()=>setShowPool(false)}    onSave={addPool}    allCategories={categories}/>}
      {updateGoal  && <UpdateSavedPanel open={!!updateGoal} goal={updateGoal} onClose={()=>setUpdateGoal(null)} onUpdate={updateSaved}/>}
      {showEmergency && <EmergencyPanel open={showEmergency} onClose={()=>setShowEmergency(false)} onSave={saveEmergency} current={emergency}/>}
    </div>
  );
}