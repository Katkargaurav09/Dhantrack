import { useState, useRef, useEffect } from "react";
import AuthPage    from "./pages/AuthPage";
import Home        from "./pages/Home";
import Investments from "./pages/Investments";
import Spending    from "./pages/Spending";
import Balance     from "./pages/Balance";

const NAV = [
  { id: "home",        label: "Overview",    icon: "🏠" },
  { id: "investments", label: "Investments", icon: "📈" },
  { id: "spending",    label: "Spending",    icon: "💸" },
  { id: "balance",     label: "Balance",     icon: "⚖️" },
];

// ── User Avatar + Dropdown ─────────────────────────────────────
function UserAvatar({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Circle button */}
      <button onClick={() => setOpen(o => !o)} title={user?.name}
        style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: "linear-gradient(135deg, #34D399, #059669)",
          border: `2px solid ${open ? "rgba(52,211,153,0.6)" : "rgba(52,211,153,0.3)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontFamily: "inherit",
          fontSize: "12px", fontWeight: "700", color: "#022C22",
          boxShadow: open ? "0 0 0 3px rgba(52,211,153,0.2)" : "none",
          transition: "all .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 0 3px rgba(52,211,153,0.2)"}
        onMouseLeave={e => { if (!open) e.currentTarget.style.boxShadow = "none"; }}>
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          background: "linear-gradient(145deg, #1A2333, #0F172A)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px", padding: "6px",
          minWidth: "200px",
          boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
          zIndex: 200,
        }}>
          {/* User info */}
          <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "4px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#34D399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700",color:"#022C22",flexShrink:0 }}>
                {initials}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ color:"#E5E7EB",fontSize:"13px",fontWeight:"600",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.name}</p>
                <p style={{ color:"#6B7280",fontSize:"11px",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.email}</p>
              </div>
            </div>
          </div>
          {/* Sign out */}
          <button onClick={() => { setOpen(false); onLogout(); }}
            style={{ width:"100%",textAlign:"left",padding:"9px 12px",borderRadius:"8px",background:"none",border:"none",color:"#F87171",fontSize:"13px",fontWeight:"500",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"8px",transition:"background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(248,113,113,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background="none"}>
            🚪 Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DESKTOP HEADER ────────────────────────────────────────────
function Header({ current, onChange, user, onLogout }) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <header className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-8 h-16 border-b border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-emerald-400 text-sm font-bold">D</span>
        </div>
        <div>
          <span className="text-base font-bold text-white">Dhan</span>
          <span className="text-base font-bold text-emerald-400">Track</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-1">
        {NAV.map(item => {
          const isActive = current === item.id;
          return (
            <button key={item.id} onClick={() => onChange(item.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400"/>}
            </button>
          );
        })}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-xs font-mono text-white/30">{today}</span>
        <UserAvatar user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}

// ─── MOBILE TOPBAR ─────────────────────────────────────────────
function MobileTopbar({ current, user, onLogout }) {
  const page  = NAV.find(n => n.id === current);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-5 h-14 border-b border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <span className="text-base font-bold text-white">Dhan</span>
        <span className="text-base font-bold text-emerald-400">Track</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base">{page?.icon}</span>
        <span className="text-sm font-medium text-white/70">{page?.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-white/30 hidden sm:block">{today}</span>
        <UserAvatar user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}

// ─── MOBILE BOTTOM NAV ─────────────────────────────────────────
function BottomNav({ current, onChange }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-white/5 backdrop-blur-xl border-t border-white/10">
      {NAV.map(item => {
        const isActive = current === item.id;
        return (
          <button key={item.id} onClick={() => onChange(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${
              isActive ? "text-emerald-400" : "text-white/25 hover:text-white/50"
            }`}>
            {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full"/>}
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] font-mono">{item.label.slice(0, 7)}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  async function handleLogin(email, password) {
    // TODO: replace with → await signInWithEmailAndPassword(auth, email, password)
    setUser({ name: "Katka User", email });
  }

  async function handleRegister(name, email, password) {
    // TODO: replace with → await createUserWithEmailAndPassword(auth, email, password)
    // then → await updateProfile(userCredential.user, { displayName: name })
    setUser({ name, email });
  }

  function handleLogout() {
    // TODO: replace with → await signOut(auth)
    setUser(null);
    setPage("home");
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  function renderPage() {
    switch (page) {
      case "home":        return <Home navigate={setPage} />;
      case "investments": return <Investments />;
      case "spending":    return <Spending />;
      case "balance":     return <Balance />;
      default:            return <Home navigate={setPage} />;
    }
  }

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-[#0B0F1A] via-[#0F172A] to-[#020617]">
      <Header current={page} onChange={setPage} user={user} onLogout={handleLogout} />
      <MobileTopbar current={page} user={user} onLogout={handleLogout} />
      <main className="max-w-3xl mx-auto px-4 pb-24 lg:pb-10 pt-2">
        {renderPage()}
      </main>
      <BottomNav current={page} onChange={setPage} />
    </div>
  );
}
