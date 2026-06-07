import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
  setDoc, getDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

// ✨ v1.9: Crypto coins we support for live prices (CoinGecko IDs)
export const CRYPTO_COINS = [
  { id: "bitcoin",      symbol: "BTC",  name: "Bitcoin" },
  { id: "ethereum",     symbol: "ETH",  name: "Ethereum" },
  { id: "solana",       symbol: "SOL",  name: "Solana" },
  { id: "ronin",        symbol: "RON",  name: "Ronin" },
  { id: "binancecoin",  symbol: "BNB",  name: "BNB" },
  { id: "cardano",      symbol: "ADA",  name: "Cardano" },
  { id: "dogecoin",     symbol: "DOGE", name: "Dogecoin" },
  { id: "matic-network",symbol: "POL",  name: "Polygon" },
  { id: "polkadot",     symbol: "DOT",  name: "Polkadot" },
  { id: "avalanche-2",  symbol: "AVAX", name: "Avalanche" },
  { id: "chainlink",    symbol: "LINK", name: "Chainlink" },
  { id: "tron",         symbol: "TRX",  name: "Tron" },
  { id: "ripple",       symbol: "XRP",  name: "Ripple" },
  { id: "litecoin",     symbol: "LTC",  name: "Litecoin" },
  { id: "shiba-inu",    symbol: "SHIB", name: "Shiba Inu" },
];

const PRICE_CACHE_HOURS = 6; // refetch only if cache older than this

export default function useFirestore(uid) {
  const [investments,      setInvestments]      = useState([]);
  const [spendings,        setSpendings]        = useState([]);
  const [incomes,          setIncomes]          = useState([]);     // ✨ NEW v1.6 income
  const [categories,       setCategories]       = useState([]);     // Legacy v1.4 (shared)
  const [customCategories, setCustomCategories] = useState([]);     // ✨ NEW v1.5 (with kind)
  const [learnedCategories,setLearnedCategories]= useState({});     // ✨ NEW v1.5 (auto-categorize)
  const [scoreHistory,     setScoreHistory]     = useState([]);     // ✨ NEW v1.7 monthly score snapshots
  const [pools,            setPools]            = useState([]);
  const [cryptoPrices,     setCryptoPrices]     = useState({});     // ✨ NEW v1.9 { coinId: priceINR }
  const [pricesUpdatedAt,  setPricesUpdatedAt]  = useState(null);   // ✨ NEW v1.9
  const [pricesLoading,    setPricesLoading]    = useState(false);  // ✨ NEW v1.9
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

  // ✨ NEW v1.6: Incomes listener ───
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "incomes"), orderBy("date", "desc"));
    const unsub = onSnapshot(q,
      snap => setIncomes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("Incomes error:", err.message)
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

  // ✨ NEW v1.7: Score history listener (one snapshot per completed month)
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "scoreHistory"),
      snap => setScoreHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error("ScoreHistory error:", err.message)
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

  // ✨ NEW v1.9: Fetch fresh prices from CoinGecko and save to shared cache
  const fetchAndCachePrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const ids = CRYPTO_COINS.map(c => c.id).join(",");
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=inr`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("CoinGecko " + res.status);
      const data = await res.json();
      // data looks like { bitcoin: { inr: 5300000 }, ... } -> flatten to { bitcoin: 5300000 }
      const flat = {};
      Object.keys(data).forEach(coinId => {
        if (data[coinId] && typeof data[coinId].inr === "number") flat[coinId] = data[coinId].inr;
      });
      const nowIso = new Date().toISOString();
      setCryptoPrices(flat);
      setPricesUpdatedAt(nowIso);
      // Save to shared cache so other users/devices reuse it (keeps API calls low)
      try {
        await setDoc(doc(db, "appData", "cryptoPrices"), { prices: flat, updatedAt: nowIso }, { merge: true });
      } catch (e) { console.error("Price cache save error:", e.message); }
      return flat;
    } catch (e) {
      console.error("Fetch prices error:", e.message);
      return null;
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // ✨ NEW v1.9: On load, read shared cache; only refetch if stale
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "appData", "cryptoPrices"));
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          if (d.prices) setCryptoPrices(d.prices);
          if (d.updatedAt) setPricesUpdatedAt(d.updatedAt);
          const ageMs = d.updatedAt ? (Date.now() - new Date(d.updatedAt).getTime()) : Infinity;
          if (ageMs > PRICE_CACHE_HOURS * 3600 * 1000) {
            fetchAndCachePrices(); // stale -> refresh in background
          }
        } else {
          fetchAndCachePrices(); // no cache yet -> first fetch
        }
      } catch (e) {
        console.error("Price cache read error:", e.message);
        fetchAndCachePrices();
      }
    })();
    return () => { cancelled = true; };
  }, [uid, fetchAndCachePrices]);

  // ─── Add Entry ───
  const addEntry = useCallback(async (kind, entry) => {
    if (!uid) throw new Error("Not logged in");
    if (!entry.name || !entry.amount || !entry.date) throw new Error("Missing fields");
    const payload = {
      name:       entry.name,
      amount:     Number(entry.amount),
      date:       entry.date,
      type:       entry.type || "Other",
      note:       entry.note || "",
      customTags: entry.customTags || [],   // ✨ link to customCategories
      createdAt:  serverTimestamp(),
    };
    // ✨ NEW v1.9: carry live-price fields if present (crypto holdings)
    if (entry.liveTrack) {
      payload.liveTrack  = true;
      payload.coinId     = entry.coinId || null;
      payload.coinSymbol = entry.coinSymbol || null;
      payload.buyPrice   = Number(entry.buyPrice) || 0;
    }
    await addDoc(collection(db, "users", uid, kind), payload);
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

  // ✨ NEW v1.7: Save a month's final score snapshot (doc id = "YYYY-MM", frozen)
  const saveMonthScore = useCallback(async (monthKey, score, meta = {}) => {
    if (!uid || !monthKey) return;
    try {
      await setDoc(
        doc(db, "users", uid, "scoreHistory", monthKey),
        { month: monthKey, score: Math.round(score), ...meta, savedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error("Save month score error:", e.message);
    }
  }, [uid]);

  // ─── Computed totals ───
  const totalInvested = investments.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSpent    = spendings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalIncome   = incomes.reduce((s, e) => s + (Number(e.amount) || 0), 0);   // ✨ NEW v1.6

  // ✨ v1.8: Net Savings = Income − Spent (true savings) once income is logged.
  const hasIncome  = totalIncome > 0;
  const netBalance = hasIncome ? (totalIncome - totalSpent) : (totalInvested - totalSpent);

  return {
    investments,
    spendings,
    incomes,                   // ✨ NEW v1.6
    categories,                // legacy v1.4
    customCategories,          // ✨ NEW v1.5
    learnedCategories,         // ✨ NEW v1.5
    scoreHistory,              // ✨ NEW v1.7
    pools,
    cryptoPrices,              // ✨ NEW v1.9 { coinId: priceINR }
    pricesUpdatedAt,           // ✨ NEW v1.9
    pricesLoading,             // ✨ NEW v1.9
    refreshCryptoPrices: fetchAndCachePrices, // ✨ NEW v1.9 manual refresh
    loading,
    addEntry,
    deleteEntry,
    learnCategory,             // ✨ NEW v1.5
    saveMonthScore,            // ✨ NEW v1.7
    totalInvested,
    totalSpent,
    totalIncome,               // ✨ NEW v1.6
    netBalance,
  };
}