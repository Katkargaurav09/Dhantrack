import { useState, useEffect, useRef, useMemo } from "react";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function fmtDate(s) { 
  const d = new Date(s); 
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const RECENT_SEARCHES_KEY = "dhantrack_recent_searches";
const MAX_RECENT = 6;

// Get recent searches from localStorage
function getRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

// Save a search to recent
function saveRecentSearch(query) {
  if (!query.trim() || query.length < 2) return;
  try {
    const recent = getRecentSearches().filter(q => q !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}

function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch {}
}

// Highlight matching text
function HighlightText({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = String(text).split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? 
          <mark key={i} style={{background:"rgba(251,191,36,0.3)", color:"#FBBF24", padding:"0 2px", borderRadius:"3px"}}>{part}</mark> :
          <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function SearchOverlay({ firestoreData, user, onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(getRecentSearches());
  const [autopayList, setAutopayList] = useState([]);
  const inputRef = useRef(null);

  // ✨ NEW: Pull customCategories from firestoreData
  const { investments = [], spendings = [], customCategories = [] } = firestoreData || {};

  // Auto-focus input when opened
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ESC key to close
  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Load autopay data separately (not in firestoreData hook)
  useEffect(() => {
    if (!user?.uid) return;
    import("firebase/firestore").then(({ collection, onSnapshot }) => {
      import("../firebase/config").then(({ db }) => {
        const unsub = onSnapshot(
          collection(db, "users", user.uid, "autopay"),
          snap => setAutopayList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => unsub();
      });
    });
  }, [user?.uid]);

  // Save search on blur if query is meaningful
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        saveRecentSearch(query.trim());
        setRecentSearches(getRecentSearches());
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [query]);

  // Search logic — searches across all data
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { spendings: [], investments: [], autopay: [], customCats: [], total: 0, totalAmount: 0 };

    const matchEntry = (entry) => {
      const fields = [
        String(entry.name || ""),
        String(entry.note || ""),
        String(entry.notes || ""),
        String(entry.type || ""),
        String(entry.category || ""),    // ✨ NEW: for autopay category
        String(entry.amount || ""),
        fmtDate(entry.date || entry.nextRenewal || "").toLowerCase(),
      ].join(" ").toLowerCase();
      return fields.includes(q);
    };

    // ✨ NEW: Match custom categories
    const matchCustomCat = (cat) => {
      const fields = [
        String(cat.name || ""),
        String(cat.kind || ""),
      ].join(" ").toLowerCase();
      return fields.includes(q);
    };

    const matchedSpendings   = spendings.filter(matchEntry);
    const matchedInvestments = investments.filter(matchEntry);
    const matchedAutopay     = autopayList.filter(matchEntry);
    const matchedCustomCats  = customCategories.filter(matchCustomCat);  // ✨ NEW

    // ✨ NEW: Also include entries that are tagged with matching custom categories
    const customCatIds = matchedCustomCats.map(c => c.id);
    const customCatTaggedSpendings = spendings.filter(s => 
      Array.isArray(s.customTags) && s.customTags.some(t => customCatIds.includes(t)) && !matchedSpendings.find(m => m.id === s.id)
    );
    const customCatTaggedInvestments = investments.filter(i => 
      Array.isArray(i.customTags) && i.customTags.some(t => customCatIds.includes(t)) && !matchedInvestments.find(m => m.id === i.id)
    );

    const allSpendings = [...matchedSpendings, ...customCatTaggedSpendings];
    const allInvestments = [...matchedInvestments, ...customCatTaggedInvestments];

    const totalAmount = 
      allSpendings.reduce((s, e) => s + (Number(e.amount) || 0), 0) +
      allInvestments.reduce((s, e) => s + (Number(e.amount) || 0), 0) +
      matchedAutopay.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return {
      spendings:   allSpendings,
      investments: allInvestments,
      autopay:     matchedAutopay,
      customCats:  matchedCustomCats,  // ✨ NEW
      total:       allSpendings.length + allInvestments.length + matchedAutopay.length + matchedCustomCats.length,
      totalAmount,
    };
  }, [query, spendings, investments, autopayList, customCategories]);

  function handleRecentClick(search) {
    setQuery(search);
    inputRef.current?.focus();
  }

  function handleResultClick(targetPage) {
    saveRecentSearch(query.trim());
    onNavigate(targetPage);
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecentSearches([]);
  }

  const ResultCard = ({ entry, kind, color, icon }) => (
    <button
      onClick={() => handleResultClick(kind === "autopay" ? "autopay" : kind)}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        marginBottom: "8px",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "all .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      <div style={{
        width: "36px", height: "36px", borderRadius: "10px",
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: "16px",
      }}>{icon || "💡"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#E5E7EB", fontSize: "14px", fontWeight: 600, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <HighlightText text={entry.name} query={query}/>
        </p>
        <p style={{ color: "#6B7280", fontSize: "11px", fontFamily: "monospace" }}>
          {entry.type || (kind === "autopay" ? "Subscription" : "")} · {fmtDate(entry.date || entry.nextRenewal)}
          {entry.note && <span> · <HighlightText text={entry.note.slice(0, 30)} query={query}/></span>}
        </p>
      </div>
      <p style={{ color, fontSize: "14px", fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
        {kind === "investments" ? "+" : kind === "spending" ? "-" : ""}{fmt(entry.amount)}
      </p>
    </button>
  );

  // ✨ NEW: Custom Category result card
  const CustomCatCard = ({ cat }) => {
    const kindColor = cat.kind === "investment" ? "#34D399" : "#F87171";
    const targetPage = cat.kind === "investment" ? "investments" : "spending";
    
    // Count entries linked to this category
    const linkedEntries = cat.kind === "investment"
      ? investments.filter(i => Array.isArray(i.customTags) && i.customTags.includes(cat.id))
      : spendings.filter(s => Array.isArray(s.customTags) && s.customTags.includes(cat.id));
    const totalAmt = linkedEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
      <button
        onClick={() => handleResultClick(targetPage)}
        style={{
          width: "100%",
          background: `${kindColor}08`,
          border: `1px solid ${kindColor}25`,
          borderRadius: "12px",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          marginBottom: "8px",
          textAlign: "left",
          fontFamily: "inherit",
          transition: "all .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${kindColor}15`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${kindColor}08`; }}
      >
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: `${kindColor}15`,
          border: `1px solid ${kindColor}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: "16px",
        }}>{cat.icon || "🎯"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <p style={{ color: "#E5E7EB", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <HighlightText text={cat.name} query={query}/>
            </p>
            <span style={{
              padding:"1px 6px",
              background: `${kindColor}12`,
              border: `1px solid ${kindColor}25`,
              borderRadius:"6px",
              color: kindColor,
              fontSize:"9px",
              fontWeight:"700",
            }}>
              {cat.kind === "investment" ? "📈 INV" : "💸 SPD"}
            </span>
          </div>
          <p style={{ color: "#6B7280", fontSize: "11px", fontFamily: "monospace", marginTop: "2px" }}>
            Custom Category · {linkedEntries.length} {linkedEntries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <p style={{ color: kindColor, fontSize: "14px", fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
          {fmt(totalAmt)}
        </p>
      </button>
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "linear-gradient(180deg, rgba(11,15,26,0.98), rgba(11,15,26,0.95))",
      backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column",
      animation: "fadeIn .2s ease",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* HEADER — Search Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(15,23,42,0.6)",
        animation: "slideDown .25s ease",
      }}>
        <button onClick={onClose} style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#9CA3AF", flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        <div style={{ position: "relative", flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, note, amount, category..."
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "11px 40px 11px 40px",
              color: "#E5E7EB", fontSize: "14px",
              outline: "none", fontFamily: "inherit",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{
              position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
              width: "24px", height: "24px", borderRadius: "50%",
              background: "rgba(255,255,255,0.08)", border: "none",
              color: "#9CA3AF", cursor: "pointer", fontSize: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        
        {/* EMPTY STATE — no query yet */}
        {!query && (
          <div style={{ animation: "slideDown .3s ease" }}>
            {recentSearches.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <p style={{ color: "#6B7280", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Recent Searches
                  </p>
                  <button onClick={handleClearRecent} style={{
                    color: "#F87171", background: "none", border: "none",
                    fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  }}>Clear</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                  {recentSearches.map((search, i) => (
                    <button key={i} onClick={() => handleRecentClick(search)} style={{
                      padding: "7px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "20px",
                      color: "#9CA3AF", fontSize: "12px",
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}>
                      🕐 {search}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div style={{
              background: "rgba(52,211,153,0.04)",
              border: "1px solid rgba(52,211,153,0.1)",
              borderRadius: "14px", padding: "20px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔍</div>
              <p style={{ color: "#E5E7EB", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                Search across all your data
              </p>
              <p style={{ color: "#6B7280", fontSize: "12px", lineHeight: 1.5 }}>
                Find entries by name (Swiggy), note (Goa trip), amount (5000), category (Food), or custom category (Puri Trip)
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                <span style={{ padding: "4px 10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "12px", color: "#F87171", fontSize: "11px" }}>💸 Spending</span>
                <span style={{ padding: "4px 10px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "12px", color: "#34D399", fontSize: "11px" }}>📈 Investments</span>
                <span style={{ padding: "4px 10px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "12px", color: "#8B5CF6", fontSize: "11px" }}>🔔 Autopay</span>
                <span style={{ padding: "4px 10px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "12px", color: "#FBBF24", fontSize: "11px" }}>🎯 Custom</span>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {query && (
          <div style={{ animation: "slideDown .2s ease" }}>
            {/* Summary */}
            <div style={{
              padding: "12px 14px", marginBottom: "16px",
              background: results.total > 0 ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.04)",
              border: `1px solid ${results.total > 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.1)"}`,
              borderRadius: "12px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <p style={{ color: "#E5E7EB", fontSize: "13px", fontWeight: 600 }}>
                  {results.total === 0 ? "No results found" : `${results.total} result${results.total !== 1 ? "s" : ""} found`}
                </p>
                {results.total > 0 && (
                  <p style={{ color: "#6B7280", fontSize: "11px", marginTop: "2px" }}>
                    Total: <span style={{ color: "#FBBF24", fontWeight: 700, fontFamily: "monospace" }}>{fmt(results.totalAmount)}</span>
                  </p>
                )}
              </div>
              {results.total === 0 && <span style={{ fontSize: "20px" }}>😕</span>}
            </div>

            {/* Empty results */}
            {results.total === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#4B5563" }}>
                <p style={{ fontSize: "14px", marginBottom: "8px" }}>Nothing matches "<span style={{ color: "#9CA3AF" }}>{query}</span>"</p>
                <p style={{ fontSize: "12px" }}>Try a different keyword or check your spelling</p>
              </div>
            )}

            {/* ✨ NEW: Custom Categories (show FIRST if any) */}
            {results.customCats.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "14px" }}>🎯</span>
                  <p style={{ color: "#FBBF24", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Custom Categories ({results.customCats.length})
                  </p>
                </div>
                {results.customCats.map(cat => (
                  <CustomCatCard key={`cc-${cat.id}`} cat={cat}/>
                ))}
              </div>
            )}

            {/* Spendings */}
            {results.spendings.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "14px" }}>💸</span>
                  <p style={{ color: "#F87171", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Spending ({results.spendings.length})
                  </p>
                </div>
                {results.spendings.slice(0, 10).map(e => (
                  <ResultCard key={`s-${e.id}`} entry={e} kind="spending" color="#F87171" icon="💸"/>
                ))}
                {results.spendings.length > 10 && (
                  <p style={{ color: "#6B7280", fontSize: "11px", textAlign: "center", marginTop: "4px" }}>
                    + {results.spendings.length - 10} more · Tap to view all
                  </p>
                )}
              </div>
            )}

            {/* Investments */}
            {results.investments.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "14px" }}>📈</span>
                  <p style={{ color: "#34D399", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Investments ({results.investments.length})
                  </p>
                </div>
                {results.investments.slice(0, 10).map(e => (
                  <ResultCard key={`i-${e.id}`} entry={e} kind="investments" color="#34D399" icon="📈"/>
                ))}
                {results.investments.length > 10 && (
                  <p style={{ color: "#6B7280", fontSize: "11px", textAlign: "center", marginTop: "4px" }}>
                    + {results.investments.length - 10} more
                  </p>
                )}
              </div>
            )}

            {/* Autopay */}
            {results.autopay.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "14px" }}>🔔</span>
                  <p style={{ color: "#8B5CF6", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Autopay ({results.autopay.length})
                  </p>
                </div>
                {results.autopay.slice(0, 10).map(e => (
                  <ResultCard key={`a-${e.id}`} entry={e} kind="autopay" color="#8B5CF6" icon={e.icon || "🔔"}/>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}