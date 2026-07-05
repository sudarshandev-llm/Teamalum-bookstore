'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, CheckCircle } from 'lucide-react'

interface Ticket {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'read' | 'unread'
  created_at: string
}

export default function AdminSupportPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const checkAdmin = useCallback(async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/login'); return false }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) { router.push('/dashboard'); return false }
    return true
  }, [router])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support')
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets ?? data)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    checkAdmin().then((ok) => { if (ok) { setChecking(false); fetchTickets() } })
  }, [checkAdmin, fetchTickets])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/support`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'read' }),
      })
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'read' as const } : t))
      )
    } catch { /* silent */ }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Mail className="w-4 h-4" />
          <span>{tickets.filter((t) => t.status === 'unread').length} unread</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No support tickets</td></tr>
              ) : (
                tickets.map((ticket) => (
                  <>
                    <tr
                      key={ticket.id}
                      onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                      className={`border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer ${
                        ticket.status === 'unread' ? 'font-semibold' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{ticket.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{ticket.email}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{ticket.subject}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ticket.status === 'unread'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ticket.status === 'unread' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(ticket.id) }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Mark Read
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === ticket.id && (
                      <tr key={`${ticket.id}-msg`} className="bg-gray-50 dark:bg-gray-800/20">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {ticket.message}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
