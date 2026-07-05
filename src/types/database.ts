export type UserRole = 'user' | 'admin' | 'super_admin';
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'pending';
export type LicensePlan = '1M' | '3M' | 'LT';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  author: string | null;
  publisher: string | null;
  edition: string | null;
  version: string | null;
  isbn: string | null;
  chapters_count: number;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  title: string;
  slug: string;
  chapter_number: number;
  content: string | null;
  preview_content: string | null;
  is_premium: boolean;
  is_free_preview: boolean;
  word_count: number | null;
  estimated_minutes: number | null;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: string;
  user_id: string;
  code: string;
  plan: LicensePlan;
  status: LicenseStatus;
  purchased_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RedeemCode {
  id: string;
  code: string;
  plan: LicensePlan;
  status: 'available' | 'assigned' | 'used' | 'revoked';
  assigned_to: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  progress: number;
  last_position: string | null;
  completed: boolean;
  time_spent_seconds: number;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  position: string | null;
  note: string | null;
  color: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name: string | null;
  subscribed: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  user_id: string | null;
  session_id: string | null;
  properties: Record<string, unknown> | null;
  page_url: string | null;
  created_at: string;
}

export interface ReleaseNote {
  id: string;
  title: string;
  version: string;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
