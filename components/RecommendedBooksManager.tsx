'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'
import BookSearch from './BookSearch'

type RecommendedBook = {
  id: number
  book_title: string
  book_author: string | null
  book_cover_url: string | null
  book_isbn: string | null
  book_publisher: string | null
  book_publication_year: string | null
  book_total_pages: number | null
  description: string | null
  display_order: number
}

export default function RecommendedBooksManager() {
  const supabase = getSupabaseClient()
  const [books, setBooks] = useState<RecommendedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBook, setEditingBook] = useState<RecommendedBook | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadBooks() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from('teacher_recommended_books')
        .select('*')
        .eq('teacher_id', user.id)
        .order('display_order', { ascending: true })
        .limit(5)

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setBooks(data || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  async function handleAddBook(book: {
    title: string
    author: string | null
    coverUrl: string | null
    isbn?: string | null
    publisher?: string | null
    publicationYear?: string | null
    totalPages?: number | null
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 최대 5권까지만 허용
      if (books.length >= 5) {
        setError('추천 도서는 최대 5권까지 등록할 수 있습니다.')
        return
      }

      const { error: insertError } = await supabase
        .from('teacher_recommended_books')
        .insert({
          teacher_id: user.id,
          book_title: book.title,
          book_author: book.author || null,
          book_cover_url: book.coverUrl || null,
          book_isbn: book.isbn || null,
          book_publisher: book.publisher || null,
          book_publication_year: book.publicationYear || null,
          book_total_pages: book.totalPages ?? null,
          display_order: books.length + 1
        })

      if (insertError) {
        setError(insertError.message)
      } else {
        setShowAddForm(false)
        await loadBooks()
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDeleteBook(bookId: number) {
    if (!confirm('이 추천 도서를 삭제하시겠습니까?')) return

    try {
      const { error: deleteError } = await supabase
        .from('teacher_recommended_books')
        .delete()
        .eq('id', bookId)

      if (deleteError) {
        setError(deleteError.message)
      } else {
        await loadBooks()
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}>로딩 중...</div>
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>선생님 추천 도서 (최대 5권)</h3>
        {books.length < 5 && !showAddForm && (
          <button
            className="btn primary"
            onClick={() => setShowAddForm(true)}
            style={{ fontSize: 'var(--font-size-sm)', padding: '8px 16px' }}
          >
            + 도서 추가
          </button>
        )}
      </div>

      {error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#fee', 
          color: '#c33', 
          borderRadius: 6, 
          marginBottom: 12,
          fontSize: 'var(--font-size-sm)'
        }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid var(--color-border)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>추천 도서 추가</h4>
            <button
              className="btn"
              onClick={() => setShowAddForm(false)}
              style={{ fontSize: 'var(--font-size-sm)', padding: '4px 8px' }}
            >
              취소
            </button>
          </div>
          <BookSearch onSelect={handleAddBook} />
        </div>
      )}

      {books.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 24, fontSize: 14 }}>
          등록된 추천 도서가 없습니다.
          <br />
          위의 "도서 추가" 버튼을 눌러 추천 도서를 등록해주세요.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {books.map((book) => (
            <div
              key={book.id}
              style={{
                padding: 12,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}
            >
              {book.book_cover_url && (
                <img
                  src={book.book_cover_url}
                  alt={book.book_title}
                  style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 4 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {book.book_title}
                </div>
                {book.book_author && (
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                    {book.book_author}
                  </div>
                )}
                {book.book_publisher && (
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {book.book_publisher}
                    {book.book_publication_year && ` · ${book.book_publication_year}`}
                  </div>
                )}
              </div>
              <button
                className="btn"
                onClick={() => handleDeleteBook(book.id)}
                style={{
                  fontSize: 'var(--font-size-sm)',
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none'
                }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
