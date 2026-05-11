import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import { doc, updateDoc, collection, addDoc, deleteDoc } from "firebase/firestore";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEFAULT_CATS=["Food","Travel","Shopping","Entertainment","Course","Electronics","Health","Utilities","Rent","Fuel","Other"];
const ICONS={Food:"🍔",Travel:"✈️",Shopping:"🛍️",Entertainment:"🎬",Course:"📚",Electronics:"💻",Health:"💊",Utilities:"⚡",Rent:"🏠",Fuel:"⛽",Other:"💡"};

function fmt(n){return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}
function mkey(d){const dt=new Date(d);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");}
function parseKey(mk){const[y,m]=mk.split("-");return{year:+y,month:+m};}
function buildKeys(year){return Array.from({length:12},(_,i)=>year+"-"+String(i+1).padStart(2,"0"));}
function fmtDate(s){const d=new Date(s);return`${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;}
function groupByDate(entries){const map={};entries.forEach(e=>{if(!map[e.date])map[e.date]=[];map[e.date].push(e);});return Object.entries(map).sort((a,b)=>new Date(b[0])-new Date(a[0]));}

const card={background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 10px 30px rgba(0,0,0,0.4)",borderRadius:"16px"};
const inp={width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"13px 16px",color:"#E5E7EB",fontSize:"14px",outline:"none",transition:"border-color .2s",fontFamily:"inherit",boxSizing:"border-box"};
// ✨ NEW: Custom select with proper arrow position
const selectStyle = { ...inp, background:"#0F172A", appearance:"none", WebkitAppearance:"none", MozAppearance:"none", backgroundImage:"url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg width='12' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%236B7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 16px center", paddingRight:"40px" };

function Pencil(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);}

// ── Manage Categories Panel (with EDIT) ────────────────────────
function ManageCatsPanel({ open, onClose, uid, customCats }) {
  const [newCat,    setNewCat]    = useState("");
  const [newIcon,   setNewIcon]   = useState("💡");
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState("");
  const [editIcon,  setEditIcon]  = useState("💡");
  const [saving,    setSaving]    = useState(false);

  const ICON_OPTIONS = ["💡","🏋️","🎮","🎵","💈","🧴","🐾","🍕","☕","🎯","🚌","💊","🎁","📱","🏦","🌿","🍺","🏊","✂️","🧹","📊","💼","🥇","₿"];

  useEffect(() => { if (open) { setNewCat(""); setNewIcon("💡"); setEditingId(null); } }, [open]);

  async function addCat() {
    if (!newCat.trim()) return alert("Enter category name");
    if ([...DEFAULT_CATS, ...customCats.map(c=>c.name)].includes(newCat.trim())) return alert("Category already exists");
    setSaving(true);
    try {
      await addDoc(collection(db, "users", uid, "categories"), {
        name: newCat.trim(), icon: newIcon, createdAt: new Date().toISOString()
      });
      setNewCat(""); setNewIcon("💡");
    } catch(e) { alert(e.message); }
    setSaving(false);
  }

  async function deleteCat(id) {
    if (!confirm("Delete this category? Existing entries will keep this category name.")) return;
    await deleteDoc(doc(db, "users", uid, "categories", id));
  }

  function startEdit(cat) { setEditingId(cat.id); setEditName(cat.name); setEditIcon(cat.icon); }
  function cancelEdit() { setEditingId(null); }

  async function saveEdit() {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, "users", uid, "categories", editingId), {
        name: editName.trim(), icon: editIcon
      });
      setEditingId(null);
    } catch(e) { alert(e.message); }
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
        style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"85vh",overflowY:"auto"}}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>

        <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
          <h3 className="font-bold text-white text-base">🏷️ Manage Categories</h3>
        </div>

        <div className="px-5 pt-4 pb-2">
          <p className="text-xs uppercase tracking-wider mb-3" style={{color:"#6B7280"}}>Add New Category</p>

          <div className="mb-3">
            <label className="text-xs block mb-2" style={{color:"#6B7280"}}>Pick an icon</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
              {ICON_OPTIONS.map(ic=>(
                <button key={ic} onClick={()=>setNewIcon(ic)}
                  style={{fontSize:"20px",padding:"5px 8px",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",
                    border:`1px solid ${newIcon===ic?"rgba(248,113,113,0.5)":"rgba(255,255,255,0.08)"}`,
                    background:newIcon===ic?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.03)"}}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            <input type="text" value={newCat} onChange={e=>setNewCat(e.target.value)}
              placeholder="Category name e.g. Gym, Coffee..."
              style={{...inp,flex:1}}
              onKeyDown={e=>e.key==="Enter"&&addCat()}/>
            <button onClick={addCat} disabled={saving}
              style={{padding:"0 18px",background:"linear-gradient(135deg,#F87171,#ef4444)",border:"none",borderRadius:"12px",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
              {saving?"...":"Add"}
            </button>
          </div>

          <p className="text-xs uppercase tracking-wider mb-2" style={{color:"#6B7280"}}>Default Categories</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"16px"}}>
            {DEFAULT_CATS.map(c=>(
              <span key={c} style={{padding:"5px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"20px",color:"#9CA3AF",fontSize:"12px"}}>
                {ICONS[c]||"💡"} {c}
              </span>
            ))}
          </div>

          {customCats.length > 0 && (<>
            <p className="text-xs uppercase tracking-wider mb-2" style={{color:"#6B7280"}}>Your Categories</p>
            <div className="space-y-2 mb-6">
              {customCats.map(c=>(
                <div key={c.id} className="px-4 py-3 rounded-xl"
                  style={{background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.15)"}}>
                  {editingId === c.id ? (
                    <div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"8px"}}>
                        {ICON_OPTIONS.map(ic=>(
                          <button key={ic} onClick={()=>setEditIcon(ic)}
                            style={{fontSize:"16px",padding:"3px 6px",borderRadius:"6px",cursor:"pointer",fontFamily:"inherit",
                              border:`1px solid ${editIcon===ic?"rgba(248,113,113,0.5)":"rgba(255,255,255,0.08)"}`,
                              background:editIcon===ic?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.03)"}}>
                            {ic}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} style={{...inp,flex:1,padding:"8px 12px"}}/>
                        <button onClick={saveEdit} style={{padding:"0 14px",background:"#34D399",border:"none",borderRadius:"8px",color:"#022C22",fontWeight:"700",fontSize:"12px",cursor:"pointer"}}>Save</button>
                        <button onClick={cancelEdit} style={{padding:"0 12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#6B7280",fontSize:"12px",cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span style={{color:"#E5E7EB",fontSize:"14px"}}>{c.icon} {c.name}</span>
                      <div style={{display:"flex",gap:"6px"}}>
                        <button onClick={()=>startEdit(c)}
                          style={{color:"#8B5CF6",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"6px",padding:"4px 8px",cursor:"pointer",fontSize:"12px",display:"flex",alignItems:"center"}}>
                          <Pencil/>
                        </button>
                        <button onClick={()=>deleteCat(c.id)}
                          style={{color:"#F87171",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontSize:"14px"}}>
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>
    </>
  );
}

// ── Entry Panel ────────────────────────────────────────────────
function EntryPanel({ open, onClose, onSave, uid, editEntry, allCats, onManageCats }) {
  const isEdit = !!editEntry;
  const accentColor = "#F87171";

  const [name,   setName]   = useState("");
  const [amount, setAmount] = useState("");
  const [date,   setDate]   = useState(new Date().toISOString().split("T")[0]);
  const [type,   setType]   = useState("Food");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(editEntry.name || "");
      setAmount(String(editEntry.amount || ""));
      setDate(editEntry.date || new Date().toISOString().split("T")[0]);
      setType(editEntry.type || "Food");
      setNote(editEntry.note || "");
    } else {
      setName(""); setAmount(""); setNote("");
      setType("Food");
      setDate(new Date().toISOString().split("T")[0]);
    }
    setSaving(false);
  }, [open, isEdit, editEntry?.id]);

  async function save() {
    if (!name.trim() || !amount || !date) return alert("Fill all fields");
    setSaving(true);
    try {
      if (isEdit) {
        await updateDoc(doc(db, "users", uid, "spendings", editEntry.id), {
          name: name.trim(), amount: parseFloat(amount), date, type, note: note.trim(),
        });
      } else {
        await onSave({ name: name.trim(), amount: parseFloat(amount), date, type, note: note.trim() });
      }
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
          <h3 className="font-bold text-white text-base">{isEdit ? "✏️ Edit Spending" : "Add Spending"}</h3>
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold"
            style={{background:"rgba(248,113,113,0.15)",color:accentColor,border:"1px solid rgba(248,113,113,0.2)"}}>
            {isEdit ? "Editing" : "Spent"}
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
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Zomato Dinner" style={inp}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Note (optional)</label>
            <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Any note..." style={inp}/>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase tracking-wider" style={{color:"#6B7280"}}>Category</label>
              <button onClick={()=>{onClose();onManageCats();}}
                style={{display:"flex",alignItems:"center",gap:"5px",color:"#F87171",background:"none",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"600",fontFamily:"inherit"}}>
                + Add Category
              </button>
            </div>
            <select value={type} onChange={e=>setType(e.target.value)} style={selectStyle}>
              {allCats.map(c=><option key={c.name} style={{background:"#0F172A",color:"#E5E7EB",fontFamily:"system-ui, -apple-system, sans-serif",fontStyle:"normal",fontWeight:"normal"}}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-8">
          <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(248,113,113,0.4)":"linear-gradient(135deg,#F87171,#ef4444)",border:"none",borderRadius:"12px",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving ? "Saving..." : isEdit ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      </div>
    </>
  );
}

function MonthCard({mk,entries,onClick,iconMap}){
  const[,m]=mk.split("-");const total=entries.reduce((s,e)=>s+e.amount,0);const has=entries.length>0;
  return(
    <div onClick={()=>has&&onClick(mk)} style={{...card,padding:"12px",cursor:has?"pointer":"default",opacity:has?1:0.4,transition:"all .2s"}}>
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:"#9CA3AF"}}>{MONTHS[+m-1].slice(0,3)}</p>
      <div style={{minHeight:"52px",marginBottom:"10px"}}>
        {entries.slice(0,3).map(e=>(<div key={e.id} className="flex justify-between text-xs mb-0.5"><span className="truncate mr-1" style={{color:"#6B7280"}}>{iconMap[e.type]||"💡"} {e.name.slice(0,10)}</span><span className="font-mono flex-shrink-0" style={{color:"#9CA3AF"}}>{fmt(e.amount)}</span></div>))}
        {entries.length>3&&<p className="text-xs" style={{color:"#4B5563"}}>+{entries.length-3} more</p>}
        {!has&&<p className="text-xs" style={{color:"#374151"}}>No entries</p>}
      </div>
      <div className="text-xs font-bold font-mono pt-2" style={{borderTop:`1px solid ${has?"rgba(248,113,113,0.15)":"rgba(255,255,255,0.03)"}`,color:has?"#F87171":"#374151"}}>
        Total = {fmt(total)}
      </div>
    </div>
  );
}

function MonthDetail({mk,onChange,spendings,onBack,onDelete,onEdit,iconMap}){
  const{year,month}=parseKey(mk);
  function shift(dir){let nm=month+dir,ny=year;if(nm<1){nm=12;ny--;}if(nm>12){nm=1;ny++;}onChange(ny+"-"+String(nm).padStart(2,"0"));}
  const entries=spendings.filter(e=>mkey(e.date)===mk);
  const total=entries.reduce((s,e)=>s+e.amount,0);
  const grouped=groupByDate(entries);
  const allCatNames=[...DEFAULT_CATS,...Object.keys(iconMap).filter(k=>!DEFAULT_CATS.includes(k))];
  const byCat=allCatNames.map(cat=>({cat,icon:iconMap[cat]||"💡",total:entries.filter(e=>e.type===cat).reduce((s,e)=>s+e.amount,0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const navBtn={width:"42px",height:"42px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#E5E7EB",fontSize:"18px",cursor:"pointer",fontFamily:"inherit"};

  return(
    <div>
      <button onClick={onBack} className="text-sm font-medium block mb-4" style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>

      <div className="px-5 py-3 mb-3" style={{...card}}>
        <p className="font-bold text-white">Spending :</p>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button onClick={()=>shift(-1)} style={navBtn}>◄</button>
        <div style={{flex:1,...card,padding:"10px",textAlign:"center"}}>
          <p className="font-bold text-white text-sm uppercase tracking-widest">{MONTHS[month-1]}</p>
        </div>
        <button onClick={()=>shift(1)} style={navBtn}>►</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[["Spend","#F87171"],["Total","#E5E7EB"]].map(([lbl,col])=>(
          <div key={lbl} style={{...card,padding:"12px 16px",textAlign:"center"}}>
            <p className="text-xs font-mono mb-1" style={{color:"#6B7280"}}>{lbl}</p>
            <p className="text-base font-bold font-mono" style={{color:col}}>{fmt(total)}</p>
          </div>
        ))}
      </div>

      {byCat.length>0&&(
        <div className="p-4 mb-4" style={{...card}}>
          <p className="text-xs uppercase tracking-wider mb-3" style={{color:"#4B5563"}}>By Category</p>
          <div className="space-y-2">
            {byCat.map(({cat,icon,total:ct})=>(
              <div key={cat} className="flex items-center gap-2">
                <span style={{fontSize:"14px",width:"20px"}}>{icon}</span>
                <div style={{flex:1}}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{color:"#9CA3AF"}}>{cat}</span>
                    <span className="font-mono" style={{color:"#F87171"}}>{fmt(ct)}</span>
                  </div>
                  <div style={{height:"3px",background:"rgba(255,255,255,0.05)",borderRadius:"99px",overflow:"hidden"}}>
                    <div style={{height:"100%",background:"rgba(248,113,113,0.6)",borderRadius:"99px",width:`${(ct/total)*100}%`}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grouped.length===0&&(
        <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
          <p style={{fontSize:"36px",marginBottom:"8px"}}>💸</p>
          <p style={{fontSize:"14px"}}>No spending this month</p>
        </div>
      )}

      <div className="space-y-3">
        {grouped.map(([date,dayEntries])=>{
          const dayTotal=dayEntries.reduce((s,e)=>s+e.amount,0);
          return(
            <div key={date} style={{...card,overflow:"hidden"}}>
              <div className="flex justify-between px-5 py-3" style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.02)"}}>
                <p className="text-sm font-semibold font-mono" style={{color:"#9CA3AF"}}>{fmtDate(date)}</p>
                <p className="text-sm font-bold font-mono" style={{color:"#E5E7EB"}}>{fmt(dayTotal)}</p>
              </div>
              {dayEntries.map((e,ei)=>(
                <div key={e.id} className="flex items-center px-4 py-3"
                  style={{borderBottom:ei<dayEntries.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>
                  <div style={{fontSize:"20px",flexShrink:0,width:"36px"}}>{iconMap[e.type]||"💡"}</div>
                  <div style={{flex:1,minWidth:0,padding:"0 8px"}}>
                    <p className="text-sm font-medium truncate" style={{color:"#E5E7EB"}}>{e.name}</p>
                    <p className="text-xs truncate" style={{color:"#6B7280"}}>{e.type}{e.note ? ` · ${e.note}` : ""}</p>
                  </div>
                  <p className="text-sm font-bold font-mono flex-shrink-0 mr-2" style={{color:"#F87171"}}>{fmt(e.amount)}</p>
                  <button onClick={()=>onEdit(e)} title="Edit"
                    style={{color:"#8B5CF6",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"8px",padding:"6px",cursor:"pointer",marginRight:"4px",display:"flex",alignItems:"center"}}>
                    <Pencil/>
                  </button>
                  <button onClick={()=>onDelete("spendings",e.id)} title="Delete"
                    style={{color:"#F87171",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"8px",padding:"6px 8px",cursor:"pointer",fontSize:"13px"}}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Spending({firestoreData, user, quickAddTrigger}){
  const [activeMonth,  setActiveMonth]  = useState(null);
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [editEntry,    setEditEntry]    = useState(null);
  const [manageCats,   setManageCats]   = useState(false);
  const [vis,          setVis]          = useState(false);

  useEffect(()=>{setTimeout(()=>setVis(true),40);},[]);

  const {spendings=[], categories=[], addEntry, deleteEntry, loading=false} = firestoreData||{};
  const uid = user?.uid;

  // ✨ NEW: respond to universal +
  useEffect(()=>{
  if (quickAddTrigger?.type === "spending") {
    setEditEntry(null);
    setPanelOpen(true);
  }
}, [quickAddTrigger?.ts]);

// ✨ NEW: Close panels when leaving this page
useEffect(() => {
  return () => {
    setPanelOpen(false);
    setManageCats(false);
    setEditEntry(null);
  };
}, []);

  const allCats = [
    ...DEFAULT_CATS.map(name=>({name, icon:ICONS[name]||"💡"})),
    ...categories.map(c=>({name:c.name, icon:c.icon})),
  ];

  const iconMap = {};
  allCats.forEach(c=>{ iconMap[c.name]=c.icon; });

  const year = new Date().getFullYear();
  const keys = buildKeys(year);
  const totalAll = spendings.reduce((s,e)=>s+e.amount,0);

  function openEdit(entry) { setEditEntry(entry); setPanelOpen(true); }
  function closePanel()    { setPanelOpen(false); setEditEntry(null); }

  const handleAdd = useCallback(async(entry)=>{
    await addEntry("spendings",entry);
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
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Spending</h1>
            <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>
              {year} · Total: <span style={{color:"#F87171",fontWeight:600}}>{fmt(totalAll)}</span>
            </p>
          </div>
          <button onClick={()=>setManageCats(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",color:"#F87171",cursor:"pointer",fontFamily:"inherit"}}>
            🏷️ Categories
          </button>
        </div>

        <div className="p-4 mb-5 flex justify-between items-center" style={{...card}}>
          <div>
            <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Total Spent {year}</p>
            <p className="text-2xl font-bold" style={{color:"#F87171"}}>{fmt(totalAll)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Entries</p>
            <p className="text-2xl font-bold" style={{color:"#E5E7EB"}}>{spendings.length}</p>
          </div>
        </div>

        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{color:"#4B5563"}}>Tap a month to view</p>
        <div className="grid grid-cols-3 gap-3">
          {keys.map(mk=>(
            <MonthCard key={mk} mk={mk} entries={spendings.filter(e=>mkey(e.date)===mk)} onClick={setActiveMonth} iconMap={iconMap}/>
          ))}
        </div>
      </>)}

      {activeMonth&&(
        <MonthDetail mk={activeMonth} onChange={setActiveMonth} spendings={spendings}
          onBack={()=>setActiveMonth(null)} onDelete={handleDelete} onEdit={openEdit} iconMap={iconMap}/>
      )}

      {panelOpen  && <EntryPanel       open={panelOpen}  onClose={closePanel} onSave={handleAdd} uid={uid} editEntry={editEntry} allCats={allCats} onManageCats={()=>setManageCats(true)}/>}
      {manageCats && <ManageCatsPanel  open={manageCats} onClose={()=>setManageCats(false)} uid={uid} customCats={categories}/>}
    </div>
  );
}