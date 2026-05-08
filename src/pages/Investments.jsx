import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import { doc, updateDoc } from "firebase/firestore";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const TYPES=["Stock","Crypto","Mutual Fund","Gold","FD/RD","ETF","Other"];
const ICONS={Stock:"📊",Crypto:"₿","Mutual Fund":"💼",Gold:"🥇","FD/RD":"🏦",ETF:"📉",Other:"💡"};

function fmt(n){return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}
function mkey(d){const dt=new Date(d);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");}
function parseKey(mk){const[y,m]=mk.split("-");return{year:+y,month:+m};}
function buildKeys(year){return Array.from({length:12},(_,i)=>year+"-"+String(i+1).padStart(2,"0"));}
function fmtDate(s){const d=new Date(s);return`${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()].slice(0,3)} ${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;}
function groupByDate(entries){const map={};entries.forEach(e=>{if(!map[e.date])map[e.date]=[];map[e.date].push(e);});return Object.entries(map).sort((a,b)=>new Date(b[0])-new Date(a[0]));}

const card={background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 10px 30px rgba(0,0,0,0.4)",borderRadius:"16px"};
const inp={width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"13px 16px",color:"#E5E7EB",fontSize:"14px",outline:"none",transition:"border-color .2s",fontFamily:"inherit",boxSizing:"border-box"};

// ── Pencil Icon SVG ────────────────────────────────────────────
function Pencil(){
  return(
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

// ── Entry Panel — handles both ADD and EDIT ────────────────────
function EntryPanel({ open, onClose, onSave, uid, editEntry }) {
  const isEdit = !!editEntry;

  const [name,   setName]   = useState("");
  const [amount, setAmount] = useState("");
  const [date,   setDate]   = useState(new Date().toISOString().split("T")[0]);
  const [type,   setType]   = useState("Stock");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-fill fields when editing
  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(editEntry.name || "");
      setAmount(String(editEntry.amount || ""));
      setDate(editEntry.date || new Date().toISOString().split("T")[0]);
      setType(editEntry.type || "Stock");
      setNote(editEntry.note || "");
    } else {
      setName(""); setAmount(""); setNote("");
      setType("Stock");
      setDate(new Date().toISOString().split("T")[0]);
    }
    setSaving(false);
  }, [open, isEdit, editEntry?.id]);

  async function save() {
    if (!name.trim() || !amount || !date) return alert("Fill all fields");
    setSaving(true);
    try {
      if (isEdit) {
        // Update in Firestore
        await updateDoc(doc(db, "users", uid, "investments", editEntry.id), {
          name:   name.trim(),
          amount: parseFloat(amount),
          date,
          type,
          note:   note.trim(),
        });
      } else {
        // Add new
        await onSave({ name: name.trim(), amount: parseFloat(amount), date, type, note: note.trim() });
      }
      onClose();
    } catch (e) {
      alert("Failed: " + e.message);
    }
    setSaving(false);
  }

  const accentColor = "#34D399";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>

        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px",fontFamily:"inherit"}}>←</button>
          <h3 className="font-bold text-white text-base">
            {isEdit ? "✏️ Edit Investment" : "Add Investment"}
          </h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold"
            style={{background:`rgba(52,211,153,0.15)`,color:accentColor,border:`1px solid rgba(52,211,153,0.2)`}}>
            {isEdit ? "Editing" : "Invest"}
          </span>
        </div>

        <div className="px-5 pt-4 pb-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}
              onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Amount (₹)</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={inp}
              onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Zerodha Nifty 50" style={inp}
              onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Note (optional)</label>
            <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Any note..." style={inp}
              onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} style={{...inp,background:"#0F172A"}}>
              {TYPES.map(t=><option key={t} style={{background:"#0F172A"}}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(52,211,153,0.4)":"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"12px",color:"#022C22",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving ? "Saving..." : isEdit ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── MonthCard ──────────────────────────────────────────────────
function MonthCard({mk,entries,onClick}){
  const[,m]=mk.split("-");const total=entries.reduce((s,e)=>s+e.amount,0);const has=entries.length>0;
  return(
    <div onClick={()=>has&&onClick(mk)} style={{...card,padding:"12px",cursor:has?"pointer":"default",opacity:has?1:0.4,transition:"all .2s"}}
      onMouseEnter={e=>{if(has){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="rgba(52,211,153,0.3)";}}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}>
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:"#9CA3AF"}}>{MONTHS[+m-1].slice(0,3)}</p>
      <div style={{minHeight:"52px",marginBottom:"10px"}}>
        {entries.slice(0,3).map(e=>(<div key={e.id} className="flex justify-between text-xs mb-0.5"><span className="truncate mr-1" style={{color:"#6B7280"}}>{ICONS[e.type]||"💡"} {e.name.slice(0,10)}</span><span className="font-mono flex-shrink-0" style={{color:"#9CA3AF"}}>{fmt(e.amount)}</span></div>))}
        {entries.length>3&&<p className="text-xs" style={{color:"#4B5563"}}>+{entries.length-3} more</p>}
        {!has&&<p className="text-xs" style={{color:"#374151"}}>No entries</p>}
      </div>
      <div className="text-xs font-bold font-mono pt-2" style={{borderTop:`1px solid ${has?"rgba(52,211,153,0.15)":"rgba(255,255,255,0.03)"}`,color:has?"#34D399":"#374151"}}>
        Total = {fmt(total)}
      </div>
    </div>
  );
}

// ── MonthDetail ────────────────────────────────────────────────
function MonthDetail({mk, onChange, investments, onBack, onDelete, onEdit}){
  const{year,month}=parseKey(mk);
  function shift(dir){let nm=month+dir,ny=year;if(nm<1){nm=12;ny--;}if(nm>12){nm=1;ny++;}onChange(ny+"-"+String(nm).padStart(2,"0"));}
  const entries=investments.filter(e=>mkey(e.date)===mk);
  const total=entries.reduce((s,e)=>s+e.amount,0);
  const grouped=groupByDate(entries);
  const navBtn={width:"42px",height:"42px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#E5E7EB",fontSize:"18px",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"};

  return(
    <div>
      <button onClick={onBack} className="text-sm font-medium block mb-4"
        style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}
        onMouseEnter={e=>e.currentTarget.style.color="#E5E7EB"}
        onMouseLeave={e=>e.currentTarget.style.color="#6B7280"}>← Back</button>

      <div className="px-5 py-3 mb-3" style={{...card}}>
        <p className="font-bold text-white">Investment :</p>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button onClick={()=>shift(-1)} style={navBtn}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(52,211,153,0.4)";e.currentTarget.style.color="#34D399";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#E5E7EB";}}>◄</button>
        <div style={{flex:1,...card,padding:"10px",textAlign:"center"}}>
          <p className="font-bold text-white text-sm uppercase tracking-widest">{MONTHS[month-1]}</p>
        </div>
        <button onClick={()=>shift(1)} style={navBtn}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(52,211,153,0.4)";e.currentTarget.style.color="#34D399";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#E5E7EB";}}>►</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[["Invest","#34D399"],["Total","#E5E7EB"]].map(([lbl,col])=>(
          <div key={lbl} style={{...card,padding:"12px 16px",textAlign:"center"}}>
            <p className="text-xs font-mono mb-1" style={{color:"#6B7280"}}>{lbl}</p>
            <p className="text-base font-bold font-mono" style={{color:col}}>{fmt(total)}</p>
          </div>
        ))}
      </div>

      {grouped.length===0&&(
        <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
          <p style={{fontSize:"36px",marginBottom:"8px"}}>📈</p>
          <p style={{fontSize:"14px"}}>No investments this month</p>
          <p style={{fontSize:"12px",marginTop:"4px",color:"#374151"}}>Tap + to add one</p>
        </div>
      )}

      <div className="space-y-3">
        {grouped.map(([date,dayEntries])=>{
          const dayTotal=dayEntries.reduce((s,e)=>s+e.amount,0);
          return(
            <div key={date} style={{...card,overflow:"hidden"}}>
              <div className="flex justify-between px-5 py-3"
                style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.02)"}}>
                <p className="text-sm font-semibold font-mono" style={{color:"#9CA3AF"}}>{fmtDate(date)}</p>
                <p className="text-sm font-bold font-mono" style={{color:"#E5E7EB"}}>{fmt(dayTotal)}</p>
              </div>

              {dayEntries.map((e,ei)=>(
                <div key={e.id} className="flex items-center px-5 py-3.5 group transition-colors"
                  style={{borderBottom:ei<dayEntries.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}
                  onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={el=>el.currentTarget.style.background="transparent"}>

                  <div style={{width:"90px",flexShrink:0}}>
                    <p className="text-sm" style={{color:"#9CA3AF"}}>{e.type}</p>
                  </div>
                  <div style={{flex:1,minWidth:0,padding:"0 12px"}}>
                    <p className="text-sm font-medium truncate" style={{color:"#E5E7EB"}}>{e.name}</p>
                    {e.note&&<p className="text-xs mt-0.5" style={{color:"#4B5563"}}>{e.note}</p>}
                  </div>
                  <p className="text-sm font-bold font-mono flex-shrink-0 mr-2" style={{color:"#34D399"}}>{fmt(e.amount)}</p>

                  {/* ── Pencil edit button ── */}
                  <button
                    onClick={()=>onEdit(e)}
                    className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mr-1"
                    title="Edit entry"
                    style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",padding:"4px 5px",display:"flex",alignItems:"center"}}
                    onMouseEnter={el=>el.currentTarget.style.color="#34D399"}
                    onMouseLeave={el=>el.currentTarget.style.color="#6B7280"}>
                    <Pencil/>
                  </button>

                  {/* ── Delete X button ── */}
                  <button
                    onClick={()=>onDelete("investments",e.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Delete entry"
                    style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"14px",padding:"2px 4px"}}
                    onMouseEnter={el=>el.currentTarget.style.color="#F87171"}
                    onMouseLeave={el=>el.currentTarget.style.color="#6B7280"}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Investments({firestoreData, user}){
  const [activeMonth, setActiveMonth] = useState(null);
  const [panelOpen,   setPanelOpen]   = useState(false);
  const [editEntry,   setEditEntry]   = useState(null); // null=add, obj=edit
  const [vis,         setVis]         = useState(false);

  useEffect(()=>{setTimeout(()=>setVis(true),40);},[]);

  const {investments=[],addEntry,deleteEntry,loading=false} = firestoreData||{};
  const uid = user?.uid;
  const year = new Date().getFullYear();
  const keys = buildKeys(year);
  const totalAll = investments.reduce((s,e)=>s+e.amount,0);

  // Open panel in ADD mode
  function openAdd() { setEditEntry(null); setPanelOpen(true); }

  // Open panel in EDIT mode with pre-filled entry
  function openEdit(entry) { setEditEntry(entry); setPanelOpen(true); }

  function closePanel() { setPanelOpen(false); setEditEntry(null); }

  const handleAdd = useCallback(async(entry)=>{
    await addEntry("investments",entry);
    setActiveMonth(mkey(entry.date));
  },[addEntry]);

  const handleDelete = useCallback(async(kind,id)=>{
    await deleteEntry(kind,id);
  },[deleteEntry]);

  if(loading) return(
    <div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}
    </div>
  );

  return(
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>

      {!activeMonth&&(<>
        <div className="mb-4">
          <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Investments</h1>
          <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>
            {year} · Total: <span style={{color:"#34D399",fontWeight:600}}>{fmt(totalAll)}</span>
          </p>
        </div>
        <div className="p-4 mb-5 flex justify-between items-center" style={{...card}}>
          <div>
            <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Total Invested {year}</p>
            <p className="text-2xl font-bold" style={{color:"#34D399"}}>{fmt(totalAll)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Entries</p>
            <p className="text-2xl font-bold" style={{color:"#E5E7EB"}}>{investments.length}</p>
          </div>
        </div>
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{color:"#4B5563"}}>Tap a month to view</p>
        <div className="grid grid-cols-3 gap-3">
          {keys.map(mk=>(
            <MonthCard key={mk} mk={mk}
              entries={investments.filter(e=>mkey(e.date)===mk)}
              onClick={setActiveMonth}/>
          ))}
        </div>
      </>)}

      {activeMonth&&(
        <MonthDetail
          mk={activeMonth}
          onChange={setActiveMonth}
          investments={investments}
          onBack={()=>setActiveMonth(null)}
          onDelete={handleDelete}
          onEdit={openEdit}
        />
      )}

      {/* Shared Add/Edit panel */}
      <EntryPanel
        open={panelOpen}
        onClose={closePanel}
        onSave={handleAdd}
        uid={uid}
        editEntry={editEntry}
      />

      {/* Floating + button */}
      <button onClick={openAdd}
        className="fixed bottom-20 right-5 md:bottom-6 flex items-center justify-center rounded-full transition-all hover:scale-110 z-30"
        style={{width:"52px",height:"52px",background:"linear-gradient(135deg,#34D399,#059669)",border:"none",color:"#022C22",fontSize:"26px",cursor:"pointer",boxShadow:"0 8px 20px rgba(52,211,153,0.4)"}}>
        +
      </button>
    </div>
  );
}
