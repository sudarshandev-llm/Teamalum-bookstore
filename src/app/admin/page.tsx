'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Key, BookOpen, IndianRupee, Loader2 } from 'lucide-react'

interface Stats {
  total_users: number
  active_licenses: number
  total_books: number
  total_revenue: number
  recent_signups: { id: string; name: string; email: string; created_at: string }[]
  license_breakdown: Record<string, number>
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        router.push('/dashboard')
        return
      }
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // fallback handled by null state
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Active Licenses', value: stats?.active_licenses ?? 0, icon: Key, color: 'text-green-600' },
    { label: 'Books Published', value: stats?.total_books ?? 0, icon: BookOpen, color: 'text-purple-600' },
    { label: 'Revenue', value: `₹${(stats?.total_revenue ?? 0).toLocaleString()}`, icon: IndianRupee, color: 'text-amber-600' },
  ]

  const breakdown = stats?.license_breakdown ?? {}
  const totalLicenses = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-800 ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Signups</h3>
          {stats?.recent_signups && stats.recent_signups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_signups.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800/50">
                      <td className="py-2.5 text-gray-900 dark:text-white">{user.name || '—'}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{user.email}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No recent signups</p>
          )}
        </section>

        {/* License breakdown */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">License Breakdown</h3>
          {Object.keys(breakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(breakdown).map(([plan, count]) => (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{plan}</span>
                    <span className="text-gray-500 dark:text-gray-400">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${(count / totalLicenses) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No license data</p>
          )}
        </section>
      </div>
    </div>
  )
}
