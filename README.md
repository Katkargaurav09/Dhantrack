# 💰 DhanTrack — Personal Finance Manager

> Track your investments, monitor spending, and visualize your net balance — all in one place.

🌐 **Live Demo:** [dhantrack-one.vercel.app](https://dhantrack-one.vercel.app)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📈 Investment Tracking | Add stocks, crypto, mutual funds, gold with monthly view |
| 💸 Spending Tracker | Log expenses by category with date grouping |
| ⚖️ Balance Overview | Net balance, invest vs spend ratio, monthly breakdown |
| 🔐 Authentication | Email/password + Google sign in via Firebase |
| 📊 Real-time Sync | Firestore real-time updates across devices |
| 📱 Responsive | Mobile-first design, works on all screen sizes |
| 🌑 Dark Theme | Premium dark UI with emerald + gold color system |

---

## 📸 Screenshots

> Dashboard · Investments · Spending · Balance

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Hosting | Vercel |

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/Katkargaurav09/Dhantrack.git
cd Dhantrack
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Firebase
- Go to [Firebase Console](https://console.firebase.google.com)
- Create a project → enable **Firestore** and **Authentication**
- Enable **Email/Password** and **Google** sign-in providers
- Copy your config values

### 4. Create `.env` file in root
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Run locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
src/
├── firebase/
│   └── config.js           # Firebase connection setup
├── hooks/
│   ├── useAuth.js           # Auth state + login/register/logout
│   └── useFirestore.js      # Real-time Firestore CRUD
├── pages/
│   ├── AuthPage.jsx         # Login + Register (split layout)
│   ├── Home.jsx             # Dashboard overview
│   ├── Investments.jsx      # Investment tracker with calendar
│   ├── Spending.jsx         # Spending tracker with categories
│   └── Balance.jsx          # Net balance + monthly breakdown
└── App.jsx                  # Root — auth flow + navigation
```

---

## 🔒 Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

Each user can only access their own data.

---

## 🌐 Deployment

Deployed on **Vercel** with automatic GitHub integration.  
Every push to `main` triggers a new deployment automatically.

---

## ⚠️ Security Note

Never commit your `.env` file. It is listed in `.gitignore` and contains your private Firebase API keys.

---

## 📄 License

MIT License — free to use, modify and distribute.

---

<div align="center">
  Built with ❤️ using React + Firebase
</div>
