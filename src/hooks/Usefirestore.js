import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

export default function useFirestore(uid) {
  const [investments,      setInvestments]      = useState([]);
  const [spendings,        setSpendings]        = useState([]);
  const [categories,       setCategories]       = useState([]);     // Legacy v1.4 (shared)
  const [customCategories, setCustomCategories] = useState([]);     // ✨ NEW v1.5 (with kind)
  const [learnedCategories,setLearnedCategories]= useState({});     // ✨ NEW v1.5 (auto-categorize)
  const [pools,            setPools]            = useState([]);
  const [loading,          setLoading]          = useState(true);

  // ─── Investments listener ───
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, "users", uid, "investments"), orderBy("date", "desc"));
    const unsub = onSnapshot(q,
      snap => {
        setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { console.error("Investments error:", err.message); setLoading(false); }
    );
    return () => unsub();
  }, [uid]);

  // ─── Spendings listener ───
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "spendings"), orderBy("date", "desc"));
    const unsub = onSnapshot(q,
      snap => setSpendings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("Spendings error:", err.message)
    );
    return () => unsub();
  }, [uid]);

  // ─── LEGACY categories listener (v1.4 — shared between Spending + Investments) ───
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "categories"),
      snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("Categories error:", err.message)
    );
    return () => unsub();
  }, [uid]);

  // ✨ NEW v1.5: customCategories listener (with "kind" field)
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "customCategories"),
      snap => setCustomCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("CustomCategories error:", err.message)
    );
    return () => unsub();
  }, [uid]);

  // ✨ NEW v1.5: Learned categories (for smart auto-categorization)
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "learnedCategories"),
      snap => {
        const map = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.merchant && data.category) {
            map[data.merchant.toLowerCase()] = data.category;
          }
        });
        setLearnedCategories(map);
      },
      err => console.error("LearnedCategories error:", err.message)
    );
    return () => unsub();
  }, [uid]);

  // ─── Pools listener (v1.4) ───
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "pools"),
      snap => setPools(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("Pools error:", err.message)
    );
    return () => unsub();
  }, [uid]);

  // ─── Add Entry ───
  const addEntry = useCallback(async (kind, entry) => {
    if (!uid) throw new Error("Not logged in");
    if (!entry.name || !entry.amount || !entry.date) throw new Error("Missing fields");
    await addDoc(collection(db, "users", uid, kind), {
      name:       entry.name,
      amount:     Number(entry.amount),
      date:       entry.date,
      type:       entry.type || "Other",
      note:       entry.note || "",
      customTags: entry.customTags || [],   // ✨ NEW: link to customCategories
      createdAt:  serverTimestamp(),
    });
  }, [uid]);

  // ─── Delete Entry ───
  const deleteEntry = useCallback(async (kind, id) => {
    if (!uid) throw new Error("Not logged in");
    await deleteDoc(doc(db, "users", uid, kind, id));
  }, [uid]);

  // ✨ NEW v1.5: Learn a merchant→category mapping
  const learnCategory = useCallback(async (merchant, category) => {
    if (!uid || !merchant || !category) return;
    const normalized = merchant.toLowerCase().trim();
    if (normalized.length < 3) return;
    // Use deterministic doc ID based on merchant (overwrites if exists)
    const docId = normalized.replace(/[^a-z0-9]/g, "_").slice(0, 100);
    try {
      await setDoc(
        doc(db, "users", uid, "learnedCategories", docId),
        {
          merchant: normalized,
          category,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Learn category error:", e.message);
    }
  }, [uid]);

  // ─── Computed totals ───
  const totalInvested = investments.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSpent    = spendings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netBalance    = totalInvested - totalSpent;

  return {
    investments,
    spendings,
    categories,                // legacy v1.4
    customCategories,          // ✨ NEW v1.5
    learnedCategories,         // ✨ NEW v1.5
    pools,
    loading,
    addEntry,
    deleteEntry,
    learnCategory,             // ✨ NEW v1.5
    totalInvested,
    totalSpent,
    netBalance,
  };
}