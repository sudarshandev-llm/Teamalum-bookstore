# API Documentation

## Authentication

All API routes use Supabase session cookies for authentication. Protected routes require a valid session. Public routes are accessible without authentication.

### Auth Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login with email/password | No |
| POST | /api/auth/logout | Logout current session | Yes |
| POST | /api/auth/forgot-password | Send password reset email | No |

### Book Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/books | List all published books | No |
| GET | /api/books/[slug] | Get book by slug | No |
| GET | /api/books/[slug]/chapters | List chapters for a book | No |
| POST | /api/books | Create new book | Admin |
| PUT | /api/books/[id] | Update book | Admin |
| DELETE | /api/books/[id] | Delete book | Admin |

### Chapter Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/chapters/[id] | Get chapter content | Licensed |
| POST | /api/chapters | Create chapter | Admin |
| PUT | /api/chapters/[id] | Update chapter | Admin |
| DELETE | /api/chapters/[id] | Delete chapter | Admin |

### License Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/licenses | Get user licenses | Yes |
| POST | /api/licenses/redeem | Redeem a license code | Yes |
| GET | /api/licenses/check/[bookId] | Check access to a book | Yes |

### Progress & Bookmarks

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/progress/[bookId] | Get reading progress | Yes |
| POST | /api/progress/save | Save reading progress | Yes |
| GET | /api/bookmarks/[bookId] | Get bookmarks | Yes |
| POST | /api/bookmarks | Add bookmark | Yes |
| DELETE | /api/bookmarks/[id] | Remove bookmark | Yes |

### Newsletter & Contact

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/newsletter/subscribe | Subscribe to newsletter | No |
| POST | /api/contact | Submit contact form | No |

### Admin Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/users | List all users | Admin |
| GET | /api/admin/analytics | Get analytics data | Admin |
| GET | /api/admin/audit-logs | Get audit logs | Admin |
| GET | /api/admin/redeem-codes | List redeem codes | Admin |
| POST | /api/admin/redeem-codes/generate | Generate codes | Admin |
| GET | /api/admin/support-tickets | List tickets | Admin |
| PUT | /api/admin/support-tickets/[id] | Update ticket | Admin |

---

## Request/Response Formats

### GET /api/books

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Learn TypeScript",
    "slug": "learn-typescript",
    "author": "Sudarshan",
    "description": "A comprehensive guide...",
    "cover_url": "https://...",
    "chapters_count": 12,
    "examples_count": 45,
    "templates_count": 8,
    "what_you_learn": ["TypeScript fundamentals", "Advanced types"],
    "prerequisites": ["Basic JavaScript"],
    "is_published": true
  }
]
```

### GET /api/chapters/[id]

**Headers Required:** `Authorization: Bearer <session>` (for premium chapters)

**Response:**
```json
{
  "id": "uuid",
  "book_id": "uuid",
  "title": "Getting Started",
  "chapter_number": 1,
  "content": "# Chapter 1\n\nWelcome to...",
  "is_premium": false,
  "est_read_time": 15
}
```

**Error Response (Premium - No License):**
```json
{
  "error": "Premium content requires an active license",
  "code": "LICENSE_REQUIRED",
  "status": 403
}
```

### POST /api/licenses/redeem

**Request:**
```json
{
  "code": "TA-PE-1M-A1B2C3",
  "book_id": "uuid"
}
```

**Response (Success):**
```json
{
  "success": true,
  "license": {
    "id": "uuid",
    "plan_type": "1M",
    "expires_at": "2026-08-05T00:00:00Z",
    "is_active": true
  }
}
```

**Error Response:**
```json
{
  "error": "Invalid or already used code",
  "code": "INVALID_CODE",
  "status": 400
}
```

### POST /api/progress/save

**Request:**
```json
{
  "chapter_id": "uuid",
  "book_id": "uuid",
  "progress": 65,
  "last_position": "scroll_65"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/newsletter/subscribe

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter"
}
```

---

## Example curl Commands

```bash
# List all published books
curl https://teamalum-bookstore.vercel.app/api/books

# Get a book by slug
curl https://teamalum-bookstore.vercel.app/api/books/learn-typescript

# Subscribe to newsletter
curl -X POST https://teamalum-bookstore.vercel.app/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Submit contact form
curl -X POST https://teamalum-bookstore.vercel.app/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com", "subject": "Help", "message": "I need assistance"}'

# Redeem a license code (authenticated)
curl -X POST https://teamalum-bookstore.vercel.app/api/licenses/redeem \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"code": "TA-PE-1M-A1B2C3", "book_id": "uuid"}'

# Save reading progress (authenticated)
curl -X POST https://teamalum-bookstore.vercel.app/api/progress/save \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"chapter_id": "uuid", "book_id": "uuid", "progress": 50, "last_position": "scroll_50"}'
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | No valid session |
| FORBIDDEN | 403 | Insufficient permissions |
| LICENSE_REQUIRED | 403 | Premium content requires license |
| INVALID_CODE | 400 | Redeem code is invalid or used |
| CODE_EXPIRED | 400 | Redeem code has expired |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Request data validation failed |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error |
