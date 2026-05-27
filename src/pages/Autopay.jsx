import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, serverTimestamp,
} from "firebase/firestore";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function fmtDate(s) { 
  const d = new Date(s); 
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function monthsBetween(startStr) {
  if (!startStr) return 0;
  const start = new Date(startStr);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

const FREQ_OPTIONS = [
  { label: "Monthly",     value: "monthly",     days: 30  },
  { label: "Quarterly",   value: "quarterly",   days: 90  },
  { label: "Half Yearly", value: "halfyearly",  days: 180 },
  { label: "Yearly",      value: "yearly",      days: 365 },
  { label: "Weekly",      value: "weekly",      days: 7   },
  { label: "Custom",      value: "custom",      days: null },
];

const SUB_ICONS = ["📺","🎵","🎮","💪","☁️","📰","🎬","🛒","📱","💊","🏫","🎓","🍕","🚗","💡","🏠","🌐","📧","🔒","🎯","📊","₿","💼","🥇","🏦","📉"];

const card = { background: "linear-gradient(145deg,#1A2333,#0F172A)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)", borderRadius: "16px" };
const inp = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "13px 16px", color: "#E5E7EB", fontSize: "14px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const selectStyle = { ...inp, background:"#0F172A", appearance:"none", WebkitAppearance:"none", MozAppearance:"none", backgroundImage:"url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg width='12' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%236B7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 16px center", paddingRight:"40px" };

export function getDaysUntilRenewal(sub) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const renewal  = new Date(sub.nextRenewal); renewal.setHours(0,0,0,0);
  return Math.ceil((renewal - today) / 86400000);
}

function computeNextRenewal(lastRenewal, frequency, customDays) {
  const d = new Date(lastRenewal);
  const freq = FREQ_OPTIONS.find(f => f.value === frequency);
  const days = freq?.days || parseInt(customDays) || 30;
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function AutopayPanel({ open, onClose, editSub, uid }) {
  const isEdit = !!editSub;
  const [name,setName]=useState(""); const [amount,setAmount]=useState("");
  const [icon,setIcon]=useState("📺"); const [frequency,setFrequency]=useState("monthly");
  const [customDays,setCustomDays]=useState(""); const [nextRenewal,setNextRenewal]=useState("");
  const [startDate,setStartDate]=useState("");
  const [paymentKind,setPaymentKind]=useState("spending"); // ✨ NEW: spending or investment
  const [category,setCategory]=useState(""); // ✨ NEW: category to log under
  const [notes,setNotes]=useState(""); const [saving,setSaving]=useState(false);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    if (isEdit) {
      setName(editSub.name || ""); setAmount(String(editSub.amount || ""));
      setIcon(editSub.icon || "📺"); setFrequency(editSub.frequency || "monthly");
      setCustomDays(editSub.customDays || ""); setNextRenewal(editSub.nextRenewal || "");
      setStartDate(editSub.startDate || "");
      setPaymentKind(editSub.paymentKind || "spending"); // ✨ NEW
      setCategory(editSub.category || ""); // ✨ NEW
      setNotes(editSub.notes || "");
    } else {
      setName(""); setAmount(""); setIcon("📺");
      setFrequency("monthly"); setCustomDays(""); setNotes("");
      setPaymentKind("spending"); // ✨ Default: spending
      setCategory("");
      const today = new Date();
      setStartDate(today.toISOString().split("T")[0]);
      const d = new Date(); d.setDate(d.getDate() + 30);
      setNextRenewal(d.toISOString().split("T")[0]);
    }
  }, [open, isEdit, editSub?.id]);

  // ✨ Default category options based on paymentKind
  const categoryOptions = paymentKind === "investment"
    ? ["Stock", "Crypto", "Mutual Fund", "Gold", "FD/RD", "ETF", "Other"]
    : ["Food", "Travel", "Shopping", "Entertainment", "Course", "Electronics", "Health", "Utilities", "Rent", "Fuel", "Other"];

  // Auto-set category default when kind changes
  useEffect(() => {
    if (!category || !categoryOptions.includes(category)) {
      setCategory(categoryOptions[0]);
    }
  }, [paymentKind]);

  async function save() {
    if (!name.trim() || !amount || !nextRenewal || !startDate) return alert("Fill all fields");
    setSaving(true);
    try {
      const data = {
        name: name.trim(), amount: parseFloat(amount), icon, frequency,
        customDays: frequency === "custom" ? parseInt(customDays) : null,
        nextRenewal, 
        startDate,
        paymentKind, // ✨ NEW
        category,    // ✨ NEW
        notes: notes.trim(), active: true, updatedAt: serverTimestamp(),
      };
      if (isEdit) {
        await updateDoc(doc(db, "users", uid, "autopay", editSub.id), data);
      } else {
        await addDoc(collection(db, "users", uid, "autopay"), { ...data, createdAt: serverTimestamp() });
      }
      onClose();
    } catch(e) { alert("Failed: " + e.message); }
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
          <h3 className="font-bold text-white text-base">{isEdit?"✏️ Edit Autopay":"🔔 Add Autopay"}</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(139,92,246,0.15)",color:"#8B5CF6",border:"1px solid rgba(139,92,246,0.2)"}}>Autopay</span>
        </div>

        <div className="px-5 pt-4 pb-4 space-y-3">

          {/* ✨ NEW: Type Selector — Spending vs Investment */}
          <div>
            <label className="text-xs uppercase tracking-wider block mb-2" style={{color:"#6B7280"}}>
              Type — Is this Spending or Investment?
            </label>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>setPaymentKind("spending")} style={{
                flex:1, padding:"12px", borderRadius:"10px", cursor:"pointer", fontFamily:"inherit",
                background: paymentKind==="spending" ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)",
                border: paymentKind==="spending" ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(255,255,255,0.08)",
                color: paymentKind==="spending" ? "#F87171" : "#9CA3AF",
                fontSize:"12px", fontWeight:600, textAlign:"center",
              }}>
                <div style={{fontSize:"18px", marginBottom:"4px"}}>💸</div>
                Spending
                <p style={{fontSize:"10px", marginTop:"3px", opacity:0.7, fontWeight:400}}>
                  Netflix, Gym, Bills
                </p>
              </button>
              <button onClick={()=>setPaymentKind("investment")} style={{
                flex:1, padding:"12px", borderRadius:"10px", cursor:"pointer", fontFamily:"inherit",
                background: paymentKind==="investment" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)",
                border: paymentKind==="investment" ? "1px solid rgba(52,211,153,0.35)" : "1px solid rgba(255,255,255,0.08)",
                color: paymentKind==="investment" ? "#34D399" : "#9CA3AF",
                fontSize:"12px", fontWeight:600, textAlign:"center",
              }}>
                <div style={{fontSize:"18px", marginBottom:"4px"}}>📈</div>
                Investment
                <p style={{fontSize:"10px", marginTop:"3px", opacity:0.7, fontWeight:400}}>
                  SIP, RD, NPS
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-2" style={{color:"#6B7280"}}>Pick Icon</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
              {SUB_ICONS.map(ic=>(
                <button key={ic} onClick={()=>setIcon(ic)}
                  style={{fontSize:"22px",padding:"5px 8px",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",
                    border:`1px solid ${icon===ic?"rgba(139,92,246,0.5)":"rgba(255,255,255,0.08)"}`,
                    background:icon===ic?"rgba(139,92,246,0.15)":"rgba(255,255,255,0.03)"}}>{ic}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>
              {paymentKind === "investment" ? "Investment Name" : "Subscription Name"}
            </label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} 
              placeholder={paymentKind === "investment" ? "e.g. SIP Nifty 50, Gold RD..." : "e.g. Netflix, Gym, Internet..."} 
              style={inp}/>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Amount (₹)</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={inp}/>
          </div>

          {/* ✨ NEW: Category dropdown — auto-populates based on kind */}
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>
              {paymentKind === "investment" ? "Investment Type" : "Spending Category"}
            </label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={selectStyle}>
              {categoryOptions.map(c => (
                <option key={c} value={c} style={{background:"#0F172A",color:"#E5E7EB",fontStyle:"normal",fontWeight:"normal"}}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Frequency</label>
            <select value={frequency} onChange={e=>setFrequency(e.target.value)} style={selectStyle}>
              {FREQ_OPTIONS.map(f=>(<option key={f.value} value={f.value} style={{background:"#0F172A",color:"#E5E7EB",fontFamily:"system-ui, -apple-system, sans-serif",fontStyle:"normal",fontWeight:"normal"}}>{f.label}</option>))}
            </select>
          </div>

          {frequency === "custom" && (
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Every how many days?</label>
              <input type="number" value={customDays} onChange={e=>setCustomDays(e.target.value)} placeholder="e.g. 45" style={inp}/>
            </div>
          )}
          
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>
              📅 Started On <span style={{color:"#4B5563", fontWeight:"normal"}}>(when did you subscribe?)</span>
            </label>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={inp}/>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Next Renewal Date</label>
            <input type="date" value={nextRenewal} onChange={e=>setNextRenewal(e.target.value)} style={inp}/>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Note (optional)</label>
            <input type="text" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Cancel if not watching..." style={inp}/>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(139,92,246,0.4)":"linear-gradient(135deg,#8B5CF6,#6D28D9)",border:"none",borderRadius:"12px",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"Saving...":isEdit?"Update":"Add Autopay"}
          </button>
        </div>
      </div>
    </>
  );
}

// ✨ MODIFIED: Renewed Panel now uses paymentKind + category
function RenewedPanel({ open, sub, onClose, onRenew, uid }) {
  const [saving, setSaving] = useState(false);
  const [alsoAdd, setAlsoAdd] = useState(true);
  
  useEffect(() => { if (open) setAlsoAdd(true); }, [open]);
  
  if (!sub) return null;

  // Determine target collection based on paymentKind
  // Default to "spending" for backward compatibility (old autopays without paymentKind)
  const targetKind = sub.paymentKind === "investment" ? "investments" : "spendings";
  const targetCategory = sub.category || "Other";
  const isInvestment = targetKind === "investments";
  
  async function confirm() {
    setSaving(true);
    try { 
      // ✨ Auto-route to correct collection based on paymentKind
      if (alsoAdd && uid) {
        await addDoc(collection(db, "users", uid, targetKind), {
          name: `${sub.icon} ${sub.name}`,
          amount: Number(sub.amount),
          date: sub.nextRenewal,
          type: targetCategory,
          note: `Auto-logged from autopay: ${sub.name}`,
          createdAt: serverTimestamp(),
        });
      }
      await onRenew(sub); 
      onClose(); 
    }
    catch(e) { alert(e.message); }
    setSaving(false);
  }
  
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="px-6 pb-6 text-center">
          <div style={{fontSize:"48px",marginBottom:"12px"}}>{sub.icon}</div>
          <p className="text-lg font-bold text-white mb-2">{sub.name} Renewed?</p>
          <p className="text-sm mb-1" style={{color:"#9CA3AF"}}>Amount: <span style={{color:"#34D399",fontWeight:"600"}}>{fmt(sub.amount)}</span></p>
          <p className="text-sm mb-4" style={{color:"#9CA3AF"}}>Next renewal: <span style={{color:"#E5E7EB",fontWeight:"600"}}>{computeNextRenewal(sub.nextRenewal, sub.frequency, sub.customDays)}</span></p>
          
          {/* ✨ Auto-add with KIND awareness */}
          <label style={{
            display:"flex", alignItems:"center", gap:"10px",
            padding:"12px 16px",
            background: isInvestment ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)",
            border: isInvestment ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(248,113,113,0.15)",
            borderRadius:"10px",
            marginBottom:"16px", cursor:"pointer", textAlign:"left",
          }}>
            <input 
              type="checkbox" 
              checked={alsoAdd} 
              onChange={e=>setAlsoAdd(e.target.checked)}
              style={{width:"16px", height:"16px", accentColor: isInvestment ? "#34D399" : "#F87171", cursor:"pointer"}}
            />
            <div style={{flex:1}}>
              <p style={{color:"#E5E7EB", fontSize:"12px", fontWeight:"600"}}>
                {isInvestment ? "📈 Also add to Investments" : "💸 Also add to Spending"}
              </p>
              <p style={{color:"#6B7280", fontSize:"11px", marginTop:"2px"}}>
                Logs {fmt(sub.amount)} as {isInvestment ? "investment" : "spending"} ({targetCategory})
              </p>
            </div>
          </label>

          <div className="flex gap-3">
            <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button onClick={confirm} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(52,211,153,0.4)":"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"12px",color:"#022C22",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {saving?"Updating...":"Yes, Renewed ✓"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Autopay({ user, quickAddTrigger }) {
  const [subs,setSubs]=useState([]); const [panelOpen,setPanelOpen]=useState(false);
  const [editSub,setEditSub]=useState(null); const [renewedSub,setRenewedSub]=useState(null);
  const [showRenewed,setShowRenewed]=useState(false); const [filter,setFilter]=useState("all");
  const [kindFilter,setKindFilter]=useState("all"); // ✨ NEW: filter by spending/investment
  const [vis,setVis]=useState(false);

  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const uid = user?.uid;

  useEffect(()=>{
    if (quickAddTrigger?.type === "autopay") {
      setEditSub(null);
      setPanelOpen(true);
    }
  }, [quickAddTrigger?.ts]);

  useEffect(() => {
    return () => {
      setPanelOpen(false);
      setEditSub(null);
      setShowRenewed(false);
      setRenewedSub(null);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "autopay"),
      snap => setSubs(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error(err)
    );
    return () => unsub();
  }, [uid]);

  function openEdit(sub)  { setEditSub(sub);   setPanelOpen(true); }
  function closePanel()   { setPanelOpen(false); setEditSub(null); }

  async function deleteSub(id) {
    if (!confirm("Delete this autopay?")) return;
    await deleteDoc(doc(db, "users", uid, "autopay", id));
  }

  async function toggleActive(sub) {
    await updateDoc(doc(db, "users", uid, "autopay", sub.id), { active: !sub.active });
  }

  async function markRenewed(sub) {
    const nextDate = computeNextRenewal(sub.nextRenewal, sub.frequency, sub.customDays);
    await updateDoc(doc(db, "users", uid, "autopay", sub.id), {
      nextRenewal: nextDate, lastRenewed: sub.nextRenewal,
    });
  }

  // ✨ NEW: Apply kind filter (spending/investment/all)
  const filtered = subs
    .filter(s => {
      // Kind filter
      if (kindFilter !== "all") {
        const sKind = s.paymentKind || "spending"; // default to spending for legacy
        if (sKind !== kindFilter) return false;
      }
      // Status filter
      if (filter === "upcoming") return getDaysUntilRenewal(s) <= 7 && s.active;
      if (filter === "active")   return s.active;
      return true;
    })
    .sort((a,b) => new Date(a.nextRenewal) - new Date(b.nextRenewal));

  const upcomingCount = subs.filter(s => getDaysUntilRenewal(s) <= 3 && s.active).length;
  const monthlyTotal  = subs.filter(s => s.active).reduce((sum, s) => {
    const freq = FREQ_OPTIONS.find(f => f.value === s.frequency);
    const days = freq?.days || s.customDays || 30;
    return sum + (s.amount / days * 30);
  }, 0);

  const yearlyTotal = subs.filter(s => s.active).reduce((sum, s) => {
    const freq = FREQ_OPTIONS.find(f => f.value === s.frequency);
    const days = freq?.days || s.customDays || 30;
    return sum + (s.amount / days * 365);
  }, 0);

  // ✨ NEW: Stats by kind
  const spendCount = subs.filter(s => s.active && (s.paymentKind || "spending") === "spending").length;
  const investCount = subs.filter(s => s.active && s.paymentKind === "investment").length;
  const investYearly = subs.filter(s => s.active && s.paymentKind === "investment").reduce((sum, s) => {
    const freq = FREQ_OPTIONS.find(f => f.value === s.frequency);
    const days = freq?.days || s.customDays || 30;
    return sum + (s.amount / days * 365);
  }, 0);
  const spendYearly = subs.filter(s => s.active && (s.paymentKind || "spending") === "spending").reduce((sum, s) => {
    const freq = FREQ_OPTIONS.find(f => f.value === s.frequency);
    const days = freq?.days || s.customDays || 30;
    return sum + (s.amount / days * 365);
  }, 0);

  return (
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Autopay & Subscriptions</h1>
        <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>Track renewals · Never get surprised</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          {label:"Active",   val:subs.filter(s=>s.active).length, color:"#34D399", icon:"✅"},
          {label:"Upcoming", val:upcomingCount,                   color:"#FBBF24", icon:"⏰"},
          {label:"Monthly ≈",val:fmt(Math.round(monthlyTotal)),   color:"#F87171", icon:"💸"},
        ].map(c=>(
          <div key={c.label} style={{...card,padding:"14px",textAlign:"center"}}>
            <p style={{fontSize:"20px",marginBottom:"4px"}}>{c.icon}</p>
            <p className="text-lg font-bold" style={{color:c.color}}>{c.val}</p>
            <p className="text-xs font-mono" style={{color:"#6B7280"}}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* ✨ NEW: Split breakdown — Spending vs Investment */}
      {(spendCount > 0 || investCount > 0) && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"16px"}}>
          <div style={{...card, padding:"12px", background:"rgba(248,113,113,0.04)", border:"1px solid rgba(248,113,113,0.15)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontSize:"16px"}}>💸</span>
              <p style={{color:"#9CA3AF", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600}}>Spending</p>
            </div>
            <p style={{color:"#F87171", fontSize:"14px", fontWeight:700, fontFamily:"monospace"}}>{fmt(Math.round(spendYearly))}/yr</p>
            <p style={{color:"#6B7280", fontSize:"10px"}}>{spendCount} active</p>
          </div>
          <div style={{...card, padding:"12px", background:"rgba(52,211,153,0.04)", border:"1px solid rgba(52,211,153,0.15)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <span style={{fontSize:"16px"}}>📈</span>
              <p style={{color:"#9CA3AF", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600}}>Investment</p>
            </div>
            <p style={{color:"#34D399", fontSize:"14px", fontWeight:700, fontFamily:"monospace"}}>{fmt(Math.round(investYearly))}/yr</p>
            <p style={{color:"#6B7280", fontSize:"10px"}}>{investCount} active</p>
          </div>
        </div>
      )}

      {/* Yearly cost insight banner */}
      {yearlyTotal > 0 && (
        <div style={{
          ...card,
          padding:"12px 16px", marginBottom:"16px",
          background:"linear-gradient(135deg, rgba(248,113,113,0.06), rgba(251,191,36,0.04))",
          border:"1px solid rgba(248,113,113,0.15)",
        }}>
          <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
            <span style={{fontSize:"22px"}}>📊</span>
            <div style={{flex:1}}>
              <p style={{color:"#E5E7EB", fontSize:"12px", fontWeight:600, marginBottom:"2px"}}>
                Total Yearly Cost: <span style={{color:"#F87171", fontWeight:700}}>{fmt(Math.round(yearlyTotal))}</span>
              </p>
              <p style={{color:"#6B7280", fontSize:"11px"}}>
                You commit this much per year on active autopays
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✨ NEW: Kind filter (All / Spending / Investment) */}
      <div className="flex gap-2 mb-3" style={{overflowX:"auto", paddingBottom:"4px"}}>
        {[
          ["all","All Types",null,null],
          ["spending","💸 Spending","#F87171","248,113,113"],
          ["investment","📈 Investment","#34D399","52,211,153"],
        ].map(([id,label,color,rgb])=>(
          <button key={id} onClick={()=>setKindFilter(id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{
              background: kindFilter===id ? (rgb ? `rgba(${rgb},0.15)` : "rgba(139,92,246,0.15)") : "rgba(255,255,255,0.04)",
              border: kindFilter===id ? (rgb ? `1px solid rgba(${rgb},0.3)` : "1px solid rgba(139,92,246,0.3)") : "1px solid rgba(255,255,255,0.08)",
              color: kindFilter===id ? (color || "#8B5CF6") : "#6B7280",
              cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Status filter (All / Upcoming / Active) */}
      <div className="flex gap-2 mb-4">
        {[["all","All"],["upcoming","Upcoming"],["active","Active"]].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{
              background: filter===id?"rgba(139,92,246,0.15)":"rgba(255,255,255,0.04)",
              border: filter===id?"1px solid rgba(139,92,246,0.3)":"1px solid rgba(255,255,255,0.08)",
              color: filter===id?"#8B5CF6":"#6B7280", cursor:"pointer", fontFamily:"inherit",
            }}>
            {label} {id==="upcoming"&&upcomingCount>0&&<span style={{background:"#F87171",color:"#fff",borderRadius:"99px",padding:"0 5px",marginLeft:"3px",fontSize:"10px"}}>{upcomingCount}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
          <p style={{fontSize:"40px",marginBottom:"10px"}}>🔔</p>
          <p style={{fontSize:"15px",color:"#E5E7EB",fontWeight:"600",marginBottom:"6px"}}>
            {filter==="upcoming"?"No upcoming renewals 🎉":"No autopay added yet"}
          </p>
          <p style={{fontSize:"13px"}}>
            {filter==="upcoming"?"All clear for now!":"Tap + at bottom-right to add your first autopay"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const daysLeft = getDaysUntilRenewal(sub);
            const isOverdue = daysLeft < 0;
            const isUrgent  = daysLeft <= 2 && daysLeft >= 0;
            const isWarning = daysLeft <= 5 && daysLeft > 2;
            const statusColor = isOverdue?"#F87171":isUrgent?"#F87171":isWarning?"#FBBF24":"#34D399";
            const borderColor = isOverdue?"rgba(248,113,113,0.25)":isUrgent?"rgba(248,113,113,0.2)":isWarning?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.06)";

            const monthsActive = sub.startDate ? monthsBetween(sub.startDate) : 0;
            const freq = FREQ_OPTIONS.find(f => f.value === sub.frequency);
            const renewalsPerYear = freq?.days ? Math.floor(365 / freq.days) : 12;
            const renewalsSoFar = sub.startDate ? Math.floor(monthsActive * renewalsPerYear / 12) : 0;
            const totalSoFar = renewalsSoFar * Number(sub.amount);
            const yearlyCost = (sub.amount / (freq?.days || 30)) * 365;
            
            // ✨ NEW: Kind badge
            const subKind = sub.paymentKind || "spending";
            const isInv = subKind === "investment";

            return (
              <div key={sub.id} style={{...card,padding:"16px",border:`1px solid ${borderColor}`,opacity:sub.active?1:0.5}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px",flex:1,minWidth:0}}>
                    <div style={{fontSize:"28px",flexShrink:0}}>{sub.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px"}}>
                        <p style={{color:"#E5E7EB",fontSize:"15px",fontWeight:"600"}}>{sub.name}</p>
                        {/* ✨ NEW: Kind badge */}
                        <span style={{
                          padding:"1px 6px",
                          background: isInv ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                          border: isInv ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(248,113,113,0.25)",
                          borderRadius:"6px",
                          color: isInv ? "#34D399" : "#F87171",
                          fontSize:"9px",
                          fontWeight:"700",
                        }}>
                          {isInv ? "📈 INV" : "💸 SPD"}
                        </span>
                      </div>
                      <p style={{color:"#6B7280",fontSize:"12px",fontFamily:"monospace"}}>
                        {fmt(sub.amount)} · {FREQ_OPTIONS.find(f=>f.value===sub.frequency)?.label||"Custom"}
                        {sub.category && <span> · {sub.category}</span>}
                      </p>
                      {sub.notes&&<p style={{color:"#4B5563",fontSize:"11px",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub.notes}</p>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{color:statusColor,fontSize:"13px",fontWeight:"700",marginBottom:"4px"}}>
                      {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today!" : `${daysLeft}d left`}
                    </p>
                    <p style={{color:"#4B5563",fontSize:"10px",fontFamily:"monospace"}}>
                      {fmtDate(sub.nextRenewal)}
                    </p>
                  </div>
                </div>

                {sub.startDate && (
                  <div style={{
                    marginTop:"10px", padding:"8px 12px",
                    background:"rgba(255,255,255,0.02)",
                    border:"1px solid rgba(255,255,255,0.04)",
                    borderRadius:"8px",
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    fontSize:"10px", fontFamily:"monospace",
                  }}>
                    <span style={{color:"#6B7280"}}>📅 Since {fmtDate(sub.startDate)}</span>
                    {monthsActive > 0 && (
                      <span style={{color:"#9CA3AF"}}>
                        {isInv ? "Invested: " : "Spent: "}
                        <span style={{color: isInv ? "#34D399" : "#F87171", fontWeight:600}}>{fmt(totalSoFar)}</span>
                      </span>
                    )}
                  </div>
                )}

                {sub.active && (
                  <p style={{color:"#FBBF24", fontSize:"10px", fontStyle:"italic", marginTop:"6px", textAlign:"center"}}>
                    ≈ {fmt(Math.round(yearlyCost))}/year
                  </p>
                )}

                {(isUrgent || isOverdue) && sub.active && (
                  <div style={{marginTop:"12px",padding:"10px 14px",borderRadius:"10px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)"}}>
                    <p style={{color:"#F87171",fontSize:"12px",fontWeight:"600"}}>
                      {isOverdue ? `⚠️ Was due ${Math.abs(daysLeft)} day${Math.abs(daysLeft)!==1?"s":""} ago — renew or cancel!` : daysLeft === 0 ? "🔴 Renewing TODAY!" : `🔴 Renewing in ${daysLeft} day${daysLeft!==1?"s":""}!`}
                    </p>
                  </div>
                )}
                {isWarning && sub.active && (
                  <div style={{marginTop:"12px",padding:"10px 14px",borderRadius:"10px",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)"}}>
                    <p style={{color:"#FBBF24",fontSize:"12px",fontWeight:"600"}}>⚡ Renews in {daysLeft} days</p>
                  </div>
                )}

                <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
                  <button onClick={()=>{setRenewedSub(sub);setShowRenewed(true);}} style={{flex:1,padding:"9px",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:"8px",color:"#34D399",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"inherit"}}>
                    ✓ Mark Renewed
                  </button>
                  <button onClick={()=>openEdit(sub)} title="Edit" style={{padding:"9px 14px",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"8px",color:"#8B5CF6",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                    ✏️
                  </button>
                  <button onClick={()=>toggleActive(sub)} title={sub.active?"Pause":"Resume"} style={{padding:"9px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#6B7280",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                    {sub.active?"⏸":"▶"}
                  </button>
                  <button onClick={()=>deleteSub(sub.id)} title="Delete" style={{padding:"9px 14px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:"8px",color:"#F87171",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {panelOpen   && <AutopayPanel open={panelOpen}   onClose={closePanel} uid={uid} editSub={editSub}/>}
      {showRenewed && <RenewedPanel open={showRenewed} sub={renewedSub} onClose={()=>{setShowRenewed(false);setRenewedSub(null);}} onRenew={markRenewed} uid={uid}/>}
    </div>
  );
}