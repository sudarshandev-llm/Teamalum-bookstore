'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Chapter {
  id: string
  book_id: string
  title: string
  content: string
  chapter_number: number
  is_premium: boolean
  est_read_time: number
}

interface Book {
  id: string
  title: string
  slug: string
}

interface ReadingProgress {
  id: string
  progress: number
  last_position: string
}

export default function ChapterReaderPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const chapterId = params.chapterId as string

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [progress, setProgress] = useState<number>(0)
  const [hasLicense, setHasLicense] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [fontSize, setFontSize] = useState(18)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({})

  const contentRef = useRef<HTMLDivElement>(null)
  const progressSavedRef = useRef<number>(0)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const { data: bookData } = await supabase
        .from('books')
        .select('id, title, slug')
        .eq('slug', slug)
        .single()

      if (!bookData) {
        setLoading(false)
        return
      }

      setBook(bookData)

      const { data: chapterData } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single()

      if (!chapterData) {
        setLoading(false)
        return
      }

      setChapter(chapterData)

      const { data: allChapters } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookData.id)
        .order('chapter_number', { ascending: true })

      if (allChapters) {
        setChapters(allChapters)
      }

      if (chapterData.is_premium && session) {
        const { data: licenses } = await supabase
          .from('licenses')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('book_id', bookData.id)
          .gte('expires_at', new Date().toISOString())
          .limit(1)

        if (licenses && licenses.length > 0) {
          setHasLicense(true)
        } else {
          router.push(`/purchase?book=${slug}`)
          return
        }
      } else if (chapterData.is_premium && !session) {
        router.push(`/login?redirect=/book/${slug}/chapter/${chapterId}`)
        return
      } else {
        setHasLicense(true)
      }

      if (session) {
        const { data: existingProgress } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('chapter_id', chapterId)
          .maybeSingle()

        if (existingProgress) {
          setProgress(existingProgress.progress)
          progressSavedRef.current = existingProgress.progress
        }

        const { data: bookmark } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('chapter_id', chapterId)
          .maybeSingle()

        setIsBookmarked(!!bookmark)
      }

      setLoading(false)
    }

    fetchData()
  }, [slug, chapterId, router])

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement
    const scrollPercent = Math.min(
      100,
      Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
    )

    setProgress(scrollPercent)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    const saveProgress = async () => {
      if (Math.abs(progress - progressSavedRef.current) < 5) return

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: existing } = await supabase
        .from('reading_progress')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('chapter_id', chapterId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('reading_progress')
          .update({ progress, last_position: `scroll_${progress}`, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('reading_progress')
          .insert({ user_id: session.user.id, chapter_id: chapterId, book_id: book?.id, progress, last_position: `scroll_${progress}` })
      }

      progressSavedRef.current = progress
    }

    const timeout = setTimeout(saveProgress, 2000)
    return () => clearTimeout(timeout)
  }, [progress, chapterId, book?.id])

  const toggleBookmark = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    if (isBookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', session.user.id)
        .eq('chapter_id', chapterId)
      setIsBookmarked(false)
    } else {
      await supabase
        .from('bookmarks')
        .insert({ user_id: session.user.id, chapter_id: chapterId, book_id: book?.id })
      setIsBookmarked(true)
    }
  }

  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyStates((prev) => ({ ...prev, [index]: true }))
      setTimeout(() => {
        setCopyStates((prev) => ({ ...prev, [index]: false }))
      }, 2000)
    } catch {
      // clipboard not available
    }
  }

  const currentIndex = chapters.findIndex((c) => c.id === chapterId)
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!chapter || !hasLicense) {
    return null
  }

  const renderedContent = chapter.content
    ? chapter.content.split(/(```[\s\S]*?```)/g).map((segment, idx) => {
        const codeMatch = segment.match(/```(?:\w+)?\n([\s\S]*?)```/)
        if (codeMatch) {
          const code = codeMatch[1]
          return (
            <div key={idx} className="group relative my-4 overflow-hidden rounded-lg bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
                <span className="text-xs text-gray-400">Code</span>
                <button
                  onClick={() => copyCode(code, idx)}
                  className="rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                >
                  {copyStates[idx] ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 text-sm text-gray-100">
                <code>{code}</code>
              </pre>
            </div>
          )
        }
        return (
          <div key={idx} className="prose prose-gray max-w-none dark:prose-invert">
            {segment}
          </div>
        )
      })
    : null

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Link
                href={`/book/${slug}`}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                &larr; {book?.title}
              </Link>
              <span className="text-sm text-gray-400 dark:text-gray-500">|</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ch. {chapter.chapter_number}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleBookmark}
                className={`rounded-lg p-2 transition-colors ${
                  isBookmarked
                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <svg className="h-5 w-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Decrease font size"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-8 text-center text-xs text-gray-500 dark:text-gray-400">{fontSize}</span>
                <button
                  onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Increase font size"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => setIsDarkMode((d) => !d)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Toggle dark mode"
              >
                {isDarkMode ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-4xl px-4 py-8">
          <h1
            className="font-bold text-gray-900 dark:text-white"
            style={{ fontSize: `${fontSize + 10}px` }}
          >
            Chapter {chapter.chapter_number}: {chapter.title}
          </h1>

          <div
            ref={contentRef}
            className="mt-8 leading-relaxed text-gray-800 dark:text-gray-200"
            style={{ fontSize: `${fontSize}px` }}
          >
            {renderedContent || (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Content coming soon.
              </p>
            )}
          </div>

          <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
            {prevChapter ? (
              <Link
                href={`/book/${slug}/chapter/${prevChapter.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                &larr; {prevChapter.title}
              </Link>
            ) : (
              <div />
            )}

            {nextChapter ? (
              <Link
                href={`/book/${slug}/chapter/${nextChapter.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {nextChapter.title} &rarr;
              </Link>
            ) : (
              <Link
                href={`/book/${slug}`}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Complete &amp; Review &rarr;
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
