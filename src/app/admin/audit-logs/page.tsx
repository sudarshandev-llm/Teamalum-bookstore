'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  resource: string
  user_id: string
  user_name?: string
  created_at: string
  ip_address?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const actionTypes = [
  { label: 'All', value: '' },
  { label: 'Generate Codes', value: 'generate_codes' },
  { label: 'Extend License', value: 'extend_license' },
  { label: 'Deactivate License', value: 'deactivate_license' },
  { label: 'Delete License', value: 'delete_license' },
  { label: 'User Update', value: 'user_update' },
  { label: 'Login', value: 'login' },
  { label: 'Other', value: 'other' },
]

export default function AdminAuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const checkAdmin = useCallback(async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/login'); return false }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) { router.push('/dashboard'); return false }
    return true
  }, [router])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      if (search) params.set('search', search)
      if (actionFilter) params.set('action', actionFilter)
      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? data)
        setPagination(data.pagination ?? null)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [page, search, actionFilter])

  useEffect(() => {
    checkAdmin().then((ok) => { if (ok) { setChecking(false); fetchLogs() } })
  }, [checkAdmin, fetchLogs])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLogs() }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search user or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          {actionTypes.map((a) => (
            <button
              key={a.value}
              onClick={() => { setActionFilter(a.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                actionFilter === a.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No audit logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{log.resource}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.user_name || log.user_id || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{log.ip_address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
