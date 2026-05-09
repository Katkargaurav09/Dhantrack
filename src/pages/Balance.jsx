import { useState, useEffect } from "react";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEFAULT_CATS=["Food","Travel","Shopping","Entertainment","Course","Electronics","Health","Utilities","Rent","Fuel","Other"];
const DEFAULT_TYPES=["Stock","Crypto","Mutual Fund","Gold","FD/RD","ETF","Other"];
const CAT_COLORS=["#34D399","#F87171","#FBBF24","#60A5FA","#A78BFA","#F472B6","#FB923C","#4ADE80","#E879F9","#94A3B8"];

function fmt(n){return"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});}
function mkey(d){const dt=new Date(d);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");}
function mlabel(mk){const[y,m]=mk.split("-");return MONTHS[+m-1].slice(0,3)+" "+y;}
const card={background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 10px 30px rgba(0,0,0,0.4)",borderRadius:"16px"};

function PieChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const r = size / 2 - 10; const cx = size / 2; const cy = size / 2;
  let angle = -Math.PI / 2;
  const slices = data.map(d => {
    const start = angle;
    const sweep = (d.value / total) * 2 * Math.PI;
    angle += sweep;
    const end = angle;
    const x1 = cx + r * Math.cos(start); const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);   const y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="rgba(15,23,42,0.8)" strokeWidth="2">
          <title>{s.label}: {fmt(s.value)}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0F172A"/>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#E5E7EB" fontSize="11" fontWeight="700">Total</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#34D399" fontSize="10" fontWeight="600">
        {fmt(total).replace("₹","")}
      </text>
    </svg>
  );
}

function BarChart({ months, investments, spendings }) {
  const last6 = months.slice(0, 6).reverse();
  if (last6.length === 0) return null;
  const vals = last6.map(mk => ({
    mk,
    inv: investments.filter(e => mkey(e.date) === mk).reduce((s, e) => s + e.amount, 0),
    spe: spendings.filter(e => mkey(e.date) === mk).reduce((s, e) => s + e.amount, 0),
  }));
  const maxVal = Math.max(...vals.flatMap(v => [v.inv, v.spe]), 1);
  const H = 120, W = 300, barW = 18, gap = 8;
  const groupW = barW * 2 + gap + 12;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ overflow: "visible" }}>
      {vals.map((v, i) => {
        const x = i * groupW + 10;
        const invH = (v.inv / maxVal) * H;
        const speH = (v.spe / maxVal) * H;
        return (
          <g key={v.mk}>
            <rect x={x} y={H - invH} width={barW} height={invH} rx="4" fill="rgba(52,211,153,0.7)"/>
            <rect x={x + barW + gap} y={H - speH} width={barW} height={speH} rx="4" fill="rgba(248,113,113,0.7)"/>
            <text x={x + barW} y={H + 16} textAnchor="middle" fill="#6B7280" fontSize="9">
              {mlabel(v.mk).slice(0, 3)}
            </text>
          </g>
        );
      })}
      <circle cx={W - 90} cy={H + 20} r="4" fill="rgba(52,211,153,0.7)"/>
      <text x={W - 83} y={H + 24} fill="#9CA3AF" fontSize="9">Invest</text>
      <circle cx={W - 50} cy={H + 20} r="4" fill="rgba(248,113,113,0.7)"/>
      <text x={W - 43} y={H + 24} fill="#9CA3AF" fontSize="9">Spend</text>
    </svg>
  );
}

