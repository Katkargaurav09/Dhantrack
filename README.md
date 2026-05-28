# 💰 DhanTrack

> **Personal Finance Tracker for Indians** — Built with React + Firebase + Capacitor

[![Version](https://img.shields.io/badge/version-1.5-blue.svg)](https://github.com/Katkargaurav09/Dhantrack)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web-green.svg)](https://dhantrack-one.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

🌐 **Live App**: [dhantrack-one.vercel.app](https://dhantrack-one.vercel.app)  
📱 **Android**: Available on Google Play Store (Closed Testing)

---

## ✨ Features

### 💸 Spending & Investments
- Track every rupee in or out
- Beautiful monthly grid view
- Drill-down by category for any time period
- Custom icons for every category
- Edit, delete, and note any entry

### 🎯 Custom Categories (v1.5)
Create project-style categories that group entries together:
- **"Puri Trip"** — Track all 7-day trip expenses in one place
- **"Binance"** — All crypto investments grouped
- **"Wedding"** — Event-based tracking
- **"Office Setup"** — One-time project tracking

Two creation modes:
- **Pull Existing** — Select date range → checkbox specific entries → group them
- **Start Fresh** — Create empty category → add entries later

### 🤖 Smart Auto-Categorization (v1.5)
App suggests categories as you type:
- Type "Swiggy" → suggests **Food** 🍔
- Type "Uber" → suggests **Travel** ✈️
- Type "Binance" → suggests **Crypto** ₿
- Type "Zerodha" → suggests **Stock** 📊
- **Learns from your history** — After 3 same-tags, remembers your habits

100+ built-in merchants pre-configured.

### ✨ Spending Personality (v1.5)
Discover your money personality from your data:
- 🎉 **Weekend Splurger** — 50%+ spending on Sat-Sun
- 👑 **Investor King** — Invest 1.5x more than spend
- 🍔 **Food Lover** — 35%+ on dining
- 📺 **Subscription Collector** — 8+ active subs
- 💰 **Cash Hoarder** — 60%+ savings rate
- ⚖️ **Balanced Planner** — Healthy invest/spend ratio
- ⚡ **Impulse Buyer** — Many small daily purchases
- ₿ **Crypto Curious** — 40%+ in crypto
- 📊 **Consistent Tracker** — 14+ day streak

**Share to Instagram/WhatsApp** with auto-generated story image (1080x1920).

### 🔔 Autopay & Subscriptions
Track recurring payments with:
- Multiple frequencies (Weekly, Monthly, Quarterly, Yearly, Custom)
- Renewal countdown with smart alerts
- **Spending vs Investment selector** (v1.5) — auto-route SIPs to investments
- Start date + total spent calculation
- Yearly cost framing — see "₹2,388/year" not just "₹199/month"
- Auto-add to Spending/Investments on renewal
- Pause/resume any subscription

### 💎 Goals & Pools
- **Budget Goals** — Monthly category limits with traffic-light status
- **Savings Goals** — Long-term targets with progress tracking
- **Spending Pools** — "₹X for Y days" tracker (trips, monthly food, half-salary)

### 🔍 Global Search
Search across ALL your data instantly:
- Entries (name, note, amount, date)
- Custom categories
- Autopay subscriptions
- Investments

Highlights matches, shows totals, recent searches saved.

### 🏆 Streak & Badges
- Track consecutive days of logging
- 9 unlockable badges (locked + progress shown)
- Visual progress bars for in-progress badges

### 📊 Insights
- Net balance hero card
- Monthly quick status
- Yearly aggregate views
- Category breakdowns
- Recent activity feed

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS + Custom CSS |
| **Backend** | Firebase Firestore (real-time database) |
| **Auth** | Firebase Authentication |
| **Hosting (Web)** | Vercel |
| **Mobile** | Capacitor (Android) |
| **State Mgmt** | React Hooks + Custom useFirestore hook |

---

## 🎯 Why DhanTrack?

### Built for Indians, by an Indian
- **Rupee-first** — All amounts in ₹ with Indian comma formatting
- **Indian context** — Knows Swiggy, Zomato, Zerodha, Binance, FD/RD, SIP
- **Festival aware** — Future: Diwali/Holi spending spikes detection
- **Couples-focused** — v2.0 will target newly-married Indian couples

### Free Forever
- No ads (we never sell user attention)
- No premium tier (yet)
- No data selling
- Open source on GitHub
- Built on Firebase free tier

### Privacy First
- Your data stays in YOUR Firebase
- No analytics tracking
- No third-party SDKs
- Sign out anytime, data still yours

---

## 🤝 Contributing

This is a personal project but open to contributions:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📸 Screenshots

> Coming soon — will add screenshots after v1.5 production launch.

---

## 🐛 Known Issues

- Personality empty state shows even after exactly 14 days (minor)
- Search with 1 character returns no results (intentional — performance)
- Image share on iOS Safari may fail (Web Share API limitation)

---

## 📧 Contact

**Gaurav Katkar**  
📧 katkargaurav6@gmail.com  
🌐 [DhanTrack Web App](https://dhantrack-one.vercel.app)  
🐙 [@Katkargaurav09](https://github.com/Katkargaurav09)

---

## 📜 License

MIT License — feel free to fork, learn, and build your own!

---

## 🙏 Acknowledgments

- **Anthropic Claude** — AI pair programmer through every version
- **Firebase** — Best free backend ever
- **Vercel** — Free hosting that just works
- **Capacitor** — Web → Native magic
- **Indian fintech community** — For inspiration

---

<p align="center">
  Made with ❤️ in India 🇮🇳<br>
  <strong>Track your money. Build your future.</strong>
</p>
---

## 📁 Project Structure
