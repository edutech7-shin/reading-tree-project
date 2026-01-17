'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'
import BookSearch from './BookSearch'
import { useRouter } from 'next/navigation'

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
  created_at?: string
}

type SortOption = 'recent' | 'title' | 'author'

export default function UserBooks() {
  const supabase = getSupabaseClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reading, setReading] = useState<UserBook[]>([])
  const [finished, setFinished] = useState<UserBook[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<UserBook | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserBook | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('recent')
  const [filterStatus, setFilterStatus] = useState<'all' | 'reading' | 'finished'>('all')
  const [readingPage, setReadingPage] = useState(1)
  const [finishedPage, setFinishedPage] = useState(1)
  const [filteredPage, setFilteredPage] = useState(1)

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
    
    // 정렬 적용
    const sortBooks = (books: UserBook[]) => {
      const sorted = [...books]
      switch (sortOption) {
        case 'title':
          sorted.sort((a, b) => (a.book_title || '').localeCompare(b.book_title || ''))
          break
        case 'author':
          sorted.sort((a, b) => (a.book_author || '').localeCompare(b.book_author || ''))
          break
        case 'recent':
        default:
          sorted.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
            return dateB - dateA
          })
          break
      }
      return sorted
    }
    
    setReading(sortBooks(r))
    setFinished(sortBooks(f))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sortOption])

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setFilteredPage(1)
  }, [filterStatus])

  async function addBook(book: { 
    title: string
    author: string | null
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

  async function deleteBook(book: UserBook) {
    const { error } = await supabase.from('user_books')
      .delete()
      .eq('id', book.id)
    if (error) {
      setError(error.message)
      return
    }
    setShowDeleteConfirm(null)
    await load()
  }

  // 독서록 작성 페이지로 이동
  function goToRecord(book: UserBook) {
    router.push('/record')
  }

  // 통계 계산
  const totalBooks = reading.length + finished.length
  const readingCount = reading.length
  const finishedCount = finished.length

  // 필터링된 책 목록
  const getFilteredBooks = () => {
    if (filterStatus === 'reading') return reading
    if (filterStatus === 'finished') return finished
    return [...reading, ...finished]
  }

  // 페이지네이션 상수
  const BOOKS_PER_PAGE = 5

  // 페이지네이션된 책 목록
  const getPaginatedReading = () => {
    const start = (readingPage - 1) * BOOKS_PER_PAGE
    return reading.slice(start, start + BOOKS_PER_PAGE)
  }

  const getPaginatedFinished = () => {
    const start = (finishedPage - 1) * BOOKS_PER_PAGE
    return finished.slice(start, start + BOOKS_PER_PAGE)
  }

  const getPaginatedFiltered = () => {
    const books = getFilteredBooks()
    const start = (filteredPage - 1) * BOOKS_PER_PAGE
    return books.slice(start, start + BOOKS_PER_PAGE)
  }

  // 총 페이지 수 계산
  const getTotalPages = (books: UserBook[]) => Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE))

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        button:focus-visible {
          outline: 3px solid var(--color-primary);
          outline-offset: 2px;
        }
      `}} />
      
      <div className="card" style={{ marginTop: 16 }}>
        {/* 헤더: 제목, 통계, 추가 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--grid-gap-sm)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>내 책장</h3>
            {!loading && (
              <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginTop: 4 }}>
                총 {totalBooks}권 · 읽는 중 {readingCount}권 · 다 읽음 {finishedCount}권
              </div>
            )}
          </div>
          <button 
            className="btn primary" 
            onClick={() => setShowSearch(true)}
            style={{ fontSize: 'var(--font-size-md)', padding: '12px 24px' }}
            aria-label="새 책 추가하기"
          >
            📚 ＋ 새 책 추가
          </button>
        </div>

        {/* 필터 및 정렬 */}
        {!loading && totalBooks > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: 'var(--grid-gap-sm)', 
            marginTop: 'var(--grid-gap-md)',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: 'var(--grid-gap-xs)', alignItems: 'center' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>보기:</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'reading', 'finished'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={filterStatus === status ? 'btn primary' : 'btn'}
                    style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      padding: '6px 12px',
                      whiteSpace: 'nowrap'
                    }}
                    aria-label={status === 'all' ? '전체 보기' : status === 'reading' ? '읽는 중만 보기' : '다 읽은 책만 보기'}
                  >
                    {status === 'all' ? '전체' : status === 'reading' ? '읽는 중' : '다 읽음'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--grid-gap-xs)', alignItems: 'center', marginLeft: 'auto' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>정렬:</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-small)',
                  border: '1px solid var(--color-border-medium)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer'
                }}
                aria-label="정렬 기준 선택"
              >
                <option value="recent">최근 추가순</option>
                <option value="title">제목순</option>
                <option value="author">저자순</option>
              </select>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-negative-light text-negative" style={{ padding: 12, borderRadius: 6, marginTop: 12, fontSize: 'var(--font-size-sm)' }}>
            {error}
          </div>
        )}

        {showSearch && (
          <div style={{ marginTop: 12 }}>
            <BookSearch onSelect={addBook} />
          </div>
        )}

        {loading ? (
          <div style={{ padding: 'var(--grid-gap-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-lg)', color: '#999' }}>📚</div>
            <p style={{ color: '#999', padding: 12, fontSize: 'var(--font-size-md)' }}>책장을 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 필터링된 책 목록 표시 */}
            {filterStatus === 'all' ? (
              <>
                <section style={{ marginTop: 'var(--grid-gap-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--grid-gap-xs)', marginBottom: 'var(--grid-gap-sm)' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                      📖 읽고 있어요
                    </h4>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: '#666', backgroundColor: 'var(--color-background-secondary)', padding: '2px 8px', borderRadius: 12 }}>
                      {readingCount}권
                    </span>
                  </div>
                  {reading.length === 0 ? (
                    <div style={{ 
                      padding: 'var(--grid-gap-lg)', 
                      textAlign: 'center',
                      backgroundColor: 'var(--color-background-secondary)',
                      borderRadius: 'var(--radius-medium)',
                      border: '2px dashed var(--color-border-medium)'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--grid-gap-sm)' }}>📚</div>
                      <p style={{ color: '#666', fontSize: 'var(--font-size-md)', marginBottom: 'var(--grid-gap-xs)' }}>
                        읽고 있는 책이 없어요
                      </p>
                      <p style={{ color: '#999', fontSize: 'var(--font-size-sm)' }}>
                        위의 "＋ 새 책 추가" 버튼을 눌러서 책을 추가해보세요!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(5, 174px)', 
                        gap: 'var(--grid-gap-md)',
                        justifyContent: 'flex-start'
                      }}>
                        {getPaginatedReading().map((b) => (
                          <BookCard 
                            key={b.id} 
                            book={b} 
                            onSelect={() => setSelectedBook(b)}
                            onToggleStatus={() => toggleStatus(b)}
                            onDelete={() => setShowDeleteConfirm(b)}
                            onWriteRecord={() => goToRecord(b)}
                          />
                        ))}
                      </div>
                      {reading.length > BOOKS_PER_PAGE && (
                        <Pagination 
                          currentPage={readingPage}
                          totalPages={getTotalPages(reading)}
                          onPageChange={setReadingPage}
                        />
                      )}
                    </>
                  )}
                </section>

                <section style={{ marginTop: 'var(--grid-gap-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--grid-gap-xs)', marginBottom: 'var(--grid-gap-sm)' }}>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                      ✅ 다 읽었어요
                    </h4>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: '#666', backgroundColor: 'var(--color-background-secondary)', padding: '2px 8px', borderRadius: 12 }}>
                      {finishedCount}권
                    </span>
                  </div>
                  {finished.length === 0 ? (
                    <div style={{ 
                      padding: 'var(--grid-gap-lg)', 
                      textAlign: 'center',
                      backgroundColor: 'var(--color-background-secondary)',
                      borderRadius: 'var(--radius-medium)',
                      border: '2px dashed var(--color-border-medium)'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--grid-gap-sm)' }}>🎉</div>
                      <p style={{ color: '#666', fontSize: 'var(--font-size-md)', marginBottom: 'var(--grid-gap-xs)' }}>
                        다 읽은 책이 없어요
                      </p>
                      <p style={{ color: '#999', fontSize: 'var(--font-size-sm)' }}>
                        책을 다 읽으면 여기에 표시돼요!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(5, 174px)', 
                        gap: 'var(--grid-gap-md)',
                        justifyContent: 'flex-start'
                      }}>
                        {getPaginatedFinished().map((b) => (
                          <BookCard 
                            key={b.id} 
                            book={b} 
                            onSelect={() => setSelectedBook(b)}
                            onToggleStatus={() => toggleStatus(b)}
                            onDelete={() => setShowDeleteConfirm(b)}
                            onWriteRecord={() => goToRecord(b)}
                          />
                        ))}
                      </div>
                      {finished.length > BOOKS_PER_PAGE && (
                        <Pagination 
                          currentPage={finishedPage}
                          totalPages={getTotalPages(finished)}
                          onPageChange={setFinishedPage}
                        />
                      )}
                    </>
                  )}
                </section>
              </>
            ) : (
              <section style={{ marginTop: 'var(--grid-gap-md)' }}>
                {getFilteredBooks().length === 0 ? (
                  <div style={{ 
                    padding: 'var(--grid-gap-lg)', 
                    textAlign: 'center',
                    backgroundColor: 'var(--color-background-secondary)',
                    borderRadius: 'var(--radius-medium)',
                    border: '2px dashed var(--color-border-medium)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--grid-gap-sm)' }}>📚</div>
                    <p style={{ color: '#666', fontSize: 'var(--font-size-md)' }}>
                      {filterStatus === 'reading' ? '읽고 있는 책이 없어요' : '다 읽은 책이 없어요'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(5, 174px)', 
                      gap: 'var(--grid-gap-md)',
                      justifyContent: 'flex-start'
                    }}>
                      {getPaginatedFiltered().map((b) => (
                        <BookCard 
                          key={b.id} 
                          book={b} 
                          onSelect={() => setSelectedBook(b)}
                          onToggleStatus={() => toggleStatus(b)}
                          onDelete={() => setShowDeleteConfirm(b)}
                          onWriteRecord={() => goToRecord(b)}
                        />
                      ))}
                    </div>
                    {getFilteredBooks().length > BOOKS_PER_PAGE && (
                      <Pagination 
                        currentPage={filteredPage}
                        totalPages={getTotalPages(getFilteredBooks())}
                        onPageChange={setFilteredPage}
                      />
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* 책 상세 정보 모달 */}
      {selectedBook && (
        <BookDetailModal 
          book={selectedBook} 
          onClose={() => setSelectedBook(null)}
          onToggleStatus={() => {
            toggleStatus(selectedBook)
            setSelectedBook(null)
          }}
          onDelete={() => {
            setShowDeleteConfirm(selectedBook)
            setSelectedBook(null)
          }}
          onWriteRecord={() => {
            goToRecord(selectedBook)
            setSelectedBook(null)
          }}
        />
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          book={showDeleteConfirm}
          onConfirm={() => deleteBook(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </>
  )
}

// 책 카드 컴포넌트
function BookCard({ 
  book, 
  onSelect, 
  onToggleStatus, 
  onDelete,
  onWriteRecord
}: { 
  book: UserBook
  onSelect: () => void
  onToggleStatus: () => void
  onDelete: () => void
  onWriteRecord: () => void
}) {
  return (
    <div 
      style={{ 
        border: '2px solid var(--color-border-light)', 
        borderRadius: 'var(--radius-medium)', 
        padding: 'var(--grid-gap-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--grid-gap-xs)',
        position: 'relative',
        backgroundColor: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: 174,
        minWidth: 174,
        maxWidth: 174,
        minHeight: 320,
        boxSizing: 'border-box'
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-light)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${book.book_title || '제목 없음'} - ${book.book_author || '저자 없음'} 상세 정보 보기`}
    >
      {/* 삭제 버튼 - 항상 보이게 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          zIndex: 10,
          padding: 0,
          boxShadow: 'var(--shadow-card)'
        }}
        aria-label="책 삭제하기"
        title="삭제"
      >
        ×
      </button>

      {/* 책 표지 */}
      <div style={{ 
        width: '150px', 
        height: '210px', 
        minWidth: '150px',
        maxWidth: '150px',
        minHeight: '210px',
        maxHeight: '210px',
        flexShrink: 0, 
        flexGrow: 0,
        alignSelf: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        margin: '0 auto'
      }}>
        {book.book_cover_url ? (
          <img 
            src={book.book_cover_url} 
            alt={book.book_title ?? ''} 
            style={{ 
              width: '150px', 
              height: '210px',
              minWidth: '150px',
              maxWidth: '150px',
              minHeight: '210px',
              maxHeight: '210px',
              objectFit: 'contain', 
              backgroundColor: 'var(--color-background-secondary)',
              borderRadius: 'var(--radius-small)',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--color-border-light)',
              display: 'block',
              boxSizing: 'border-box'
            }} 
          />
        ) : (
          <div style={{
            width: '150px',
            height: '210px',
            minWidth: '150px',
            maxWidth: '150px',
            minHeight: '210px',
            maxHeight: '210px',
            backgroundColor: 'var(--color-background-secondary)',
            borderRadius: 'var(--radius-small)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 'var(--font-size-sm)',
            border: '2px dashed var(--color-border-medium)',
            boxSizing: 'border-box'
          }}>
            표지 없음
          </div>
        )}
      </div>

      {/* 책 정보 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        <div style={{ 
          fontWeight: 'var(--font-weight-semibold)', 
          fontSize: 'var(--font-size-sm)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.4,
          minHeight: 36
        }}>
          {book.book_title || '제목 없음'}
        </div>
        <div style={{ 
          fontSize: 'var(--font-size-xs)', 
          color: '#666',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {book.book_author || '저자 없음'}
        </div>
      </div>

      {/* 상태 변경 버튼 */}
      <button 
        className={book.status === 'reading' ? 'btn primary' : 'btn'}
        style={{ 
          marginTop: 'auto',
          fontSize: 'var(--font-size-xs)', 
          padding: '8px 12px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4
        }} 
        onClick={(e) => {
          e.stopPropagation()
          onToggleStatus()
        }}
        aria-label={book.status === 'reading' ? '다 읽음으로 변경' : '읽는 중으로 변경'}
      >
        {book.status === 'reading' ? (
          <>✅ 다 읽음</>
        ) : (
          <>📖 읽는 중</>
        )}
      </button>
    </div>
  )
}

