'use client'

import { useState } from 'react'

type BookResult = {
  title: string
  author: string
  coverUrl: string | null
  isbn?: string | null
  publisher?: string | null
  publicationYear?: string | null
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
    setResults([])

    try {
      console.log('[BookSearch] Searching for:', query)
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '검색에 실패했습니다.' }))
        throw new Error(errorData.error || `검색 실패 (${response.status})`)
      }

      const data = await response.json()
      console.log('[BookSearch] Response:', data)
      
      // 브라우저 콘솔에서 API 응답 상세 확인
      if (data.books && data.books.length > 0) {
        console.log('[BookSearch] 첫 번째 책의 상세 정보:', data.books[0])
        console.log('[BookSearch] 첫 번째 책의 필드:', Object.keys(data.books[0]))
        console.log('[BookSearch] ISBN:', data.books[0].isbn)
        console.log('[BookSearch] 출판사:', data.books[0].publisher)
        console.log('[BookSearch] 출판연도:', data.books[0].publicationYear)
      }
      
      if (data.error) {
        setError(data.error)
        setResults([])
        setShowModal(true) // 에러가 있어도 모달 표시
      } else {
        setResults(data.books || [])
        if (!data.books || data.books.length === 0) {
          setError('검색 결과가 없습니다.')
        }
        setShowModal(true) // 검색 결과가 있으면 모달 표시
      }
    } catch (err: any) {
      console.error('[BookSearch] Error:', err)
      setError(err.message || '검색 중 오류가 발생했습니다.')
      setResults([])
      setShowModal(true) // 에러 발생 시에도 모달 표시
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
      <div style={{ display: 'flex', gap: 'var(--grid-gap-xs)', alignItems: 'center' }}>
        <label htmlFor="book-search-query" style={{ display: 'none' }}>책 제목 또는 저자</label>
        <input
          id="book-search-query"
          name="book-search-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearch()
            }
          }}
          onClick={() => {
            if (results.length > 0 || error) {
              setShowModal(true)
            }
          }}
          placeholder="책 제목 또는 저자를 입력하세요"
          style={{ 
            flex: 1, 
            padding: 'var(--grid-gap-sm) var(--grid-gap-md)', 
            border: '1px solid var(--color-border-medium)', 
            borderRadius: 'var(--radius-small)',
            fontSize: 'var(--font-size-md)',
            fontFamily: 'inherit'
          }}
        />
        <button 
          type="button"
          className="btn primary" 
          onClick={handleSearch} 
          disabled={searching || !query.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {searching ? '검색 중...' : '🔍 검색'}
        </button>
      </div>

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
            <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-md)' }}>검색 결과</h3>

            {error && (
              <div style={{ 
                color: 'crimson', 
                marginBottom: 12, 
                padding: 8, 
                backgroundColor: '#fee', 
                borderRadius: 4 
              }}>
                {error}
              </div>
            )}

            {!searching && results.length === 0 && !error && query && (
              <div style={{ 
                color: '#666', 
                marginBottom: 12, 
                padding: 8, 
                textAlign: 'center' 
              }}>
                검색 결과가 없습니다.
              </div>
            )}

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
                      {book.publisher && (
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                          {book.publisher} {book.publicationYear && `· ${book.publicationYear}`}
                        </div>
                      )}
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

