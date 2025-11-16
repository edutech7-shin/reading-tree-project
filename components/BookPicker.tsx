'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'

type UserBookItem = {
  id: number
  title: string
  author: string
  coverUrl: string | null
  isbn?: string | null
  publisher?: string | null
  publicationYear?: string | null
  totalPages?: number | null
  createdAt?: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (book: UserBookItem) => void
}

export default function BookPicker({ open, onClose, onSelect }: Props) {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<UserBookItem[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'oldest' | 'title'>('recent')

  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('user_books')
        .select('id, book_title, book_author, book_cover_url, book_publisher, book_isbn, book_publication_year, book_total_pages, created_at')
        .eq('user_id', user.id)
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      const mapped = (data || []).map((b: any) => ({
        id: b.id as number,
        title: b.book_title || '',
        author: b.book_author || '',
        coverUrl: b.book_cover_url || null,
        isbn: b.book_isbn || null,
        publisher: b.book_publisher || null,
        publicationYear: b.book_publication_year || null,
        totalPages: b.book_total_pages ?? null,
        createdAt: b.created_at
      }))
      setItems(mapped)
      setLoading(false)
    })()
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = items.filter(b => {
      if (!q) return true
      return (
        (b.title || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.publisher || '').toLowerCase().includes(q) ||
        (b.isbn || '').toLowerCase().includes(q)
      )
    })
    if (sort === 'recent') {
      arr = arr.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    } else if (sort === 'oldest') {
      arr = arr.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    } else if (sort === 'title') {
      arr = arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'))
    }
    return arr
  }, [items, query, sort])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 16,
          maxWidth: 720,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="책장 내에서 검색 (제목/저자/출판사/ISBN)"
            style={{
              flex: 1,
              padding: 'var(--grid-gap-sm) var(--grid-gap-md)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 'var(--radius-small)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'inherit'
            }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            style={{ height: 44 }}
          >
            <option value="recent">최근 추가순</option>
            <option value="oldest">오래된 순</option>
            <option value="title">제목 가나다 순</option>
          </select>
        </div>

        {loading ? (
          <div style={{ color: '#666', padding: 12 }}>불러오는 중...</div>
        ) : error ? (
          <div className="bg-negative-light text-negative" style={{ padding: 12, borderRadius: 6 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#666', padding: 12 }}>책장이 비어있거나 결과가 없습니다.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {filtered.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: 12,
                  border: '1px solid #eee',
                  borderRadius: 8,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  cursor: 'pointer'
                }}
                onClick={() => onSelect(b)}
              >
                {b.coverUrl && (
                  <img src={b.coverUrl} alt={b.title} style={{ width: 50, height: 70, objectFit: 'cover', borderRadius: 4 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{b.title}</div>
                  <div style={{ fontSize: 14, color: '#666' }}>{b.author}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {(b.publisher || '')}{b.publicationYear ? ` · ${b.publicationYear}` : ''}
                  </div>
                </div>
                <button className="btn primary" type="button" onClick={() => onSelect(b)}>선택</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}


