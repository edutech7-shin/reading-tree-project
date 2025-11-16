'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'
import BookSearch from './BookSearch'

type UserBook = {
  id: number
  book_title: string | null
  book_author: string | null
  book_cover_url: string | null
  book_publisher: string | null
  book_isbn: string | null
  book_publication_year: string | null
  book_total_pages: number | null
  status: 'reading' | 'finished'
}

export default function UserBooks() {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [reading, setReading] = useState<UserBook[]>([])
  const [finished, setFinished] = useState<UserBook[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('user_books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const r: UserBook[] = []
    const f: UserBook[] = []
    for (const b of data as any[]) {
      if (b.status === 'finished') f.push(b as UserBook)
      else r.push(b as UserBook)
    }
    setReading(r)
    setFinished(f)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addBook(book: { 
    title: string
    author: string
    coverUrl: string | null
    isbn?: string | null
    publisher?: string | null
    publicationYear?: string | null
    totalPages?: number | null
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('user_books').insert({
      user_id: user.id,
      book_title: book.title || null,
      book_author: book.author || null,
      book_cover_url: book.coverUrl || null,
      book_publisher: book.publisher || null,
      book_isbn: book.isbn || null,
      book_publication_year: book.publicationYear || null,
      book_total_pages: book.totalPages ?? null,
      status: 'reading'
    } as any)
    if (error) {
      setError(error.message)
      return
    }
    setShowSearch(false)
    await load()
  }

  async function toggleStatus(book: UserBook) {
    const next = book.status === 'reading' ? 'finished' : 'reading'
    const { error } = await supabase.from('user_books')
      .update({ status: next } as any)
      .eq('id', book.id)
    if (error) {
      setError(error.message)
      return
    }
    await load()
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>내 책장</h3>
        <button className="btn primary" onClick={() => setShowSearch(true)}>＋ 새 책 추가</button>
      </div>

      {error && (
        <div className="bg-negative-light text-negative" style={{ padding: 12, borderRadius: 6, marginTop: 12 }}>
          {error}
        </div>
      )}

      {showSearch && (
        <div style={{ marginTop: 12 }}>
          <BookSearch onSelect={addBook} />
        </div>
      )}

      {loading ? (
        <p style={{ color: '#999', padding: 12 }}>불러오는 중...</p>
      ) : (
        <>
          <section style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0' }}>읽고 있어요</h4>
            {reading.length === 0 ? (
              <p style={{ color: '#999', padding: 8 }}>읽고 있는 책이 없습니다.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {reading.map((b) => (
                  <div key={b.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'flex', gap: 12 }}>
                    {b.book_cover_url && (
                      <img src={b.book_cover_url} alt={b.book_title ?? ''} style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 4 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{b.book_title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{b.book_author}</div>
                      <button className="btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => toggleStatus(b)}>
                        완료로 이동
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 16 }}>
            <h4 style={{ margin: '8px 0' }}>다 읽었어요</h4>
            {finished.length === 0 ? (
              <p style={{ color: '#999', padding: 8 }}>다 읽은 책이 없습니다.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {finished.map((b) => (
                  <div key={b.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'flex', gap: 12 }}>
                    {b.book_cover_url && (
                      <img src={b.book_cover_url} alt={b.book_title ?? ''} style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 4 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{b.book_title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{b.book_author}</div>
                      <button className="btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => toggleStatus(b)}>
                        다시 읽는 중
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}


