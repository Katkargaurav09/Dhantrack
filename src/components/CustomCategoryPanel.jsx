import { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, doc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
function fmtDate(s) { 
  const d = new Date(s); 
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const card = {
  background: "linear-gradient(145deg,#1A2333,#0F172A)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "16px",
};

const inp = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  padding: "13px 16px",
  color: "#E5E7EB",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const SPENDING_ICONS = ["💸","🍔","✈️","🛍️","🎬","📚","💻","💊","⚡","🏠","⛽","🎯","🏖️","🎉","💼","☕","🎁","🚗","🐾","💈","🍕","🎮","🎵","🏋️"];
const INVESTMENT_ICONS = ["📊","₿","💼","🥇","🏦","📉","📈","💰","🏠","🌐","📦","🏛️","🎯","💎","🚀","🌟"];

export default function CustomCategoryPanel({
  open,
  onClose,
  uid,
  kind,              // "spending" or "investment"
  spendings = [],
  investments = [],
  editCategory = null, // if provided, we're editing
}) {
  const isEdit = !!editCategory;

  const [step, setStep] = useState(1); // 1 = form, 2 = preview entries
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(kind === "spending" ? "💸" : "📊");
  const [mode, setMode] = useState("pull"); // "pull" or "fresh"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pick icon list based on kind
  const ICON_LIST = kind === "spending" ? SPENDING_ICONS : INVESTMENT_ICONS;
  const accentColor = kind === "spending" ? "#F87171" : "#34D399";
  const accentRgb = kind === "spending" ? "248,113,113" : "52,211,153";

  // Source entries (based on kind)
  const sourceEntries = kind === "spending" ? spendings : investments;

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    return sourceEntries.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [fromDate, toDate, sourceEntries]);

  // Selected total
  const selectedTotal = useMemo(() => {
    return filteredEntries
      .filter(e => selectedIds.has(e.id))
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredEntries, selectedIds]);

  // ✨ FIX #5: load the SAVED icon when editing (with safe fallback)
  useEffect(() => {
    if (open) {
      setStep(1);
      setError("");
      if (isEdit) {
        setName(editCategory.name || "");
        setIcon(editCategory.icon || (kind === "spending" ? "💸" : "📊")); // load saved icon, not default
        setMode("fresh");
      } else {
        setName("");
        setIcon(kind === "spending" ? "💸" : "📊");
        setMode("pull");
        setFromDate("");
        setToDate("");
        setSelectedIds(new Set());
      }
    }
  }, [open, isEdit, editCategory, kind]);

  // When entries change, select all by default
  useEffect(() => {
    if (filteredEntries.length > 0) {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)));
    }
  }, [filteredEntries.length]);

  function toggleEntry(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)));
    }
  }

  function goToPreview() {
    setError("");
    if (!name.trim()) {
      setError("Please enter a category name");
      return;
    }
    if (mode === "pull") {
      if (!fromDate || !toDate) {
        setError("Please pick a date range");
        return;
      }
      if (new Date(fromDate) > new Date(toDate)) {
        setError("From date must be before To date");
        return;
      }
      setStep(2);
    } else {
      // Fresh mode → save directly
      handleSave();
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        // EDIT: update name + icon (✨ #1, #5)
        await updateDoc(doc(db, "users", uid, "customCategories", editCategory.id), {
          name: name.trim(),
          icon,
        });
      } else {
        // CREATE: Save category first
        const catData = {
          name: name.trim(),
          icon,
          kind,
          mode,
          fromDate: mode === "pull" ? fromDate : null,
          toDate: mode === "pull" ? toDate : null,
          createdAt: serverTimestamp(),
        };
        const catRef = await addDoc(collection(db, "users", uid, "customCategories"), catData);

        // If "pull" mode: tag selected entries with this category
        if (mode === "pull" && selectedIds.size > 0) {
          const batch = writeBatch(db);
          const sourceCollection = kind === "spending" ? "spendings" : "investments";
          
          selectedIds.forEach(entryId => {
            const entryRef = doc(db, "users", uid, sourceCollection, entryId);
            const entry = filteredEntries.find(e => e.id === entryId);
            const currentTags = entry?.customTags || [];
            const newTags = [...new Set([...currentTags, catRef.id])];
            batch.update(entryRef, { customTags: newTags });
          });
          
          await batch.commit();
        }
      }
      onClose();
    } catch (e) {
      console.error(e);
      setError("Failed: " + e.message);
    }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl transition-transform duration-300 translate-y-0"
        style={{
          background: "linear-gradient(145deg,#1A2333,#0F172A)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}>
        
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:"rgba(255,255,255,0.2)"}}/>

        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "0 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <button onClick={step === 2 ? () => setStep(1) : onClose} style={{
            color: "#6B7280", background: "none", border: "none",
            cursor: "pointer", fontSize: "18px", padding: 0,
          }}>←</button>
          <h3 style={{color: "white", fontWeight: 700, fontSize: "16px", flex: 1}}>
            {isEdit ? "✏️ Edit Category" : step === 1 ? (kind === "spending" ? "💸 New Spending Category" : "📊 New Investment Category") : "Pick Entries"}
          </h3>
          <span style={{
            padding: "4px 10px",
            background: `rgba(${accentRgb},0.15)`,
            color: accentColor,
            border: `1px solid rgba(${accentRgb},0.2)`,
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 600,
          }}>
            {kind === "spending" ? "Spend" : "Invest"}
          </span>
        </div>

        {/* ═══ STEP 1: FORM ═══ */}
        {step === 1 && (
          <div className="px-5 pt-4 pb-4" style={{display: "flex", flexDirection: "column", gap: "16px"}}>
            
            {/* ICON PICKER */}
            <div>
              <label style={{
                display: "block", color: "#6B7280", fontSize: "11px",
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: "8px", fontWeight: 600,
              }}>Pick an icon</label>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "8px",
                maxHeight: "120px", overflowY: "auto",
              }}>
                {ICON_LIST.map(ic => (
                  <button key={ic} onClick={() => setIcon(ic)} style={{
                    fontSize: "22px",
                    padding: "5px 9px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border: `1px solid ${icon === ic ? `rgba(${accentRgb},0.5)` : "rgba(255,255,255,0.08)"}`,
                    background: icon === ic ? `rgba(${accentRgb},0.12)` : "rgba(255,255,255,0.03)",
                  }}>{ic}</button>
                ))}
              </div>
            </div>

            {/* NAME */}
            <div>
              <label style={{
                display: "block", color: "#6B7280", fontSize: "11px",
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: "8px", fontWeight: 600,
              }}>Category Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={kind === "spending" ? "e.g. Puri Trip, Domain, Office Setup" : "e.g. Binance, Zerodha, Real Estate"}
                style={inp}
              />
            </div>

            {/* MODE SELECTION (only for create, not edit) */}
            {!isEdit && (
              <div>
                <label style={{
                  display: "block", color: "#6B7280", fontSize: "11px",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  marginBottom: "8px", fontWeight: 600,
                }}>How to add entries?</label>
                <div style={{display: "flex", gap: "8px"}}>
                  <button onClick={() => setMode("pull")} style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: mode === "pull" ? `rgba(${accentRgb},0.15)` : "rgba(255,255,255,0.04)",
                    border: mode === "pull" ? `1px solid rgba(${accentRgb},0.4)` : "1px solid rgba(255,255,255,0.08)",
                    color: mode === "pull" ? accentColor : "#9CA3AF",
                    fontSize: "12px",
                    fontWeight: 600,
                    textAlign: "left",
                  }}>
                    <div style={{fontSize: "16px", marginBottom: "4px"}}>📅</div>
                    Pull Existing
                    <p style={{fontSize: "10px", marginTop: "3px", opacity: 0.7, fontWeight: 400}}>
                      From date range
                    </p>
                  </button>
                  <button onClick={() => setMode("fresh")} style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: mode === "fresh" ? `rgba(${accentRgb},0.15)` : "rgba(255,255,255,0.04)",
                    border: mode === "fresh" ? `1px solid rgba(${accentRgb},0.4)` : "1px solid rgba(255,255,255,0.08)",
                    color: mode === "fresh" ? accentColor : "#9CA3AF",
                    fontSize: "12px",
                    fontWeight: 600,
                    textAlign: "left",
                  }}>
                    <div style={{fontSize: "16px", marginBottom: "4px"}}>✨</div>
                    Start Fresh
                    <p style={{fontSize: "10px", marginTop: "3px", opacity: 0.7, fontWeight: 400}}>
                      Add entries later
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* DATE RANGE (if pull mode) */}
            {!isEdit && mode === "pull" && (
              <div style={{display: "flex", gap: "10px"}}>
                <div style={{flex: 1}}>
                  <label style={{
                    display: "block", color: "#6B7280", fontSize: "11px",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    marginBottom: "8px", fontWeight: 600,
                  }}>From Date</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inp}/>
                </div>
                <div style={{flex: 1}}>
                  <label style={{
                    display: "block", color: "#6B7280", fontSize: "11px",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    marginBottom: "8px", fontWeight: 600,
                  }}>To Date</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inp}/>
                </div>
              </div>
            )}

            {/* HINT */}
            {!isEdit && mode === "pull" && (
              <div style={{
                padding: "10px 12px",
                background: `rgba(${accentRgb},0.05)`,
                border: `1px solid rgba(${accentRgb},0.12)`,
                borderRadius: "10px",
              }}>
                <p style={{color: "#9CA3AF", fontSize: "11px", lineHeight: 1.6}}>
                  💡 Example: For "Puri Trip" pick the 7 days you were there.<br/>
                  For "Binance" pick a wide range like last 1 year.
                </p>
              </div>
            )}

            {/* ✨ Edit hint */}
            {isEdit && (
              <div style={{
                padding: "10px 12px",
                background: `rgba(${accentRgb},0.05)`,
                border: `1px solid rgba(${accentRgb},0.12)`,
                borderRadius: "10px",
              }}>
                <p style={{color: "#9CA3AF", fontSize: "11px", lineHeight: 1.6}}>
                  💡 Editing updates the name and icon. To add entries, open the category and tap "+ Add Entry".
                </p>
              </div>
            )}

            {error && (
              <div style={{padding: "10px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px"}}>
                <p style={{color: "#F87171", fontSize: "12px"}}>{error}</p>
              </div>
            )}

            {/* BUTTONS */}
            <div style={{display: "flex", gap: "10px", marginTop: "8px"}}>
              <button onClick={onClose} style={{
                flex: 1, padding: "13px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px", color: "#6B7280",
                fontSize: "14px", cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <button onClick={goToPreview} disabled={saving} style={{
                flex: 1, padding: "13px",
                background: saving ? `rgba(${accentRgb},0.4)` : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                border: "none", borderRadius: "12px",
                color: kind === "spending" ? "#fff" : "#022C22",
                fontWeight: 700, fontSize: "14px",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}>
                {saving ? "Saving..." : isEdit ? "Save Changes" : (mode === "pull" ? "Next →" : "Create")}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: PREVIEW ENTRIES ═══ */}
        {step === 2 && !isEdit && (
          <div className="px-5 pt-4 pb-4">
            
            {/* Summary */}
            <div style={{
              padding: "12px 14px",
              background: filteredEntries.length > 0 ? `rgba(${accentRgb},0.06)` : "rgba(248,113,113,0.06)",
              border: `1px solid rgba(${accentRgb},0.15)`,
              borderRadius: "12px",
              marginBottom: "14px",
            }}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <div>
                  <p style={{color: "#E5E7EB", fontSize: "13px", fontWeight: 600}}>
                    Found {filteredEntries.length} {kind === "spending" ? "spending" : "investment"} {filteredEntries.length === 1 ? "entry" : "entries"}
                  </p>
                  <p style={{color: "#6B7280", fontSize: "11px", marginTop: "3px", fontFamily: "monospace"}}>
                    {fmtDate(fromDate)} → {fmtDate(toDate)}
                  </p>
                </div>
                <div style={{textAlign: "right"}}>
                  <p style={{color: accentColor, fontSize: "14px", fontWeight: 700, fontFamily: "monospace"}}>
                    {fmt(selectedTotal)}
                  </p>
                  <p style={{color: "#6B7280", fontSize: "10px"}}>
                    {selectedIds.size} of {filteredEntries.length} selected
                  </p>
                </div>
              </div>
            </div>

            {/* No entries found */}
            {filteredEntries.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "32px 20px",
                color: "#6B7280",
              }}>
                <p style={{fontSize: "32px", marginBottom: "8px"}}>🔍</p>
                <p style={{color: "#E5E7EB", fontSize: "13px", fontWeight: 600, marginBottom: "4px"}}>
                  No entries found
                </p>
                <p style={{fontSize: "11px"}}>
                  Try a different date range or switch to "Start Fresh" mode.
                </p>
              </div>
            ) : (
              <>
                {/* Select All toggle */}
                <button onClick={toggleAll} style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  color: "#9CA3AF",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredEntries.length}
                    readOnly
                    style={{width: "14px", height: "14px", accentColor}}
                  />
                  {selectedIds.size === filteredEntries.length ? "Deselect All" : "Select All"}
                </button>

                {/* Entries list */}
                <div style={{maxHeight: "320px", overflowY: "auto", marginBottom: "12px"}}>
                  {filteredEntries.map(entry => {
                    const selected = selectedIds.has(entry.id);
                    return (
                      <button key={entry.id} onClick={() => toggleEntry(entry.id)} style={{
                        width: "100%",
                        padding: "10px 12px",
                        marginBottom: "6px",
                        background: selected ? `rgba(${accentRgb},0.08)` : "rgba(255,255,255,0.02)",
                        border: selected ? `1px solid rgba(${accentRgb},0.25)` : "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        textAlign: "left",
                      }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          readOnly
                          style={{width: "14px", height: "14px", accentColor, flexShrink: 0}}
                        />
                        <div style={{flex: 1, minWidth: 0}}>
                          <p style={{
                            color: "#E5E7EB",
                            fontSize: "13px",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>{entry.name}</p>
                          <p style={{color: "#6B7280", fontSize: "10px", fontFamily: "monospace", marginTop: "2px"}}>
                            {fmtDate(entry.date)} · {entry.type}
                          </p>
                        </div>
                        <p style={{
                          color: accentColor,
                          fontSize: "13px",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          flexShrink: 0,
                        }}>
                          {fmt(entry.amount)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {error && (
              <div style={{padding: "10px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", marginBottom: "10px"}}>
                <p style={{color: "#F87171", fontSize: "12px"}}>{error}</p>
              </div>
            )}

            {/* BUTTONS */}
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: "13px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px", color: "#6B7280",
                fontSize: "14px", cursor: "pointer", fontFamily: "inherit",
              }}>← Back</button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 2, padding: "13px",
                background: saving ? `rgba(${accentRgb},0.4)` : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                border: "none", borderRadius: "12px",
                color: kind === "spending" ? "#fff" : "#022C22",
                fontWeight: 700, fontSize: "14px",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}>
                {saving ? "Creating..." : filteredEntries.length === 0 ? "Create Empty Category" : `Create with ${selectedIds.size} ${selectedIds.size === 1 ? "Entry" : "Entries"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}