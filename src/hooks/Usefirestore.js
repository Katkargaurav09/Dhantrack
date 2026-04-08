import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

export default function useFirestore(uid) {
  const [investments, setInvestments] = useState([]);
  const [spendings,   setSpendings]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  // ── Real-time investments listener ────────────────────────
  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, "users", uid, "investments"),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q,
      snap => {
        setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => {
        console.error("Investments error:", err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  // ── Real-time spendings listener ──────────────────────────
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "spendings"),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q,
      snap => setSpendings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("Spendings error:", err.message)
    );
    return () => unsub();
  }, [uid]);

  // ── addEntry — useCallback so reference is always stable ──
  // kind = "investments" | "spendings"
  const addEntry = useCallback(async (kind, entry) => {
    if (!uid) throw new Error("Not logged in");
    if (!entry.name || !entry.amount || !entry.date) throw new Error("Missing fields");

    await addDoc(collection(db, "users", uid, kind), {
      name:      entry.name,
      amount:    Number(entry.amount),
      date:      entry.date,
      type:      entry.type || "Other",
      note:      entry.note || "",
      createdAt: serverTimestamp(),
    });
  }, [uid]);

  // ── deleteEntry — useCallback so reference is always stable
  const deleteEntry = useCallback(async (kind, id) => {
    if (!uid) throw new Error("Not logged in");
    await deleteDoc(doc(db, "users", uid, kind, id));
  }, [uid]);

  // ── Computed totals ───────────────────────────────────────
  const totalInvested = investments.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSpent    = spendings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
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