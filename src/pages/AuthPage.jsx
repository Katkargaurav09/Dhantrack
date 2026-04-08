import { useState } from "react";

const inp = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
  padding: "14px 16px", color: "#E5E7EB", fontSize: "14px",
  outline: "none", transition: "border-color .2s",
  fontFamily: "inherit", boxSizing: "border-box",
};

function EyeBtn({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} style={{
      position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)",
      background:"none", border:"none", cursor:"pointer", padding:0,
      color: show ? "#34D399" : "#6B7280",
      display:"flex", alignItems:"center",
    }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      )}
    </button>
  );
}

function cleanError(err) {
  const msg = err?.message || "Something went wrong.";
  if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) return "Invalid email or password.";
  if (msg.includes("email-already-in-use")) return "This email is already registered.";
  if (msg.includes("weak-password"))        return "Password is too weak.";
  if (msg.includes("invalid-email"))        return "Please enter a valid email.";
  if (msg.includes("popup-closed"))         return "Google sign-in was cancelled.";
  if (msg.includes("network-request-failed")) return "Network error. Check your connection.";
  return msg.replace("Firebase: ", "").replace(/\(auth\/.*?\)/g, "").trim();
}

export default function AuthPage({ onLogin, onRegister, onGoogle }) {
  const [mode,     setMode]     = useState("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [pass,     setPass]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const isLogin = mode === "login";

  function switchMode(m) {
    setMode(m); setError("");
    setName(""); setEmail(""); setPass(""); setConfirm("");
    setShowPass(false); setShowConf(false);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError("");
    if (!email.trim() || !pass.trim()) { setError("Please fill all fields."); return; }
    if (!isLogin && !name.trim())       { setError("Please enter your name."); return; }
    if (!isLogin && pass !== confirm)   { setError("Passwords do not match."); return; }
    if (pass.length < 6)               { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (isLogin) await onLogin(email.trim(), pass);
      else         await onRegister(name.trim(), email.trim(), pass);
    } catch (err) { setError(cleanError(err)); }
    setLoading(false);
  }

  async function handleGoogle() {
    setError(""); setLoading(true);
    try { await onGoogle(); }
    catch (err) { setError(cleanError(err)); }
    setLoading(false);
  }

  // ── accentJSX — JSX variable NOT a sub-component (fixes focus bug) ──
  const accentJSX = (
    <div style={{
      width:"100%", height:"100%", minHeight:"320px",
      background:"linear-gradient(160deg,#064E3B 0%,#022C22 60%,#0B0F1A 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"48px 40px", position:"relative", overflow:"hidden",
    }}>
      <div style={{position:"absolute",top:"-80px",right:"-80px",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.25),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-60px",left:"-60px",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,rgba(251,191,36,0.12),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",textAlign:"center",maxWidth:"300px",zIndex:1}}>
        <div style={{fontSize:"52px",marginBottom:"20px",lineHeight:1}}>{isLogin?"👋":"🎉"}</div>
        <h3 style={{color:"#E5E7EB",fontSize:"24px",fontWeight:"700",marginBottom:"12px",lineHeight:1.3}}>
          {isLogin?"Hello, Friend!":"Welcome Back!"}
        </h3>
        <p style={{color:"rgba(52,211,153,0.8)",fontSize:"14px",lineHeight:"1.7",marginBottom:"32px"}}>
          {isLogin
            ?"Don't have an account yet? Join DhanTrack and start managing your finances smarter."
            :"Already have an account? Sign in to continue tracking your investments."}
        </p>
        <button onClick={()=>switchMode(isLogin?"register":"login")} style={{
          padding:"12px 36px",background:"transparent",border:"2px solid #34D399",borderRadius:"50px",
          color:"#34D399",fontWeight:"700",fontSize:"13px",cursor:"pointer",
          letterSpacing:"0.1em",transition:"all .2s",fontFamily:"inherit",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background="#34D399";e.currentTarget.style.color="#022C22";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#34D399";}}>
          {isLogin?"SIGN UP":"SIGN IN"}
        </button>
        <div style={{marginTop:"32px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",textAlign:"left"}}>
          {[{l:"Track Investments",i:"📈"},{l:"Monitor Spending",i:"💸"},{l:"Monthly Insights",i:"⚡"},{l:"Net Balance",i:"⚖️"}].map(f=>(
            <div key={f.l} style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.18)",borderRadius:"10px",padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontSize:"16px"}}>{f.i}</span>
              <span style={{color:"rgba(229,231,235,0.85)",fontSize:"11px",fontWeight:"600"}}>{f.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── formJSX — JSX variable NOT a sub-component (fixes focus bug) ──
  const formJSX = (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(145deg,#1A2333,#0F172A)",
      padding:"48px 44px", display:"flex", flexDirection:"column",
      justifyContent:"center", boxSizing:"border-box", overflowY:"auto",
    }}>
      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"32px"}}>
        <div style={{width:"34px",height:"34px",borderRadius:"10px",background:"linear-gradient(135deg,#34D399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{color:"#022C22",fontSize:"15px",fontWeight:"900"}}>D</span>
        </div>
        <span style={{color:"#E5E7EB",fontSize:"18px",fontWeight:"700"}}>
          Dhan<span style={{color:"#34D399"}}>Track</span>
        </span>
      </div>

      <h2 style={{color:"#E5E7EB",fontSize:"28px",fontWeight:"700",marginBottom:"6px"}}>
        {isLogin?"Sign In":"Create Account"}
      </h2>
      <p style={{color:"#6B7280",fontSize:"13px",marginBottom:"28px"}}>
        {isLogin?"Welcome back! Enter your details.":"Start tracking your finances today."}
      </p>

      {error&&(
        <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:"10px",padding:"11px 14px",color:"#F87171",fontSize:"13px",marginBottom:"18px"}}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"14px"}}>
        {!isLogin&&(
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Full Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)}
              placeholder="Your full name" autoComplete="name" style={inp}
              onFocus={e=>e.target.style.borderColor="#34D399"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
        )}

        <div>
          <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Email Address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="you@email.com" autoComplete="email" style={inp}
            onFocus={e=>e.target.style.borderColor="#34D399"}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
        </div>

        <div>
          <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Password</label>
          <div style={{position:"relative"}}>
            <input type={showPass?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete={isLogin?"current-password":"new-password"}
              style={{...inp,paddingRight:"46px"}}
              onFocus={e=>e.target.style.borderColor="#34D399"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            <EyeBtn show={showPass} onToggle={()=>setShowPass(s=>!s)}/>
          </div>
        </div>

        {!isLogin&&(
          <div>
            <label style={{display:"block",color:"#6B7280",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Confirm Password</label>
            <div style={{position:"relative"}}>
              <input type={showConf?"text":"password"} value={confirm} onChange={e=>setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                style={{...inp,paddingRight:"46px"}}
                onFocus={e=>e.target.style.borderColor="#34D399"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              <EyeBtn show={showConf} onToggle={()=>setShowConf(s=>!s)}/>
            </div>
          </div>
        )}

        {isLogin&&(
          <div style={{textAlign:"right",marginTop:"-6px"}}>
            <button type="button" style={{color:"#FBBF24",fontSize:"12px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:"500"}}>
              Forgot password?
            </button>
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          marginTop:"2px",padding:"15px",
          background:loading?"rgba(52,211,153,0.4)":"linear-gradient(135deg,#34D399,#059669)",
          border:"none",borderRadius:"12px",color:"#022C22",
          fontWeight:"800",fontSize:"14px",cursor:loading?"not-allowed":"pointer",
          letterSpacing:"0.08em",transition:"opacity .2s",fontFamily:"inherit",
        }}
          onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity="0.88";}}
          onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}>
          {loading?"Please wait...":isLogin?"SIGN IN":"CREATE ACCOUNT"}
        </button>

        <button type="button" onClick={handleGoogle} disabled={loading} style={{
          padding:"14px",background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",
          color:"#E5E7EB",fontSize:"13px",fontWeight:"600",
          cursor:loading?"not-allowed":"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",
          transition:"all .2s",fontFamily:"inherit",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.3)";e.currentTarget.style.background="rgba(255,255,255,0.07)";}}
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
        {isLogin?"Don't have an account? ":"Already have an account? "}
        <button onClick={()=>switchMode(isLogin?"register":"login")}
          style={{color:"#34D399",fontWeight:"700",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {isLogin?"Sign Up":"Sign In"}
        </button>
      </p>
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .auth-root {
          min-height: 100vh; width: 100%;
          background: linear-gradient(135deg, #0B0F1A 0%, #111827 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .auth-card {
          width: 100%; max-width: 920px;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 30px 70px rgba(0,0,0,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          /* Desktop: side by side */
          display: flex; flex-direction: row;
          /* KEY: min-height + stretch so both panels fill equally */
          min-height: 580px; align-items: stretch;
        }
        .auth-left  { flex: 0 0 50%; display: flex; flex-direction: column; }
        .auth-right { flex: 0 0 50%; display: flex; flex-direction: column; }

        /* Mobile: stack vertically, green panel full width */
        @media (max-width: 700px) {
          .auth-card {
            flex-direction: column;
            min-height: unset;
          }
          .auth-left, .auth-right {
            flex: unset !important;
            width: 100% !important;
          }
          /* On mobile: accent always on top */
          .accent-mobile-top  { order: -1; }
          .accent-mobile-bottom { order: 1; }
          .form-mobile { order: 0; }
        }
      `}</style>

      <div className="auth-root">
        <div className="auth-card">
          {isLogin ? (
            /* Sign In: accent LEFT, form RIGHT */
            <>
              <div className={`auth-left accent-mobile-top`}>{accentJSX}</div>
              <div className={`auth-right form-mobile`}>{formJSX}</div>
            </>
          ) : (
            /* Sign Up: form LEFT, accent RIGHT */
            <>
              <div className={`auth-left form-mobile`}>{formJSX}</div>
              <div className={`auth-right accent-mobile-bottom`}>{accentJSX}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
