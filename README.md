# WC 2026 Sweepstakes

World Cup 2026 sweepstakes tracker for 21 participants. Hosted on GitHub Pages, backed by Firebase Firestore (free tier). Football data synced automatically from football-data.org via GitHub Actions.

## Quick Start

### 1. Create Firebase project (one-time, ~5 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google account
2. **Create project** → name it `wc2026-sweepstakes` → disable Google Analytics → Create
3. In the left sidebar:
   - **Firestore Database** → Create database → Production mode → Region: `europe-west2` → Enable
   - **Authentication** → Get started → Google provider → Enable → save your support email → Save
   - **Project Overview** → `</>` (Web) → App nickname: `wc2026-web` → Register → copy the `firebaseConfig` values
4. **Project Settings** → Service Accounts → Generate new private key → save the downloaded JSON

### 2. Set up the repository

```bash
git clone https://github.com/YOUR_ORG/wc2026-sweepstakes.git
cd wc2026-sweepstakes
npm install
```

Copy `.env.example` to `.env.local` and fill in your Firebase config values.

### 3. Add GitHub Secrets

In your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | From Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN` | From Firebase console |
| `VITE_FIREBASE_PROJECT_ID` | From Firebase console |
| `VITE_FIREBASE_STORAGE_BUCKET` | From Firebase console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase console |
| `VITE_FIREBASE_APP_ID` | From Firebase console |
| `FOOTBALL_DATA_API_KEY` | Register free at [football-data.org](https://www.football-data.org/client/register) |
| `FIREBASE_SERVICE_ACCOUNT` | Contents of the service account JSON file (entire JSON as a string) |

### 4. Deploy Firestore security rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

Or paste `firestore.rules` into the Firebase console → Firestore → Rules tab.

### 5. Seed initial data

```bash
export FIREBASE_SERVICE_ACCOUNT='<paste JSON here>'
npm run seed
```

This creates the 21 participant records and default prize config in Firestore.

### 6. Enable GitHub Pages

In your repo → Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages` → Save.

Push to `main` to trigger the first deploy. The site will be live at:
`https://YOUR_ORG.github.io/wc2026-sweepstakes/`

---

## After the Team Draw

Update team assignments via the Admin Panel → Teams tab, or run:

```bash
firebase firestore:update participants/craig teamCode "BRA"
```

Or simply use the Admin Panel in the app once deployed.

---

## Making yourself admin

After signing in once with Google, find your Firebase UID (Firebase Console → Authentication → Users), then run:

```javascript
// In Firebase console → Functions (or use Admin SDK)
admin.auth().setCustomUserClaims('YOUR_UID', { admin: true })
```

Then sign out and sign back in for the claim to take effect.

---

## Development

```bash
npm run dev           # Local dev server at http://localhost:5173
npm run sync:dry      # Test football API connection (read-only)
npm run build         # Production build
npm run preview       # Preview production build
```

For local Firebase emulation:
```bash
firebase emulators:start --only firestore,auth
# Then set VITE_USE_FIREBASE_EMULATOR=true in .env.local
```

---

## Prize Structure

| Prize | % of Pool | Description |
|---|---|---|
| World Cup Winner | 30% | Participant whose team wins the tournament |
| Runner Up | 20% | Participant whose team finishes second |
| Third Place | 15% | Participant whose team wins 3rd place playoff |
| Dirtiest Team | 10% | Yellow = 1pt, Red = 3pts — highest total |
| Longest Goal | 8% | Goal from greatest measured distance |
| Wooden Spoon | 7% | First team eliminated from tournament |
| Nostradamus | 10% | Most correct match predictions (3pts result, 6pts exact score) |

Prize percentages are configurable via Admin Panel → Prizes.

---

## Data Sources

- **Match results + standings**: [football-data.org](https://football-data.org) free tier, synced every 30 minutes via GitHub Actions
- **Goal scorers + cards**: Entered manually by admin (not available on free API tier)
- **Participant draws**: Static config in `src/config/participants.ts`, editable via Admin Panel

---

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Routing**: React Router v6 with HashRouter (required for GitHub Pages)
- **Auth**: Firebase Authentication (Google OAuth)
- **Database**: Firebase Firestore (Spark free tier — ~50K reads/day limit, far above our usage)
- **Hosting**: GitHub Pages (static)
- **CI/CD**: GitHub Actions (deploy on push + scheduled data sync)
- **Football data**: football-data.org → GitHub Actions cron → Firestore
