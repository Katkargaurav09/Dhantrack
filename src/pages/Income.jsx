import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import IncomeAddPanel from "../components/IncomeAddPanel";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SOURCE_ICON = { Salary:"💼", Freelance:"💻", Business:"🏪", Gift:"🎁", Rental:"🏠", Interest:"🏦", Other:"💡" };

function fmt(n){return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}
function mkey(d){const dt=new Date(d);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");}
function mlabel(mk){const[y,m]=mk.split("-");return MONTHS[+m-1]+" "+y;}
function fmtDate(s){const d=new Date(s);return`${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;}

const card={background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 10px 30px rgba(0,0,0,0.4)",borderRadius:"16px"};

function Pencil(){return(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);}

export default function Income({ firestoreData, user, onBack, quickAddTrigger }) {
  const [vis,setVis]=useState(false);
  const [panelOpen,setPanelOpen]=useState(false);
  const [editEntry,setEditEntry]=useState(null);

  useEffect(()=>{setTimeout(()=>setVis(true),40);},[]);

  const { incomes=[], totalIncome=0, addEntry, deleteEntry, loading=false } = firestoreData||{};
  const uid = user?.uid;

  // open add form when global + → Income fires while this page is active
  useEffect(()=>{
    if (quickAddTrigger?.type === "income") { setEditEntry(null); setPanelOpen(true); }
  }, [quickAddTrigger?.ts]);

  // group by month, newest first
  const byMonth = {};
  incomes.forEach(e => { const k=mkey(e.date); if(!byMonth[k]) byMonth[k]=[]; byMonth[k].push(e); });
  const monthKeys = Object.keys(byMonth).sort((a,b)=> a<b?1:-1);
  monthKeys.forEach(k => byMonth[k].sort((a,b)=> new Date(b.date)-new Date(a.date)));

  const now = new Date();
  const cm = mkey(now.toISOString());
  const cmTotal = (byMonth[cm]||[]).reduce((s,e)=>s+e.amount,0);

  async function handleSave(entry) {
    if (editEntry) {
      await updateDoc(doc(db, "users", uid, "incomes", editEntry.id), {
        name: entry.name, amount: Number(entry.amount), date: entry.date, type: entry.type, note: entry.note || "",
      });
    } else {
      await addEntry("incomes", entry);
    }
  }

  const handleDelete = useCallback(async(id)=>{
    if (!confirm("Delete this income entry?")) return;
    try { await deleteEntry("incomes", id); } catch(e) { alert("Failed: "+e.message); }
  }, [deleteEntry]);

  function openEdit(entry){ setEditEntry(entry); setPanelOpen(true); }
  function openAdd(){ setEditEntry(null); setPanelOpen(true); }
  function closePanel(){ setPanelOpen(false); setEditEntry(null); }

  if (loading) return (
    <div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}
    </div>
  );

  return (
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>
      {onBack && (
        <button onClick={onBack} className="text-sm font-medium block mb-4" style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Income</h1>
          <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>
            All-time: <span style={{color:"#FBBF24",fontWeight:600}}>{fmt(totalIncome)}</span>
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{background:"linear-gradient(135deg,#FBBF24,#D97706)",border:"none",color:"#022C22",cursor:"pointer",fontFamily:"inherit"}}>
          + Add Income
        </button>
      </div>

      {/* Summary */}
      <div className="p-4 mb-5 flex justify-between items-center" style={{...card, border:"1px solid rgba(251,191,36,0.15)"}}>
        <div>
          <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>This Month</p>
          <p className="text-2xl font-bold" style={{color:"#FBBF24"}}>{fmt(cmTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Entries</p>
          <p className="text-2xl font-bold" style={{color:"#E5E7EB"}}>{incomes.length}</p>
        </div>
      </div>

      {/* Empty state */}
      {incomes.length === 0 && (
        <div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}>
          <p style={{fontSize:"36px",marginBottom:"8px"}}>💰</p>
          <p style={{fontSize:"14px",marginBottom:"4px",color:"#9CA3AF"}}>No income added yet</p>
          <p style={{fontSize:"12px"}}>Tap "+ Add Income" to record your salary or earnings.</p>
        </div>
      )}

      {/* Month groups */}
      <div className="space-y-4">
        {monthKeys.map(mk => {
          const entries = byMonth[mk];
          const monthTotal = entries.reduce((s,e)=>s+e.amount,0);
          return (
            <div key={mk} style={{...card,overflow:"hidden"}}>
              <div className="flex justify-between px-5 py-3" style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.02)"}}>
                <p className="text-sm font-semibold" style={{color:"#E5E7EB"}}>{mlabel(mk)}</p>
                <p className="text-sm font-bold font-mono" style={{color:"#FBBF24"}}>{fmt(monthTotal)}</p>
              </div>
              {entries.map((e,ei)=>(
                <div key={e.id} className="flex items-center px-4 py-3" style={{borderBottom:ei<entries.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>
                  <div style={{fontSize:"20px",flexShrink:0,width:"36px"}}>{SOURCE_ICON[e.type]||"💡"}</div>
                  <div style={{flex:1,minWidth:0,padding:"0 8px"}}>
                    <p className="text-sm font-medium truncate" style={{color:"#E5E7EB"}}>{e.name}</p>
                    <p className="text-xs truncate" style={{color:"#6B7280"}}>{e.type} · {fmtDate(e.date)}{e.note ? ` · ${e.note}` : ""}</p>
                  </div>
                  <p className="text-sm font-bold font-mono flex-shrink-0 mr-2" style={{color:"#FBBF24"}}>+{fmt(e.amount)}</p>
                  <button onClick={()=>openEdit(e)} title="Edit" style={{color:"#8B5CF6",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"8px",padding:"6px",cursor:"pointer",marginRight:"4px",display:"flex",alignItems:"center"}}>
                    <Pencil/>
                  </button>
                  <button onClick={()=>handleDelete(e.id)} title="Delete" style={{color:"#F87171",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"8px",padding:"6px 8px",cursor:"pointer",fontSize:"13px"}}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <IncomeAddPanel open={panelOpen} onClose={closePanel} onSave={handleSave} editEntry={editEntry}/>
    </div>
  );
}