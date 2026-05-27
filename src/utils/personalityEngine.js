// ✨ v1.5 — Spending Personality Engine
// Analyzes user's data and assigns a personality type
// Updates weekly based on last 30 days of data

const MIN_DAYS_REQUIRED = 14; // Need at least 14 days of data
const MIN_ENTRIES = 5;        // Need at least 5 entries total

/**
 * Get day of week (0=Sun, 6=Sat)
 */
function getDayOfWeek(dateStr) {
  return new Date(dateStr).getDay();
}

/**
 * Get days since oldest entry
 */
function getDaysOfData(investments, spendings) {
  const all = [...investments, ...spendings];
  if (all.length === 0) return 0;
  const oldest = all.reduce((min, e) => {
    const d = new Date(e.date);
    return d < min ? d : min;
  }, new Date());
  return Math.floor((Date.now() - oldest) / 86400000);
}

/**
 * Get entries from last N days
 */
function recentEntries(entries, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter(e => new Date(e.date) >= cutoff);
}

/**
 * All possible personalities — order matters (first match wins)
 * Each has: id, name, icon, description, rule, color
 */
const PERSONALITIES = [
  {
    id: "weekend_splurger",
    name: "Weekend Splurger",
    icon: "🎉",
    color: "#F59E0B",
    description: "More than half your spending happens on weekends! You work hard, you play hard.",
    fact: "{pct}% of your spending is Sat-Sun",
    rule: ({ spendings }) => {
      if (spendings.length < 10) return null;
      const weekend = spendings.filter(s => {
        const day = getDayOfWeek(s.date);
        return day === 0 || day === 6;
      });
      const weekendAmt = weekend.reduce((sum, s) => sum + Number(s.amount), 0);
      const totalAmt = spendings.reduce((sum, s) => sum + Number(s.amount), 0);
      if (totalAmt === 0) return null;
      const pct = Math.round((weekendAmt / totalAmt) * 100);
      return pct > 50 ? { pct } : null;
    },
  },
  {
    id: "investor_king",
    name: "Investor King",
    icon: "👑",
    color: "#34D399",
    description: "You invest way more than you spend. A true wealth builder!",
    fact: "Invest:spend ratio of {ratio}:1",
    rule: ({ totalInvested, totalSpent }) => {
      if (totalSpent === 0 || totalInvested === 0) return null;
      const ratio = totalInvested / totalSpent;
      return ratio > 1.5 ? { ratio: ratio.toFixed(1) } : null;
    },
  },
  {
    id: "subscription_collector",
    name: "Subscription Collector",
    icon: "📺",
    color: "#8B5CF6",
    description: "You love subscriptions! Time to audit which ones you actually use.",
    fact: "You have {count} active subscriptions",
    rule: ({ autopayList }) => {
      const active = autopayList.filter(a => a.active);
      return active.length >= 8 ? { count: active.length } : null;
    },
  },
  {
    id: "food_lover",
    name: "Food Lover",
    icon: "🍔",
    color: "#F87171",
    description: "Foodie alert! Food is your biggest spending category.",
    fact: "{pct}% of spending goes to Food",
    rule: ({ spendings }) => {
      if (spendings.length < 10) return null;
      const food = spendings.filter(s => s.type === "Food");
      const foodAmt = food.reduce((sum, s) => sum + Number(s.amount), 0);
      const totalAmt = spendings.reduce((sum, s) => sum + Number(s.amount), 0);
      if (totalAmt === 0) return null;
      const pct = Math.round((foodAmt / totalAmt) * 100);
      return pct >= 35 ? { pct } : null;
    },
  },
  {
    id: "cash_hoarder",
    name: "Cash Hoarder",
    icon: "💰",
    color: "#FBBF24",
    description: "You're a saver! Most of your money sits as savings. Smart move!",
    fact: "{pct}% saved vs spent",
    rule: ({ totalInvested, totalSpent, netBalance }) => {
      const total = totalInvested + totalSpent;
      if (total < 5000) return null;
      const savedPct = Math.round((netBalance / total) * 100);
      return savedPct > 60 ? { pct: savedPct } : null;
    },
  },
  {
    id: "shopping_addict",
    name: "Shopping Addict",
    icon: "🛍️",
    color: "#EC4899",
    description: "Shopping is your favorite category. Treat yourself, but watch the budget!",
    fact: "{pct}% goes to Shopping",
    rule: ({ spendings }) => {
      if (spendings.length < 10) return null;
      const shop = spendings.filter(s => s.type === "Shopping");
      const shopAmt = shop.reduce((sum, s) => sum + Number(s.amount), 0);
      const totalAmt = spendings.reduce((sum, s) => sum + Number(s.amount), 0);
      if (totalAmt === 0) return null;
      const pct = Math.round((shopAmt / totalAmt) * 100);
      return pct >= 30 ? { pct } : null;
    },
  },
  {
    id: "impulse_buyer",
    name: "Impulse Buyer",
    icon: "⚡",
    color: "#EF4444",
    description: "Lots of small daily purchases. Tap, tap, tap — it adds up!",
    fact: "{count} entries in last 30 days",
    rule: ({ spendings }) => {
      const recent = recentEntries(spendings, 30);
      // Many small entries
      const small = recent.filter(s => Number(s.amount) < 500);
      if (small.length >= 30) {
        return { count: small.length };
      }
      return null;
    },
  },
  {
    id: "minimalist",
    name: "Minimalist",
    icon: "🌿",
    color: "#10B981",
    description: "Few entries, focused spending. You buy what you need, nothing more.",
    fact: "Only {count} entries this month",
    rule: ({ spendings }) => {
      const recent = recentEntries(spendings, 30);
      const totalAmt = recent.reduce((sum, s) => sum + Number(s.amount), 0);
      // Few entries but reasonable spending
      if (recent.length >= 5 && recent.length <= 15 && totalAmt > 3000) {
        return { count: recent.length };
      }
      return null;
    },
  },
  {
    id: "crypto_curious",
    name: "Crypto Curious",
    icon: "₿",
    color: "#F59E0B",
    description: "You're into crypto! High risk, high reward — play smart.",
    fact: "{pct}% of investments in crypto",
    rule: ({ investments }) => {
      if (investments.length < 3) return null;
      const crypto = investments.filter(i => i.type === "Crypto");
      const cryptoAmt = crypto.reduce((sum, i) => sum + Number(i.amount), 0);
      const totalAmt = investments.reduce((sum, i) => sum + Number(i.amount), 0);
      if (totalAmt === 0) return null;
      const pct = Math.round((cryptoAmt / totalAmt) * 100);
      return pct >= 40 ? { pct } : null;
    },
  },
  {
    id: "balanced_planner",
    name: "Balanced Planner",
    icon: "⚖️",
    color: "#06B6D4",
    description: "You've got a healthy balance between spending and investing. Keep it up!",
    fact: "Invest:spend ratio of {ratio}:1",
    rule: ({ totalInvested, totalSpent }) => {
      if (totalInvested === 0 || totalSpent === 0) return null;
      const ratio = totalInvested / totalSpent;
      return (ratio >= 0.7 && ratio <= 1.3) ? { ratio: ratio.toFixed(1) } : null;
    },
  },
  {
    id: "consistent_tracker",
    name: "Consistent Tracker",
    icon: "📊",
    color: "#3B82F6",
    description: "You log entries every day. Discipline is your superpower!",
    fact: "{streak}-day tracking streak",
    rule: ({ streak }) => {
      return streak >= 14 ? { streak } : null;
    },
  },
  // Fallback — applies to anyone who doesn't match above
  {
    id: "money_explorer",
    name: "Money Explorer",
    icon: "🧭",
    color: "#9CA3AF",
    description: "You're getting to know your money habits. Keep tracking to discover your style!",
    fact: "You're discovering your patterns",
    rule: () => ({ }),  // Always matches as fallback
  },
];

