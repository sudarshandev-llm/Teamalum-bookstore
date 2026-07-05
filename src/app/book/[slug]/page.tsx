'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Book {
  id: string
  title: string
  slug: string
  author: string
  description: string
  cover_url: string
  chapters_count: number
  examples_count: number
  templates_count: number
  what_you_learn: string[]
  prerequisites: string[]
  is_published: boolean
}

interface Chapter {
  id: string
  book_id: string
  title: string
  slug: string
  chapter_number: number
  is_premium: boolean
  est_read_time: number
}

export default function BookDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBook() {
      const supabase = createClient()
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

      if (bookError || !bookData) {
        setLoading(false)
        return
      }

      setBook(bookData)

      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookData.id)
        .order('chapter_number', { ascending: true })

      if (chaptersData) {
        setChapters(chaptersData)
      }

      setLoading(false)
    }

    fetchBook()
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Book not found</h2>
        <Link
          href="/book/catalog"
          className="mt-4 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          &larr; Back to catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/book/catalog"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; Back to catalog
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[400px_1fr]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            <Image
              src={book.cover_url || '/book-cover.png'}
              alt={book.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {book.title}
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              by {book.author}
            </p>

            <p className="mt-4 text-gray-700 dark:text-gray-300">{book.description}</p>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {book.chapters_count}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Chapters</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {book.examples_count}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Examples</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {book.templates_count}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Templates</p>
              </div>
            </div>

            {book.what_you_learn && book.what_you_learn.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  What You&apos;ll Learn
                </h2>
                <ul className="mt-3 list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300">
                  {book.what_you_learn.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {book.prerequisites && book.prerequisites.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Prerequisites
                </h2>
                <ul className="mt-3 list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300">
                  {book.prerequisites.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={`/book/${book.slug}/chapter/${chapters[0]?.id || ''}`}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Read Preview
              </Link>
              <Link
                href="/purchase"
                className="inline-flex items-center rounded-lg border border-indigo-600 px-6 py-3 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950"
              >
                Get Full Access
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Instant Access
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Lifetime Updates
              </span>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                24/7 Support
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Money-back Guarantee
              </span>
            </div>

            {chapters.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Chapters
                </h2>
                <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {chapter.chapter_number}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {chapter.title}
                          </p>
                          {chapter.est_read_time > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ~{chapter.est_read_time} min read
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {chapter.is_premium ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Premium
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Free
                          </span>
                        )}
                        {!chapter.is_premium && (
                          <Link
                            href={`/book/${book.slug}/chapter/${chapter.id}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          >
                            Read
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
