'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Book {
  id: string
  title: string
  slug: string
  author: string
  description: string
  cover_url: string
  is_published: boolean
}

export default function BookCatalogPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBooks() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('books')
        .select('id, title, slug, author, description, cover_url, is_published')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setBooks(data)
      }
      setLoading(false)
    }

    fetchBooks()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          Book Catalog
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Explore our collection of books and start learning.
        </p>

        {books.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-lg text-gray-500 dark:text-gray-400">
              No books available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={book.cover_url || '/book-cover.png'}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute left-2 top-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow">
                    FREE Preview
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {book.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    by {book.author}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                    {book.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'].map((ch) => (
                      <span
                        key={ch}
                        className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      >
                        {ch}
                      </span>
                    ))}
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Free Preview
                    </span>
                  </div>
                  <Link
                    href={`/book/${book.slug}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    Read More
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
