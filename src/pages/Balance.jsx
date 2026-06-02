import { useState, useEffect } from "react";
import { saveOrShareImage } from "../utils/shareImage";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const H = 160, W = 340, barW = 22, gap = 10, padX = 16;
  const groupW = (W - padX * 2) / vals.length;
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 40}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", maxHeight: "220px", display: "block" }}
    >
      {vals.map((v, i) => {
        const groupX = padX + i * groupW;
        const cx = groupX + groupW / 2;
        const invH = (v.inv / maxVal) * H;
        const speH = (v.spe / maxVal) * H;
        return (
          <g key={v.mk}>
            <rect x={cx - barW - gap / 2} y={H - invH} width={barW} height={invH} rx="4" fill="rgba(52,211,153,0.7)"/>
            <rect x={cx + gap / 2}        y={H - speH} width={barW} height={speH} rx="4" fill="rgba(248,113,113,0.7)"/>
            <text x={cx} y={H + 18} textAnchor="middle" fill="#6B7280" fontSize="11">
              {mlabel(v.mk).slice(0, 3)}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <circle cx={W / 2 - 60} cy={H + 36} r="4" fill="rgba(52,211,153,0.7)"/>
      <text x={W / 2 - 52} y={H + 40} fill="#9CA3AF" fontSize="11">Invest</text>
      <circle cx={W / 2 + 20} cy={H + 36} r="4" fill="rgba(248,113,113,0.7)"/>
      <text x={W / 2 + 28} y={H + 40} fill="#9CA3AF" fontSize="11">Spend</text>
    </svg>
  );
}

function computeStreak(investments, spendings) {
  const allDates = new Set([...investments.map(e=>e.date),...spendings.map(e=>e.date)]);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const key = d.toISOString().split("T")[0];
    if (allDates.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// Health Score (components we can calculate today). Income improves savings accuracy.
function computeHealthScore({ totalIncome, totalSpent, investments, streak }) {
  // 1. Savings rate — (income - spend) / income. >=20% = full. Falls back to invest-vs-spend if no income.
  let savingsPts = 0;
  if (totalIncome > 0) {
    const rate = (totalIncome - totalSpent) / totalIncome;
    savingsPts = Math.max(0, Math.min(1, rate / 0.2)) * 35;
  } else {
    const denom = investments.reduce((s,e)=>s+(Number(e.amount)||0),0) + totalSpent;
    if (denom > 0) {
      const invTotal = investments.reduce((s,e)=>s+(Number(e.amount)||0),0);
      savingsPts = Math.max(0, Math.min(1, (invTotal/denom) / 0.5)) * 35;
    }
  }
  const investPts = Math.max(0, Math.min(1, investments.length / 10)) * 30;
  const consistencyPts = Math.max(0, Math.min(1, streak / 14)) * 20;
  const subsPts = 15; // placeholder until autopay is wired into Balance

  const components = [
    { label: "Savings Rate",  pts: Math.round(savingsPts),     max: 35, tip: "Save 20%+ of your income for full points." },
    { label: "Investing",     pts: Math.round(investPts),      max: 30, tip: "Invest regularly — 10+ entries unlocks full points." },
    { label: "Consistency",   pts: Math.round(consistencyPts), max: 20, tip: "Track daily — a 14-day streak gives full points." },
    { label: "Subscriptions", pts: Math.round(subsPts),        max: 15, tip: "Keep autopay under ₹2,000/month." },
  ];
  const total = components.reduce((s, c) => s + c.pts, 0);
  return { total: Math.max(0, Math.min(100, total)), components };
}

// Monthly report IMAGE (Report tab "Share this report") — unchanged behaviour
async function exportReportImage(investments, spendings, incomes, totalInvested, totalSpent, netBalance) {
  const now   = new Date();
  const month = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const cm    = mkey(now.toISOString());
  const mInv  = investments.filter(e => mkey(e.date) === cm).reduce((s,e)=>s+e.amount,0);
  const mSpe  = spendings.filter(e => mkey(e.date) === cm).reduce((s,e)=>s+e.amount,0);
  const mIncm = incomes.filter(e => mkey(e.date) === cm).reduce((s,e)=>s+e.amount,0);

  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0,0,0,1350);
  bg.addColorStop(0,"#0B0F1A"); bg.addColorStop(1,"#020617");
  ctx.fillStyle = bg; ctx.fillRect(0,0,1080,1350);

  ctx.globalAlpha = 0.12; ctx.fillStyle = "#34D399";
  ctx.beginPath(); ctx.arc(920,180,260,0,2*Math.PI); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.fillStyle = "#34D399"; ctx.font = "bold 56px system-ui, sans-serif";
  ctx.fillText("💰 DhanTrack", 540, 150);
  ctx.fillStyle = "#9CA3AF"; ctx.font = "34px system-ui";
  ctx.fillText(`Report for ${month}`, 540, 210);

  const pos = netBalance >= 0;
  ctx.fillStyle = "#6B7280"; ctx.font = "30px system-ui";
  ctx.fillText("NET SAVINGS", 540, 340);
  ctx.fillStyle = pos ? "#FBBF24" : "#F87171"; ctx.font = "bold 100px system-ui";
  ctx.fillText(`${pos?"+":"-"}₹${Math.abs(netBalance).toLocaleString("en-IN")}`, 540, 450);

  function box(x, label, value, color) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(x, 540, 280, 180);
    ctx.fillStyle = "#6B7280"; ctx.font = "26px system-ui"; ctx.textAlign = "center";
    ctx.fillText(label, x + 140, 600);
    ctx.fillStyle = color; ctx.font = "bold 44px system-ui";
    ctx.fillText(`₹${value.toLocaleString("en-IN")}`, x + 140, 665);
  }
  box(70,  "INCOME (mo)", mIncm, "#FBBF24");
  box(400, "INVESTED (mo)", mInv, "#34D399");
  box(730, "SPENT (mo)", mSpe, "#F87171");

  ctx.textAlign = "left";
  ctx.fillStyle = "#E5E7EB"; ctx.font = "bold 40px system-ui";
  ctx.fillText("All-Time Totals", 90, 870);
  ctx.fillStyle = "#9CA3AF"; ctx.font = "32px system-ui";
  ctx.fillText(`💰 Income:    ₹${incomes.reduce((s,e)=>s+e.amount,0).toLocaleString("en-IN")}`, 90, 935);
  ctx.fillText(`📈 Invested:  ₹${totalInvested.toLocaleString("en-IN")}`, 90, 990);
  ctx.fillText(`💸 Spent:      ₹${totalSpent.toLocaleString("en-IN")}`, 90, 1045);

  ctx.textAlign = "center";
  ctx.fillStyle = "#34D399"; ctx.font = "bold 36px system-ui";
  ctx.fillText("Track your money smarter", 540, 1230);
  ctx.fillStyle = "#6B7280"; ctx.font = "28px system-ui";
  ctx.fillText("dhantrack-one.vercel.app", 540, 1280);

  const blob = await new Promise(res => canvas.toBlob(res, "image/png", 0.95));
  return saveOrShareImage(blob, `dhantrack-report-${cm}.png`, {
    title: `DhanTrack Report — ${month}`,
    text: `My DhanTrack summary for ${month}`,
  });
}

// ✨ FULL-DATA PDF (top Export button) — all incomes + spendings + investments, every row
async function exportFullPDF(investments, spendings, incomes, totalInvested, totalSpent, totalIncome) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const now = new Date();
  const generated = now.toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
  const inr = n => "Rs " + Number(n).toLocaleString("en-IN");

  // Header
  doc.setFontSize(20); doc.setTextColor(5,150,105);
  doc.text("DhanTrack — Full Report", 40, 50);
  doc.setFontSize(10); doc.setTextColor(120,120,120);
  doc.text(`Generated ${generated}`, 40, 68);

  // Summary line
  const net = totalIncome - totalSpent;
  doc.setFontSize(11); doc.setTextColor(40,40,40);
  doc.text(
    `Income: ${inr(totalIncome)}   |   Invested: ${inr(totalInvested)}   |   Spent: ${inr(totalSpent)}   |   Net (Income - Spent): ${inr(net)}`,
    40, 92
  );

  let y = 110;
  const sortByDate = arr => [...arr].sort((a,b)=>new Date(b.date)-new Date(a.date));

  function section(title, rows, totalLabel, totalVal, headColor) {
    doc.setFontSize(13); doc.setTextColor(30,30,30);
    autoTable(doc, {
      startY: y + 14,
      head: [[title, "", "", "", ""]],
      body: [],
      theme: "plain",
      styles: { fontStyle: "bold", fontSize: 12 },
    });
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: [["Date", "Name", "Category", "Amount", "Note"]],
      body: rows.length
        ? sortByDate(rows).map(e => [e.date, e.name || "-", e.type || "-", inr(e.amount), e.note || "-"])
        : [["—", "No entries", "—", "—", "—"]],
      foot: rows.length ? [["", "", totalLabel, inr(totalVal), ""]] : undefined,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: headColor, textColor: 255 },
      footStyles: { fillColor: [243,244,246], textColor: 30, fontStyle: "bold" },
      columnStyles: { 3: { halign: "right" } },
      margin: { left: 40, right: 40 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  section("Income", incomes, "Total Income", totalIncome, [217,119,6]);
  section("Investments", investments, "Total Invested", totalInvested, [5,150,105]);
  section("Spending", spendings, "Total Spent", totalSpent, [239,68,68]);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text(`DhanTrack · dhantrack-one.vercel.app · Page ${i}/${pageCount}`, 40, doc.internal.pageSize.getHeight() - 20);
  }

  const fileName = `dhantrack-full-report-${now.toISOString().split("T")[0]}.pdf`;
  const isNative = Capacitor.isNativePlatform && Capacitor.isNativePlatform();

  if (isNative) {
    // Write PDF to device + open native share sheet
    const base64 = doc.output("datauristring").split(",")[1];
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    const uri = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({ title: "DhanTrack Full Report", url: uri.uri, dialogTitle: "Save or share your PDF" });
    return "shared";
  } else {
    // Desktop: normal download
    doc.save(fileName);
    return "downloaded";
  }
}

export default function Balance({ firestoreData }) {
  const [vis,setVis]=useState(false); const [barW,setBarW]=useState(50);
  const [tab,setTab]=useState("overview");
  const [exporting,setExporting]=useState(false);
  const [exportMsg,setExportMsg]=useState("");
  const [reportSharing,setReportSharing]=useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const { investments=[], spendings=[], incomes=[], categories=[], totalInvested=0, totalSpent=0, totalIncome=0, netBalance=0, loading=false } = firestoreData || {};

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

  // Monthly Report data (current month)
  const now = new Date();
  const cm = mkey(now.toISOString());
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const cmInv = investments.filter(e => mkey(e.date) === cm);
  const cmSpe = spendings.filter(e => mkey(e.date) === cm);
  const cmIncm = incomes.filter(e => mkey(e.date) === cm);
  const cmInvTotal = cmInv.reduce((s,e)=>s+e.amount,0);
  const cmSpeTotal = cmSpe.reduce((s,e)=>s+e.amount,0);
  const cmIncTotal = cmIncm.reduce((s,e)=>s+e.amount,0);
  const cmNet = cmInvTotal - cmSpeTotal;
  const cmCatAgg = {};
  cmSpe.forEach(e => { const c=e.type||"Other"; cmCatAgg[c]=(cmCatAgg[c]||0)+Number(e.amount); });
  const cmTopCat = Object.entries(cmCatAgg).sort((a,b)=>b[1]-a[1])[0];

  // Health Score
  const streak = computeStreak(investments, spendings);
  const health = computeHealthScore({ totalIncome, totalSpent, investments, streak });
  const scoreColor = health.total >= 71 ? "#34D399" : health.total >= 41 ? "#FBBF24" : "#F87171";
  const scoreLabel = health.total >= 71 ? "Good" : health.total >= 41 ? "Fair" : "Needs Work";

  async function handleExport() {
    setExporting(true); setExportMsg("");
    try {
      const outcome = await exportFullPDF(investments, spendings, incomes, totalInvested, totalSpent, totalIncome);
      setExportMsg(outcome === "shared" ? "PDF ready — share sheet opened 🎉" : "PDF downloaded 🎉");
      setTimeout(()=>setExportMsg(""), 3000);
    } catch (e) {
      console.error("Export error:", e);
      setExportMsg("Couldn't export. Try again?");
      setTimeout(()=>setExportMsg(""), 3000);
    }
    setExporting(false);
  }

  async function handleShareReport() {
    setReportSharing(true);
    try {
      await exportReportImage(investments, spendings, incomes, totalInvested, totalSpent, netBalance);
    } catch (e) { console.error("Report share error:", e); }
    setReportSharing(false);
  }

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
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",color:"#FBBF24",cursor:exporting?"not-allowed":"pointer",fontFamily:"inherit"}}>
          {exporting ? "..." : "📄 Export PDF"}
        </button>
      </div>
      {exportMsg && <p className="text-xs text-center mb-3" style={{color:"#FBBF24"}}>{exportMsg}</p>}

      {/* Tabs — horizontally scrollable so 4 fit cleanly on mobile */}
      <div className="flex gap-2 mb-4" style={{overflowX:"auto",paddingBottom:"4px"}}>
        {[["overview","📊 Overview"],["charts","📈 Charts"],["report","📄 Report"],["score","💯 Score"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              flexShrink:0,
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

        {/* Income summary row */}
        <div style={{...card,padding:"16px",marginBottom:"16px",border:"1px solid rgba(251,191,36,0.15)"}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>Total Income</p>
              <p className="text-2xl font-bold" style={{color:"#FBBF24"}}>{fmt(totalIncome)}</p>
            </div>
            <p className="text-xs" style={{color:"#475569"}}>{incomes.length} {incomes.length===1?"entry":"entries"}</p>
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

      {/* Monthly Report tab (image share) */}
      {tab === "report" && (<>
        <div className="p-5 mb-4 relative overflow-hidden" style={{...card}}>
          <div style={{position:"absolute",top:"-40px",right:"-40px",width:"160px",height:"160px",borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.12),transparent 70%)",pointerEvents:"none"}}/>
          <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"#6B7280"}}>Report for</p>
          <p className="text-lg font-bold mb-4" style={{color:"#E5E7EB"}}>{monthLabel}</p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div style={{padding:"12px",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:"12px"}}>
              <p className="text-xs" style={{color:"#6B7280"}}>Income</p>
              <p className="text-base font-bold font-mono" style={{color:"#FBBF24"}}>{fmt(cmIncTotal)}</p>
            </div>
            <div style={{padding:"12px",background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:"12px"}}>
              <p className="text-xs" style={{color:"#6B7280"}}>Invested</p>
              <p className="text-base font-bold font-mono" style={{color:"#34D399"}}>{fmt(cmInvTotal)}</p>
            </div>
            <div style={{padding:"12px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:"12px"}}>
              <p className="text-xs" style={{color:"#6B7280"}}>Spent</p>
              <p className="text-base font-bold font-mono" style={{color:"#F87171"}}>{fmt(cmSpeTotal)}</p>
            </div>
          </div>

          <div style={{padding:"14px",background:"rgba(255,255,255,0.03)",borderRadius:"12px"}}>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{color:"#9CA3AF"}}>Net this month</span>
              <span className="text-lg font-bold font-mono" style={{color:cmNet>=0?"#FBBF24":"#F87171"}}>{cmNet>=0?"+":""}{fmt(cmNet)}</span>
            </div>
            {cmTopCat && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm" style={{color:"#9CA3AF"}}>Top spending</span>
                <span className="text-sm font-semibold" style={{color:"#E5E7EB"}}>{cmTopCat[0]} · {fmt(cmTopCat[1])}</span>
              </div>
            )}
          </div>
        </div>

        {cmInv.length === 0 && cmSpe.length === 0 && cmIncm.length === 0 && (
          <div style={{...card,textAlign:"center",padding:"32px 20px",color:"#4B5563"}}>
            <p style={{fontSize:"32px",marginBottom:"8px"}}>📄</p>
            <p style={{fontSize:"13px"}}>No activity this month yet</p>
          </div>
        )}

        <button onClick={handleShareReport} disabled={reportSharing} style={{
          width:"100%",padding:"13px",marginBottom:"8px",
          background: reportSharing ? "rgba(52,211,153,0.4)" : "linear-gradient(135deg,#34D399,#059669)",
          border:"none",borderRadius:"12px",color:"#022C22",fontWeight:700,fontSize:"14px",
          cursor:reportSharing?"not-allowed":"pointer",fontFamily:"inherit",
        }}>
          {reportSharing ? "Preparing..." : "📤 Share this report (image)"}
        </button>
      </>)}

      {/* Health Score tab */}
      {tab === "score" && (<>
        <div className="p-6 mb-4 relative overflow-hidden" style={{...card,textAlign:"center"}}>
          <div style={{position:"absolute",top:"-50px",left:"50%",transform:"translateX(-50%)",width:"220px",height:"220px",borderRadius:"50%",background:`radial-gradient(circle, ${scoreColor}22, transparent 70%)`,pointerEvents:"none"}}/>
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{color:"#6B7280"}}>Money Score</p>

          <div style={{position:"relative",width:"180px",height:"180px",margin:"0 auto 12px"}}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14"/>
              <circle cx="90" cy="90" r="78" fill="none" stroke={scoreColor} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(health.total/100)*490} 490`} transform="rotate(-90 90 90)"
                style={{transition:"stroke-dasharray .8s ease"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:scoreColor,fontSize:"46px",fontWeight:800,lineHeight:1}}>{health.total}</span>
              <span style={{color:"#6B7280",fontSize:"12px"}}>/ 100</span>
            </div>
          </div>
          <p style={{color:scoreColor,fontWeight:700,fontSize:"15px"}}>{scoreLabel}</p>
        </div>

        <div style={{...card,padding:"16px"}}>
          <p className="text-xs uppercase tracking-wider font-mono mb-3" style={{color:"#6B7280"}}>Breakdown</p>
          {health.components.map(c => {
            const pctc = Math.round((c.pts / c.max) * 100);
            return (
              <div key={c.label} style={{marginBottom:"14px"}}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{color:"#E5E7EB",fontWeight:600}}>{c.label}</span>
                  <span style={{color:"#9CA3AF",fontFamily:"monospace"}}>{c.pts}/{c.max}</span>
                </div>
                <div style={{height:"5px",background:"rgba(255,255,255,0.05)",borderRadius:"99px",overflow:"hidden",marginBottom:"4px"}}>
                  <div style={{height:"100%",width:`${pctc}%`,background:scoreColor,borderRadius:"99px",transition:"width .6s ease"}}/>
                </div>
                <p style={{color:"#4B5563",fontSize:"10px"}}>{c.tip}</p>
              </div>
            );
          })}
          <p style={{color:"#4B5563",fontSize:"10px",marginTop:"4px",lineHeight:1.5}}>
            More factors (budgets, emergency fund) will be added to your score as those features arrive.
          </p>
        </div>
      </>)}
    </div>
  );
}