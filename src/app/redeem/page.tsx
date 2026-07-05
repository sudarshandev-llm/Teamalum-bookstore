'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LICENSE_REGEX = /^TA-PE-(1M|3M|LT)-[A-Z0-9]{6}$/

export default function RedeemPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmed = code.trim().toUpperCase()

    if (!LICENSE_REGEX.test(trimmed)) {
      setError('Invalid code format. Expected format: TA-PE-XX-XXXXXX')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be signed in to redeem a license.')
        return
      }

      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, userId: user.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to redeem license.')
        return
      }

      setSuccess('License redeemed successfully! Redirecting to your book...')
      setTimeout(() => router.push('/book'), 1500)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [code, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Redeem Your License</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your license code below to unlock the book. Your code should follow the format <span className="font-mono">TA-PE-XX-XXXXXX</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TA-PE-XX-XXXXXX"
              className="w-full px-4 py-3 text-center font-mono uppercase tracking-[0.2em] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={19}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Validating...' : 'Unlock Book'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have a license?{' '}
          <a href="/purchase" className="text-blue-600 dark:text-blue-400 hover:underline">
            Purchase one here
          </a>
        </p>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>Need help? Contact us:</p>
          <p>WhatsApp: +55 11 99999-9999</p>
          <p>Email: suporte@teamalum.com</p>
          <p>Phone: +55 11 3333-3333</p>
        </div>
      </div>
    </div>
  )
}
