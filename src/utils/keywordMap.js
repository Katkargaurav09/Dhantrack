// ✨ v1.5 — Smart Auto-Categorization
// Maps merchant names to suggested categories
// Used when user types entry name → app suggests category

// SPENDING category keywords
// Keys = lowercase keyword to detect in entry name
// Values = matching default category
export const SPENDING_KEYWORDS = {
  // Food & Dining
  "swiggy":      "Food",
  "zomato":      "Food",
  "dominos":     "Food",
  "domino":      "Food",
  "pizza":       "Food",
  "kfc":         "Food",
  "mcdonald":    "Food",
  "burger":      "Food",
  "subway":      "Food",
  "starbucks":   "Food",
  "cafe":        "Food",
  "restaurant":  "Food",
  "biryani":     "Food",
  "tea":         "Food",
  "coffee":      "Food",
  "lunch":       "Food",
  "dinner":      "Food",
  "breakfast":   "Food",
  "kirana":      "Food",
  "grocery":     "Food",

  // Travel
  "uber":        "Travel",
  "ola":         "Travel",
  "rapido":      "Travel",
  "auto":        "Travel",
  "taxi":        "Travel",
  "metro":       "Travel",
  "bus":         "Travel",
  "train":       "Travel",
  "irctc":       "Travel",
  "flight":      "Travel",
  "indigo":      "Travel",
  "vistara":     "Travel",
  "airindia":    "Travel",
  "air india":   "Travel",
  "spicejet":    "Travel",
  "hotel":       "Travel",
  "oyo":         "Travel",
  "airbnb":      "Travel",
  "makemytrip":  "Travel",
  "goibibo":     "Travel",

  // Shopping
  "amazon":      "Shopping",
  "flipkart":    "Shopping",
  "myntra":      "Shopping",
  "ajio":        "Shopping",
  "meesho":      "Shopping",
  "snapdeal":    "Shopping",
  "shopping":    "Shopping",
  "mall":        "Shopping",
  "bazaar":      "Shopping",
  "shop":        "Shopping",
  "clothes":     "Shopping",
  "dress":       "Shopping",
  "shoes":       "Shopping",
  "decathlon":   "Shopping",

  // Entertainment
  "netflix":     "Entertainment",
  "prime":       "Entertainment",
  "hotstar":     "Entertainment",
  "disney":      "Entertainment",
  "spotify":     "Entertainment",
  "youtube":     "Entertainment",
  "movie":       "Entertainment",
  "bookmyshow":  "Entertainment",
  "pvr":         "Entertainment",
  "inox":        "Entertainment",
  "cinema":      "Entertainment",
  "game":        "Entertainment",
  "steam":       "Entertainment",
  "playstation": "Entertainment",

  // Education / Course
  "udemy":       "Course",
  "coursera":    "Course",
  "byju":        "Course",
  "unacademy":   "Course",
  "course":      "Course",
  "udacity":     "Course",
  "book":        "Course",
  "tuition":     "Course",
  "fee":         "Course",

  // Electronics
  "laptop":      "Electronics",
  "mobile":      "Electronics",
  "phone":       "Electronics",
  "charger":     "Electronics",
  "headphone":   "Electronics",
  "iphone":      "Electronics",
  "samsung":     "Electronics",
  "oneplus":     "Electronics",

  // Health
  "pharmacy":    "Health",
  "medical":     "Health",
  "doctor":      "Health",
  "hospital":    "Health",
  "medicine":    "Health",
  "apollo":      "Health",
  "1mg":         "Health",
  "pharmeasy":   "Health",
  "gym":         "Health",
  "yoga":        "Health",

  // Utilities
  "electricity": "Utilities",
  "water":       "Utilities",
  "gas":         "Utilities",
  "internet":    "Utilities",
  "wifi":        "Utilities",
  "broadband":   "Utilities",
  "jio":         "Utilities",
  "airtel":      "Utilities",
  "vi ":         "Utilities",
  "vodafone":    "Utilities",
  "bsnl":        "Utilities",
  "bill":        "Utilities",

  // Rent
  "rent":        "Rent",
  "house":       "Rent",
  "pg":          "Rent",
  "hostel":      "Rent",
  "lease":       "Rent",

  // Fuel
  "petrol":      "Fuel",
  "diesel":      "Fuel",
  "fuel":        "Fuel",
  "shell":       "Fuel",
  "iocl":        "Fuel",
  "hp":          "Fuel",
  "bp":          "Fuel",
};

