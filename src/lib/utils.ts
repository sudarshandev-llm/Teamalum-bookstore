import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function generateLicenseCode(plan: '1M' | '3M' | 'LT'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TA-PE-${plan}-${code}`;
}

export function calculateExpiry(plan: '1M' | '3M' | 'LT'): Date | null {
  if (plan === 'LT') return null;
  const days = plan === '1M' ? 30 : 90;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

export function getWhatsAppLink(plan: string, duration: string, price: number): string {
  const msg = encodeURIComponent(
    `Hi Team Alum! I'd like to purchase the "${plan}" plan (${duration}) for ₹${price} for the Prompt Engineering Blueprint. Please share payment details. My email: socialsudarshan8@gmail.com`
  );
  return `https://wa.me/917775990933?text=${msg}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '…';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: [string, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [label, secondsInUnit] of intervals) {
    const count = Math.floor(seconds / secondsInUnit);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}
