'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Menu, X, Sun, Moon, LogOut, BookOpen, ShoppingCart, LayoutDashboard, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Book', icon: BookOpen },
  { href: '/purchase', label: 'Purchase', icon: ShoppingCart },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then((res: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
      const session = res.data.session;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: import('@supabase/supabase-js').Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??';

  const isAdmin = user?.email === 'admin@teamalum.com';

  const links = [
    ...navLinks,
    ...(user ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-bright/10 bg-paper/80 backdrop-blur-lg dark:bg-ink/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl font-bold tracking-wider text-blue-deep dark:text-white">
            TEAM <span className="text-gold">ALUM</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 font-mono text-xs font-medium uppercase tracking-wider transition-colors',
                  isActive
                    ? 'bg-blue-bright/10 text-blue-bright dark:text-blue-bright'
                    : 'text-ink-soft hover:bg-blue-bright/5 hover:text-blue-deep dark:hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-blue-bright/10 hover:text-blue-deep dark:hover:text-white"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-blue-bright/10" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-bright text-xs font-bold text-white transition-transform hover:scale-105"
              >
                {initials}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-blue-bright/10 bg-paper shadow-soft dark:bg-ink dark:border-white/10">
                  <div className="border-b border-blue-bright/10 px-4 py-3 dark:border-white/10">
                    <p className="truncate text-sm font-medium text-ink dark:text-white">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-blue-bright/5 hover:text-blue-deep dark:hover:text-white"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-blue-bright/5 hover:text-danger"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-deep px-5 py-2 font-mono text-xs font-medium uppercase tracking-wider text-white transition-transform hover:-translate-y-0.5 dark:bg-blue-bright"
            >
              Login
            </Link>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-blue-bright/10 hover:text-blue-deep md:hidden dark:hover:text-white"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed bottom-0 left-0 top-16 z-50 w-64 border-r border-blue-bright/10 bg-paper p-6 shadow-strong md:hidden dark:bg-ink dark:border-white/10">
            <nav className="flex flex-col gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 font-mono text-xs font-medium uppercase tracking-wider transition-colors',
                      isActive
                        ? 'bg-blue-bright/10 text-blue-bright'
                        : 'text-ink-soft hover:bg-blue-bright/5 hover:text-blue-deep dark:hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
