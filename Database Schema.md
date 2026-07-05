# Database Schema

## Table: `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | References auth.users |
| email | text | User email address |
| full_name | text | User display name |
| avatar_url | text | Profile picture URL |
| role | text | 'user' or 'admin' |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Relationships:** `id` → `auth.users.id`

## Table: `books`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| title | text | Book title |
| slug | text (unique) | URL-friendly identifier |
| author | text | Author name |
| description | text | Book description |
| cover_url | text | Cover image URL |
| is_published | boolean | Published status |
| chapters_count | integer | Total chapters |
| examples_count | integer | Code examples count |
| templates_count | integer | Templates count |
| what_you_learn | jsonb | Array of learning points |
| prerequisites | jsonb | Array of prerequisites |
| price_1m | integer | 1 month plan price |
| price_3m | integer | 3 months plan price |
| price_lt | integer | Lifetime plan price |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Relationships:** Referenced by `chapters.book_id`, `licenses.book_id`

## Table: `chapters`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| book_id | uuid (FK) | References books.id |
| title | text | Chapter title |
| slug | text | URL-friendly identifier |
| chapter_number | integer | Chapter ordering |
| content | text | Full chapter content |
| is_premium | boolean | Premium content flag |
| est_read_time | integer | Estimated reading minutes |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Relationships:** `book_id` → `books.id`, Referenced by `reading_progress.chapter_id`, `bookmarks.chapter_id`

## Table: `licenses`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References profiles.id |
| book_id | uuid (FK) | References books.id |
| plan_type | text | '1M', '3M', or 'LT' |
| starts_at | timestamptz | License start |
| expires_at | timestamptz | License expiry (null for LT) |
| is_active | boolean | Active status |
| created_at | timestamptz | Creation timestamp |

**Relationships:** `user_id` → `profiles.id`, `book_id` → `books.id`

## Table: `redeem_codes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| code | text (unique) | Redemption code |
| book_id | uuid (FK) | References books.id |
| plan_type | text | '1M', '3M', or 'LT' |
| is_used | boolean | Usage status |
| used_by | uuid (FK) | References profiles.id |
| used_at | timestamptz | Usage timestamp |
| created_at | timestamptz | Creation timestamp |

**Relationships:** `book_id` → `books.id`, `used_by` → `profiles.id`

## Table: `reading_progress`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References profiles.id |
| book_id | uuid (FK) | References books.id |
| chapter_id | uuid (FK) | References chapters.id |
| progress | integer | Scroll percentage (0-100) |
| last_position | text | Scroll position identifier |
| completed_at | timestamptz | Completion timestamp |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Relationships:** `user_id` → `profiles.id`, `book_id` → `books.id`, `chapter_id` → `chapters.id`

## Table: `bookmarks`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References profiles.id |
| book_id | uuid (FK) | References books.id |
| chapter_id | uuid (FK) | References chapters.id |
| note | text | Optional bookmark note |
| created_at | timestamptz | Creation timestamp |

**Relationships:** `user_id` → `profiles.id`, `book_id` → `books.id`, `chapter_id` → `chapters.id`

## Table: `newsletter_subscribers`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| email | text (unique) | Subscriber email |
| is_active | boolean | Active subscription |
| subscribed_at | timestamptz | Subscription timestamp |
| unsubscribed_at | timestamptz | Unsubscription timestamp |

## Table: `contact_messages`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| name | text | Sender name |
| email | text | Sender email |
| subject | text | Message subject |
| message | text | Message body |
| is_read | boolean | Read status |
| created_at | timestamptz | Creation timestamp |

## Table: `support_tickets`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References profiles.id |
| subject | text | Ticket subject |
| description | text | Issue description |
| status | text | 'open', 'in_progress', 'resolved', 'closed' |
| priority | text | 'low', 'medium', 'high', 'critical' |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Relationships:** `user_id` → `profiles.id`

## Table: `audit_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References profiles.id |
| action | text | Action performed |
| resource | text | Resource affected |
| resource_id | text | Resource identifier |
| details | jsonb | Additional context |
| ip_address | text | Request IP address |
| created_at | timestamptz | Creation timestamp |

**Relationships:** `user_id` → `profiles.id`

## Table: `analytics_events`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| event_type | text | Event name |
| user_id | uuid (FK) | References profiles.id (nullable) |
| session_id | text | User session identifier |
| page | text | Page path |
| metadata | jsonb | Event payload |
| created_at | timestamptz | Creation timestamp |

**Relationships:** `user_id` → `profiles.id`

