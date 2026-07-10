# Ekam Voice Hub — Walkthrough

## 1. First Visit

Open the app. You'll see the **Dashboard** with:
- A hero section showing your daily stats (languages, voices, doc formats)
- Quick action cards to jump into any tool
- Recent activity feed
- Pro tips sidebar

## 2. Sign Up / Sign In

Click **Sign In / Sign Up** in the sidebar (or the user icon on mobile).

**Sign Up tab:** Enter your name, email, and password to create an account. Your profile is stored locally in your browser.

**Sign In tab:** Use your email and password to log back in on subsequent visits.

**Admin tab:** Enter `admin@ekam.com` and the admin password (default: `admin@2024`) to unlock the Admin Console. Configure these via `.env` / `.env.production`.

Once signed in, the sidebar shows your name and a **Sign Out** button.

## 3. Dashboard

- **Hero Stats** — glance at your activity at a glance
- **Quick Actions** — one-click access to any tool
- **Daily Usage** — horizontal bar with live counters for each feature
- **Recent Activity** — shows your latest operations
- **Pro Tips** — helpful suggestions to get the most out of the app

## 4. Using Tools

### Text to Speech
1. Navigate to **Text to Speech** from the sidebar
2. Type or paste text in the input area
3. Choose a voice and language
4. Click **Generate** — audio plays in the built-in player

### Speech to Text
1. Navigate to **Speech to Text**
2. Record directly or upload an audio file
3. Click **Transcribe** — text output appears below

### Bulk WhatsApp
1. Navigate to **Tools → Bulk WhatsApp**
2. Paste phone numbers (one per line or CSV format)
3. Write your message template (use `{{name}}` for personalisation)
4. Preview and send

### QR Code Generator
1. Navigate to **Tools → QR Generator**
2. Enter a URL or text
3. Customise colours and size
4. Download as PNG/SVG

### PDF Tools
1. Navigate to **Tools → PDF Tools**
2. Upload PDFs to merge, split, compress, or convert

## 5. Profile & Usage

**Profile page** shows:
- Your name, email, and subscription status
- Daily usage counters for each feature (resets at midnight)
- License key activation (enter a Pro key to unlock unlimited usage)

## 6. Pro Upgrade

Navigate to **Upgrade** (or click the Pro banner in sidebar). Choose:
- **Pro Monthly** — ₹199/month
- **Pro Yearly** — ₹999/year (save 58%)

Pro unlocks unlimited usage across all features.

## 7. Settings

Available under **Settings** in the sidebar:
- Toggle dark/light mode
- Manage data preferences
- Access Privacy & Terms (links to the Legal page)

## 8. Admin Console

Only visible after signing in as admin (`admin@ekam.com`). Provides:
- License key generation and revocation
- System management tools

## 9. Dark Mode

Toggle in Settings. The entire UI adapts with custom CSS variables — no page reload needed.

## 10. Mobile

The app is fully responsive:
- **Desktop:** Sidebar navigation + content area
- **Mobile:** Bottom tab bar + collapsible header
- All tools work on touch devices

## 11. Running Tests

```bash
# Start the dev server first (required for e2e)
npm run dev

# In another terminal, run tests
npx playwright test --project=chromium
```

The 8 e2e tests cover: dashboard stats, quick actions, PWA dismiss, Bulk WhatsApp CSV parsing, Premium Templates, QR limits, Settings legal link, and Pro Upgrade flow.

## 12. Building for Production

```bash
npm run build
```

Output goes to `build/`. Set your `.env.production` variables before building:

```env
VITE_BACKEND_URL=https://your-api.com
VITE_ADMIN_PASSWORD=<strong-password>
```

Serve the `build/` directory with any static file server (Nginx, Netlify, Vercel, etc.). The `/api` proxy from dev mode is not included in the production build — your web server or CDN must route `/api/*` requests to your backend.
