# Project Inspection Report

## Repository
- URL: https://github.com/sudarshandev-llm/Teamalum-bookstore
- Stack: Next.js 16, TypeScript, Tailwind CSS v4, Supabase
- Frontend: React Server Components + Client Components
- Backend: Supabase (PostgreSQL, Auth, Storage)
- Deployment Target: Vercel + Supabase

## Architecture
- App Router with (auth) route groups
- Middleware for session management and route protection
- Supabase for auth, database, and storage
- API routes for server-side operations
- Utility-first styling with Tailwind

## Pages
- / — Homepage with hero, catalog, features, newsletter
- /book/catalog — Book listing
- /book/[slug] — Book detail with chapter list
- /book/[slug]/chapter/[chapterId] — Chapter reader with progress tracking
- /purchase — License plan selection with WhatsApp checkout
- /redeem — License code redemption
- /login, /register, /forgot-password — Authentication
- /dashboard — User dashboard
- /admin/* — Admin panel

## Database
- 14 tables: profiles, books, chapters, licenses, redeem_codes, reading_progress, bookmarks, newsletter_subscribers, contact_messages, support_tickets, audit_logs, analytics_events, release_notes

## Authentication
- Email/password login
- Google OAuth
- Session management via Supabase SSR
- Protected routes via middleware

## License System
- Plans: 1 Month (₹199), 3 Months (₹399), Lifetime (₹999)
- Code format: TA-PE-{1M|3M|LT}-XXXXXX
- WhatsApp-based purchase flow
- Code redemption with validation
- Auto-expiry based on plan

## Security
- Row Level Security on all tables
- Server-side validation on all API routes
- Rate limiting ready
- Audit logging
- Environment variables for secrets

## Performance
- React Server Components for static content
- Client Components for interactive parts
- Lazy loading for heavy components
- Image optimization via Next/Image