## Table: `release_notes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| version | text | Version identifier |
| title | text | Release title |
| description | text | Release description |
| changes | jsonb | Array of change items |
| is_published | boolean | Published status |
| published_at | timestamptz | Publication timestamp |
| created_at | timestamptz | Creation timestamp |

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐
│   profiles   │──┬───>│   licenses   │
└──────┬───────┘  │    └──────┬───────┘
       │          │           │
       │          │    ┌──────┴───────┐
       │          └───>│ redeem_codes │
       │               └──────────────┘
       │
       │    ┌──────────────────┐
       ├───>│ reading_progress │
       │    └──────────────────┘
       │
       │    ┌─────────────┐
       ├───>│  bookmarks  │
       │    └─────────────┘
       │
       │    ┌──────────────────┐
       ├───>│ support_tickets  │
       │    └──────────────────┘
       │
       │    ┌───────────────┐
       ├───>│  audit_logs   │
       │    └───────────────┘
       │
       │    ┌──────────────────┐
       └───>│ analytics_events │
            └──────────────────┘

┌───────────┐       ┌──────────────┐       ┌──────────────────┐
│   books   │──┬───>│   chapters   │──┬───>│ reading_progress │
└───────────┘  │    └──────────────┘  │    └──────────────────┘
               │                      │
               │                      │    ┌─────────────┐
               │                      └───>│  bookmarks  │
               │                           └─────────────┘
               │
               │    ┌──────────────┐
               ├───>│   licenses   │
               │    └──────────────┘
               │
               │    ┌──────────────┐
               └───>│ redeem_codes │
                    └──────────────┘
```

---

## Indexes

| Index Name | Table | Column(s) | Type |
|------------|-------|-----------|------|
| idx_books_slug | books | slug | UNIQUE |
| idx_books_published | books | is_published | - |
| idx_chapters_book | chapters | book_id, chapter_number | UNIQUE |
| idx_licenses_user | licenses | user_id, book_id | - |
| idx_licenses_active | licenses | user_id, is_active | - |
| idx_redeem_codes_code | redeem_codes | code | UNIQUE |
| idx_redeem_codes_used | redeem_codes | is_used | - |
| idx_reading_progress_user | reading_progress | user_id, chapter_id | UNIQUE |
| idx_bookmarks_user | bookmarks | user_id, chapter_id | UNIQUE |
| idx_newsletter_email | newsletter_subscribers | email | UNIQUE |
| idx_audit_logs_created | audit_logs | created_at | - |
| idx_analytics_type | analytics_events | event_type, created_at | - |

---

## Row Level Security (RLS) Policies

| Table | Policy Name | Action | Description |
|-------|-------------|--------|-------------|
| profiles | users_read_own | SELECT | Users can read their own profile |
| profiles | users_update_own | UPDATE | Users can update their own profile |
| profiles | admin_all | ALL | Admins can manage all profiles |
| books | published_read | SELECT | Anyone can read published books |
| books | admin_all | ALL | Admins can manage books |
| chapters | free_read | SELECT | Anyone can read free chapters |
| chapters | premium_read | SELECT | Licensed users can read premium chapters |
| chapters | admin_all | ALL | Admins can manage chapters |
| licenses | user_read_own | SELECT | Users can read their own licenses |
| licenses | admin_all | ALL | Admins can manage licenses |
| redeem_codes | admin_all | ALL | Admins can manage redeem codes |
| reading_progress | user_manage_own | ALL | Users can manage their own progress |
| bookmarks | user_manage_own | ALL | Users can manage their own bookmarks |
| newsletter_subscribers | insert_public | INSERT | Anyone can subscribe |
| contact_messages | insert_public | INSERT | Anyone can submit messages |
| contact_messages | admin_read | SELECT | Admins can read messages |
| support_tickets | user_manage_own | ALL | Users can manage their own tickets |
| support_tickets | admin_all | ALL | Admins can manage all tickets |
| audit_logs | admin_read | SELECT | Admins can read audit logs |
| analytics_events | insert_public | INSERT | Anyone can insert events |
| analytics_events | admin_read | SELECT | Admins can read events |

---

## Triggers & Functions

| Name | Type | Description |
|------|------|-------------|
| handle_new_user | TRIGGER | Creates profile on auth.users insert |
| update_updated_at_column | FUNCTION | Auto-updates updated_at timestamp |
| check_license_expiry | TRIGGER | Auto-deactivates expired licenses |
| validate_redeem_code | FUNCTION | Validates code format and availability |
| log_audit_event | FUNCTION | Logs admin actions to audit_logs |
| increment_book_stats | FUNCTION | Updates chapters/examples/templates counts |
