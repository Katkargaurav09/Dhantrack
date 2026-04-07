import { useState, useEffect } from "react";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmt(n){return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}
function mkey(d){const dt=new Date(d);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");}
function mlabel(mk){const[y,m]=mk.split("-");return MONTHS[+m-1].slice(0,3)+" "+y;}
const card={background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 10px 30px rgba(0,0,0,0.4)",borderRadius:"16px"};

export default function Balance({firestoreData}){
  const[vis,setVis]=useState(false);
  const[barW,setBarW]=useState(50);
  useEffect(()=>{setTimeout(()=>setVis(true),40);},[]);

  const{investments=[],spendings=[],totalInvested=0,totalSpent=0,netBalance=0,loading=false}=firestoreData||{};

  const isPos=netBalance>=0;
  const pct=totalInvested+totalSpent>0?Math.round(totalInvested/(totalInvested+totalSpent)*100):50;
  useEffect(()=>{const t=setTimeout(()=>setBarW(pct),400);return()=>clearTimeout(t);},[pct]);

  const allMonths=[...new Set([...investments.map(e=>mkey(e.date)),...spendings.map(e=>mkey(e.date))])].sort((a,b)=>b<a?-1:1);
  const monthStats=allMonths.map(mk=>({mk,inv:investments.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0),spe:spendings.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0)})).map(m=>({...m,net:m.inv-m.spe}));
  const best=monthStats.length?monthStats.reduce((a,b)=>b.net>a.net?b:a):null;
  const worst=monthStats.length?monthStats.reduce((a,b)=>b.net<a.net?b:a):null;

  if(loading)return(<div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>{[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}</div>);

  return(<div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>
    <div className="mb-5">
      <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Balance</h1>
      <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>Your complete financial picture</p>
    </div>

    {/* Net balance hero */}
    <div className="p-6 mb-4 relative overflow-hidden" style={{...card,border:`1px solid ${isPos?"rgba(52,211,153,0.15)":"rgba(248,113,113,0.15)"}`}}>
      <div style={{position:"absolute",top:"-50px",right:"-50px",width:"180px",height:"180px",borderRadius:"50%",background:isPos?"radial-gradient(circle,rgba(52,211,153,0.12),transparent 70%)":"radial-gradient(circle,rgba(248,113,113,0.12),transparent 70%)",pointerEvents:"none"}}/>
      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"#6B7280"}}>Net Balance</p>
      <p className="text-4xl font-bold mb-1" style={{color:isPos?"#FBBF24":"#F87171"}}>{fmt(Math.abs(netBalance))}</p>
      <p className="text-xs" style={{color:"#4B5563"}}>{isPos?"Saving more than spending 🎯":"Spending exceeds investments ⚠️"}</p>
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div style={{...card,padding:"16px"}}>
        <p className="text-xs uppercase tracking-wider font-mono mb-2" style={{color:"#6B7280"}}>Total Invested</p>
        <p className="text-2xl font-bold" style={{color:"#34D399"}}>{fmt(totalInvested)}</p>
        <p className="text-xs mt-1" style={{color:"#475569"}}>{investments.length} entries</p>
      </div>
      <div style={{...card,padding:"16px"}}>
        <p className="text-xs uppercase tracking-wider font-mono mb-2" style={{color:"#6B7280"}}>Total Spent</p>
        <p className="text-2xl font-bold" style={{color:"#F87171"}}>{fmt(totalSpent)}</p>
        <p className="text-xs mt-1" style={{color:"#475569"}}>{spendings.length} entries</p>
      </div>
    </div>

    {/* Ratio bar */}
    <div className="p-5 mb-4" style={{...card}}>
      <p className="text-xs uppercase tracking-wider font-mono mb-3" style={{color:"#6B7280"}}>Invest vs Spend</p>
      <div className="flex justify-between text-xs mb-2">
        <span className="font-mono font-semibold" style={{color:"#34D399"}}>Invest {pct}%</span>
        <span className="font-mono font-semibold" style={{color:"#F87171"}}>Spend {100-pct}%</span>
      </div>
      <div style={{height:"8px",background:"rgba(255,255,255,0.05)",borderRadius:"99px",overflow:"hidden"}}>
        <div style={{height:"100%",background:"linear-gradient(90deg,#34D399,#059669)",borderRadius:"99px",width:barW+"%",transition:"width .7s ease"}}/>
      </div>
      <div className="flex justify-between text-xs font-mono mt-2" style={{color:"#4B5563"}}>
        <span>{fmt(totalInvested)}</span><span>{fmt(totalSpent)}</span>
      </div>
    </div>

    {/* Best / Worst */}
    {best&&worst&&best.mk!==worst.mk&&(
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div style={{...card,padding:"16px",border:"1px solid rgba(52,211,153,0.12)"}}>
          <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Best Month</p>
          <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>{mlabel(best.mk)}</p>
          <p className="text-base font-bold font-mono" style={{color:"#34D399"}}>+{fmt(best.net)}</p>
        </div>
        <div style={{...card,padding:"16px",border:"1px solid rgba(248,113,113,0.12)"}}>
          <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Worst Month</p>
          <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>{mlabel(worst.mk)}</p>
          <p className="text-base font-bold font-mono" style={{color:"#F87171"}}>{fmt(worst.net)}</p>
        </div>
      </div>
    )}

    {/* Monthly breakdown */}
    <div style={{...card,overflow:"hidden"}}>
      <div className="px-5 py-3" style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>Monthly Breakdown</p>
      </div>
      {allMonths.length===0?(
        <div className="text-center py-12" style={{color:"#4B5563"}}>
          <p style={{fontSize:"32px",marginBottom:"8px"}}>⚖️</p>
          <p style={{fontSize:"14px"}}>No data yet</p>
          <p style={{fontSize:"12px",marginTop:"4px",color:"#374151"}}>Add entries to see your breakdown</p>
        </div>
      ):allMonths.map((mk,i)=>{
        const inv=investments.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
        const spe=spendings.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
        const n=inv-spe;const pos=n>=0;
        return(<div key={mk} className="flex items-center justify-between px-5 py-4 transition-colors"
          style={{borderBottom:i<allMonths.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}
          onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={el=>el.currentTarget.style.background="transparent"}>
          <div>
            <p className="text-sm font-semibold" style={{color:"#E5E7EB"}}>{mlabel(mk)}</p>
            <p className="text-xs font-mono mt-0.5" style={{color:"#4B5563"}}>In: {fmt(inv)} · Out: {fmt(spe)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold font-mono" style={{color:pos?"#34D399":"#F87171"}}>{pos?"+":""}{fmt(n)}</p>
            <div style={{height:"3px",width:"60px",background:"rgba(255,255,255,0.05)",borderRadius:"99px",overflow:"hidden",marginTop:"4px",marginLeft:"auto"}}>
              <div style={{height:"100%",borderRadius:"99px",background:pos?"#34D399":"#F87171",width:`${inv+spe>0?Math.round(inv/(inv+spe)*100):50}%`}}/>
            </div>
          </div>
        </div>);
      })}
    </div>
  </div>);
}
