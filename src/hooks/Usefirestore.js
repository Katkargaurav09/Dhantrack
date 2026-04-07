import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

// ── useFirestore ───────────────────────────────────────────────
// Usage in any page:
//   const { investments, spendings, addEntry, deleteEntry, loading } = useFirestore(uid);
//
// Data is stored per user:
//   users/{uid}/investments/{docId}
//   users/{uid}/spendings/{docId}

export default function useFirestore(uid) {
  const [investments, setInvestments] = useState([]);
  const [spendings,   setSpendings]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  // ── Real-time listener — Investments ───────────────────────
  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, "users", uid, "investments"),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Investments fetch error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  // ── Real-time listener — Spendings ─────────────────────────
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "spendings"),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setSpendings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Spendings fetch error:", err);
    });

    return () => unsub();
  }, [uid]);

  // ── Add entry ───────────────────────────────────────────────
  // kind = "investments" | "spendings"
  async function addEntry(kind, entry) {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, kind), {
      name:      entry.name,
      amount:    entry.amount,
      date:      entry.date,
      type:      entry.type,
      note:      entry.note || "",
      createdAt: serverTimestamp(),
    });
  }

  // ── Delete entry ────────────────────────────────────────────
  async function deleteEntry(kind, id) {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, kind, id));
  }

  // ── Computed totals ─────────────────────────────────────────
  const totalInvested = investments.reduce((s, e) => s + e.amount, 0);
  const totalSpent    = spendings.reduce((s, e) => s + e.amount, 0);
  const netBalance    = totalInvested - totalSpent;

  return {
    investments,
    spendings,
    loading,
    addEntry,
    deleteEntry,
    totalInvested,
    totalSpent,
    netBalance,
  };
}