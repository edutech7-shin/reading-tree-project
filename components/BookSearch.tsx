'use client'

import { useState } from 'react'

type BookResult = {
  title: string
  author: string
  coverUrl: string | null
  isbn?: string
}

type Props = {
  onSelect: (book: BookResult) => void
}

export default function BookSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<BookResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return

    setSearching(true)
    setError(null)

    try {
      // TODO: 실제 API 연동 (알라딘 또는 도서관 정보나루)
      // 현재는 기본 구조만 제공
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error('검색에 실패했습니다.')
      }

      const data = await response.json()
      setResults(data.books || [])
    } catch (err: any) {
      setError(err.message || '검색 중 오류가 발생했습니다.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(book: BookResult) {
    onSelect(book)
    setShowModal(false)
    setQuery('')
    setResults([])
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => setShowModal(true)}
        style={{ marginBottom: 12 }}
      >
        🔍 책 검색하기
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 24,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>책 검색</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="책 제목 또는 저자를 입력하세요"
                style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
              />
              <button className="btn primary" onClick={handleSearch} disabled={searching}>
                {searching ? '검색 중...' : '검색'}
              </button>
            </div>

            {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

            {results.length > 0 && (
              <div style={{ display: 'grid', gap: 8, maxHeight: '400px', overflow: 'auto' }}>
                {results.map((book, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelect(book)}
                    style={{
                      padding: 12,
                      border: '1px solid #eee',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white'
                    }}
                  >
                    {book.coverUrl && (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        style={{ width: 50, height: 70, objectFit: 'cover', borderRadius: 4 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{book.title}</div>
                      <div style={{ fontSize: 14, color: '#666' }}>{book.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button className="btn" onClick={() => setShowModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

