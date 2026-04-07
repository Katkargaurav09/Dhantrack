import { useState, useEffect } from "react";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const CATS=["Food","Travel","Shopping","Entertainment","Course","Electronics","Health","Utilities","Rent","Fuel","Other"];
const ICONS={Food:"🍔",Travel:"✈️",Shopping:"🛍️",Entertainment:"🎬",Course:"📚",Electronics:"💻",Health:"💊",Utilities:"⚡",Rent:"🏠",Fuel:"⛽",Other:"💡"};
function fmt(n){return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}
function mkey(d){const dt=new Date(d);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");}
function parseKey(mk){const[y,m]=mk.split("-");return{year:+y,month:+m};}
function buildKeys(year){return Array.from({length:12},(_,i)=>year+"-"+String(i+1).padStart(2,"0"));}
function fmtDate(s){const d=new Date(s);return`${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()].slice(0,3)} ${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;}
function groupByDate(entries){const map={};entries.forEach(e=>{if(!map[e.date])map[e.date]=[];map[e.date].push(e);});return Object.entries(map).sort((a,b)=>new Date(b[0])-new Date(a[0]));}
const card={background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 10px 30px rgba(0,0,0,0.4)",borderRadius:"16px"};
const inp={width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",padding:"13px 16px",color:"#E5E7EB",fontSize:"14px",outline:"none",transition:"border-color .2s",fontFamily:"inherit",boxSizing:"border-box"};

function AddPanel({open,onClose,onSave}){
  const[name,setName]=useState("");const[amount,setAmount]=useState("");
  const[date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const[type,setType]=useState("Food");const[note,setNote]=useState("");
  const[saving,setSaving]=useState(false);
  useEffect(()=>{if(open){setName("");setAmount("");setNote("");setType("Food");}},[open]);
  async function save(){
    if(!name.trim()||!amount||!date)return alert("Fill all fields");
    setSaving(true);await onSave({name:name.trim(),amount:parseFloat(amount),date,type,note:note.trim()});setSaving(false);onClose();
  }
  return(<>
    {open&&<div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>}
    <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 ${open?"translate-y-0":"translate-y-full"}`} style={{background:"linear-gradient(145deg,#1A2333,#0F172A)",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
      <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>
      <div className="flex items-center gap-3 px-5 pb-3" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <button onClick={onClose} style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontSize:"18px"}}>←</button>
        <h3 className="font-bold text-white text-base">Add Spending</h3>
        <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold" style={{background:"rgba(248,113,113,0.15)",color:"#F87171",border:"1px solid rgba(248,113,113,0.2)"}}>Spent</span>
      </div>
      <div className="px-5 pt-4 pb-4 space-y-3">
        {[["Date","date",date,setDate],["Amount (₹)","number",amount,setAmount],["Name","text",name,setName],["Note (optional)","text",note,setNote]].map(([lbl,tp,val,set])=>(
          <div key={lbl}><label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>{lbl}</label>
            <input type={tp} value={val} onChange={e=>set(e.target.value)} placeholder={lbl==="Amount (₹)"?"0.00":lbl==="Name"?"e.g. Zomato Dinner":lbl==="Note (optional)"?"Any note...":""} style={inp}
              onFocus={e=>e.target.style.borderColor="#F87171"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
        ))}
        <div><label className="text-xs uppercase tracking-wider block mb-1.5" style={{color:"#6B7280"}}>Category</label>
          <select value={type} onChange={e=>setType(e.target.value)} style={{...inp,background:"#0F172A"}}>
            {CATS.map(t=><option key={t} style={{background:"#0F172A"}}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 px-5 pb-8">
        <button onClick={onClose} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#6B7280",fontSize:"14px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        <button onClick={save} disabled={saving} style={{flex:1,padding:"13px",background:saving?"rgba(248,113,113,0.4)":"linear-gradient(135deg,#F87171,#ef4444)",border:"none",borderRadius:"12px",color:"#fff",fontWeight:"700",fontSize:"14px",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
          {saving?"Saving...":"Save Entry"}
        </button>
      </div>
    </div>
  </>);
}

function MonthCard({mk,entries,onClick}){
  const[,m]=mk.split("-");const total=entries.reduce((s,e)=>s+e.amount,0);const has=entries.length>0;
  return(<div onClick={()=>has&&onClick(mk)} style={{...card,padding:"12px",cursor:has?"pointer":"default",opacity:has?1:0.4,transition:"all .2s"}}
    onMouseEnter={e=>{if(has){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="rgba(248,113,113,0.3)";}}}
    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}>
    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:"#9CA3AF"}}>{MONTHS[+m-1].slice(0,3)}</p>
    <div style={{minHeight:"52px",marginBottom:"10px"}}>
      {entries.slice(0,3).map(e=>(<div key={e.id} className="flex justify-between text-xs mb-0.5"><span className="truncate mr-1" style={{color:"#6B7280"}}>{ICONS[e.type]||"💡"} {e.name.slice(0,10)}</span><span className="font-mono flex-shrink-0" style={{color:"#9CA3AF"}}>{fmt(e.amount)}</span></div>))}
      {entries.length>3&&<p className="text-xs" style={{color:"#4B5563"}}>+{entries.length-3} more</p>}
      {!has&&<p className="text-xs" style={{color:"#374151"}}>No entries</p>}
    </div>
    <div className="text-xs font-bold font-mono pt-2" style={{borderTop:`1px solid ${has?"rgba(248,113,113,0.15)":"rgba(255,255,255,0.03)"}`,color:has?"#F87171":"#374151"}}>Total = {fmt(total)}</div>
  </div>);
}

