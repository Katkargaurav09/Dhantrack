import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import PersonalityCard from "../components/PersonalityCard";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function mkey(d) { const dt = new Date(d); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"); }
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return diff + " days ago";
}

function getDaysUntilRenewal(sub) {
  const today   = new Date(); today.setHours(0,0,0,0);
  const renewal = new Date(sub.nextRenewal); renewal.setHours(0,0,0,0);
  return Math.ceil((renewal - today) / 86400000);
}

const TYPE_ICON = { Stock:"📊",Crypto:"₿","Mutual Fund":"💼",Gold:"🥇","FD/RD":"🏦",Food:"🍔",Travel:"✈️",Shopping:"🛍️",Entertainment:"🎬",Course:"📚",Electronics:"💻",Health:"💊",Utilities:"⚡",Rent:"🏠",Fuel:"⛽",ETF:"📉",Other:"💡" };
const card = { background:"linear-gradient(145deg, #1A2333, #0F172A)", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 30px rgba(0,0,0,0.4)", borderRadius:"16px" };

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

// All badges with locked/unlocked state
function getAllBadges(investments, spendings, totalInvested, netBalance, streak) {
  return [
    { icon:"🌱", label:"First Investment", desc:"Add your first investment",     unlocked: investments.length >= 1,  goal: investments.length, target: 1 },
    { icon:"📈", label:"Investment Pro",   desc:"Track 10+ investments",         unlocked: investments.length >= 10, goal: investments.length, target: 10 },
    { icon:"💎", label:"Diamond Investor", desc:"Invest ₹10,000+",                unlocked: totalInvested >= 10000,   goal: totalInvested,      target: 10000 },
    { icon:"👑", label:"Investment King",  desc:"Invest ₹1 Lakh+",                unlocked: totalInvested >= 100000,  goal: totalInvested,      target: 100000 },
    { icon:"📝", label:"Expense Tracker",  desc:"Start tracking spending",        unlocked: spendings.length >= 1,    goal: spendings.length,   target: 1 },
    { icon:"🎯", label:"Smart Saver",      desc:"Investments exceed spending",    unlocked: netBalance > 0,           goal: netBalance > 0?1:0, target: 1 },
    { icon:"🔥", label:"3 Day Streak",     desc:"Track 3 days in a row",          unlocked: streak >= 3,              goal: streak,             target: 3 },
    { icon:"⚡", label:"Week Warrior",     desc:"Track 7 days in a row",          unlocked: streak >= 7,              goal: streak,             target: 7 },
    { icon:"🏆", label:"Month Master",     desc:"Track 30 days in a row",         unlocked: streak >= 30,             goal: streak,             target: 30 },
  ];
}

export default function Home({ navigate, firestoreData, user }) {
  const [vis,         setVis]         = useState(false);
  const [autopayList, setAutopayList] = useState([]);
  const [dismissed,   setDismissed]   = useState(new Set());

  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "users", uid, "autopay"),
      snap => setAutopayList(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error(err)
    );
    return () => unsub();
  }, [uid]);

  const { investments=[], spendings=[], incomes=[], categories=[], customCategories=[], totalInvested=0, totalSpent=0, totalIncome=0, netBalance=0, loading=false } = firestoreData || {};

  // Build full icon map from defaults + custom categories (legacy + new)
  const iconMap = { ...TYPE_ICON };
  categories.forEach(c => { iconMap[c.name] = c.icon; });
  customCategories.forEach(c => { iconMap[c.name] = c.icon; });

  const now     = new Date();
  const cm      = mkey(now.toISOString());
  const pm      = mkey(new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString());
  const cs      = spendings.filter(e=>mkey(e.date)===cm).reduce((s,e)=>s+e.amount,0);
  const ps      = spendings.filter(e=>mkey(e.date)===pm).reduce((s,e)=>s+e.amount,0);
  const ci      = investments.filter(e=>mkey(e.date)===cm).reduce((s,e)=>s+e.amount,0);
  const cInc    = incomes.filter(e=>mkey(e.date)===cm).reduce((s,e)=>s+e.amount,0); // this month's income
  const diff    = cs - ps;
  const pct     = ps > 0 ? Math.abs(Math.round((diff/ps)*100)) : 0;
  const dayName = now.toLocaleDateString("en-IN",{weekday:"long"}).toUpperCase();
  const dateStr = now.toLocaleDateString("en-IN",{day:"numeric",month:"long"}).toUpperCase();
  const recent  = [...investments.map(e=>({...e,kind:"invest"})),...spendings.map(e=>({...e,kind:"spend"}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  const isPos   = netBalance >= 0;
  const streak  = computeStreak(investments, spendings);
  const allBadges = getAllBadges(investments, spendings, totalInvested, netBalance, streak);
  const earnedCount = allBadges.filter(b=>b.unlocked).length;

  // Detect new users
  const isNewUser = investments.length === 0 && spendings.length === 0 && autopayList.length === 0 && incomes.length === 0;

  const reminders = autopayList.filter(sub => {
    if (!sub.active) return false;
    if (dismissed.has(sub.id)) return false;
    const days = getDaysUntilRenewal(sub);
    return days <= 5;
  }).sort((a,b) => getDaysUntilRenewal(a) - getDaysUntilRenewal(b));

  if (loading) return (
    <div style={{paddingTop:"24px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {[1,2,3].map(i=><div key={i} style={{...card,height:"80px",opacity:0.5}}/>)}
    </div>
  );

  return (
    <div style={{opacity:vis?1:0,transform:vis?"none":"translateY(14px)",transition:"all .4s ease"}}>

      {/* ── GREETING ── */}
      <div className="mb-6">
        <p className="text-xs font-mono tracking-widest mb-1" style={{color:"#6B7280"}}>{dayName}, {dateStr}</p>
        <h1 className="text-2xl font-bold" style={{color:"#E5E7EB"}}>
          Welcome back, {user?.name?.split(" ")[0]||"there"} 👋
        </h1>
      </div>

      {/* Onboarding card for new users */}
      {isNewUser && (
        <div className="p-5 mb-4 relative overflow-hidden" style={{
          background:"linear-gradient(135deg, rgba(52,211,153,0.08), rgba(251,191,36,0.05))",
          border:"1px solid rgba(52,211,153,0.2)",
          borderRadius:"16px",
        }}>
          <div style={{position:"absolute",top:"-30px",right:"-30px",width:"120px",height:"120px",borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.15),transparent 70%)",pointerEvents:"none"}}/>
          <p style={{fontSize:"32px",marginBottom:"8px"}}>🎉</p>
          <h3 style={{color:"#E5E7EB",fontSize:"17px",fontWeight:"700",marginBottom:"6px"}}>Welcome to DhanTrack!</h3>
          <p style={{color:"#9CA3AF",fontSize:"13px",lineHeight:"1.6",marginBottom:"14px"}}>
            Let's set up your finances. Tap the <span style={{color:"#34D399",fontWeight:"600"}}>+ button</span> at the bottom-right to start adding entries.
          </p>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            <button onClick={()=>navigate?.("investments")} style={{padding:"7px 14px",background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:"10px",color:"#34D399",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"inherit"}}>
              📈 Add Investment
            </button>
            <button onClick={()=>navigate?.("spending")} style={{padding:"7px 14px",background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:"10px",color:"#F87171",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"inherit"}}>
              💸 Log Expense
            </button>
            <button onClick={()=>navigate?.("autopay")} style={{padding:"7px 14px",background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.25)",borderRadius:"10px",color:"#8B5CF6",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"inherit"}}>
              🔔 Track Subscription
            </button>
          </div>
        </div>
      )}

      {/* ─── AUTOPAY REMINDER BANNERS ─── */}
      {reminders.length > 0 && (
        <div className="mb-5 space-y-2">
          {reminders.map(sub => {
            const days     = getDaysUntilRenewal(sub);
            const isOverdue = days < 0;
            const isToday   = days === 0;
            const isUrgent  = days <= 2;
            const bgColor   = isUrgent || isOverdue ? "rgba(248,113,113,0.1)"  : "rgba(251,191,36,0.08)";
            const bdColor   = isUrgent || isOverdue ? "rgba(248,113,113,0.3)"  : "rgba(251,191,36,0.25)";
            const txColor   = isUrgent || isOverdue ? "#F87171" : "#FBBF24";

            return (
              <div key={sub.id} style={{background: bgColor,border: `1px solid ${bdColor}`,borderRadius: "14px",padding: "12px 16px",display: "flex",alignItems: "center",gap: "12px"}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <span style={{fontSize:"26px"}}>{sub.icon}</span>
                  {isUrgent && (
                    <span style={{position:"absolute",top:"-3px",right:"-3px",width:"10px",height:"10px",borderRadius:"50%",background:"#F87171",boxShadow:"0 0 0 2px rgba(248,113,113,0.3)"}}/>
                  )}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{color:"#E5E7EB",fontSize:"13px",fontWeight:"700",marginBottom:"2px"}}>
                    {isOverdue ? `⚠️ ${sub.name} was due ${Math.abs(days)} day${Math.abs(days)!==1?"s":""} ago!` : isToday ? `🔴 ${sub.name} renews TODAY!` : `🔔 ${sub.name} renews in ${days} day${days!==1?"s":""}!`}
                  </p>
                  <p style={{color:txColor,fontSize:"12px"}}>
                    {fmt(sub.amount)} · {isOverdue || isToday ? "Cancel autopay now if not needed" : "Check if you still want this subscription"}
                  </p>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"4px",flexShrink:0}}>
                  <button onClick={() => navigate?.("autopay")} style={{padding:"5px 10px",background:isUrgent?"rgba(248,113,113,0.2)":"rgba(251,191,36,0.15)",border:`1px solid ${bdColor}`,borderRadius:"8px",color:txColor,fontSize:"11px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                    View →
                  </button>
                  <button onClick={() => setDismissed(prev => new Set([...prev, sub.id]))} style={{padding:"4px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",color:"#6B7280",fontSize:"10px",cursor:"pointer",fontFamily:"inherit"}}>
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PERSONALITY CARD */}
      {!isNewUser && (
        <PersonalityCard 
          firestoreData={firestoreData}
          autopayList={autopayList}
          user={user}
        />
      )}

      {/* ── BALANCE HERO — "Net Savings" ── */}
      <div className="p-6 mb-4 relative overflow-hidden" style={{...card}}>
        <div style={{position:"absolute",top:"-50px",right:"-50px",width:"180px",height:"180px",borderRadius:"50%",background:isPos?"radial-gradient(circle,rgba(52,211,153,0.12),transparent 70%)":"radial-gradient(circle,rgba(248,113,113,0.12),transparent 70%)",pointerEvents:"none"}}/>
        <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"#6B7280"}}>Net Savings</p>
        <p className="text-4xl font-bold mb-1" style={{color:isPos?"#FBBF24":"#F87171"}}>
          {fmt(Math.abs(netBalance))}
          {!isPos&&<span style={{fontSize:"16px",color:"#F87171",marginLeft:"8px"}}>deficit</span>}
        </p>
        <p className="text-xs mb-5" style={{color:"#4B5563"}}>
          {isPos ? "Invested − Spent" : "You're spending more than investing"}
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

      {/* ✨ v1.6: INCOME CARD — now tappable, opens Income page */}
      <button onClick={()=>navigate?.("income")} className="w-full text-left p-5 mb-4 relative overflow-hidden transition-all duration-200 hover:scale-[1.01]"
        style={{...card, border:"1px solid rgba(251,191,36,0.15)", cursor:"pointer", fontFamily:"inherit"}}>
        <div style={{position:"absolute",top:"-40px",right:"-40px",width:"150px",height:"150px",borderRadius:"50%",background:"radial-gradient(circle,rgba(251,191,36,0.12),transparent 70%)",pointerEvents:"none"}}/>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"#6B7280"}}>💰 Income This Month</p>
            <p className="text-2xl font-bold" style={{color:"#FBBF24"}}>{fmt(cInc)}</p>
            <p className="text-xs mt-1" style={{color:"#4B5563"}}>All-time: {fmt(totalIncome)} · {incomes.length} {incomes.length===1?"entry":"entries"}</p>
          </div>
          <div style={{width:"52px",height:"52px",borderRadius:"14px",background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",flexShrink:0}}>
            💰
          </div>
        </div>
        {incomes.length === 0 ? (
          <p className="text-xs mt-3" style={{color:"#6B7280"}}>
            Tap to add your salary or earnings →
          </p>
        ) : (
          <p className="text-xs mt-3 font-semibold" style={{color:"#FBBF24"}}>
            View all income →
          </p>
        )}
      </button>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          {label:"Total Invested",val:totalInvested,color:"#34D399",icon:"📈",page:"investments",count:investments.length},
          {label:"Total Spent",val:totalSpent,color:"#F87171",icon:"💸",page:"spending",count:spendings.length},
        ].map(c=>(
          <button key={c.page} onClick={()=>navigate?.(c.page)} className="text-left p-4 transition-all duration-200" style={{...card}}>
            <div className="text-2xl mb-3">{c.icon}</div>
            <p className="text-xs uppercase tracking-wider font-mono mb-1" style={{color:"#6B7280"}}>{c.label}</p>
            <p className="text-xl font-bold mb-1" style={{color:c.color}}>{fmt(c.val)}</p>
            <p className="text-xs" style={{color:"#475569"}}>{c.count} {c.count===1?"entry":"entries"}</p>
          </button>
        ))}
      </div>

      {/* ── STREAK + BADGES (locked + unlocked) ── */}
      <div className="p-5 mb-4" style={{...card}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🔥</span>
            <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>Streak & Badges</p>
            <span style={{fontSize:"11px",color:"#6B7280"}}>· {earnedCount}/{allBadges.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)"}}>
            <span style={{fontSize:"16px"}}>🔥</span>
            <span style={{color:"#FBBF24",fontWeight:"700",fontSize:"14px"}}>{streak} day{streak!==1?"s":""}</span>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"8px"}}>
          {allBadges.map(b=>{
            const progress = Math.min(Math.round((b.goal/b.target)*100), 100);
            return (
              <div key={b.label} className="rounded-xl text-center" style={{padding:"10px 6px",
                background: b.unlocked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                border: b.unlocked ? "1px solid rgba(255,255,255,0.06)" : "1px dashed rgba(255,255,255,0.05)",
                opacity: b.unlocked ? 1 : 0.55,
                position: "relative",
              }}>
                <div style={{fontSize:"22px",marginBottom:"3px",filter: b.unlocked ? "none" : "grayscale(1)"}}>
                  {b.unlocked ? b.icon : "🔒"}
                </div>
                <p style={{color: b.unlocked ? "#E5E7EB" : "#6B7280",fontSize:"10px",fontWeight:"700",marginBottom:"2px",lineHeight:"1.2"}}>
                  {b.label}
                </p>
                <p style={{color:"#4B5563",fontSize:"9px",lineHeight:"1.2"}}>{b.desc}</p>
                {!b.unlocked && (
                  <div style={{height:"2px",background:"rgba(255,255,255,0.05)",borderRadius:"99px",marginTop:"6px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${progress}%`,background:"#FBBF24",borderRadius:"99px"}}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MONTHLY QUICK STATUS ── */}
      <div className="p-5 mb-4" style={{...card}}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⚡</span>
          <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>Monthly Quick Status</p>
        </div>
        <p className="text-sm leading-relaxed" style={{color:"#9CA3AF"}}>
          {cs===0&&ci===0&&cInc===0
            ? "No activity this month yet. Tap + to add your first entry!"
            : <>
                {cInc>0&&<>You earned{" "}<span style={{color:"#FBBF24",fontWeight:600}}>{fmt(cInc)}</span>{" "}this month. </>}
                You spent{" "}<span style={{color:"#F87171",fontWeight:600}}>{fmt(cs)}</span>.{" "}
                {ps>0&&<>{diff>0?"Increased":"Decreased"} by{" "}<span style={{color:diff>0?"#F87171":"#34D399",fontWeight:600}}>{fmt(Math.abs(diff))}</span>{" "}<span style={{color:"#FBBF24",fontWeight:600}}>({pct}%)</span> vs last month. </>}
                {ci>0&&<>Invested{" "}<span style={{color:"#34D399",fontWeight:600}}>{fmt(ci)}</span> this month.</>}
              </>
          }
        </p>
      </div>

      {/* ── RECENT ACTIVITY (real category icons) ── */}
      <div className="overflow-hidden" style={{...card}}>
        <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <div className="flex items-center gap-2">
            <span className="text-base">🕐</span>
            <p className="text-sm font-bold" style={{color:"#E5E7EB"}}>Recent Activity</p>
          </div>
          <button onClick={()=>navigate?.("balance")} className="text-xs font-semibold" style={{color:"#FBBF24",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
            View all →
          </button>
        </div>
        {recent.length===0?(
          <div className="text-center py-12" style={{color:"#4B5563"}}>
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No entries yet</p>
            <p className="text-xs mt-1" style={{color:"#374151"}}>Tap + to add your first entry</p>
          </div>
        ):recent.map((e,i)=>(
          <div key={e.id+e.kind} className="flex items-center gap-3 px-5 py-4 transition-all duration-150"
            style={{borderBottom:i<recent.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{background:e.kind==="invest"?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",border:e.kind==="invest"?"1px solid rgba(52,211,153,0.2)":"1px solid rgba(248,113,113,0.2)"}}>
              {iconMap[e.type]||"💡"}
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