# Changelog

## [0.1.0] — Initial Production Release

### Added
- **Next.js 16 project** with TypeScript, Tailwind CSS v4, App Router
- **Supabase integration** with client, server, admin, and middleware utilities
- **Database schema** (14 tables) with RLS policies, indexes, triggers
- **Authentication** — Email/password login, Google OAuth, password reset, session management
- **Protected routes** via proxy middleware with redirect logic
- **User dashboard** — Profile view, license status, reading progress
- **Admin dashboard** — Users, Licenses, Redeem Codes, Analytics, Support, Audit Logs
- **License system** — 3 plans (1M ₹199, 3M ₹399, Lifetime ₹999), code generation, redemption, auto-expiry
- **WhatsApp purchase flow** — Modal with plan selection → WhatsApp redirect with pre-filled message
- **Book pages** — Catalog, detail with chapter list, chapter reader with progress tracking
- **UI components** — Button (5 variants), Badge (6 variants), Card, Input
- **Dark mode** — System-aware with manual toggle via next-themes
- **API routes** — Auth, Licenses, Redeem, Newsletter, Contact, Progress, Bookmarks, Admin
- **Redeem system** — Code validation (TA-PE-{1M|3M|LT}-XXXXXX), activation, expiry calculation
- **Middleware/proxy** — Session management, route protection, auth redirects
- **Environment variables** — Complete .env.example with all required vars
- **Documentation** — PROJECT_INSPECTION_REPORT.md, DATABASE_SCHEMA.md, API_DOCUMENTATION.md, DEPLOYMENT_GUIDE.md, SECURITY_REPORT.md, PERFORMANCE_REPORT.md, FINAL_DEPLOYMENT_REPORT.md
