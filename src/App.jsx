import { useState, useRef, useEffect } from "react";
import AuthPage      from "./pages/AuthPage";
import Home          from "./pages/Home";
import Investments   from "./pages/Investments";
import Spending      from "./pages/Spending";
import Income        from "./pages/Income";
import Autopay       from "./pages/Autopay";
import Goals         from "./pages/Goals";
import Balance       from "./pages/Balance";
import useAuth       from "./hooks/Useauth";
import useFirestore  from "./hooks/Usefirestore";
import QuickAddMenu  from "./components/QuickAddMenu";
import SearchOverlay from "./components/SearchOverlay";
import IncomeAddPanel from "./components/IncomeAddPanel";

const NAV = [
  { id: "home",        label: "Home",   fullLabel: "Overview",    icon: "🏠" },
  { id: "investments", label: "Invest", fullLabel: "Investments", icon: "📈" },
  { id: "spending",    label: "Spend",  fullLabel: "Spending",    icon: "💸" },
  { id: "autopay",     label: "Bills",  fullLabel: "Autopay",     icon: "🔔" },
  { id: "goals",       label: "Goals",  fullLabel: "Goals",       icon: "🎯" },
  { id: "balance",     label: "Stats",  fullLabel: "Balance",     icon: "⚖️" },
];
// Note: "income" is intentionally NOT in NAV — it's reached from the Home card, not a bottom tab.

