# Ekam Voice Hub

AI-powered productivity suite — text to speech, speech to text, translation, document processing, bulk WhatsApp messaging, QR codes, PDF tools, and more.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 6
- **Styling:** Tailwind CSS v3 + custom CSS variables (light/dark mode)
- **Routing:** React Router v7
- **Icons:** Lucide React
- **Tests:** Playwright (8 e2e tests)
- **Font:** Inter (Google Fonts)

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:5173
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:8001` | Backend API base URL |
| `VITE_ADMIN_EMAIL` | `admin@ekam.com` | Admin sign-in email |
| `VITE_ADMIN_PASSWORD` | `admin@2024` | Admin sign-in password |

Create `.env.production` for deployment:

```env
VITE_BACKEND_URL=https://api.ekam.digital
VITE_ADMIN_EMAIL=admin@ekam.com
VITE_ADMIN_PASSWORD=<change-this>
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npx tsc --noEmit` | TypeScript check only |
| `npx playwright test` | Run all e2e tests across browsers |
| `npx playwright test --project=chromium` | Run e2e tests (Chromium only) |

## Auth System

- **Sign Up** — email + password + name (stored in localStorage)
- **Sign In** — email + password (validates against localStorage registry)
- **Admin** — special credentials (`VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD`) unlock the admin console
- Pro licenses are verified client-side via a hash-based key generator
- Usage limits are tracked per feature, reset daily

> Admin credentials are compiled into the JS bundle at build time. For production, move admin auth to a server-side endpoint.

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI (Layout, modals, etc.)
│   ├── contexts/        # AuthContext (auth, usage, licenses, pro)
│   ├── pages/           # Route pages (Dashboard, Profile, Settings, etc.)
│   ├── tools/           # Tool pages (BulkWhatsApp, QR, PDF, etc.)
│   └── index.css        # CSS variables, component classes, animations
├── e2e/                 # Playwright e2e tests
├── public/              # Static assets
├── .env                 # Dev environment variables
├── .env.production      # Production environment variables
├── tailwind.config.js   # Tailwind config (teal/indigo palette)
└── vite.config.ts       # Vite config with API proxy
```

## Features

| Feature | Description |
|---|---|
| Text to Speech | Convert text to natural speech with multiple voices |
| Speech to Text | Transcribe audio files and recordings |
| Translation | Translate text across 30+ languages |
| Audio Translate | Record and get translated speech output |
| Documents | Upload, read, and listen to PDFs/DOCX |
| Bulk WhatsApp | Send bulk WhatsApp messages with templates |
| QR Generator | Generate QR codes with custom styling |
| PDF Tools | Merge, split, compress, and convert PDFs |
| Dev Studio | Developer tools and utilities |

## License

Admin license key management is built in. Free tier has daily usage caps; Pro tier unlocks unlimited access.