function MonthDetail({mk,onChange,spendings,onBack,onDelete}){
  const{year,month}=parseKey(mk);
  function shift(dir){let nm=month+dir,ny=year;if(nm<1){nm=12;ny--;}if(nm>12){nm=1;ny++;}onChange(ny+"-"+String(nm).padStart(2,"0"));}
  const entries=spendings.filter(e=>mkey(e.date)===mk);
  const total=entries.reduce((s,e)=>s+e.amount,0);
  const grouped=groupByDate(entries);
  const byCat=CATS.map(cat=>({cat,icon:ICONS[cat]||"💡",total:entries.filter(e=>e.type===cat).reduce((s,e)=>s+e.amount,0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const navBtn={width:"42px",height:"42px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#E5E7EB",fontSize:"18px",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"};
  return(<div>
    <button onClick={onBack} className="text-sm font-medium block mb-4" style={{color:"#6B7280",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}
      onMouseEnter={e=>e.currentTarget.style.color="#E5E7EB"} onMouseLeave={e=>e.currentTarget.style.color="#6B7280"}>← Back</button>
    <div className="px-5 py-3 mb-3" style={{...card}}><p className="font-bold text-white">Spending :</p></div>
    <div className="flex items-center gap-2 mb-3">
      <button onClick={()=>shift(-1)} style={navBtn} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(248,113,113,0.4)";e.currentTarget.style.color="#F87171";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#E5E7EB";}}>◄</button>
      <div style={{flex:1,...card,padding:"10px",textAlign:"center"}}><p className="font-bold text-white text-sm uppercase tracking-widest">{MONTHS[month-1]}</p></div>
      <button onClick={()=>shift(1)} style={navBtn} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(248,113,113,0.4)";e.currentTarget.style.color="#F87171";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#E5E7EB";}}>►</button>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-4">
      {[["Spend","#F87171"],["Total","#E5E7EB"]].map(([lbl,col])=>(<div key={lbl} style={{...card,padding:"12px 16px",textAlign:"center"}}><p className="text-xs font-mono mb-1" style={{color:"#6B7280"}}>{lbl}</p><p className="text-base font-bold font-mono" style={{color:col}}>{fmt(total)}</p></div>))}
    </div>
    {byCat.length>0&&(<div className="p-4 mb-4" style={{...card}}>
      <p className="text-xs uppercase tracking-wider mb-3" style={{color:"#4B5563"}}>By Category</p>
      <div className="space-y-2">{byCat.map(({cat,icon,total:ct})=>(<div key={cat} className="flex items-center gap-2">
        <span style={{fontSize:"14px",width:"20px"}}>{icon}</span>
        <div style={{flex:1}}>
          <div className="flex justify-between text-xs mb-1"><span style={{color:"#9CA3AF"}}>{cat}</span><span className="font-mono" style={{color:"#F87171"}}>{fmt(ct)}</span></div>
          <div style={{height:"3px",background:"rgba(255,255,255,0.05)",borderRadius:"99px",overflow:"hidden"}}><div style={{height:"100%",background:"rgba(248,113,113,0.6)",borderRadius:"99px",width:`${(ct/total)*100}%`}}/></div>
        </div>
      </div>))}</div>
    </div>)}
    {grouped.length===0&&<div style={{...card,textAlign:"center",padding:"48px 20px",color:"#4B5563"}}><p style={{fontSize:"36px",marginBottom:"8px"}}>💸</p><p style={{fontSize:"14px"}}>No spending this month</p></div>}
    <div className="space-y-3">{grouped.map(([date,dayEntries])=>{
      const dayTotal=dayEntries.reduce((s,e)=>s+e.amount,0);
      return(<div key={date} style={{...card,overflow:"hidden"}}>
        <div className="flex justify-between px-5 py-3" style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.02)"}}>
          <p className="text-sm font-semibold font-mono" style={{color:"#9CA3AF"}}>{fmtDate(date)}</p>
          <p className="text-sm font-bold font-mono" style={{color:"#E5E7EB"}}>{fmt(dayTotal)}</p>
        </div>
        {dayEntries.map((e,ei)=>(<div key={e.id} className="flex items-center px-5 py-3.5 group transition-colors" style={{borderBottom:ei<dayEntries.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}
          onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={el=>el.currentTarget.style.background="transparent"}>
          <div style={{width:"90px",flexShrink:0}}><p className="text-sm" style={{color:"#9CA3AF"}}>{e.type}</p></div>
          <div style={{flex:1,minWidth:0,padding:"0 12px"}}>
            <p className="text-sm font-medium truncate" style={{color:"#E5E7EB"}}>{e.name}</p>
            {e.note&&<p className="text-xs mt-0.5" style={{color:"#4B5563"}}>{e.note}</p>}
          </div>
          <p className="text-sm font-bold font-mono flex-shrink-0 mr-3" style={{color:"#F87171"}}>{fmt(e.amount)}</p>
          <button onClick={()=>onDelete("spendings",e.id)} className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            style={{color:"#4B5563",background:"none",border:"none",cursor:"pointer",fontSize:"14px",padding:"2px 6px"}}
            onMouseEnter={el=>el.currentTarget.style.color="#F87171"} onMouseLeave={el=>el.currentTarget.style.color="#4B5563"}>✕</button>
        </div>))}
      </div>);
    })}</div>
  </div>);
}

export default function Spending({firestoreData}){
  const[activeMonth,setActiveMonth]=useState(null);
  const[showAdd,setShowAdd]=useState(false);
  const[vis,setVis]=useState(false);
  useEffect(()=>{setTimeout(()=>setVis(true),40);},[]);
  const{spendings=[],addEntry,deleteEntry,loading=false}=firestoreData||{};
  const year=new Date().getFullYear();
  const keys=buildKeys(year);
  const totalAll=spendings.reduce((s,e)=>s+e.amount,0);
  async function handleAdd(entry){await addEntry("spendings",entry);setActiveMonth(mkey(entry.date));}
  async function handleDelete(kind,id){await deleteEntry(kind,id);}
  if(loading)return(<div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>{[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}</div>);
  return(<div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>
    {!activeMonth&&(<>
      <div className="mb-4"><h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Spending</h1>
        <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>{year} · Total: <span style={{color:"#F87171",fontWeight:600}}>{fmt(totalAll)}</span></p></div>
      <div className="p-4 mb-5 flex justify-between items-center" style={{...card}}>
        <div><p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Total Spent {year}</p><p className="text-2xl font-bold" style={{color:"#F87171"}}>{fmt(totalAll)}</p></div>
        <div className="text-right"><p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Entries</p><p className="text-2xl font-bold" style={{color:"#E5E7EB"}}>{spendings.length}</p></div>
      </div>
      <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{color:"#4B5563"}}>Tap a month to view</p>
      <div className="grid grid-cols-3 gap-3">{keys.map(mk=><MonthCard key={mk} mk={mk} entries={spendings.filter(e=>mkey(e.date)===mk)} onClick={setActiveMonth}/>)}</div>
    </>)}
    {activeMonth&&<MonthDetail mk={activeMonth} onChange={setActiveMonth} spendings={spendings} onBack={()=>setActiveMonth(null)} onDelete={handleDelete}/>}
    <AddPanel open={showAdd} onClose={()=>setShowAdd(false)} onSave={handleAdd}/>
    <button onClick={()=>setShowAdd(true)} className="fixed bottom-20 right-5 md:bottom-6 flex items-center justify-center rounded-full transition-all hover:scale-110 z-30"
      style={{width:"52px",height:"52px",background:"linear-gradient(135deg,#F87171,#ef4444)",border:"none",color:"#fff",fontSize:"26px",cursor:"pointer",boxShadow:"0 8px 20px rgba(248,113,113,0.4)"}}>+</button>
  </div>);
}