// 책 상세 정보 모달
function BookDetailModal({
  book,
  onClose,
  onToggleStatus,
  onDelete,
  onWriteRecord
}: {
  book: UserBook
  onClose: () => void
  onToggleStatus: () => void
  onDelete: () => void
  onWriteRecord: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--grid-gap-md)'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--color-background-secondary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            zIndex: 10
          }}
          aria-label="닫기"
        >
          ×
        </button>

        <div style={{ display: 'flex', gap: 'var(--grid-gap-md)', marginBottom: 'var(--grid-gap-md)' }}>
          {book.book_cover_url ? (
            <img
              src={book.book_cover_url}
              alt={book.book_title ?? ''}
              style={{
                width: 150,
                height: 210,
                objectFit: 'cover',
                borderRadius: 'var(--radius-medium)',
                boxShadow: 'var(--shadow-card)',
                flexShrink: 0
              }}
            />
          ) : (
            <div style={{
              width: 150,
              height: 210,
              backgroundColor: 'var(--color-background-secondary)',
              borderRadius: 'var(--radius-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: 'var(--font-size-sm)',
              border: '2px dashed var(--color-border-medium)'
            }}>
              표지 없음
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-xl)' }}>
              {book.book_title || '제목 없음'}
            </h3>
            <div style={{ fontSize: 'var(--font-size-md)', color: '#666', marginBottom: 'var(--grid-gap-sm)' }}>
              {book.book_author || '저자 없음'}
            </div>
            
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
              {book.book_publisher && (
                <div>
                  <strong>출판사:</strong> {book.book_publisher}
                </div>
              )}
              {book.book_publication_year && (
                <div>
                  <strong>출판연도:</strong> {book.book_publication_year}
                </div>
              )}
              {book.book_total_pages && (
                <div>
                  <strong>페이지 수:</strong> {book.book_total_pages}페이지
                </div>
              )}
              {book.book_isbn && (
                <div>
                  <strong>ISBN:</strong> {book.book_isbn}
                </div>
              )}
              <div>
                <strong>상태:</strong> {book.status === 'reading' ? '📖 읽는 중' : '✅ 다 읽음'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', flexWrap: 'wrap' }}>
          <button
            className="btn primary"
            onClick={onWriteRecord}
            style={{ flex: 1, minWidth: 150, fontSize: 'var(--font-size-md)', padding: '12px 24px' }}
            aria-label="독서록 작성하기"
          >
            ✍️ 독서록 쓰기
          </button>
          <button
            className="btn"
            onClick={onToggleStatus}
            style={{ flex: 1, minWidth: 150, fontSize: 'var(--font-size-md)', padding: '12px 24px' }}
            aria-label={book.status === 'reading' ? '다 읽음으로 변경' : '읽는 중으로 변경'}
          >
            {book.status === 'reading' ? '✅ 다 읽음으로 변경' : '📖 읽는 중으로 변경'}
          </button>
          <button
            className="btn"
            onClick={onDelete}
            style={{ 
              flex: 1, 
              minWidth: 150, 
              fontSize: 'var(--font-size-md)', 
              padding: '12px 24px',
              backgroundColor: 'var(--color-negative)',
              color: 'white'
            }}
            aria-label="책 삭제하기"
          >
            🗑️ 삭제하기
          </button>
        </div>
      </div>
    </div>
  )
}

