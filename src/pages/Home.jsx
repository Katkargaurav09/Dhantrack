import { useState, useEffect } from "react";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function mkey(d) { const dt = new Date(d); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"); }
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return diff + " days ago";
}
const TYPE_ICON = { Stock:"📊",Crypto:"₿","Mutual Fund":"💼",Gold:"🥇","FD/RD":"🏦",Food:"🍔",Travel:"✈️",Shopping:"🛍️",Entertainment:"🎬",Course:"📚",Electronics:"💻",Health:"💊",Utilities:"⚡",Rent:"🏠",Fuel:"⛽",ETF:"📉",Other:"💡" };
const card = { background:"linear-gradient(145deg, #1A2333, #0F172A)", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 30px rgba(0,0,0,0.4)", borderRadius:"16px" };

export default function Home({ navigate, firestoreData, user }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const { investments=[], spendings=[], totalInvested=0, totalSpent=0, netBalance=0, loading=false } = firestoreData || {};

  const now  = new Date();
  const cm   = mkey(now.toISOString());
  const pm   = mkey(new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString());
  const cs   = spendings.filter(e=>mkey(e.date)===cm).reduce((s,e)=>s+e.amount,0);
  const ps   = spendings.filter(e=>mkey(e.date)===pm).reduce((s,e)=>s+e.amount,0);
  const ci   = investments.filter(e=>mkey(e.date)===cm).reduce((s,e)=>s+e.amount,0);
  const diff = cs - ps;
  const pct  = ps > 0 ? Math.abs(Math.round((diff/ps)*100)) : 0;
  const dayName = now.toLocaleDateString("en-IN",{weekday:"long"}).toUpperCase();
  const dateStr = now.toLocaleDateString("en-IN",{day:"numeric",month:"long"}).toUpperCase();
  const recent  = [...investments.map(e=>({...e,kind:"invest"})),...spendings.map(e=>({...e,kind:"spend"}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  const isPos   = netBalance >= 0;

  if (loading) return (
    <div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}
    </div>
  );

  return (
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(14px)",transition:"all .4s ease"}}>
      <div className="mb-6">
        <p className="text-xs font-mono tracking-widest mb-1" style={{color:"#6B7280"}}>{dayName}, {dateStr}</p>
        <h1 className="text-2xl font-bold" style={{color:"#E5E7EB"}}>Welcome back, {user?.name?.split(" ")[0]||"there"} 👋</h1>
      </div>

      {/* Balance hero */}
      <div className="p-6 mb-4 relative overflow-hidden" style={{...card}}>
        <div style={{position:"absolute",top:"-50px",right:"-50px",width:"180px",height:"180px",borderRadius:"50%",background:isPos?"radial-gradient(circle,rgba(52,211,153,0.12),transparent 70%)":"radial-gradient(circle,rgba(248,113,113,0.12),transparent 70%)",pointerEvents:"none"}}/>
        <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"#6B7280"}}>Available Balance</p>
        <p className="text-4xl font-bold mb-5" style={{color:isPos?"#FBBF24":"#F87171"}}>
          {fmt(Math.abs(netBalance))}
          {!isPos&&<span style={{fontSize:"16px",color:"#F87171",marginLeft:"8px"}}>deficit</span>}
        </p>
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl px-4 py-3" style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.15)"}}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{color:"#6B7280"}}>Invest</p>
            <p className="font-bold text-lg" style={{color:"#34D399"}}>{fmt(totalInvested)}</p>
          </div>
          <div className="flex-1 rounded-xl px-4 py-3" style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.15)"}}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{color:"#6B7280"}}>Spend</p>
            <p className="font-bold text-lg" style={{color:"#F87171"}}>{fmt(totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          {label:"Total Invested",val:totalInvested,color:"#34D399",glow:"rgba(52,211,153,0.15)",icon:"📈",page:"investments",count:investments.length},
          {label:"Total Spent",val:totalSpent,color:"#F87171",glow:"rgba(248,113,113,0.15)",icon:"💸",page:"spending",count:spendings.length},
        ].map(c=>(
          <button key={c.page} onClick={()=>navigate?.(c.page)} className="text-left p-4 transition-all duration-200" style={{...card}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 20px 40px rgba(0,0,0,0.5),0 0 20px ${c.glow}`;e.currentTarget.style.borderColor=c.color+"40";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=card.boxShadow;e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}>
            <div className="text-2xl mb-3">{c.icon}</div>
            <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>{c.label}</p>
            <p className="text-xl font-bold mb-1" style={{color:c.color}}>{fmt(c.val)}</p>
            <p className="text-xs" style={{color:"#475569"}}>{c.count} {c.count===1?"entry":"entries"}</p>
          </button>
        ))}
      </div>

      {/* Quick status */}
      <div className="p-5 mb-4" style={{...card}}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⚡</span>
          <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>Monthly Quick Status</p>
        </div>
        <p className="text-sm leading-relaxed" style={{color:"#9CA3AF"}}>
          {cs===0&&ci===0
            ? "No activity this month yet. Tap + to add your first entry!"
            : <>You Spend{" "}<span style={{color:"#F87171",fontWeight:600}}>{fmt(cs)}</span>{" "}In This Month Spending{" "}
                {ps>0&&<>{diff>0?"Increase":"Decrease"} By{" "}<span style={{color:diff>0?"#F87171":"#34D399",fontWeight:600}}>{fmt(Math.abs(diff))}</span>{" "}<span style={{color:"#FBBF24",fontWeight:600}}>({pct}%)</span> By Last Month.</>}
                {ci>0&&<>{" "}You invested{" "}<span style={{color:"#34D399",fontWeight:600}}>{fmt(ci)}</span> this month.</>}
              </>
          }
        </p>
      </div>

      {/* Recent activity */}
      <div className="overflow-hidden" style={{...card}}>
        <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <div className="flex items-center gap-2">
            <span className="text-base">🕐</span>
            <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>Recent Activity</p>
          </div>
          <button onClick={()=>navigate?.("balance")} className="text-xs font-semibold" style={{color:"#FBBF24",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}
            onMouseEnter={e=>e.currentTarget.style.color="#fde68a"} onMouseLeave={e=>e.currentTarget.style.color="#FBBF24"}>
            View all →
          </button>
        </div>
        {recent.length===0?(
          <div className="text-center py-12" style={{color:"#4B5563"}}>
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No entries yet</p>
            <p className="text-xs mt-1" style={{color:"#374151"}}>Add investments or spending to get started</p>
          </div>
        ):recent.map((e,i)=>(
          <div key={e.id+e.kind} className="flex items-center gap-3 px-5 py-4 transition-all duration-150"
            style={{borderBottom:i<recent.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}
            onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.02)"}
            onMouseLeave={el=>el.currentTarget.style.background="transparent"}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{background:e.kind==="invest"?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",border:e.kind==="invest"?"1px solid rgba(52,211,153,0.2)":"1px solid rgba(248,113,113,0.2)"}}>
              {TYPE_ICON[e.type]||"💡"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{color:"#E5E7EB"}}>{e.name}</p>
              <p className="text-xs font-mono mt-0.5" style={{color:"#475569"}}>{e.type} · {timeAgo(e.date)}</p>
            </div>
            <p className="text-sm font-bold font-mono flex-shrink-0" style={{color:e.kind==="invest"?"#34D399":"#F87171"}}>
              {e.kind==="invest"?"+":"-"}{fmt(e.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