// INVESTMENT keywords
export const INVESTMENT_KEYWORDS = {
  // Crypto
  "binance":     "Crypto",
  "coinbase":    "Crypto",
  "wazirx":      "Crypto",
  "coindcx":     "Crypto",
  "bitcoin":     "Crypto",
  "ethereum":    "Crypto",
  "btc":         "Crypto",
  "eth":         "Crypto",
  "crypto":      "Crypto",
  "usdt":        "Crypto",
  "doge":        "Crypto",
  "shib":        "Crypto",
  "sol":         "Crypto",

  // Stocks
  "zerodha":     "Stock",
  "groww":       "Stock",
  "upstox":      "Stock",
  "angelone":    "Stock",
  "angel one":   "Stock",
  "icicidirect": "Stock",
  "hdfcsec":     "Stock",
  "kotaksec":    "Stock",
  "stock":       "Stock",
  "share":       "Stock",
  "nse":         "Stock",
  "bse":         "Stock",
  "reliance":    "Stock",
  "tcs":         "Stock",
  "infosys":     "Stock",
  "hdfc bank":   "Stock",
  "icici":       "Stock",
  "tata":        "Stock",

  // Mutual Fund
  "mutual fund": "Mutual Fund",
  "mf":          "Mutual Fund",
  "sip":         "Mutual Fund",
  "mirae":       "Mutual Fund",
  "axis":        "Mutual Fund",
  "parag":       "Mutual Fund",
  "nippon":      "Mutual Fund",
  "kotak":       "Mutual Fund",
  "nifty":       "Mutual Fund",
  "elss":        "Mutual Fund",

  // Gold
  "gold":        "Gold",
  "silver":      "Gold",
  "digigold":    "Gold",
  "safegold":    "Gold",

  // FD/RD
  "fd":          "FD/RD",
  "rd":          "FD/RD",
  "fixed":       "FD/RD",
  "recurring":   "FD/RD",
  "ppf":         "FD/RD",
  "nps":         "FD/RD",

  // ETF
  "etf":         "ETF",
  "index":       "ETF",
};

/**
 * Suggest a category based on entry name
 * @param {string} name - The entry name (e.g. "Swiggy Dinner")
 * @param {string} kind - "spending" or "investment"
 * @param {object} learnedMap - User's learned mappings (from Firestore)
 * @returns {string|null} - Suggested category or null
 */
export function suggestCategory(name, kind = "spending", learnedMap = {}) {
  if (!name || typeof name !== "string") return null;
  
  const lower = name.toLowerCase().trim();
  if (lower.length < 2) return null;

  // Priority 1: Check learned mappings (user's history)
  // Look for exact match in learned map (most specific)
  for (const [merchant, category] of Object.entries(learnedMap)) {
    if (lower.includes(merchant.toLowerCase())) {
      return { category, source: "learned", confidence: "high" };
    }
  }

  // Priority 2: Check built-in keywords
  const keywords = kind === "investment" ? INVESTMENT_KEYWORDS : SPENDING_KEYWORDS;
  
  // Find longest match (more specific = better)
  let bestMatch = null;
  let bestLength = 0;
  
  for (const [keyword, category] of Object.entries(keywords)) {
    if (lower.includes(keyword) && keyword.length > bestLength) {
      bestMatch = category;
      bestLength = keyword.length;
    }
  }

  if (bestMatch) {
    return { category: bestMatch, source: "builtin", confidence: "medium" };
  }

  return null;
}

/**
 * Check if user has tagged a merchant 3+ times with same category
 * If yes, suggest saving to learned map
 * @param {string} merchant - The merchant name to check
 * @param {string} category - The category they used
 * @param {array} pastEntries - User's past entries
 * @returns {boolean} - Whether to save as learned
 */
export function shouldLearnMapping(merchant, category, pastEntries) {
  if (!merchant || merchant.length < 3) return false;
  
  const lowerMerchant = merchant.toLowerCase();
  const matches = pastEntries.filter(e => 
    e.name && e.name.toLowerCase().includes(lowerMerchant) && e.type === category
  );
  
  return matches.length >= 3;
}

/**
 * Extract main merchant name from entry
 * "Swiggy Dinner with friends" → "Swiggy"
 * "Big Bazaar grocery" → "Big Bazaar"
 */
export function extractMerchant(name) {
  if (!name) return "";
  
  // Take first 2 words usually
  const words = name.trim().split(/\s+/);
  
  // If first word is short (like "to"), take 2 words
  if (words[0].length <= 3 && words.length > 1) {
    return words.slice(0, 2).join(" ").toLowerCase();
  }
  
  return words[0].toLowerCase();
}