import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

export default function useFirestore(uid) {
  const [investments, setInvestments] = useState([]);
  const [spendings,   setSpendings]   = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);

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

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "spendings"), orderBy("date", "desc"));
    const unsub = onSnapshot(q,
      snap => setSpendings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("Spendings error:", err.message)
    );
    return () => unsub();
  }, [uid]);

  // ✨ NEW: Shared categories listener
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "categories"),
      snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("Categories error:", err.message)
    );
    return () => unsub();
  }, [uid]);

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

  const deleteEntry = useCallback(async (kind, id) => {
    if (!uid) throw new Error("Not logged in");
    await deleteDoc(doc(db, "users", uid, kind, id));
  }, [uid]);

  const totalInvested = investments.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSpent    = spendings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netBalance    = totalInvested - totalSpent;

  return {
    investments, spendings, categories, loading,
    addEntry, deleteEntry,
    totalInvested, totalSpent, netBalance,
  };
}