import { useState, useEffect, useMemo } from "react";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function fmtDate(s) { 
  const d = new Date(s); 
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function mkey(d) { const dt = new Date(d); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"); }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const card = { background:"linear-gradient(145deg,#1A2333,#0F172A)", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 30px rgba(0,0,0,0.4)", borderRadius:"16px" };

export default function CategoryDetail({ 
  categoryName, 
  categoryIcon, 
  entries,        // array of entries for this category
  kind,           // "spending" or "investments"
  onBack,
  onEdit,
  onDelete,
}) {
  const [vis,        setVis]        = useState(false);
  const [query,      setQuery]      = useState("");
  const [activeYear, setActiveYear] = useState(null);

  useEffect(() => { setTimeout(() => setVis(true), 40); }, []);

  // Determine theme color based on kind
  const color = kind === "investments" ? "#34D399" : "#F87171";
  const colorRgb = kind === "investments" ? "52,211,153" : "248,113,113";

  // Filter entries by search query
  const filteredEntries = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(e => {
      const fields = [
        String(e.name || ""),
        String(e.note || ""),
        String(e.amount || ""),
        fmtDate(e.date).toLowerCase(),
      ].join(" ").toLowerCase();
      return fields.includes(q);
    });
  }, [query, entries]);

  // Compute stats
  const stats = useMemo(() => {
    const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const count = entries.length;
    
    // Group by year
    const byYear = {};
    entries.forEach(e => {
      const year = new Date(e.date).getFullYear();
      if (!byYear[year]) byYear[year] = { total: 0, count: 0, entries: [] };
      byYear[year].total += Number(e.amount) || 0;
      byYear[year].count += 1;
      byYear[year].entries.push(e);
    });

    // Group by month for active year (default = current year)
    const currentYear = activeYear || new Date().getFullYear();
    const byMonth = {};
    entries.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() !== currentYear) return;
      const m = d.getMonth();
      if (!byMonth[m]) byMonth[m] = { total: 0, count: 0 };
      byMonth[m].total += Number(e.amount) || 0;
      byMonth[m].count += 1;
    });

    // Find first and last entry dates
    let firstDate = null, lastDate = null;
    entries.forEach(e => {
      const d = new Date(e.date);
      if (!firstDate || d < firstDate) firstDate = d;
      if (!lastDate || d > lastDate) lastDate = d;
    });

    // Year list sorted desc
    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

    return { total, count, byYear, byMonth, firstDate, lastDate, years, currentYear };
  }, [entries, activeYear]);

  // Set default active year to current year (or latest year with entries)
  useEffect(() => {
    if (!activeYear && stats.years.length > 0) {
      const currentYear = new Date().getFullYear();
      setActiveYear(stats.years.includes(currentYear) ? currentYear : stats.years[0]);
    }
  }, [stats.years, activeYear]);

  // Group filtered entries by date for display
  const groupedByDate = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [filteredEntries]);

  // Max value for bar chart scaling
  const maxYearTotal = Math.max(...Object.values(stats.byYear).map(y => y.total), 1);
  const maxMonthTotal = Math.max(...Object.values(stats.byMonth).map(m => m.total), 1);

  function Pencil() {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    );
  }

  return (
    <div style={{ opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(10px)", transition: "all .35s ease" }}>

      {/* Back button */}
      <button onClick={onBack} className="text-sm font-medium block mb-4"
        style={{ color: "#6B7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        ← Back to {kind === "investments" ? "Investments" : "Spending"}
      </button>

      {/* HEADER CARD */}
      <div className="p-5 mb-4 relative overflow-hidden" style={{ ...card }}>
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: `radial-gradient(circle, rgba(${colorRgb},0.12), transparent 70%)`, pointerEvents: "none" }}/>
        
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `rgba(${colorRgb},0.12)`, border: `1px solid rgba(${colorRgb},0.25)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>
            {categoryIcon || "💡"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#E5E7EB", fontSize: "18px", fontWeight: 700 }}>{categoryName}</p>
            <p style={{ color: "#6B7280", fontSize: "11px", fontFamily: "monospace", marginTop: "2px" }}>
              {kind === "investments" ? "Investment Type" : "Spending Category"} · All-time view
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "120px", padding: "12px 14px", background: `rgba(${colorRgb},0.08)`, border: `1px solid rgba(${colorRgb},0.15)`, borderRadius: "12px" }}>
            <p style={{ color: "#6B7280", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Total</p>
            <p style={{ color, fontSize: "20px", fontWeight: 700, fontFamily: "monospace" }}>{fmt(stats.total)}</p>
          </div>
          <div style={{ flex: 1, minWidth: "120px", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" }}>
            <p style={{ color: "#6B7280", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Entries</p>
            <p style={{ color: "#E5E7EB", fontSize: "20px", fontWeight: 700, fontFamily: "monospace" }}>{stats.count}</p>
          </div>
        </div>

        {stats.firstDate && stats.lastDate && (
          <p style={{ color: "#4B5563", fontSize: "11px", marginTop: "12px", fontFamily: "monospace" }}>
            📅 {fmtDate(stats.firstDate.toISOString())} → {fmtDate(stats.lastDate.toISOString())}
          </p>
        )}
      </div>

      {/* SEARCH within category */}
      <div style={{ ...card, padding: "10px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search within ${categoryName}...`}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#E5E7EB", fontSize: "13px", fontFamily: "inherit",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ color: "#6B7280", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "10px", cursor: "pointer" }}>✕</button>
        )}
      </div>

      {/* BY YEAR */}
      {stats.years.length > 0 && !query && (
        <div style={{ ...card, padding: "16px", marginBottom: "16px" }}>
          <p style={{ color: "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            📊 By Year
          </p>
          <div className="space-y-2">
            {stats.years.map(year => {
              const yearData = stats.byYear[year];
              const pct = Math.round((yearData.total / maxYearTotal) * 100);
              const isActive = year === stats.currentYear;
              return (
                <button key={year} onClick={() => setActiveYear(year)} style={{
                  width: "100%", display: "block", textAlign: "left",
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "8px", borderRadius: "8px",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ color: isActive ? color : "#9CA3AF", fontSize: "13px", fontWeight: isActive ? 700 : 500, fontFamily: "monospace" }}>
                      {year} {isActive && "•"}
                    </span>
                    <span style={{ color, fontSize: "13px", fontWeight: 700, fontFamily: "monospace" }}>
                      {fmt(yearData.total)}
                      <span style={{ color: "#6B7280", fontSize: "10px", marginLeft: "6px" }}>· {yearData.count} entries</span>
                    </span>
                  </div>
                  <div style={{ height: "5px", background: "rgba(255,255,255,0.04)", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "99px", opacity: isActive ? 1 : 0.5, transition: "all .3s ease" }}/>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BY MONTH (for active year) */}
      {Object.keys(stats.byMonth).length > 0 && !query && (
        <div style={{ ...card, padding: "16px", marginBottom: "16px" }}>
          <p style={{ color: "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            📅 Monthly Breakdown ({stats.currentYear})
          </p>
          <div className="space-y-2">
            {MONTHS.map((monthName, i) => {
              const monthData = stats.byMonth[i];
              if (!monthData) return null;
              const pct = Math.round((monthData.total / maxMonthTotal) * 100);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#9CA3AF", fontSize: "11px", fontWeight: 600, fontFamily: "monospace", width: "32px", flexShrink: 0 }}>{monthName}</span>
                  <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.04)", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "99px" }}/>
                  </div>
                  <span style={{ color, fontSize: "11px", fontWeight: 700, fontFamily: "monospace", minWidth: "64px", textAlign: "right" }}>
                    {fmt(monthData.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ENTRIES LIST */}
      <div style={{ ...card, overflow: "hidden", marginBottom: "16px" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ color: "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            📋 {query ? `${filteredEntries.length} Result${filteredEntries.length !== 1 ? "s" : ""}` : `All Entries (${entries.length})`}
          </p>
        </div>

        {groupedByDate.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#4B5563" }}>
            <p style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</p>
            <p style={{ fontSize: "13px" }}>{query ? `No entries match "${query}"` : "No entries yet"}</p>
          </div>
        )}

        {groupedByDate.map(([date, dayEntries]) => {
          const dayTotal = dayEntries.reduce((s, e) => s + Number(e.amount), 0);
          return (
            <div key={date}>
              <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
                <p style={{ color: "#9CA3AF", fontSize: "11px", fontWeight: 600, fontFamily: "monospace" }}>{fmtDate(date)}</p>
                <p style={{ color: "#E5E7EB", fontSize: "11px", fontWeight: 700, fontFamily: "monospace" }}>{fmt(dayTotal)}</p>
              </div>
              {dayEntries.map((entry, ei) => (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: ei < dayEntries.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                    <p style={{ color: "#E5E7EB", fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</p>
                    {entry.note && <p style={{ color: "#6B7280", fontSize: "11px", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.note}</p>}
                  </div>
                  <p style={{ color, fontSize: "13px", fontWeight: 700, fontFamily: "monospace", flexShrink: 0, marginRight: "8px" }}>
                    {kind === "investments" ? "+" : "-"}{fmt(entry.amount)}
                  </p>
                  {onEdit && (
                    <button onClick={() => onEdit(entry)} title="Edit"
                      style={{ color: "#8B5CF6", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "8px", padding: "6px", cursor: "pointer", marginRight: "4px", display: "flex", alignItems: "center" }}>
                      <Pencil/>
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(kind === "investments" ? "investments" : "spendings", entry.id)} title="Delete"
                      style={{ color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", fontSize: "12px" }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}