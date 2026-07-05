'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, Key, BarChart3, LifeBuoy, ScrollText, Menu, X, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/licenses', label: 'Licenses', icon: Key },
  { href: '/admin/redeem-codes', label: 'Redeem Codes', icon: ScrollText },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, role')
        .eq('id', user.id)
        .single()
      if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        router.push('/dashboard')
        return
      }
      setProfile(profile)
      setChecking(false)
    }
    checkAdmin()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Admin</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {profile?.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {profile?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {navItems.find((i) => i.href === pathname)?.label || 'Admin'}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              {profile?.email}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
