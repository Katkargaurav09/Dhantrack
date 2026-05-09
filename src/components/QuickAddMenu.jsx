import { useState, useEffect, useRef } from "react";

export default function QuickAddMenu({ onAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const actions = [
    { id: "investment", label: "Investment", icon: "📈", color: "#34D399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)" },
    { id: "spending",   label: "Spending",   icon: "💸", color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
    { id: "autopay",    label: "Subscription",icon: "🔔", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
  ];

  function handleClick(id) {
    setOpen(false);
    onAdd(id);
  }

  return (
    <div ref={ref} className="fixed bottom-20 right-5 md:bottom-6 z-30">
      {/* Popup menu */}
      {open && (
        <div style={{
          position: "absolute",
          bottom: "60px",
          right: "0",
          minWidth: "200px",
          background: "linear-gradient(145deg,#1A2333,#0F172A)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "8px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          animation: "slideUp 0.18s ease-out",
        }}>
          <div style={{padding:"6px 10px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:"6px"}}>
            <p style={{color:"#6B7280",fontSize:"10px",fontWeight:"600",letterSpacing:"0.1em",textTransform:"uppercase"}}>Quick Add</p>
          </div>
          {actions.map(a => (
            <button key={a.id} onClick={()=>handleClick(a.id)}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:"12px",
                padding:"11px 12px", background:"none", border:"none",
                borderRadius:"10px", cursor:"pointer", fontFamily:"inherit",
                transition:"background 0.15s", textAlign:"left",
              }}
              onMouseEnter={e=>e.currentTarget.style.background=a.bg}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{fontSize:"22px"}}>{a.icon}</span>
              <span style={{color:"#E5E7EB",fontSize:"14px",fontWeight:"600"}}>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* + Button */}
      <button onClick={()=>setOpen(o=>!o)}
        className="flex items-center justify-center rounded-full transition-all hover:scale-110"
        style={{
          width:"54px", height:"54px",
          background: open ? "linear-gradient(135deg,#F87171,#ef4444)" : "linear-gradient(135deg,#34D399,#059669)",
          border:"none", color:"#fff", fontSize:"28px",
          cursor:"pointer",
          boxShadow: open ? "0 8px 20px rgba(248,113,113,0.4)" : "0 8px 20px rgba(52,211,153,0.4)",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "all 0.2s",
        }}>
        +
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}