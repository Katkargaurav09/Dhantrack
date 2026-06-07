  import { useState, useEffect, useCallback, useMemo } from "react";
  import { db } from "../firebase/config";
  import { doc, updateDoc, deleteDoc, collection, addDoc, writeBatch, arrayRemove } from "firebase/firestore";
  import CategoryDetail from "./CategoryDetail";
  import CustomCategoryPanel from "../components/CustomCategoryPanel";
  import { suggestCategory, extractMerchant } from "../utils/keywordMap";
  import { CRYPTO_COINS } from "../hooks/Usefirestore";

  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DEFAULT_TYPES=["Stock","Crypto","Mutual Fund","Gold","FD/RD","ETF","Other"];
  const ICONS={Stock:"📊",Crypto:"₿","Mutual Fund":"💼",Gold:"🥇","FD/RD":"🏦",ETF:"📉",Other:"💡"};

  function fmt(n){return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}
  function mkey(d){const dt=new Date(d);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");}
  function parseKey(mk){const[y,m]=mk.split("-");return{year:+y,month:+m};}
  function buildKeys(year){return Array.from({length:12},(_,i)=>year+"-"+String(i+1).padStart(2,"0"));}
  function fmtDate(s){const d=new Date(s);return`${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;}
  function groupByDate(entries){const map={};entries.forEach(e=>{if(!map[e.date])map[e.date]=[];map[e.date].push(e);});return Object.entries(map).sort((a,b)=>new Date(b[0])-new Date(a[0]));}

  const card={background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 10px 30px rgba(0,0,0,0.4)",borderRadius:"16px"};
  const inp={width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"13px 16px",color:"#E5E7EB",fontSize:"14px",outline:"none",transition:"border-color .2s",fontFamily:"inherit",boxSizing:"border-box"};
  const selectStyle = { ...inp, background:"#0F172A", appearance:"none", WebkitAppearance:"none", MozAppearance:"none", backgroundImage:"url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg width='12' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%236B7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 16px center", paddingRight:"40px" };

  function Pencil(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);}

  // ── Manage Investment Types Panel (legacy v1.4) ──────────────────
  function ManageTypesPanel({ open, onClose, uid, customTypes }) {
    const [newType,   setNewType]   = useState("");
    const [newIcon,   setNewIcon]   = useState("💡");
    const [editingId, setEditingId] = useState(null);
    const [editName,  setEditName]  = useState("");
    const [editIcon,  setEditIcon]  = useState("💡");
    const [saving,    setSaving]    = useState(false);

    const ICON_OPTIONS = ["💡","📊","₿","💼","🥇","🏦","📉","📈","💰","🏠","🌐","🎯","📦","🏛️"];

    useEffect(() => { if (open) { setNewType(""); setNewIcon("💡"); setEditingId(null); } }, [open]);

    async function addType() {
      if (!newType.trim()) return alert("Enter type name");
      if ([...DEFAULT_TYPES, ...customTypes.map(c=>c.name)].includes(newType.trim())) return alert("Type already exists");
      setSaving(true);
      try {
        await addDoc(collection(db, "users", uid, "categories"), {
          name: newType.trim(), icon: newIcon, createdAt: new Date().toISOString()
        });
        setNewType(""); setNewIcon("💡");
      } catch(e) { alert(e.message); }
      setSaving(false);
    }

    async function deleteType(id) {
      if (!confirm("Delete this type? Existing entries will keep this type name.")) return;
      await deleteDoc(doc(db, "users", uid, "categories", id));
    }

    function startEdit(t) { setEditingId(t.id); setEditName(t.name); setEditIcon(t.icon); }
    function cancelEdit() { setEditingId(null); }

    async function saveEdit() {
      if (!editName.trim()) return;
      try {
        await updateDoc(doc(db, "users", uid, "categories", editingId), { name: editName.trim(), icon: editIcon });
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
            <h3 className="font-bold text-white text-base">📊 Quick Investment Types</h3>
          </div>
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs uppercase tracking-wider mb-3" style={{color:"#6B7280"}}>Add New Quick Type</p>
            <p style={{color:"#6B7280",fontSize:"11px",marginBottom:"12px",lineHeight:"1.5"}}>
              💡 For specific platforms (Binance, Zerodha), use "Create Custom Category" instead.
            </p>
            <div className="mb-3">
              <label className="text-xs block mb-2" style={{color:"#6B7280"}}>Pick an icon</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                {ICON_OPTIONS.map(ic=>(
                  <button key={ic} onClick={()=>setNewIcon(ic)}
                    style={{fontSize:"20px",padding:"5px 8px",borderRadius:"8px",cursor:"pointer",fontFamily:"inherit",
                      border:`1px solid ${newIcon===ic?"rgba(52,211,153,0.5)":"rgba(255,255,255,0.08)"}`,
                      background:newIcon===ic?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)"}}>{ic}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-5">
              <input type="text" value={newType} onChange={e=>setNewType(e.target.value)}
                placeholder="e.g. Real Estate, NPS..." style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&addType()}/>
              <button onClick={addType} disabled={saving}
                style={{padding:"0 18px",background:"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"12px",color:"#022C22",fontWeight:"700",fontSize:"14px",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                {saving?"...":"Add"}
              </button>
            </div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{color:"#6B7280"}}>Default Types</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"16px"}}>
              {DEFAULT_TYPES.map(c=>(
                <span key={c} style={{padding:"5px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"20px",color:"#9CA3AF",fontSize:"12px"}}>
                  {ICONS[c]||"💡"} {c}
                </span>
              ))}
            </div>
            {customTypes.length > 0 && (<>
              <p className="text-xs uppercase tracking-wider mb-2" style={{color:"#6B7280"}}>Your Quick Types</p>
              <div className="space-y-2 mb-6">
                {customTypes.map(c=>(
                  <div key={c.id} className="px-4 py-3 rounded-xl" style={{background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.15)"}}>
                    {editingId === c.id ? (
                      <div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"8px"}}>
                          {ICON_OPTIONS.map(ic=>(
                            <button key={ic} onClick={()=>setEditIcon(ic)}
                              style={{fontSize:"16px",padding:"3px 6px",borderRadius:"6px",cursor:"pointer",fontFamily:"inherit",
                                border:`1px solid ${editIcon===ic?"rgba(52,211,153,0.5)":"rgba(255,255,255,0.08)"}`,
                                background:editIcon===ic?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)"}}>{ic}</button>
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
                          <button onClick={()=>deleteType(c.id)}
                            style={{color:"#F87171",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontSize:"14px"}}>✕</button>
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

  // ── Entry Panel (Smart Auto-Cat + presetType + ✨ presetCustomTagId) ──
  function EntryPanel({ open, onClose, onSave, uid, editEntry, allTypes, onManageTypes, learnedCategories, learnCategory, investments, presetType, presetCustomTagId }) {
    const isEdit = !!editEntry;
    const accentColor = "#34D399";
    const [name,setName]=useState(""); const [amount,setAmount]=useState("");
    const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
    const [type,setType]=useState("Stock"); const [note,setNote]=useState("");
    const [saving,setSaving]=useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [userPickedManually, setUserPickedManually] = useState(false);
    // ✨ v1.9 live-price (crypto)
    const [liveTrack, setLiveTrack] = useState(false);
    const [coinId,    setCoinId]    = useState("bitcoin");
    const [buyPrice,  setBuyPrice]  = useState("");

    useEffect(() => {
      if (!open) return;
      if (isEdit) {
        setName(editEntry.name || ""); setAmount(String(editEntry.amount || ""));
        setDate(editEntry.date || new Date().toISOString().split("T")[0]);
        setType(editEntry.type || "Stock"); setNote(editEntry.note || "");
        // ✨ v1.9 load live-price fields if this entry has them
        setLiveTrack(!!editEntry.liveTrack);
        setCoinId(editEntry.coinId || "bitcoin");
        setBuyPrice(editEntry.buyPrice ? String(editEntry.buyPrice) : "");
      } else {
        setName(""); setAmount(""); setNote("");
        setType(presetType || "Stock");
        setDate(new Date().toISOString().split("T")[0]);
        // ✨ v1.9 reset live-price
        setLiveTrack(false);
        setCoinId("bitcoin");
        setBuyPrice("");
      }
      setSuggestion(null);
      setUserPickedManually(false);
      setSaving(false);
    }, [open, isEdit, editEntry?.id, presetType]);

    useEffect(() => {
      if (!name.trim() || name.length < 2 || isEdit) { setSuggestion(null); return; }
      if (userPickedManually) return;
      const result = suggestCategory(name, "investment", learnedCategories || {});
      if (result && result.category && result.category !== type) {
        const validTypes = allTypes.map(t => t.name);
        if (validTypes.includes(result.category)) setSuggestion(result);
        else setSuggestion(null);
      } else setSuggestion(null);
    }, [name, learnedCategories, allTypes, type, userPickedManually, isEdit]);

    function applySuggestion() { if (suggestion) { setType(suggestion.category); setSuggestion(null); } }
    function handleTypeChange(newType) { setType(newType); setUserPickedManually(true); setSuggestion(null); }

    async function save() {
      if (!name.trim() || !amount || !date) return alert("Fill all fields");
      // ✨ v1.9 if live tracking on, need a buy price
      const wantLive = liveTrack && type === "Crypto";
      if (wantLive && (!buyPrice || parseFloat(buyPrice) <= 0)) return alert("Enter the buy price per coin");
      const coin = CRYPTO_COINS.find(c => c.id === coinId);
      setSaving(true);
      try {
        if (isEdit) {
          const upd = {
            name: name.trim(), amount: parseFloat(amount), date, type, note: note.trim(),
          };
          // ✨ v1.9 live-price fields (write or clear)
          if (wantLive) {
            upd.liveTrack = true;
            upd.coinId = coinId;
            upd.coinSymbol = coin ? coin.symbol : null;
            upd.buyPrice = parseFloat(buyPrice);
          } else {
            upd.liveTrack = false;
          }
          await updateDoc(doc(db, "users", uid, "investments", editEntry.id), upd);
        } else {
          // ✨ FIX #2: auto-tag entry with custom category if we're inside one
          const entryData = { name: name.trim(), amount: parseFloat(amount), date, type, note: note.trim() };
          if (presetCustomTagId) entryData.customTags = [presetCustomTagId];
          // ✨ v1.9 live-price fields
          if (wantLive) {
            entryData.liveTrack = true;
            entryData.coinId = coinId;
            entryData.coinSymbol = coin ? coin.symbol : null;
            entryData.buyPrice = parseFloat(buyPrice);
          }
          await onSave(entryData);

          if (learnCategory && name.trim().length >= 3) {
            const merchant = extractMerchant(name);
            if (merchant && merchant.length >= 3) {
              const sameMatches = (investments || []).filter(i => i.name && i.name.toLowerCase().includes(merchant) && i.type === type);
              if (sameMatches.length >= 2) learnCategory(merchant, type);
            }
          }
        }
        onClose();
      } catch (e) { alert("Failed: " + e.message); }
      setSaving(false);
    }

    return (
      <>
        {open && <div className="fixed inset-0 bg-black/60" style={{zIndex:80}} onClick={onClose}/>}
        <div className={`fixed bottom-0 left-0 right-0 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`}
          style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"90vh",overflowY:"auto",zIndex:90}}>
          <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
          <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
            <h3 className="font-bold text-white text-base">{isEdit ? "✏️ Edit Investment" : "Add Investment"}</h3>
            <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold"
              style={{background:`rgba(52,211,153,0.15)`,color:accentColor,border:`1px solid rgba(52,211,153,0.2)`}}>
              {isEdit ? "Editing" : "Invest"}
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
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Zerodha Nifty 50" style={inp}/>
              {suggestion && !isEdit && (
                <button onClick={applySuggestion} style={{
                  width:"100%",marginTop:"8px",padding:"10px 12px",background:"rgba(52,211,153,0.08)",
                  border:"1px solid rgba(52,211,153,0.25)",borderRadius:"10px",color:"#34D399",
                  fontSize:"12px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",
                  justifyContent:"space-between",gap:"8px",textAlign:"left",
                }}>
                  <span>💡 Suggested: <strong>{ICONS[suggestion.category] || allTypes.find(t=>t.name===suggestion.category)?.icon || "💡"} {suggestion.category}</strong>
                    {suggestion.source === "learned" && <span style={{color:"#9CA3AF",fontSize:"10px",marginLeft:"4px"}}>(from history)</span>}
                  </span>
                  <span style={{fontSize:"11px",fontWeight:"700"}}>Apply →</span>
                </button>
              )}
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Note (optional)</label>
              <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Any note..." style={inp}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-wider" style={{color:"#6B7280"}}>Type</label>
                <button onClick={()=>{onClose();onManageTypes();}}
                  style={{display:"flex",alignItems:"center",gap:"5px",color:"#34D399",background:"none",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"600",fontFamily:"inherit"}}>
                  + Add Quick Type
                </button>
              </div>
              <select value={type} onChange={e=>handleTypeChange(e.target.value)} style={selectStyle}>
                {allTypes.map(t=><option key={t.name} value={t.name} style={{background:"#0F172A",color:"#E5E7EB",fontFamily:"system-ui, -apple-system, sans-serif",fontStyle:"normal"}}>{t.icon} {t.name}</option>)}
              </select>
            </div>

            {/* ✨ v1.9: Live price toggle — only for Crypto */}
            {type === "Crypto" && (
              <div style={{padding:"12px",background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:"12px"}}>
                <div className="flex items-center justify-between">
                  <div style={{flex:1,paddingRight:"10px"}}>
                    <p style={{color:"#FBBF24",fontSize:"13px",fontWeight:700}}>📈 Track live price</p>
                    <p style={{color:"#9CA3AF",fontSize:"11px",marginTop:"2px",lineHeight:1.4}}>See current value & profit/loss in Holdings</p>
                  </div>
                  <button type="button" onClick={()=>setLiveTrack(v=>!v)} style={{
                    width:"46px",height:"26px",borderRadius:"99px",flexShrink:0,cursor:"pointer",
                    border:"none",position:"relative",transition:"background .2s",
                    background: liveTrack ? "#FBBF24" : "rgba(255,255,255,0.15)",
                  }}>
                    <span style={{
                      position:"absolute",top:"3px",left: liveTrack ? "23px" : "3px",
                      width:"20px",height:"20px",borderRadius:"50%",background:"#fff",
                      transition:"left .2s",
                    }}/>
                  </button>
                </div>

                {liveTrack && (
                  <div style={{marginTop:"12px"}} className="space-y-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Coin</label>
                      <select value={coinId} onChange={e=>setCoinId(e.target.value)} style={selectStyle}>
                        {CRYPTO_COINS.map(c=>(
                          <option key={c.id} value={c.id} style={{background:"#0F172A",color:"#E5E7EB",fontStyle:"normal"}}>
                            {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Buy price per coin (₹)</label>
                      <input type="number" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} placeholder="e.g. 5000000" style={inp}/>
                      {amount && buyPrice && parseFloat(buyPrice) > 0 && (
                        <p style={{color:"#34D399",fontSize:"11px",marginTop:"6px"}}>
                          ≈ {(parseFloat(amount)/parseFloat(buyPrice)).toLocaleString("en-IN",{maximumFractionDigits:8})} coins
                          <span style={{color:"#6B7280"}}> (from amount ÷ buy price)</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ✨ FIX #2: show that entry will be auto-tagged */}
            {presetCustomTagId && !isEdit && (
              <div style={{padding:"10px 12px",background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.18)",borderRadius:"10px"}}>
                <p style={{color:"#34D399",fontSize:"11px"}}>🎯 This entry will be tagged to the current custom category</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 px-5 pb-8">
            <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(52,211,153,0.4)":"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"12px",color:"#022C22",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {saving ? "Saving..." : isEdit ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ✨ NEW (#3): Pick Existing Entries Panel — tag past entries to current custom category
  function PickExistingPanel({ open, onClose, uid, investments, customCat }) {
    const [query, setQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (open) { setSelectedIds(new Set()); setQuery(""); } }, [open]);

    // Only show entries NOT already tagged to this custom cat
    const available = useMemo(() => {
      return investments
        .filter(e => !(Array.isArray(e.customTags) && e.customTags.includes(customCat.id)))
        .filter(e => {
          if (!query.trim()) return true;
          const q = query.toLowerCase();
          return (e.name||"").toLowerCase().includes(q) || (e.note||"").toLowerCase().includes(q) || String(e.amount).includes(q);
        })
        .sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [investments, customCat?.id, query]);

    const selectedTotal = useMemo(() => {
      return available.filter(e => selectedIds.has(e.id)).reduce((s,e) => s + Number(e.amount), 0);
    }, [available, selectedIds]);

    function toggle(id) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }

    async function tagSelected() {
      if (selectedIds.size === 0) return;
      setSaving(true);
      try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          const ref = doc(db, "users", uid, "investments", id);
          const entry = investments.find(e => e.id === id);
          const currentTags = entry?.customTags || [];
          const newTags = [...new Set([...currentTags, customCat.id])];
          batch.update(ref, { customTags: newTags });
        });
        await batch.commit();
        onClose();
      } catch (e) { alert("Failed: " + e.message); }
      setSaving(false);
    }

    if (!open || !customCat) return null;

    return (
      <>
        <div onClick={onClose} className="fixed inset-0 bg-black/60" style={{zIndex:80}}/>
        <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl"
          style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)",maxHeight:"90vh",overflowY:"auto",zIndex:90}}>
          <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
          <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
            <h3 className="font-bold text-white text-base">📅 Pick Existing → "{customCat.name}"</h3>
          </div>

          <div className="px-5 pt-4 pb-4">
            <div style={{padding:"10px 14px",background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:"12px",marginBottom:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{color:"#E5E7EB",fontSize:"12px",fontWeight:600}}>{selectedIds.size} selected</p>
                <p style={{color:"#34D399",fontSize:"13px",fontWeight:700,fontFamily:"monospace"}}>{fmt(selectedTotal)}</p>
              </div>
            </div>

            <input type="text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, note, amount..."
              style={{...inp, marginBottom:"10px"}}/>

            <div style={{maxHeight:"380px",overflowY:"auto",marginBottom:"12px"}}>
              {available.length === 0 ? (
                <div style={{textAlign:"center",padding:"32px",color:"#6B7280"}}>
                  <p style={{fontSize:"28px",marginBottom:"6px"}}>🔍</p>
                  <p style={{fontSize:"12px"}}>{query ? "No matching entries" : "All your entries are already tagged to this category"}</p>
                </div>
              ) : available.map(entry => {
                const sel = selectedIds.has(entry.id);
                return (
                  <button key={entry.id} onClick={()=>toggle(entry.id)} style={{
                    width:"100%",padding:"10px 12px",marginBottom:"6px",
                    background: sel ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
                    border: sel ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.05)",
                    borderRadius:"10px",cursor:"pointer",fontFamily:"inherit",
                    display:"flex",alignItems:"center",gap:"10px",textAlign:"left",
                  }}>
                    <input type="checkbox" checked={sel} readOnly style={{width:"14px",height:"14px",accentColor:"#34D399",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{color:"#E5E7EB",fontSize:"13px",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.name}</p>
                      <p style={{color:"#6B7280",fontSize:"10px",fontFamily:"monospace",marginTop:"2px"}}>{fmtDate(entry.date)} · {entry.type}</p>
                    </div>
                    <p style={{color:"#34D399",fontSize:"13px",fontWeight:700,fontFamily:"monospace",flexShrink:0}}>{fmt(entry.amount)}</p>
                  </button>
                );
              })}
            </div>

            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={tagSelected} disabled={saving || selectedIds.size===0} style={{
                flex:2,padding:"13px",
                background: (saving||selectedIds.size===0) ? "rgba(52,211,153,0.4)" : "linear-gradient(135deg,#34D399,#059669)",
                border:"none",borderRadius:"12px",color:"#022C22",fontWeight:700,fontSize:"14px",
                cursor:(saving||selectedIds.size===0)?"not-allowed":"pointer",fontFamily:"inherit",
              }}>
                {saving ? "Tagging..." : selectedIds.size === 0 ? "Pick entries first" : `Tag ${selectedIds.size} ${selectedIds.size===1?"entry":"entries"}`}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  function MonthCard({mk,entries,onClick,iconMap}){
    const[,m]=mk.split("-");const total=entries.reduce((s,e)=>s+e.amount,0);const has=entries.length>0;
    return(
      <div onClick={()=>has&&onClick(mk)} style={{...card,padding:"12px",cursor:has?"pointer":"default",opacity:has?1:0.4}}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:"#9CA3AF"}}>{MONTHS[+m-1].slice(0,3)}</p>
        <div style={{minHeight:"52px",marginBottom:"10px"}}>
          {entries.slice(0,3).map(e=>(<div key={e.id} className="flex justify-between text-xs mb-0.5"><span className="truncate mr-1" style={{color:"#6B7280"}}>{iconMap[e.type]||"💡"} {e.name.slice(0,10)}</span><span className="font-mono flex-shrink-0" style={{color:"#9CA3AF"}}>{fmt(e.amount)}</span></div>))}
          {entries.length>3&&<p className="text-xs" style={{color:"#4B5563"}}>+{entries.length-3} more</p>}
          {!has&&<p className="text-xs" style={{color:"#374151"}}>No entries</p>}
        </div>
        <div className="text-xs font-bold font-mono pt-2" style={{borderTop:`1px solid ${has?"rgba(52,211,153,0.15)":"rgba(255,255,255,0.03)"}`,color:has?"#34D399":"#374151"}}>
          Total = {fmt(total)}
        </div>
      </div>
    );
  }

  function MonthDetail({mk, onChange, investments, onBack, onDelete, onEdit, iconMap, onTypeClick}){
    const{year,month}=parseKey(mk);
    function shift(dir){let nm=month+dir,ny=year;if(nm<1){nm=12;ny--;}if(nm>12){nm=1;ny++;}onChange(ny+"-"+String(nm).padStart(2,"0"));}
    const entries=investments.filter(e=>mkey(e.date)===mk);
    const total=entries.reduce((s,e)=>s+e.amount,0);
    const grouped=groupByDate(entries);
    const usedTypes=[...new Set(entries.map(e=>e.type||"Other"))];
    const byType=usedTypes.map(t=>({type:t,icon:iconMap[t]||"💡",total:entries.filter(e=>e.type===t).reduce((s,e)=>s+e.amount,0)})).filter(t=>t.total>0).sort((a,b)=>b.total-a.total);
    const navBtn={width:"42px",height:"42px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#E5E7EB",fontSize:"18px",cursor:"pointer",fontFamily:"inherit"};

    return(
      <div>
        <button onClick={onBack} className="text-sm font-medium block mb-4" style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
        <div className="px-5 py-3 mb-3" style={{...card}}>
          <p className="font-bold text-white">Investment :</p>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={()=>shift(-1)} style={navBtn}>◄</button>
          <div style={{flex:1,...card,padding:"10px",textAlign:"center"}}>
            <p className="font-bold text-white text-sm uppercase tracking-widest">{MONTHS[month-1]}</p>
          </div>
          <button onClick={()=>shift(1)} style={navBtn}>►</button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[["Invest","#34D399"],["Total","#E5E7EB"]].map(([lbl,col])=>(
            <div key={lbl} style={{...card,padding:"12px 16px",textAlign:"center"}}>
              <p className="text-xs font-mono mb-1" style={{color:"#6B7280"}}>{lbl}</p>
              <p className="text-base font-bold font-mono" style={{color:col}}>{fmt(total)}</p>
            </div>
          ))}
        </div>
        {byType.length>0&&(
          <div className="p-4 mb-4" style={{...card}}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider" style={{color:"#4B5563"}}>By Type</p>
              <span style={{color:"#6B7280",fontSize:"10px",fontStyle:"italic"}}>Tap to view all</span>
            </div>
            <div className="space-y-2">
              {byType.map(({type,icon,total:tt})=>(
                <button key={type} onClick={()=>onTypeClick(type,icon)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:"8px",padding:"6px 4px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",borderRadius:"8px",transition:"background .15s"}}>
                  <span style={{fontSize:"14px",width:"20px"}}>{icon}</span>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{color:"#9CA3AF"}}>{type}</span>
                      <span className="font-mono" style={{color:"#34D399"}}>{fmt(tt)} ›</span>
                    </div>
                    <div style={{height:"3px",background:"rgba(255,255,255,0.05)",borderRadius:"99px",overflow:"hidden"}}>
                      <div style={{height:"100%",background:"rgba(52,211,153,0.6)",borderRadius:"99px",width:`${(tt/total)*100}%`}}/>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {grouped.length===0&&(
          <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
            <p style={{fontSize:"36px",marginBottom:"8px"}}>📈</p>
            <p style={{fontSize:"14px"}}>No investments this month</p>
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
                  <div key={e.id} className="flex items-center px-4 py-3" style={{borderBottom:ei<dayEntries.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>
                    <div style={{fontSize:"20px",flexShrink:0,width:"36px"}}>{iconMap[e.type]||"💡"}</div>
                    <div style={{flex:1,minWidth:0,padding:"0 8px"}}>
                      <p className="text-sm font-medium truncate" style={{color:"#E5E7EB"}}>{e.name}</p>
                      <p className="text-xs truncate" style={{color:"#6B7280"}}>{e.type}{e.note ? ` · ${e.note}` : ""}</p>
                    </div>
                    <p className="text-sm font-bold font-mono flex-shrink-0 mr-2" style={{color:"#34D399"}}>{fmt(e.amount)}</p>
                    <button onClick={()=>onEdit(e)} title="Edit" style={{color:"#8B5CF6",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"8px",padding:"6px",cursor:"pointer",marginRight:"4px",display:"flex",alignItems:"center"}}>
                      <Pencil/>
                    </button>
                    <button onClick={()=>onDelete("investments",e.id)} title="Delete" style={{color:"#F87171",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"8px",padding:"6px 8px",cursor:"pointer",fontSize:"13px"}}>✕</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ✨ NEW v1.9: Holdings view — live crypto value + profit/loss
  function HoldingsView({ investments, cryptoPrices, pricesUpdatedAt, pricesLoading, onRefresh, onBack, onEdit }) {
    // only crypto entries with live tracking + a coin + buy price
    const holdings = investments
      .filter(e => e.liveTrack && e.coinId && e.buyPrice > 0 && e.amount > 0)
      .map(e => {
        const qty       = Number(e.amount) / Number(e.buyPrice);   // coins bought
        const livePrice = cryptoPrices[e.coinId] || null;
        const invested  = Number(e.amount);
        const current   = livePrice ? qty * livePrice : null;
        const pl        = current !== null ? current - invested : null;
        const plPct     = current !== null && invested > 0 ? (pl / invested) * 100 : null;
        return { ...e, qty, livePrice, invested, current, pl, plPct };
      })
      .sort((a,b) => new Date(b.date) - new Date(a.date));

    const totalInvested = holdings.reduce((s,h) => s + h.invested, 0);
    const totalCurrent  = holdings.reduce((s,h) => s + (h.current ?? h.invested), 0);
    const totalPL       = totalCurrent - totalInvested;
    const totalPLPct    = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const haveAnyPrice  = holdings.some(h => h.livePrice !== null);

    function ago(iso) {
      if (!iso) return "never";
      const mins = Math.floor((Date.now() - new Date(iso).getTime())/60000);
      if (mins < 1) return "just now";
      if (mins < 60) return mins + " min ago";
      const hrs = Math.floor(mins/60);
      if (hrs < 24) return hrs + (hrs===1?" hour ago":" hours ago");
      const days = Math.floor(hrs/24);
      return days + (days===1?" day ago":" days ago");
    }

    return (
      <div>
        <button onClick={onBack} className="text-sm font-medium block mb-4" style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>📊 Holdings</h1>
            <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>Live crypto value · updated {ago(pricesUpdatedAt)}</p>
          </div>
          <button onClick={onRefresh} disabled={pricesLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",color:"#FBBF24",cursor:pricesLoading?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {pricesLoading ? "..." : "↻ Refresh"}
          </button>
        </div>

        {holdings.length === 0 ? (
          <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
            <p style={{fontSize:"40px",marginBottom:"10px"}}>📊</p>
            <p style={{fontSize:"15px",color:"#E5E7EB",fontWeight:"600",marginBottom:"6px"}}>No live holdings yet</p>
            <p style={{fontSize:"13px",lineHeight:1.5}}>Add a Crypto investment and turn on<br/>"Track live price" to see it here.</p>
          </div>
        ) : (<>
          {/* Summary */}
          <div className="p-5 mb-4 relative overflow-hidden" style={{...card,border:`1px solid ${totalPL>=0?"rgba(52,211,153,0.18)":"rgba(248,113,113,0.18)"}`}}>
            <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"#6B7280"}}>Current Value</p>
            <p className="text-3xl font-bold mb-1" style={{color:"#E5E7EB"}}>{fmt(totalCurrent)}</p>
            {haveAnyPrice ? (
              <p className="text-sm font-bold" style={{color: totalPL>=0 ? "#34D399" : "#F87171"}}>
                {totalPL>=0?"▲ +":"▼ "}{fmt(Math.abs(totalPL))} ({totalPL>=0?"+":""}{totalPLPct.toFixed(1)}%)
              </p>
            ) : (
              <p className="text-xs" style={{color:"#FBBF24"}}>Prices loading… tap ↻ Refresh</p>
            )}
            <div className="flex gap-3 mt-4">
              <div className="flex-1 rounded-xl px-4 py-2" style={{background:"rgba(255,255,255,0.03)"}}>
                <p className="text-xs" style={{color:"#6B7280"}}>Invested</p>
                <p className="font-bold" style={{color:"#9CA3AF"}}>{fmt(totalInvested)}</p>
              </div>
              <div className="flex-1 rounded-xl px-4 py-2" style={{background:"rgba(255,255,255,0.03)"}}>
                <p className="text-xs" style={{color:"#6B7280"}}>Profit / Loss</p>
                <p className="font-bold" style={{color: totalPL>=0 ? "#34D399" : "#F87171"}}>{totalPL>=0?"+":""}{fmt(totalPL)}</p>
              </div>
            </div>
          </div>

          {/* Each holding */}
          <div className="space-y-3">
            {holdings.map(h => {
              const up = h.pl !== null && h.pl >= 0;
              return (
                <div key={h.id} style={{...card,padding:"16px"}}>
                  <div className="flex items-center justify-between mb-3">
                    <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                      <span style={{fontSize:"22px"}}>₿</span>
                      <div style={{minWidth:0}}>
                        <p style={{color:"#E5E7EB",fontSize:"14px",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</p>
                        <p style={{color:"#6B7280",fontSize:"11px",fontFamily:"monospace"}}>
                          {h.coinSymbol} · {h.qty.toLocaleString("en-IN",{maximumFractionDigits:6})} coins
                        </p>
                      </div>
                    </div>
                    <button onClick={()=>onEdit(h)} title="Edit" style={{color:"#8B5CF6",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"8px",padding:"6px",cursor:"pointer",display:"flex",alignItems:"center",flexShrink:0}}>
                      <Pencil/>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <p style={{color:"#6B7280",fontSize:"10px"}}>Invested</p>
                      <p style={{color:"#9CA3AF",fontSize:"13px",fontWeight:600,fontFamily:"monospace"}}>{fmt(h.invested)}</p>
                    </div>
                    <div>
                      <p style={{color:"#6B7280",fontSize:"10px"}}>Now</p>
                      <p style={{color:"#E5E7EB",fontSize:"13px",fontWeight:600,fontFamily:"monospace"}}>
                        {h.current !== null ? fmt(h.current) : "—"}
                      </p>
                    </div>
                    <div>
                      <p style={{color:"#6B7280",fontSize:"10px"}}>P / L</p>
                      <p style={{color: h.pl===null ? "#6B7280" : up ? "#34D399" : "#F87171", fontSize:"13px",fontWeight:700,fontFamily:"monospace"}}>
                        {h.pl===null ? "—" : `${up?"+":""}${fmt(h.pl)}`}
                      </p>
                    </div>
                  </div>

                  {h.plPct !== null && (
                    <div className="flex items-center justify-between" style={{marginTop:"6px"}}>
                      <p style={{color:"#6B7280",fontSize:"10px",fontFamily:"monospace"}}>
                        Buy ₹{Number(h.buyPrice).toLocaleString("en-IN")} · Now ₹{h.livePrice ? Number(h.livePrice).toLocaleString("en-IN",{maximumFractionDigits:2}) : "—"}
                      </p>
                      <span style={{color: up ? "#34D399" : "#F87171",fontSize:"12px",fontWeight:700}}>
                        {up?"▲ +":"▼ "}{Math.abs(h.plPct).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p style={{color:"#4B5563",fontSize:"10px",textAlign:"center",marginTop:"16px",lineHeight:1.5}}>
            Prices from CoinGecko, cached and refreshed periodically to stay free.<br/>Not financial advice — values are approximate.
          </p>
        </>)}
      </div>
    );
  }

  export default function Investments({firestoreData, user, quickAddTrigger}){
    const [activeMonth, setActiveMonth] = useState(null);
    const [panelOpen,   setPanelOpen]   = useState(false);
    const [editEntry,   setEditEntry]   = useState(null);
    const [manageTypes, setManageTypes] = useState(false);
    const [activeType,  setActiveType]  = useState(null);
    const [showCustomPanel, setShowCustomPanel] = useState(false);
    const [editCustomCat,   setEditCustomCat]   = useState(null);
    const [activeCustom,    setActiveCustom]    = useState(null);
    const [presetType,      setPresetType]      = useState(null);
    const [presetCustomTagId, setPresetCustomTagId] = useState(null); // ✨ NEW #2: tag entry into custom cat
    const [pickExistingOpen, setPickExistingOpen] = useState(false);  // ✨ NEW #3
    const [showHoldings, setShowHoldings] = useState(false);          // ✨ NEW v1.9
    const [vis,         setVis]         = useState(false);

    useEffect(()=>{setTimeout(()=>setVis(true),40);},[]);

    const {investments=[], categories=[], customCategories=[], learnedCategories={}, addEntry, deleteEntry, learnCategory, loading=false,
           cryptoPrices={}, pricesUpdatedAt=null, pricesLoading=false, refreshCryptoPrices} = firestoreData||{};
    const uid = user?.uid;

    // ✨ Drill-down state for global + button (window event)
    useEffect(() => {
      // Tell the FAB which context we're in so + adds directly into it
      let ctx = null;
      if (activeCustom) {
        ctx = { page: "investments", customTagId: activeCustom.id, label: activeCustom.name };
      } else if (activeType) {
        ctx = { page: "investments", presetType: activeType.name, label: activeType.name };
      }
      window.__dhanPresetContext = ctx;
      window.dispatchEvent(new CustomEvent("dhan-preset-changed"));
      return () => {
        window.__dhanPresetContext = null;
        window.dispatchEvent(new CustomEvent("dhan-preset-changed"));
      };
    }, [activeCustom, activeType]);

    // ✨ Listen for global + when this page is active
    useEffect(() => {
      function handler(e) {
        const ctx = e.detail;
        if (!ctx || ctx.page !== "investments") return;
        setEditEntry(null);
        setPresetType(ctx.presetType || null);
        setPresetCustomTagId(ctx.customTagId || null);
        setPanelOpen(true);
      }
      window.addEventListener("dhan-preset-add", handler);
      return () => window.removeEventListener("dhan-preset-add", handler);
    }, []);

    useEffect(()=>{
      if (quickAddTrigger?.type === "investment") {
        setEditEntry(null);
        setPresetType(null);
        setPresetCustomTagId(null);
        setPanelOpen(true);
      }
    }, [quickAddTrigger?.ts]);

    useEffect(() => {
      return () => {
        setPanelOpen(false); setManageTypes(false); setEditEntry(null);
        setActiveType(null); setShowCustomPanel(false); setEditCustomCat(null);
        setActiveCustom(null); setPresetType(null); setPresetCustomTagId(null);
        setPickExistingOpen(false);
      };
    }, []);

    const investmentCustomCats = customCategories.filter(c => c.kind === "investment");
    const legacyTypes = categories;

    const allTypes = [
      ...DEFAULT_TYPES.map(name=>({name, icon:ICONS[name]||"💡"})),
      ...legacyTypes.map(c=>({name:c.name, icon:c.icon})),
    ];

    const iconMap = {};
    allTypes.forEach(t=>{ iconMap[t.name]=t.icon; });
    investmentCustomCats.forEach(c=>{ iconMap[c.name]=c.icon; });
    investments.forEach(e=>{ if(e.type && !iconMap[e.type]) iconMap[e.type] = ICONS[e.type] || "💡"; });

    const year = new Date().getFullYear();
    const keys = buildKeys(year);
    const totalAll = investments.reduce((s,e)=>s+e.amount,0);

    function openEdit(entry) { setEditEntry(entry); setPresetType(null); setPresetCustomTagId(null); setPanelOpen(true); }
    function closePanel()    { setPanelOpen(false); setEditEntry(null); setPresetType(null); setPresetCustomTagId(null); }

    function openTypeDetail(typeName, typeIcon) { setActiveType({ name: typeName, icon: typeIcon }); }
    function openCustomDetail(customCat) { setActiveCustom(customCat); }

    async function deleteCustomCat(cat) {
      if (!confirm(`Delete custom category "${cat.name}"? Your entries stay safe — they just won't be grouped here anymore.`)) return;
      try {
        await deleteDoc(doc(db, "users", uid, "customCategories", cat.id));
        setActiveCustom(null);
      } catch(e) { alert("Failed: " + e.message); }
    }

    const handleAdd = useCallback(async(entry)=>{
      await addEntry("investments",entry);
      setActiveMonth(mkey(entry.date));
    },[addEntry]);

    const handleDelete = useCallback(async(kind,id)=>{
      await deleteEntry(kind,id);
    },[deleteEntry]);

    // ✨ FIX #2: untag an entry from the active custom category (keeps the entry itself)
    const handleUntag = useCallback(async(entryId)=>{
      if (!activeCustom) return;
      try {
        await updateDoc(doc(db, "users", uid, "investments", entryId), {
          customTags: arrayRemove(activeCustom.id),
        });
      } catch(e) { alert("Failed: " + e.message); }
    },[activeCustom, uid]);

    if(loading) return(
      <div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>
        {[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}
      </div>
    );

    // ✨ FIX #1: Panels rendered alongside CategoryDetail (not below the early return), so they're always visible
    const sharedPanels = (
      <>
        {panelOpen && <EntryPanel open={panelOpen} onClose={closePanel} onSave={handleAdd} uid={uid} editEntry={editEntry} allTypes={allTypes} onManageTypes={()=>setManageTypes(true)} learnedCategories={learnedCategories} learnCategory={learnCategory} investments={investments} presetType={presetType} presetCustomTagId={presetCustomTagId}/>}
        {manageTypes && <ManageTypesPanel open={manageTypes} onClose={()=>setManageTypes(false)} uid={uid} customTypes={categories}/>}
        {showCustomPanel && <CustomCategoryPanel open={showCustomPanel} onClose={()=>{setShowCustomPanel(false); setEditCustomCat(null);}} uid={uid} kind="investment" investments={investments} editCategory={editCustomCat}/>}
        {pickExistingOpen && activeCustom && <PickExistingPanel open={pickExistingOpen} onClose={()=>setPickExistingOpen(false)} uid={uid} investments={investments} customCat={activeCustom}/>}
      </>
    );

    // ✨ NEW v1.9: Holdings view
    if (showHoldings) {
      return (
        <>
          <HoldingsView
            investments={investments}
            cryptoPrices={cryptoPrices}
            pricesUpdatedAt={pricesUpdatedAt}
            pricesLoading={pricesLoading}
            onRefresh={()=>refreshCryptoPrices && refreshCryptoPrices()}
            onBack={()=>setShowHoldings(false)}
            onEdit={(entry)=>{ setShowHoldings(false); openEdit(entry); }}
          />
          {sharedPanels}
        </>
      );
    }

    // Drill-down for normal types
    if (activeType) {
      const typeEntries = investments.filter(e => (e.type || "Other") === activeType.name);
      return (
        <>
          <CategoryDetail
            categoryName={activeType.name} categoryIcon={activeType.icon}
            entries={typeEntries} kind="investments"
            onBack={() => setActiveType(null)}
            onEdit={(entry) => openEdit(entry)}
            onDelete={handleDelete}
          />
          {sharedPanels}
        </>
      );
    }

    // ✨ FIX #1, #2, #3: Drill-down for custom categories — panels always available
    if (activeCustom) {
      const customEntries = investments.filter(e => Array.isArray(e.customTags) && e.customTags.includes(activeCustom.id));
      return (
        <>
          <CategoryDetail
            categoryName={activeCustom.name} categoryIcon={activeCustom.icon}
            entries={customEntries} kind="investments" isCustom
            onBack={() => setActiveCustom(null)}
            onEdit={(entry) => openEdit(entry)}
            onDelete={handleDelete}
            onUntag={handleUntag}
            onAddEntry={() => {
              // ✨ FIX #2: auto-tag this entry with current custom category
              setPresetType(null);
              setPresetCustomTagId(activeCustom.id);
              setEditEntry(null);
              setPanelOpen(true);
            }}
            onPickExisting={() => setPickExistingOpen(true)} // ✨ FIX #3
            onEditCategory={() => { setEditCustomCat(activeCustom); setShowCustomPanel(true); }}
            onDeleteCategory={() => deleteCustomCat(activeCustom)}
          />
          {sharedPanels}
        </>
      );
    }

    return(
      <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>
        {!activeMonth&&(<>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Investments</h1>
              <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>
                {year} · Total: <span style={{color:"#34D399",fontWeight:600}}>{fmt(totalAll)}</span>
              </p>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>setShowHoldings(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",color:"#FBBF24",cursor:"pointer",fontFamily:"inherit"}}>
                📊 Holdings
              </button>
              <button onClick={()=>setManageTypes(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",color:"#34D399",cursor:"pointer",fontFamily:"inherit"}}>
                📊 Types
              </button>
            </div>
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

          {/* Custom Categories */}
          <div style={{...card, padding:"16px", marginBottom:"20px"}}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>🎯 Custom Categories</p>
                <p className="text-xs" style={{color:"#6B7280", marginTop:"2px"}}>Platforms, projects, anything you want to track</p>
              </div>
              <button onClick={()=>{ setEditCustomCat(null); setShowCustomPanel(true); }}
                style={{padding:"6px 12px",background:"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:"10px",color:"#022C22",fontSize:"11px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit"}}>
                + Create
              </button>
            </div>

            {investmentCustomCats.length === 0 ? (
              <div style={{padding:"16px",background:"rgba(52,211,153,0.04)",border:"1px dashed rgba(52,211,153,0.2)",borderRadius:"10px",textAlign:"center"}}>
                <p style={{color:"#9CA3AF",fontSize:"12px",marginBottom:"4px"}}>Create your first custom category!</p>
                <p style={{color:"#6B7280",fontSize:"10px",lineHeight:"1.5"}}>Examples: "Binance" (all crypto), "Zerodha" (all stocks), "Real Estate" (property)</p>
              </div>
            ) : (
              <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                {investmentCustomCats.map(cat => {
                  const entries = investments.filter(e => Array.isArray(e.customTags) && e.customTags.includes(cat.id));
                  const total = entries.reduce((s,e) => s + Number(e.amount), 0);
                  return (
                    <button key={cat.id} onClick={() => openCustomDetail(cat)}
                      style={{padding:"10px 14px",background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:"10px",color:"#E5E7EB",fontSize:"12px",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"4px",minWidth:"140px"}}>
                      <span style={{fontSize:"18px"}}>{cat.icon}</span>
                      <span style={{fontWeight:"600"}}>{cat.name}</span>
                      <span style={{color:"#34D399",fontFamily:"monospace",fontWeight:"700"}}>{fmt(total)}</span>
                      <span style={{color:"#6B7280",fontSize:"10px"}}>{entries.length} {entries.length===1?"entry":"entries"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* All-Time Types from actual entries */}
          {(() => {
            const typeAgg = {};
            investments.forEach(e => {
              const t = e.type || "Other";
              if (!typeAgg[t]) typeAgg[t] = { name: t, icon: iconMap[t] || ICONS[t] || "💡", total: 0, count: 0 };
              typeAgg[t].total += Number(e.amount) || 0;
              typeAgg[t].count += 1;
            });
            const allTimeTypes = Object.values(typeAgg).sort((a,b) => b.total - a.total);
            if (allTimeTypes.length === 0) return null;
            return (
              <div style={{...card, padding: "16px", marginBottom: "20px"}}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider font-mono" style={{color:"#6B7280"}}>All-Time Types</p>
                  <span style={{color:"#6B7280",fontSize:"10px",fontStyle:"italic"}}>Tap to drill down</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
                  {allTimeTypes.map(t => (
                    <button key={t.name} onClick={()=>openTypeDetail(t.name, t.icon)}
                      style={{padding:"8px 12px",background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:"10px",color:"#E5E7EB",fontSize:"12px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"6px",transition:"all .15s"}}>
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                      <span style={{color:"#34D399",fontFamily:"monospace",fontWeight:600}}>{fmt(t.total)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{color:"#4B5563"}}>Tap a month to view</p>
          <div className="grid grid-cols-3 gap-3">
            {keys.map(mk=>(
              <MonthCard key={mk} mk={mk} entries={investments.filter(e=>mkey(e.date)===mk)} onClick={setActiveMonth} iconMap={iconMap}/>
            ))}
          </div>
        </>)}

        {activeMonth&&(
          <MonthDetail mk={activeMonth} onChange={setActiveMonth} investments={investments}
            onBack={()=>setActiveMonth(null)} onDelete={handleDelete} onEdit={openEdit} 
            iconMap={iconMap} onTypeClick={openTypeDetail}/>
        )}

        {sharedPanels}
      </div>
    );
  }