function exportPDF(investments, spendings, totalInvested, totalSpent, netBalance) {
  const now   = new Date();
  const month = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const cm    = mkey(now.toISOString());
  const mInv  = investments.filter(e => mkey(e.date) === cm);
  const mSpe  = spendings.filter(e => mkey(e.date) === cm);
  const html = `
    <!DOCTYPE html><html><head><title>DhanTrack Report - ${month}</title>
    <style>* { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; background:#fff; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #e5e7eb; }
    .logo { font-size:22px; font-weight:800; color:#059669; }
    .date { font-size:13px; color:#6b7280; }
    .summary { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:24px; }
    .box { background:#f9fafb; border-radius:10px; padding:16px; border:1px solid #e5e7eb; }
    .box-label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-bottom:6px; }
    .box-val { font-size:22px; font-weight:700; }
    .green { color:#059669; } .red { color:#ef4444; } .gold { color:#d97706; }
    h3 { font-size:14px; font-weight:700; color:#374151; margin-bottom:10px; margin-top:20px; }
    table { width:100%; border-collapse:collapse; font-size:11px; table-layout:fixed; }
    th { background:#f3f4f6; padding:8px 10px; text-align:left; font-weight:600; color:#374151; border:1px solid #e5e7eb; }
    td { padding:7px 10px; border:1px solid #e5e7eb; color:#374151; word-wrap:break-word; }
    th:nth-child(1), td:nth-child(1) { width:80px; }
    th:nth-child(2), td:nth-child(2) { width:25%; }
    th:nth-child(3), td:nth-child(3) { width:18%; }
    th:nth-child(4), td:nth-child(4) { width:15%; text-align:right; }
    th:nth-child(5), td:nth-child(5) { width:auto; }
    tr:nth-child(even) { background:#fafafa; }
    .footer { margin-top:32px; text-align:center; font-size:11px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:12px; }
    </style></head><body>
    <div class="header">
      <div class="logo">💰 DhanTrack</div>
      <div class="date">Report for ${month}</div>
    </div>
    <div class="summary">
      <div class="box"><div class="box-label">Net Savings</div><div class="box-val ${netBalance>=0?"gold":"red"}">${netBalance>=0?"+":""}₹${Math.abs(netBalance).toLocaleString("en-IN")}</div></div>
      <div class="box"><div class="box-label">Total Invested</div><div class="box-val green">₹${totalInvested.toLocaleString("en-IN")}</div></div>
      <div class="box"><div class="box-label">Total Spent</div><div class="box-val red">₹${totalSpent.toLocaleString("en-IN")}</div></div>
    </div>
    <h3>📈 This Month's Investments (${mInv.length} entries)</h3>
    ${mInv.length === 0 ? "<p style='color:#9ca3af;font-size:12px'>No investments this month</p>" : `
    <table><tr><th>Date</th><th>Name</th><th>Type</th><th>Amount</th><th>Note</th></tr>
    ${mInv.map(e=>`<tr><td>${e.date}</td><td>${e.name}</td><td>${e.type}</td><td>₹${Number(e.amount).toLocaleString("en-IN")}</td><td>${e.note||"-"}</td></tr>`).join("")}
    <tr><td colspan="3" style="font-weight:700">Total</td><td style="font-weight:700;color:#059669">₹${mInv.reduce((s,e)=>s+e.amount,0).toLocaleString("en-IN")}</td><td></td></tr>
    </table>`}
    <h3>💸 This Month's Spending (${mSpe.length} entries)</h3>
    ${mSpe.length === 0 ? "<p style='color:#9ca3af;font-size:12px'>No spending this month</p>" : `
    <table><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th><th>Note</th></tr>
    ${mSpe.map(e=>`<tr><td>${e.date}</td><td>${e.name}</td><td>${e.type}</td><td>₹${Number(e.amount).toLocaleString("en-IN")}</td><td>${e.note||"-"}</td></tr>`).join("")}
    <tr><td colspan="3" style="font-weight:700">Total</td><td style="font-weight:700;color:#ef4444">₹${mSpe.reduce((s,e)=>s+e.amount,0).toLocaleString("en-IN")}</td><td></td></tr>
    </table>`}
    <div class="footer">Generated by DhanTrack · ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
    </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => { w.print(); }, 500);
}

export default function Balance({ firestoreData }) {
  const [vis,setVis]=useState(false); const [barW,setBarW]=useState(50);
  const [tab,setTab]=useState("overview");
  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const { investments=[], spendings=[], categories=[], totalInvested=0, totalSpent=0, netBalance=0, loading=false } = firestoreData || {};

  const isPos = netBalance >= 0;
  const pct   = totalInvested + totalSpent > 0 ? Math.round(totalInvested / (totalInvested + totalSpent) * 100) : 50;
  useEffect(() => { const t = setTimeout(() => setBarW(pct), 400); return () => clearTimeout(t); }, [pct]);

  const allMonths = [...new Set([...investments.map(e=>mkey(e.date)),...spendings.map(e=>mkey(e.date))])].sort((a,b)=>b<a?-1:1);
  const monthStats = allMonths.map(mk => ({
    mk,
    inv: investments.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0),
    spe: spendings.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0),
  })).map(m => ({ ...m, net: m.inv - m.spe }));
  const best  = monthStats.length ? monthStats.reduce((a,b)=>b.net>a.net?b:a) : null;
  const worst = monthStats.length ? monthStats.reduce((a,b)=>b.net<a.net?b:a) : null;

  // ✨ FIXED: Use ALL category names (defaults + custom)
  const allCatNames = [...new Set([...DEFAULT_CATS, ...categories.map(c=>c.name), ...spendings.map(s=>s.type)])];
  const catData = allCatNames.map((cat, i) => ({
    label: cat,
    value: spendings.filter(e => e.type === cat).reduce((s, e) => s + e.amount, 0),
    color: CAT_COLORS[i % CAT_COLORS.length],
  })).filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0, 6);

  const allTypeNames = [...new Set([...DEFAULT_TYPES, ...categories.map(c=>c.name), ...investments.map(i=>i.type)])];
  const investData = allTypeNames.map((t, i) => ({
    label: t,
    value: investments.filter(e => e.type === t).reduce((s,e) => s + e.amount, 0),
    color: CAT_COLORS[i % CAT_COLORS.length],
  })).filter(d => d.value > 0);

  if (loading) return (
    <div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}
    </div>
  );

  return (
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(10px)",transition:"all .35s ease"}}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{color:"#E5E7EB"}}>Balance</h1>
          <p className="text-xs font-mono mt-0.5" style={{color:"#6B7280"}}>Your complete financial picture</p>
        </div>
        <button onClick={() => exportPDF(investments, spendings, totalInvested, totalSpent, netBalance)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",color:"#FBBF24",cursor:"pointer",fontFamily:"inherit"}}>
          📄 Export PDF
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[["overview","📊 Overview"],["charts","📈 Charts"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: tab===id ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
              border: tab===id ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.08)",
              color: tab===id ? "#34D399" : "#6B7280",
              cursor:"pointer", fontFamily:"inherit",
            }}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (<>
        <div className="p-6 mb-4 relative overflow-hidden" style={{...card,border:`1px solid ${isPos?"rgba(52,211,153,0.15)":"rgba(248,113,113,0.15)"}`}}>
          <div style={{position:"absolute",top:"-50px",right:"-50px",width:"180px",height:"180px",borderRadius:"50%",background:isPos?"radial-gradient(circle,rgba(52,211,153,0.12),transparent 70%)":"radial-gradient(circle,rgba(248,113,113,0.12),transparent 70%)",pointerEvents:"none"}}/>
          <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"#6B7280"}}>Net Savings</p>
          <p className="text-4xl font-bold mb-1" style={{color:isPos?"#FBBF24":"#F87171"}}>{isPos?"+":""}{fmt(Math.abs(netBalance))}</p>
          <p className="text-xs" style={{color:"#4B5563"}}>{isPos?"Saving more than spending 🎯":"Spending exceeds investments ⚠️"}</p>
        </div>

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

        {/* ✨ FIXED: Best/Worst with clear signs and labels */}
        {best&&worst&&best.mk!==worst.mk&&(
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div style={{...card,padding:"16px",border:"1px solid rgba(52,211,153,0.12)"}}>
              <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Best Month</p>
              <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>{mlabel(best.mk)}</p>
              <p className="text-base font-bold font-mono" style={{color:"#34D399"}}>+{fmt(best.net)} saved</p>
            </div>
            <div style={{...card,padding:"16px",border:"1px solid rgba(248,113,113,0.12)"}}>
              <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Worst Month</p>
              <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>{mlabel(worst.mk)}</p>
              <p className="text-base font-bold font-mono" style={{color:worst.net>=0?"#FBBF24":"#F87171"}}>
                {worst.net>=0?"+":""}{fmt(worst.net)} {worst.net>=0?"saved":"deficit"}
              </p>
            </div>
          </div>
        )}

        <div style={{...card,overflow:"hidden"}}>
          <div className="px-5 py-3" style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>Monthly Breakdown</p>
          </div>
          {allMonths.length===0?(
            <div className="text-center py-12" style={{color:"#4B5563"}}>
              <p style={{fontSize:"32px",marginBottom:"8px"}}>⚖️</p>
              <p style={{fontSize:"14px"}}>No data yet</p>
            </div>
          ):allMonths.map((mk,i)=>{
            const inv=investments.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
            const spe=spendings.filter(e=>mkey(e.date)===mk).reduce((s,e)=>s+e.amount,0);
            const n=inv-spe; const pos=n>=0;
            return(<div key={mk} className="flex items-center justify-between px-5 py-4"
              style={{borderBottom:i<allMonths.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>
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
      </>)}

      {tab === "charts" && (<>
        <div className="p-5 mb-4" style={{...card}}>
          <p className="text-sm font-bold mb-1" style={{color:"#E5E7EB"}}>📊 Monthly Invest vs Spend</p>
          <p className="text-xs mb-4" style={{color:"#6B7280"}}>Last 6 months comparison</p>
          {allMonths.length === 0 ? (
            <p className="text-center py-8" style={{color:"#4B5563",fontSize:"13px"}}>No data yet — add entries to see chart</p>
          ) : (
            <BarChart months={allMonths} investments={investments} spendings={spendings}/>
          )}
        </div>

        <div className="p-5 mb-4" style={{...card}}>
          <p className="text-sm font-bold mb-1" style={{color:"#E5E7EB"}}>🍕 Spending by Category</p>
          <p className="text-xs mb-4" style={{color:"#6B7280"}}>All time breakdown</p>
          {catData.length === 0 ? (
            <p className="text-center py-8" style={{color:"#4B5563",fontSize:"13px"}}>No spending data yet</p>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:"20px",flexWrap:"wrap"}}>
              <PieChart data={catData} size={160}/>
              <div style={{flex:1,minWidth:"140px"}}>
                {catData.map(d=>(
                  <div key={d.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <div style={{width:"10px",height:"10px",borderRadius:"50%",background:d.color,flexShrink:0}}/>
                      <span style={{color:"#9CA3AF",fontSize:"12px"}}>{d.label}</span>
                    </div>
                    <span style={{color:"#E5E7EB",fontSize:"12px",fontWeight:"600",fontFamily:"monospace"}}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 mb-4" style={{...card}}>
          <p className="text-sm font-bold mb-1" style={{color:"#E5E7EB"}}>📈 Investment by Type</p>
          <p className="text-xs mb-4" style={{color:"#6B7280"}}>All time breakdown</p>
          {investData.length === 0 ? (
            <p className="text-center py-8" style={{color:"#4B5563",fontSize:"13px"}}>No investment data yet</p>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:"20px",flexWrap:"wrap"}}>
              <PieChart data={investData} size={160}/>
              <div style={{flex:1,minWidth:"140px"}}>
                {investData.map(d=>(
                  <div key={d.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <div style={{width:"10px",height:"10px",borderRadius:"50%",background:d.color,flexShrink:0}}/>
                      <span style={{color:"#9CA3AF",fontSize:"12px"}}>{d.label}</span>
                    </div>
                    <span style={{color:"#E5E7EB",fontSize:"12px",fontWeight:"600",fontFamily:"monospace"}}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}