/**
 * Compute current streak from data
 */
function computeStreak(investments, spendings) {
  const allDates = new Set([
    ...investments.map(e => e.date),
    ...spendings.map(e => e.date)
  ]);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (allDates.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/**
 * Main function — Get user's personality
 * @returns {object} { eligible, personality, daysOfData, daysToUnlock }
 */
export function getPersonality({ investments = [], spendings = [], autopayList = [], totalInvested = 0, totalSpent = 0, netBalance = 0 }) {
  
  const daysOfData = getDaysOfData(investments, spendings);
  const totalEntries = investments.length + spendings.length;
  const streak = computeStreak(investments, spendings);

  // Not enough data yet
  if (daysOfData < MIN_DAYS_REQUIRED || totalEntries < MIN_ENTRIES) {
    return {
      eligible: false,
      personality: null,
      daysOfData,
      daysToUnlock: Math.max(0, MIN_DAYS_REQUIRED - daysOfData),
      entriesNeeded: Math.max(0, MIN_ENTRIES - totalEntries),
    };
  }

  // Check each personality rule
  const ruleData = {
    investments,
    spendings,
    autopayList,
    totalInvested,
    totalSpent,
    netBalance,
    streak,
  };

  for (const p of PERSONALITIES) {
    const result = p.rule(ruleData);
    if (result !== null) {
      // Replace placeholders in fact string
      let fact = p.fact;
      Object.entries(result).forEach(([key, value]) => {
        fact = fact.replace(`{${key}}`, value);
      });
      return {
        eligible: true,
        personality: {
          ...p,
          fact,
          data: result,
        },
        daysOfData,
      };
    }
  }

  // Should never reach here (fallback always matches)
  return {
    eligible: true,
    personality: PERSONALITIES[PERSONALITIES.length - 1],
    daysOfData,
  };
}

/**
 * Export personality list for testing
 */
export const ALL_PERSONALITIES = PERSONALITIES.map(p => ({
  id: p.id,
  name: p.name,
  icon: p.icon,
  description: p.description,
  color: p.color,
}));