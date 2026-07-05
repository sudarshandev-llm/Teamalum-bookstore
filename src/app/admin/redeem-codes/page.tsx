'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Loader2, Plus, X, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react'

interface RedeemCode {
  id: string
  code: string
  plan: string
  status: string
  used_by: string | null
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

type CodeStatus = 'all' | 'available' | 'assigned' | 'used' | 'revoked'

export default function AdminRedeemCodesPage() {
  const router = useRouter()
  const [codes, setCodes] = useState<RedeemCode[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<CodeStatus>('all')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genPlan, setGenPlan] = useState<'1M' | '3M' | 'LT'>('1M')
  const [genCount, setGenCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  const checkAdmin = useCallback(async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/login'); return false }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) { router.push('/dashboard'); return false }
    return true
  }, [router])

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/redeem-codes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCodes(data.codes)
        setPagination(data.pagination)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => {
    checkAdmin().then((ok) => { if (ok) { setChecking(false); fetchCodes() } })
  }, [checkAdmin, fetchCodes])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchCodes() }

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

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/licenses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `redeem-codes-${Date.now()}.csv`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* silent */ }
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await fetch('/api/admin/licenses/bulk', {
        method: 'POST',
        body: JSON.stringify({ action: 'import', file: file.name }),
      })
      fetchCodes()
    } catch { /* silent */ }
    e.target.value = ''
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

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  const statusOptions: { label: string; value: CodeStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Available', value: 'available' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'Used', value: 'used' },
    { label: 'Revoked', value: 'revoked' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Redeem Codes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowGenerate(true); setGeneratedCodes([]) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Generate
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            <Upload className="w-4 h-4" /> Import CSV
            <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          </label>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code..."
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
                  <button onClick={downloadCsv} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
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
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : codes.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No codes found</td></tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">{c.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{c.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'available' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : c.status === 'assigned' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : c.status === 'used' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.used_by || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= (pagination?.totalPages ?? 1)}
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
