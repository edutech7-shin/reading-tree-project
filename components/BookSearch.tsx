'use client'

import { useState } from 'react'

type BookResult = {
  title: string
  author: string
  coverUrl: string | null
  isbn?: string | null
  publisher?: string | null
  publicationYear?: string | null
  totalPages?: number | null
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
  const [pagesByIndex, setPagesByIndex] = useState<Record<number, string>>({})

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

  function handleSelect(book: BookResult, idx?: number) {
    let totalPages: number | null | undefined = book.totalPages
    if (typeof idx === 'number') {
      const raw = pagesByIndex[idx]
      if (raw && /^\d+$/.test(raw)) {
        totalPages = parseInt(raw, 10)
      }
    }
    onSelect({ ...book, totalPages: totalPages ?? null })
    setShowModal(false)
    setQuery('')
    setResults([])
    setPagesByIndex({})
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--grid-gap-md)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>🔍 책 검색</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: '#666' }}>
                  책 제목이나 저자 이름으로 검색해보세요
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setQuery('')
                  setResults([])
                  setError(null)
                  setPagesByIndex({})
                }}
                style={{
                  background: 'var(--color-background-secondary)',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#666',
                  padding: 0,
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0'
                  e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                aria-label="검색 창 닫기"
                title="닫기"
              >
                ×
              </button>
            </div>

            {searching && (
              <div style={{ 
                padding: 'var(--grid-gap-lg)', 
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{ fontSize: '48px', marginBottom: 'var(--grid-gap-sm)' }}>🔍</div>
                <p style={{ fontSize: 'var(--font-size-md)' }}>책을 찾고 있어요...</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: '#999', marginTop: 'var(--grid-gap-xs)' }}>
                  잠시만 기다려주세요
                </p>
              </div>
            )}

            {error && (
              <div style={{ 
                color: 'var(--color-negative)', 
                marginBottom: 12, 
                padding: 12, 
                backgroundColor: '#fee', 
                borderRadius: 'var(--radius-medium)',
                fontSize: 'var(--font-size-sm)',
                border: '1px solid #fcc'
              }}>
                <strong>⚠️ 오류:</strong> {error}
              </div>
            )}

            {!searching && results.length === 0 && !error && query && (
              <div style={{ 
                padding: 'var(--grid-gap-lg)', 
                textAlign: 'center',
                backgroundColor: 'var(--color-background-secondary)',
                borderRadius: 'var(--radius-medium)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: 'var(--grid-gap-sm)' }}>📚</div>
                <p style={{ color: '#666', fontSize: 'var(--font-size-md)', marginBottom: 'var(--grid-gap-xs)' }}>
                  검색 결과가 없어요
                </p>
                <p style={{ color: '#999', fontSize: 'var(--font-size-sm)' }}>
                  다른 키워드로 검색해보세요
                </p>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div style={{ 
                  marginBottom: 'var(--grid-gap-sm)', 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--color-background-secondary)', 
                  borderRadius: 'var(--radius-small)',
                  fontSize: 'var(--font-size-sm)',
                  color: '#666'
                }}>
                  💡 <strong>{results.length}권</strong>의 책을 찾았어요! 원하는 책을 선택해주세요.
                </div>
                <div style={{ display: 'grid', gap: 12, maxHeight: '400px', overflowY: 'auto', paddingRight: 4 }}>
                  {results.map((book, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 16,
                        border: '2px solid var(--color-border-light)',
                        borderRadius: 'var(--radius-medium)',
                        display: 'flex',
                        gap: 16,
                        alignItems: 'flex-start',
                        transition: 'all 0.2s',
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border-light)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          style={{ 
                            width: 80, 
                            height: 112, 
                            objectFit: 'cover', 
                            borderRadius: 'var(--radius-small)',
                            boxShadow: 'var(--shadow-card)',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 80,
                          height: 112,
                          backgroundColor: 'var(--color-background-secondary)',
                          borderRadius: 'var(--radius-small)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999',
                          fontSize: 'var(--font-size-xs)',
                          border: '2px dashed var(--color-border-medium)',
                          flexShrink: 0
                        }}>
                          표지 없음
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: 'var(--font-weight-semibold)', 
                          fontSize: 'var(--font-size-md)',
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {book.title}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginBottom: 8 }}>
                          {book.author}
                        </div>
                        {book.publisher && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: '#999', marginBottom: 12 }}>
                            {book.publisher} {book.publicationYear && `· ${book.publicationYear}`}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
                            <label htmlFor={`pages-${idx}`} style={{ fontSize: 'var(--font-size-xs)', color: '#666', fontWeight: 'var(--font-weight-semibold)' }}>
                              전체 페이지 수
                            </label>
                            <input
                              id={`pages-${idx}`}
                              name={`pages-${idx}`}
                              type="number"
                              min={1}
                              value={pagesByIndex[idx] ?? (book.totalPages ?? '')}
                              onChange={(e) => {
                                const value = e.target.value
                                setPagesByIndex((prev) => ({ ...prev, [idx]: value }))
                              }}
                              placeholder="예: 320"
                              style={{
                                padding: '10px 12px',
                                border: '1px solid var(--color-border-medium)',
                                borderRadius: 'var(--radius-small)',
                                fontSize: 'var(--font-size-sm)',
                                width: '100%',
                                minWidth: 120
                              }}
                              aria-label="전체 페이지 수 입력"
                            />
                          </div>
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => handleSelect(book, idx)}
                            style={{ 
                              whiteSpace: 'nowrap',
                              fontSize: 'var(--font-size-md)',
                              padding: '10px 20px',
                              minHeight: 44
                            }}
                            aria-label={`${book.title} 선택하기`}
                          >
                            ✅ 선택하기
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginTop: 20, textAlign: 'center', paddingTop: 16, borderTop: '1px solid var(--color-border-light)' }}>
              <button 
                className="btn" 
                onClick={() => {
                  setShowModal(false)
                  setQuery('')
                  setResults([])
                  setError(null)
                  setPagesByIndex({})
                }}
                style={{
                  fontSize: 'var(--font-size-md)',
                  padding: '12px 32px',
                  minWidth: 120
                }}
                aria-label="검색 취소"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

