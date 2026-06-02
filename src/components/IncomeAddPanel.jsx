import { useState, useEffect } from "react";

const INCOME_SOURCES = [
  { name: "Salary",    icon: "💼" },
  { name: "Freelance", icon: "💻" },
  { name: "Business",  icon: "🏪" },
  { name: "Gift",      icon: "🎁" },
  { name: "Rental",    icon: "🏠" },
  { name: "Interest",  icon: "🏦" },
  { name: "Other",     icon: "💡" },
];

const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", padding:"13px 16px", color:"#E5E7EB", fontSize:"14px", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
const selectStyle = { ...inp, background:"#0F172A", appearance:"none", WebkitAppearance:"none", MozAppearance:"none", backgroundImage:"url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg width='12' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%236B7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 16px center", paddingRight:"40px" };

// Income uses a warm gold accent (distinct from green=invest, red=spend)
const ACCENT = "#FBBF24";

export default function IncomeAddPanel({ open, onClose, onSave }) {
  const [name,setName]   = useState("");
  const [amount,setAmount] = useState("");
  const [date,setDate]   = useState(new Date().toISOString().split("T")[0]);
  const [type,setType]   = useState("Salary");
  const [note,setNote]   = useState("");
  const [saving,setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(""); setAmount(""); setNote("");
    setType("Salary");
    setDate(new Date().toISOString().split("T")[0]);
    setSaving(false);
  }, [open]);

  async function save() {
    if (!name.trim() || !amount || !date) return alert("Fill all fields");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), amount: parseFloat(amount), date, type, note: note.trim() });
      onClose();
    } catch (e) { alert("Failed: " + e.message); }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60" style={{zIndex:80}} onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl"
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"90vh",overflowY:"auto",zIndex:90}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 className="font-bold text-white text-base">💰 Add Income</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold"
            style={{background:"rgba(251,191,36,0.15)",color:ACCENT,border:"1px solid rgba(251,191,36,0.2)"}}>
            Earned
          </span>
        </div>

        <div className="px-5 pt-4 pb-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Amount (₹)</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={inp}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. June Salary" style={inp}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Note (optional)</label>
            <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Any note..." style={inp}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Source</label>
            <select value={type} onChange={e=>setType(e.target.value)} style={selectStyle}>
              {INCOME_SOURCES.map(s=>(
                <option key={s.name} value={s.name} style={{background:"#0F172A",color:"#E5E7EB",fontStyle:"normal"}}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(251,191,36,0.4)":"linear-gradient(135deg,#FBBF24,#D97706)",border:"none",borderRadius:"12px",color:"#022C22",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving ? "Saving..." : "Save Income"}
          </button>
        </div>
      </div>
    </>
  );
}