function UserAvatar({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  const initials = user?.name ? user.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() : "U";
  return (
    <div ref={ref} style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(o=>!o)} title={user?.name}
        style={{width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg,#34D399,#059669)",border:`2px solid ${open?"rgba(52,211,153,0.6)":"rgba(52,211,153,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:"700",color:"#022C22",boxShadow:open?"0 0 0 3px rgba(52,211,153,0.2)":"none",transition:"all .2s"}}>
        {initials}
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,background:"linear-gradient(145deg,#1A2333,#0F172A)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"14px",padding:"6px",minWidth:"200px",boxShadow:"0 15px 35px rgba(0,0,0,0.5)",zIndex:200}}>
          <div style={{padding:"10px 12px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:"4px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#34D399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700",color:"#022C22",flexShrink:0}}>{initials}</div>
              <div style={{minWidth:0}}>
                <p style={{color:"#E5E7EB",fontSize:"13px",fontWeight:"600",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</p>
                <p style={{color:"#6B7280",fontSize:"11px",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</p>
              </div>
            </div>
          </div>
          <button onClick={()=>{setOpen(false);onLogout();}}
            style={{width:"100%",textAlign:"left",padding:"9px 12px",borderRadius:"8px",background:"none",border:"none",color:"#F87171",fontSize:"13px",fontWeight:"500",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"8px"}}>
            🚪 Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function SearchButton({ onClick }) {
  return (
    <button onClick={onClick} title="Search"
      style={{
        width:"36px",height:"36px",borderRadius:"50%",
        background:"rgba(255,255,255,0.05)",
        border:"1px solid rgba(255,255,255,0.1)",
        display:"flex",alignItems:"center",justifyContent:"center",
        cursor:"pointer",transition:"all .2s",flexShrink:0,
        color:"#9CA3AF",
      }}
      onMouseEnter={e=>{e.currentTarget.style.background="rgba(52,211,153,0.1)"; e.currentTarget.style.borderColor="rgba(52,211,153,0.3)"; e.currentTarget.style.color="#34D399";}}
      onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#9CA3AF";}}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </button>
  );
}

function Header({ current, onChange, user, onLogout, onSearch }) {
  const today = new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  return (
    <header className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-8 h-16 border-b border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-emerald-400 text-sm font-bold">D</span>
        </div>
        <div>
          <span className="text-base font-bold text-white">Dhan</span>
          <span className="text-base font-bold text-emerald-400">Track</span>
        </div>
      </div>
      <nav className="flex items-center gap-1">
        {NAV.map(item=>{
          const isActive=current===item.id;
          return(
            <button key={item.id} onClick={()=>onChange(item.id)}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${isActive?"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20":"text-white/40 hover:text-white hover:bg-white/5"}`}>
              <span className="text-base">{item.icon}</span>
              <span className="hidden xl:inline">{item.fullLabel}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs font-mono text-white/30">{today}</span>
        <SearchButton onClick={onSearch}/>
        <UserAvatar user={user} onLogout={onLogout}/>
      </div>
    </header>
  );
}

function MobileTopbar({ current, user, onLogout, onSearch }) {
  const page  = NAV.find(n=>n.id===current) || { icon:"💰", fullLabel:"Income" }; // income isn't in NAV
  const today = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-5 h-14 border-b border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <span className="text-base font-bold text-white">Dhan</span>
        <span className="text-base font-bold text-emerald-400">Track</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base">{page?.icon}</span>
        <span className="text-sm font-medium text-white/70">{page?.fullLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <SearchButton onClick={onSearch}/>
        <UserAvatar user={user} onLogout={onLogout}/>
      </div>
    </header>
  );
}

function BottomNav({ current, onChange }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-white/5 backdrop-blur-xl border-t border-white/10">
      {NAV.map(item=>{
        const isActive=current===item.id;
        return(
          <button key={item.id} onClick={()=>onChange(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${isActive?"text-emerald-400":"text-white/25 hover:text-white/50"}`}
            style={{minWidth:0}}>
            {isActive&&<span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full"/>}
            <span className="text-lg leading-none">{item.icon}</span>
            <span style={{fontSize:"10px",fontWeight:"500"}}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function LoadingScreen() {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0B0F1A,#111827)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"16px"}}>
      <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"linear-gradient(135deg,#34D399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",fontWeight:"bold",color:"#022C22"}}>D</div>
      <p style={{color:"#6B7280",fontSize:"13px",fontFamily:"monospace"}}>Loading DhanTrack...</p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [quickAddTrigger, setQuickAddTrigger] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false); // income add-form overlay (from global +)

  const { user, loading, login, register, loginWithGoogle, logout } = useAuth();
  const firestoreData = useFirestore(user?.uid || null);

  if (loading) return <LoadingScreen/>;

  async function handleLogin(email, password)           { await login(email, password); }
  async function handleRegister(name, email, password)  { await register(name, email, password); }
  async function handleGoogle()                         { await loginWithGoogle(); }
  async function handleLogout()                         { await logout(); setPage("home"); }

  if (!user) {
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} onGoogle={handleGoogle}/>;
  }

  function changePage(newPage) {
    setQuickAddTrigger(null);
    setSearchOpen(false);
    setPage(newPage);
  }

  function handleQuickAdd(type) {
    // income: if already ON the income page, let the page's own form handle it;
    // otherwise open the quick overlay so user can add from anywhere.
    if (type === "income") {
      if (page === "income") {
        setQuickAddTrigger({ type, ts: Date.now() });
      } else {
        setIncomeOpen(true);
      }
      return;
    }

    const pageMap = { investment: "investments", spending: "spending", autopay: "autopay" };
    const targetPage = pageMap[type];
    const ctx = window.__dhanPresetContext;

    setQuickAddTrigger(null);
    setPage(targetPage);

    if (ctx && ctx.page === targetPage) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("dhan-preset-add", { detail: ctx }));
      }, 100);
    } else {
      setTimeout(() => {
        setQuickAddTrigger({ type, ts: Date.now() });
      }, 100);
    }
  }

  async function handleSaveIncome(entry) {
    await firestoreData.addEntry("incomes", entry);
  }

  function handleSearchNavigate(targetPage) {
    setSearchOpen(false);
    setPage(targetPage);
  }

  function renderPage() {
    switch (page) {
      case "home":        return <Home        key="home"        navigate={changePage} firestoreData={firestoreData} user={user}/>;
      case "investments": return <Investments key="investments" firestoreData={firestoreData} user={user} quickAddTrigger={quickAddTrigger}/>;
      case "spending":    return <Spending    key="spending"    firestoreData={firestoreData} user={user} quickAddTrigger={quickAddTrigger}/>;
      case "income":      return <Income      key="income"      firestoreData={firestoreData} user={user} quickAddTrigger={quickAddTrigger} onBack={()=>changePage("home")}/>;
      case "autopay":     return <Autopay     key="autopay"     user={user} quickAddTrigger={quickAddTrigger}/>;
      case "goals":       return <Goals       key="goals"       firestoreData={firestoreData} user={user}/>;
      case "balance":     return <Balance     key="balance"     firestoreData={firestoreData} user={user}/>;
      default:            return <Home        key="home"        navigate={changePage} firestoreData={firestoreData} user={user}/>;
    }
  }

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-[#0B0F1A] via-[#0F172A] to-[#020617]">
      <Header       current={page} onChange={changePage} user={user} onLogout={handleLogout} onSearch={()=>setSearchOpen(true)}/>
      <MobileTopbar current={page}                       user={user} onLogout={handleLogout} onSearch={()=>setSearchOpen(true)}/>
      <main className="max-w-3xl mx-auto px-4 pb-24 lg:pb-10 pt-2">
        {renderPage()}
      </main>
      <BottomNav current={page} onChange={changePage}/>
      <QuickAddMenu onAdd={handleQuickAdd}/>

      {/* Income add-form overlay (used when adding from the global + button outside the Income page) */}
      <IncomeAddPanel open={incomeOpen} onClose={()=>setIncomeOpen(false)} onSave={handleSaveIncome}/>

      {searchOpen && (
        <SearchOverlay 
          firestoreData={firestoreData} 
          user={user}
          onClose={()=>setSearchOpen(false)}
          onNavigate={handleSearchNavigate}
        />
      )}
    </div>
  );
}