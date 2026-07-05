# Security Report

## Authentication Security

- **Password Hashing:** Supabase Auth uses bcrypt for password hashing
- **Session Management:** HTTP-only cookies via Supabase SSR helpers
- **CSRF Protection:** SameSite cookie policy enforced
- **OAuth:** Google OAuth with PKCE flow for secure token exchange
- **Rate Limiting:** Built-in rate limiting on auth endpoints (Supabase)
- **Email Verification:** Configurable email confirmation for new registrations
- **Password Reset:** Time-limited reset tokens with single-use policy
- **Session Expiry:** Configurable session TTL (default 24h for web)

## Row Level Security (RLS) Overview

RLS policies are enabled on all database tables. Key policies:

| Table | Policy | Effect |
|-------|--------|--------|
| `profiles` | Users read/update own | Prevents data leakage between users |
| `books` | Public read published | Allows catalog browsing without auth |
| `chapters` | Free vs premium access | Premium content locked behind licenses |
| `licenses` | Users read own | Prevents license enumeration |
| `reading_progress` | Users manage own | Isolates user progress data |
| `bookmarks` | Users manage own | Isolates user bookmark data |
| `audit_logs` | Admin read only | Sensitive logs restricted |
| `analytics_events` | Public insert, admin read | Allows tracking without exposing data |

**Service Role Key** is never exposed to the client — only used in server-side API routes and middleware.

## API Security Measures

- **Input Validation:** All API routes validate request payloads server-side
- **SQL Injection Protection:** Supabase JS client uses parameterized queries
- **CORS:** Configured to allow only trusted origins (Vercel deployment URL)
- **Request Size Limits:** Next.js API routes have default body size limits
- **Content-Type Validation:** API routes reject non-JSON payloads
- **HTTP Methods:** Routes reject unsupported HTTP methods with 405

## Environment Variable Management

| Variable | Exposure | Risk if Leaked |
|----------|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-side (safe) | Low — public URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side (safe) | Low — RLS-enforced key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | **Critical** — full database access |
| `NEXT_PUBLIC_APP_URL` | Client-side (safe) | Low — public URL |

**Best Practices:**
- Service role key is never committed to version control
- Environment variables are configured in Vercel dashboard
- Local development uses `.env.local` (gitignored)
- Team members use their own Supabase projects for development

## Rate Limiting

- **Auth Routes:** Supabase built-in rate limiting (30 req/min per IP)
- **API Routes:** Vercel serverless function limits (100 req/s per function)
- **Newsletter Subscribe:** Idempotency check prevents duplicate subscriptions
- **Code Redemption:** Single-use codes prevent replay attacks
- **Contact Form:** Basic rate limiting via timestamp tracking

## Input Validation

- **Email Validation:** Regex pattern matching on all email inputs
- **Code Format Validation:** `TA-PE-(1M|3M|LT)-[A-Z0-9]{6}` pattern enforced
- **UUID Validation:** All resource IDs validated as proper UUIDs
- **XSS Prevention:** React's built-in escaping prevents script injection
- **SQL Injection:** Parameterized queries via Supabase client
- **Type Checking:** TypeScript throughout, Zod schemas for complex validation

## Audit Logging

- Admin actions (create/update/delete on books, chapters, codes) are logged
- Audit entries include: user_id, action, resource, resource_id, details, IP address
- Logs are append-only with RLS restricting to admin reads
- Retention: indefinite (cleanup policy can be added)

## Recommendations

### High Priority

1. **Enable email confirmation** for production to prevent bot registrations
2. **Add CAPTCHA** to newsletter and contact forms to prevent spam
3. **Implement proper rate limiting** for API routes using a middleware approach
4. **Set up database backups** in Supabase (Point-in-Time Recovery)

### Medium Priority

5. **Add 2FA support** for admin accounts
6. **Implement API key authentication** for server-to-server requests
7. **Add IP allowlisting** for admin routes in production
8. **Set up security headers** (CSP, HSTS, X-Frame-Options) via Next.js config

### Low Priority

9. **Add user session revocation** capability for admin
10. **Implement content integrity checks** (hash verification for chapter content)
11. **Set up automated security scanning** (npm audit, Snyk)
12. **Add security.txt** file at `/.well-known/security.txt`
