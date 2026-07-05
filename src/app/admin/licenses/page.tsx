'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Loader2, Plus, X, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface License {
  id: string
  code: string
  plan: string
  status: string
  user_id: string
  created_at: string
  expires_at: string
  profiles?: { full_name: string; email: string }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

type LicenseStatus = 'all' | 'active' | 'expired' | 'revoked' | 'pending'

export default function AdminLicensesPage() {
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<LicenseStatus>('all')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genPlan, setGenPlan] = useState<'1M' | '3M' | 'LT'>('1M')
  const [genCount, setGenCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const checkAdmin = useCallback(async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/login'); return false }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) { router.push('/dashboard'); return false }
    return true
  }, [router])

  const fetchLicenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/licenses?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLicenses(data.licenses)
        setPagination(data.pagination)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => {
    checkAdmin().then((ok) => { if (ok) { setChecking(false); fetchLicenses() } })
  }, [checkAdmin, fetchLicenses])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLicenses() }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', plan: genPlan, count: genCount }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedCodes(data.codes.map((c: { code: string }) => c.code))
      }
    } catch { /* silent */ }
    setGenerating(false)
  }

  const downloadCsv = () => {
    if (generatedCodes.length === 0) return
    const csv = 'code\n' + generatedCodes.map((c) => c).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `generated-codes-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleAction = async (licenseId: string, action: string) => {
    setActionLoading(licenseId)
    try {
      await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      fetchLicenses()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleDelete = async (licenseId: string) => {
    if (!confirm('Are you sure you want to delete this license?')) return
    setActionLoading(licenseId)
    try {
      await fetch(`/api/admin/licenses/${licenseId}`, { method: 'DELETE' })
      fetchLicenses()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  const statusOptions: { label: string; value: LicenseStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Expired', value: 'expired' },
    { label: 'Revoked', value: 'revoked' },
    { label: 'Pending', value: 'pending' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Licenses</h1>
        <button
          onClick={() => { setShowGenerate(true); setGeneratedCodes([]) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Generate Codes
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGenerate(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Codes</h3>
              <button onClick={() => setShowGenerate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
              <select
                value={genPlan}
                onChange={(e) => setGenPlan(e.target.value as '1M' | '3M' | 'LT')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1M">1 Month</option>
                <option value="3M">3 Months</option>
                <option value="LT">Lifetime</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Count (1-100)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={genCount}
                onChange={(e) => setGenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {generatedCodes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Generated Codes</span>
                  <button
                    onClick={downloadCsv}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                  {generatedCodes.map((code, i) => (
                    <div key={i} className="text-sm text-gray-700 dark:text-gray-300 font-mono">{code}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => setShowGenerate(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : licenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No licenses found</td></tr>
              ) : (
                licenses.map((lic) => (
                  <tr key={lic.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">{lic.code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {lic.profiles?.full_name || lic.profiles?.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{lic.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lic.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : lic.status === 'expired' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : lic.status === 'revoked' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(lic.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAction(lic.id, 'extend')}
                          disabled={actionLoading === lic.id}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => handleAction(lic.id, 'deactivate')}
                          disabled={actionLoading === lic.id}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                        <button
                          onClick={() => handleDelete(lic.id)}
                          disabled={actionLoading === lic.id}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
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
