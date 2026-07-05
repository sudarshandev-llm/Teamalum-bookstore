'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  name: string
  email: string
  avatar_url?: string
}

interface License {
  id: string
  plan: string
  status: string
  expires_at: string
}

interface BookProgress {
  id: string
  title: string
  progress: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [progress, setProgress] = useState<BookProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const [profileRes, licensesRes, progressRes] = await Promise.all([
        supabase.from('profiles').select('name, email, avatar_url').eq('id', user.id).single(),
        supabase.from('licenses').select('id, plan, status, expires_at').eq('user_id', user.id),
        supabase.from('reading_progress').select('id, title, progress').eq('user_id', user.id),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (licensesRes.data) setLicenses(licensesRes.data)
      if (progressRes.data) setProgress(progressRes.data)
      setLoading(false)
    }

    fetchData()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Profile */}
        <section className="flex items-center gap-4">
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile?.name || 'User'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
          </div>
        </section>

        {/* Licenses */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Your Licenses</h2>
          {licenses.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No active licenses.</p>
          ) : (
            <div className="space-y-3">
              {licenses.map((lic) => (
                <div
                  key={lic.id}
                  className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <p className="font-medium">{lic.plan}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Status: {lic.status} &middot; Expires: {new Date(lic.expires_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reading Progress */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Reading Progress</h2>
          {progress.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No books in progress.</p>
          ) : (
            <div className="space-y-4">
              {progress.map((book) => (
                <div key={book.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{book.title}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{book.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="flex flex-wrap gap-3">
          <a
            href="/books"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Book Catalog
          </a>
          <a
            href="/redeem"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Redeem License
          </a>
          <a
            href="/support"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Support
          </a>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  )
}
