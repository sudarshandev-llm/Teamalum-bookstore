# Team Alum Bookstore

Digital publishing platform for **Prompt Engineering Blueprint** — a comprehensive guide to mastering human-AI communication.

> **Live:** [teamalum-bookstore.vercel.app](https://teamalum-bookstore.vercel.app)

## Overview

Team Alum Bookstore is a full-stack digital bookstore built with Next.js and Supabase. It delivers the *Prompt Engineering Blueprint* — 26 planned chapters covering everything from first principles to production workflows.

### Features

- **3D Book UI** — Flip-page navigation with smooth page transitions
- **Reading Preview** — Chapter 1 preview with adjustable font size, reading width, and dark mode
- **Google OAuth** — Sign in with Google via Supabase Auth
- **User Dashboard** — Reading progress tracking, license status, bookmarks
- **License System** — 3 plans (1 Month ₹199, 3 Months ₹399, Lifetime ₹999) with code redemption
- **WhatsApp Purchase Flow** — Select a plan → redirect to WhatsApp with pre-filled message
- **Admin Dashboard** — Users, licenses, redeem codes, analytics, support tickets, audit logs
- **Redeem Codes** — Format: `TA-PE-{1M|3M|LT}-XXXXXX`
- **Dark Mode** — System-aware with manual toggle
- **PWA Ready** — Manifest, icons, standalone display
- **Newsletter & Contact** — Email subscription and contact form

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, vanilla HTML/CSS/JS (SPA) |
| Backend | Node.js (server.js) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth + Email/Password) |
| Hosting | Vercel |

## Database

14 tables with Row Level Security, indexes, and triggers. Key entities:

- `profiles` — Linked to `auth.users`, role-based access
- `books` / `chapters` — Content with premium gating
- `licenses` / `redeem_codes` — License management with auto-expiry
- `reading_progress` / `bookmarks` — User reading state
- `support_tickets` / `audit_logs` / `analytics_events` — Admin tooling

See [Database Schema.md](./Database%20Schema.md) for full schema and RLS policies.

## API

RESTful API with Supabase session-based auth. Endpoints for:

- Auth (register, login, logout, password reset)
- Books & Chapters (CRUD, premium gating)
- Licenses (redeem, check, list)
- Reading Progress & Bookmarks
- Newsletter & Contact
- Admin (users, analytics, audit logs, redeem code generation)

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for full reference.

## Getting Started

```bash
git clone https://github.com/sudarshandev-llm/Teamalum-bookstore.git
cd Teamalum-bookstore
npm install
cp .env.example .env.local
# Fill in your Supabase project credentials
npm start
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp number for purchase flow |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Support email |
| `NEXT_PUBLIC_CONTACT_PHONE` | Support phone |

## Project Structure

```
├── .github/workflows/   # CI/CD
├── auth/                # Auth callback page
├── supabase/            # DB schema, config
├── index.html           # Main SPA (all pages)
├── server.js            # Node HTTP server
├── manifest.json        # PWA manifest
├── book-cover.png       # Book cover image
├── icon-*.svg           # PWA icons
└── *.md                 # Documentation
```

## Book Roadmap

| Edition | Chapters | Status |
|---------|----------|--------|
| Foundation v0.4.0 | 1–5 | ✅ Released |
| RC-0.5 Audit | Part I | ✅ Approved |
| Core Edition | 6–12 | 🔄 In Production |
| Professional Edition | 13–18 | 📋 Planned |
| Domain Mastery | 19–22 | 📋 Planned |
| Professional Toolkit | 23–26 | 📋 Planned |
| First Edition v1.0 | All | ⭐ Future |

## Purchase Plans

| Plan | Duration | Price |
|------|----------|-------|
| Starter | 1 Month | ₹199 |
| Professional | 3 Months | ₹399 |
| Lifetime | One-time | ₹999 |

Payment via WhatsApp → license code delivered within 24 hours.

## Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./Database%20Schema.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Report](./SECURITY_REPORT.md)
- [Performance Report](./PERFORMANCE_REPORT.md)
- [Changelog](./CHANGELOG.md)
- [Project Status](./PROJECT_STATUS.md)

## Authors

- **Sudarshan Hadmode** — Founder, Team Alum Publishing
- **Soham Takale** — Co-Founder, Team Alum Publishing

## Contact

- Email: socialsudarshan8@gmail.com
- Phone: 9822822448
- WhatsApp: 7775990933

## License

All content © Team Alum Publishing. Access is license-based.
