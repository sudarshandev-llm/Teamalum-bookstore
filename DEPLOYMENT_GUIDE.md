# Deployment Guide

## Prerequisites

- Node.js 18+ and npm installed
- Git repository initialized
- Vercel account (https://vercel.com)
- Supabase account (https://supabase.com)
- Custom domain (optional)

---

## Step 1: Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Note your project URL and anon key from **Settings → API**
3. Configure Authentication:
   - Go to **Authentication → Providers**
   - Enable **Email/Password** (disable "Confirm email" for dev)
   - Enable **Google** (configure OAuth credentials)
4. Set up Storage:
   - Create a bucket named `book-covers`
   - Set it to public

## Step 2: Environment Variables

Create `.env.local` (for local dev) and configure in Vercel:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## Step 3: Database Migration

1. Open your Supabase project's **SQL Editor**
2. Copy the contents of `schema.sql` from the project root
3. Paste and run the SQL script
4. Verify all 14 tables are created in **Table Editor**

Optional: Seed sample data:
```bash
npm run seed
```

## Step 4: Vercel Deployment

### Option A: Deploy via Git (Recommended)

1. Push code to GitHub/GitLab/Bitbucket
2. Go to Vercel → **Add New Project**
3. Import your repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `next build`
   - **Output Directory:** .next
5. Add environment variables (from Step 2)
6. Click **Deploy**

### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Step 5: Custom Domain Setup

1. In Vercel dashboard, go to your project → **Domains**
2. Add your custom domain (e.g., `books.yourdomain.com`)
3. Configure DNS:
   - **Type:** CNAME
   - **Name:** @ (or subdomain)
   - **Target:** `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48 hours)
5. Enable **SSL/TLS** (auto-provisioned by Vercel)

## Step 6: Post-Deployment Checks

- [ ] Visit `/` — Homepage loads without errors
- [ ] Visit `/book/catalog` — Books are displayed
- [ ] Visit `/login` — Login page renders
- [ ] Register a new user — Auth flow works
- [ ] Visit `/purchase` — Plan selection loads
- [ ] Visit `/dashboard` — Dashboard is accessible
- [ ] Create admin user and verify `/admin/*` routes
- [ ] Test newsletter subscription
- [ ] Test contact form submission
- [ ] Verify all API routes return correct responses
- [ ] Check Supabase logs for any errors
- [ ] Validate RLS policies are active

---

## Environment Variables Table

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) | Yes | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Yes | `https://your-domain.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | No | `123456-abc.apps.googleusercontent.com` |

---

## Troubleshooting

### Build fails with "Module not found"
- Run `npm install` to ensure all dependencies are installed
- Check import paths use `@/` alias correctly
- Verify `tsconfig.json` has correct path mappings

### Database connection errors
- Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check if IP restrictions are enabled in Supabase (disable for Vercel)
- Verify RLS policies are not blocking legitimate requests

### Auth not working in production
- Ensure `NEXT_PUBLIC_APP_URL` points to your production URL
- Update Supabase Auth settings → Site URL to your production domain
- Add redirect URLs in Supabase Auth settings

### 404 on page refresh
- This is expected for client-side rendered routes — Vercel handles this automatically with Next.js
- Ensure `vercel.json` is present (if using custom rewrites)

### Images not loading
- Verify Supabase storage bucket is public
- Check `NEXT_PUBLIC_SUPABASE_URL` is correctly set
- Ensure image URLs are absolute (not relative)

### Rate limiting errors
- Default Vercel rate limit is 100 req/s per function
- Consider adding custom rate limiting for heavy traffic
- Use Vercel's Edge Functions for better rate limiting support

### Need help?
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
