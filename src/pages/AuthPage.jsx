import { useState } from "react";

export default function AuthPage({ onLogin, onRegister, onGoogle }) {
  const [mode, setMode]         = useState("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const isLogin = mode === "login";

  function switchMode(m) {
    setMode(m); setError("");
    setName(""); setEmail(""); setPassword(""); setConfirm("");
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError("");
    if (!email.trim() || !password.trim()) { setError("Please fill all fields."); return; }
    if (!isLogin && !name.trim())           { setError("Please enter your name."); return; }
    if (!isLogin && password !== confirm)   { setError("Passwords do not match."); return; }
    if (password.length < 6)               { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (isLogin) await onLogin?.(email.trim(), password);
      else         await onRegister?.(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err.message?.replace("Firebase: ", "").replace(/\(.*\)/, "").trim() || "Something went wrong.");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try { await onGoogle?.(); }
    catch (err) { setError(err.message?.replace("Firebase: ", "").replace(/\(.*\)/, "").trim() || "Google sign in failed."); }
    setLoading(false);
  }

  const inp = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
    padding: "14px 16px", color: "#E5E7EB", fontSize: "14px",
    outline: "none", transition: "border-color .2s",
    fontFamily: "inherit", boxSizing: "border-box", display: "block",
  };

  // ── Accent panel (left for login, right for register) ──────
  const Accent = () => (
    <div style={{
      flex: "0 0 50%",           // exactly 50% width
      background: "linear-gradient(160deg, #064E3B 0%, #022C22 60%, #0B0F1A 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 40px", position: "relative", overflow: "hidden",
      minHeight: "100%",         // fill full height of card
    }}>
      {/* Glow blobs */}
      <div style={{ position:"absolute",top:"-80px",right:"-80px",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.25),transparent 70%)",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",bottom:"-60px",left:"-60px",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,rgba(251,191,36,0.12),transparent 70%)",pointerEvents:"none" }}/>

      <div style={{ position:"relative", textAlign:"center", maxWidth:"300px", zIndex:1 }}>
        <div style={{ fontSize:"52px", marginBottom:"20px", lineHeight:1 }}>{isLogin ? "👋" : "🎉"}</div>
        <h3 style={{ color:"#E5E7EB", fontSize:"24px", fontWeight:"700", marginBottom:"12px", lineHeight:1.3 }}>
          {isLogin ? "Hello, Friend!" : "Welcome Back!"}
        </h3>
        <p style={{ color:"rgba(52,211,153,0.8)", fontSize:"14px", lineHeight:"1.7", marginBottom:"32px" }}>
          {isLogin
            ? "Don't have an account yet? Join DhanTrack and start managing your finances smarter."
            : "Already have an account? Sign in to continue tracking your investments and spending."
          }
        </p>
        <button onClick={() => switchMode(isLogin ? "register" : "login")} style={{
          padding:"12px 36px", background:"transparent",
          border:"2px solid #34D399", borderRadius:"50px",
          color:"#34D399", fontWeight:"700", fontSize:"13px",
          cursor:"pointer", letterSpacing:"0.1em",
          transition:"all .2s", fontFamily:"inherit",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background="#34D399";e.currentTarget.style.color="#022C22";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#34D399";}}>
          {isLogin ? "SIGN UP" : "SIGN IN"}
        </button>

        {/* Feature chips */}
        <div style={{ marginTop:"36px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", textAlign:"left" }}>
          {[{label:"Track Investments",icon:"📈"},{label:"Monitor Spending",icon:"💸"},{label:"Monthly Insights",icon:"⚡"},{label:"Net Balance",icon:"⚖️"}].map(f=>(
            <div key={f.label} style={{ background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.18)", borderRadius:"10px", padding:"10px 12px", display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{fontSize:"16px"}}>{f.icon}</span>
              <span style={{color:"rgba(229,231,235,0.85)",fontSize:"11px",fontWeight:"600"}}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Form panel ─────────────────────────────────────────────
  const Form = () => (
    <div style={{
      flex: "0 0 50%",           // exactly 50% width
      background: "linear-gradient(145deg, #1A2333, #0F172A)",
      padding: "48px 44px",
      display: "flex", flexDirection: "column", justifyContent: "center",
      boxSizing: "border-box", overflowY: "auto",
      minHeight: "100%",         // fill full height
    }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"32px" }}>
        <div style={{ width:"34px",height:"34px",borderRadius:"10px",background:"linear-gradient(135deg,#34D399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <span style={{color:"#022C22",fontSize:"14px",fontWeight:"800"}}>D</span>
        </div>
        <span style={{color:"#E5E7EB",fontSize:"18px",fontWeight:"700"}}>
          Dhan<span style={{color:"#34D399"}}>Track</span>
        </span>
      </div>

      <h2 style={{color:"#E5E7EB",fontSize:"28px",fontWeight:"700",marginBottom:"6px"}}>
        {isLogin ? "Sign In" : "Create Account"}
      </h2>
      <p style={{color:"#6B7280",fontSize:"13px",marginBottom:"28px"}}>
        {isLogin ? "Welcome back! Enter your details." : "Start tracking your finances today."}
      </p>

      {error && (
        <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:"10px",padding:"11px 14px",color:"#F87171",fontSize:"13px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"8px"}}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"13px"}}>
        {!isLogin && (
          <input type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
        )}
        <input type="email" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} style={inp}
          onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={inp}
          onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
        {!isLogin && (
          <input type="password" placeholder="Confirm Password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={inp}
            onFocus={e=>e.target.style.borderColor="#34D399"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
        )}

        {isLogin && (
          <div style={{textAlign:"right",marginTop:"-4px"}}>
            <button type="button" style={{color:"#FBBF24",fontSize:"12px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:"500"}}>
              Forgot password?
            </button>
          </div>
        )}

        {/* Sign in / Create account */}
        <button type="submit" disabled={loading} style={{
          padding:"15px", background:loading?"rgba(52,211,153,0.4)":"linear-gradient(135deg,#34D399,#059669)",
          border:"none", borderRadius:"12px", color:"#022C22",
          fontWeight:"800", fontSize:"14px", cursor:loading?"not-allowed":"pointer",
          letterSpacing:"0.08em", transition:"opacity .2s", fontFamily:"inherit",
          marginTop:"2px",
        }}
          onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity="0.88";}}
          onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}>
          {loading ? "Please wait..." : isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>

        {/* Google */}
        <button type="button" onClick={handleGoogle} disabled={loading} style={{
          padding:"14px", background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px",
          color:"#E5E7EB", fontSize:"13px", fontWeight:"600",
          cursor:"pointer", display:"flex", alignItems:"center",
          justifyContent:"center", gap:"10px",
          transition:"border-color .2s, background .2s", fontFamily:"inherit",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.25)";e.currentTarget.style.background="rgba(255,255,255,0.07)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.background="rgba(255,255,255,0.04)";}}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3-11.3-7.4l-6.6 5.1C9.8 39.8 16.4 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.2l6.2 5.2C40.7 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <p style={{color:"#6B7280",fontSize:"13px",marginTop:"24px",textAlign:"center"}}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={()=>switchMode(isLogin?"register":"login")}
          style={{color:"#34D399",fontWeight:"700",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {isLogin ? "Sign Up" : "Sign In"}
        </button>
      </p>
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .auth-root {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #0B0F1A 0%, #111827 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .auth-card {
          width: 100%;
          max-width: 920px;
          display: flex;
          flex-direction: row;       /* side by side always */
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(0,0,0,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          /* KEY FIX: min-height so both panels stretch equally */
          min-height: 580px;
          align-items: stretch;      /* panels same height */
        }
        /* Mobile: stack vertically */
        @media (max-width: 700px) {
          .auth-card {
            flex-direction: column;
            min-height: unset;
          }
          .auth-accent { order: 1; padding: 36px 24px !important; }
          .auth-form   { order: 2; padding: 36px 24px !important; flex: unset !important; }
          .auth-chips  { display: none !important; }
        }
      `}</style>

      <div className="auth-root">
        <div className="auth-card">
          {isLogin ? (
            /* Sign In: Accent LEFT, Form RIGHT */
            <>
              <div className="auth-accent" style={{flex:"0 0 50%",background:"linear-gradient(160deg,#064E3B 0%,#022C22 60%,#0B0F1A 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 40px",position:"relative",overflow:"hidden"}}>
                <Accent />
              </div>
              <div className="auth-form" style={{flex:"0 0 50%",background:"linear-gradient(145deg,#1A2333,#0F172A)",overflowY:"auto"}}>
                <Form />
              </div>
            </>
          ) : (
            /* Sign Up: Form LEFT, Accent RIGHT */
            <>
              <div className="auth-form" style={{flex:"0 0 50%",background:"linear-gradient(145deg,#1A2333,#0F172A)",overflowY:"auto"}}>
                <Form />
              </div>
              <div className="auth-accent" style={{flex:"0 0 50%",background:"linear-gradient(160deg,#064E3B 0%,#022C22 60%,#0B0F1A 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 40px",position:"relative",overflow:"hidden"}}>
                <Accent />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