// 삭제 확인 모달
function DeleteConfirmModal({
  book,
  onConfirm,
  onCancel
}: {
  book: UserBook
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: 'var(--grid-gap-md)'
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: 400,
          width: '100%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, color: 'var(--color-negative)' }}>⚠️ 책 삭제하기</h3>
        <p style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--grid-gap-md)' }}>
          <strong>"{book.book_title || '제목 없음'}"</strong> 책을 책장에서 삭제하시겠어요?
        </p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginBottom: 'var(--grid-gap-md)' }}>
          삭제하면 다시 되돌릴 수 없어요.
        </p>
        <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', justifyContent: 'flex-end' }}>
          <button
            className="btn"
            onClick={onCancel}
            style={{ fontSize: 'var(--font-size-md)', padding: '10px 20px' }}
            aria-label="취소"
          >
            취소
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            style={{ 
              fontSize: 'var(--font-size-md)', 
              padding: '10px 20px',
              backgroundColor: 'var(--color-negative)',
              color: 'white'
            }}
            aria-label="삭제 확인"
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  )
}

// 페이지네이션 컴포넌트
function Pagination({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7
    
    if (totalPages <= maxVisible) {
      // 전체 페이지가 적으면 모두 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 첫 페이지
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('...')
      }
      
      // 현재 페이지 주변
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      
      // 마지막 페이지
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      gap: 8,
      marginTop: 'var(--grid-gap-md)',
      flexWrap: 'wrap'
    }}>
      <button
        className="btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '8px 12px',
          fontSize: 'var(--font-size-sm)',
          opacity: currentPage === 1 ? 0.5 : 1,
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
        }}
        aria-label="이전 페이지"
      >
        ‹
      </button>
      
      {getPageNumbers().map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} style={{ 
              padding: '8px 4px',
              color: '#999',
              fontSize: 'var(--font-size-sm)'
            }}>
              ...
            </span>
          )
        }
        
        const pageNum = page as number
        const isActive = pageNum === currentPage
        
        return (
          <button
            key={pageNum}
            className={isActive ? 'btn primary' : 'btn'}
            onClick={() => onPageChange(pageNum)}
            style={{
              padding: '8px 12px',
              fontSize: 'var(--font-size-sm)',
              minWidth: 40,
              fontWeight: isActive ? 'var(--font-weight-bold)' : 'normal'
            }}
            aria-label={`${pageNum}페이지로 이동`}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNum}
          </button>
        )
      })}
      
      <button
        className="btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 12px',
          fontSize: 'var(--font-size-sm)',
          opacity: currentPage === totalPages ? 0.5 : 1,
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
        }}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </div>
  )
}


