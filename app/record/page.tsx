'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import BookPicker from '../../components/BookPicker'

export default function RecordPage() {
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null)
  const [bookPublisher, setBookPublisher] = useState('')
  const [bookIsbn, setBookIsbn] = useState('')
  const [bookPublicationYear, setBookPublicationYear] = useState('')
  const [bookTotalPages, setBookTotalPages] = useState('')
  const [contentText, setContentText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [userBooks, setUserBooks] = useState<Array<{
    id: number
    title: string
    author: string
    coverUrl: string | null
    isbn?: string | null
    publisher?: string | null
    publicationYear?: string | null
    totalPages?: number | null
  }>>([])
  const [recentRecords, setRecentRecords] = useState<Array<{
    id: number
    book_title: string | null
    book_author: string | null
    book_cover_url: string | null
    book_publisher: string | null
    book_isbn: string | null
    book_publication_year: string | null
    book_total_pages: number | null
  }>>([])
  const [selectedBookId, setSelectedBookId] = useState<number | ''>('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  useEffect(() => {
    async function loadUserBooks() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('user_books')
        .select('id, book_title, book_author, book_cover_url, book_publisher, book_isbn, book_publication_year, book_total_pages')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[Record] user_books load error:', error)
        return
      }
      const mapped = (data || []).map((b) => ({
        id: b.id as number,
        title: (b as any).book_title || '',
        author: (b as any).book_author || '',
        coverUrl: (b as any).book_cover_url || null,
        isbn: (b as any).book_isbn || null,
        publisher: (b as any).book_publisher || null,
        publicationYear: (b as any).book_publication_year || null,
        totalPages: (b as any).book_total_pages ?? null,
      }))
      setUserBooks(mapped)
    }
    loadUserBooks()
  }, [])

  // 최근 기록 로드 함수 (컴포넌트 레벨로 이동하여 재사용 가능하게)
  async function loadRecentRecords() {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[Record] No user, skipping recent records load')
      return
    }
    console.log('[Record] Loading recent records for user:', user.id)
    
    // book_records에서 이미 제출한 책 목록 가져오기 (제외할 책들)
    const { data: recordsData, error: recordsError } = await supabase
      .from('book_records')
      .select('id, book_title, book_author, book_isbn')
      .eq('user_id', user.id)
    
    if (recordsError) {
      console.error('[Record] book_records load error:', recordsError)
    } else {
      console.log('[Record] book_records loaded:', recordsData?.length || 0, 'records (already submitted)')
    }
    
    // 이미 제출한 책들의 식별자 집합 생성 (ISBN 또는 제목+저자)
    const submittedBooks = new Set<string>()
    if (recordsData) {
      recordsData.forEach((r: any) => {
        if (r.book_isbn) {
          submittedBooks.add(`isbn_${r.book_isbn}`)
        } else {
          const key = `title_${(r.book_title || '').trim()}_${(r.book_author || '').trim()}`
          if (key !== 'title__') { // 빈 제목+저자가 아닌 경우만
            submittedBooks.add(key)
          }
        }
      })
    }
    console.log('[Record] Submitted books set size:', submittedBooks.size)
    
    // user_books에서 최근 책 가져오기 (더 많이 가져와서 필터링)
    const { data: booksData, error: booksError } = await supabase
      .from('user_books')
      .select('id, book_title, book_author, book_cover_url, book_publisher, book_isbn, book_publication_year, book_total_pages, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20) // 충분히 가져와서 필터링 후 정렬
    
    if (booksError) {
      console.error('[Record] user_books load error:', booksError)
    } else {
      console.log('[Record] user_books loaded:', booksData?.length || 0, 'books')
    }
    
    // user_books에서 이미 제출한 책 제외
    const unsubmittedBooks = (booksData || []).filter((book: any) => {
      // ISBN으로 체크
      if (book.book_isbn) {
        if (submittedBooks.has(`isbn_${book.book_isbn}`)) {
          console.log('[Record] Excluding book (ISBN match):', book.book_title)
          return false
        }
      }
      // ISBN이 없거나 매칭되지 않으면 제목+저자로 체크
      const key = `title_${(book.book_title || '').trim()}_${(book.book_author || '').trim()}`
      if (key !== 'title__' && submittedBooks.has(key)) {
        console.log('[Record] Excluding book (title+author match):', book.book_title)
        return false
      }
      return true
    })
    
    console.log('[Record] Unsubmitted books after filtering:', unsubmittedBooks.length, 'books')
    
    // created_at 기준으로 정렬 (최신순)
    unsubmittedBooks.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })
    
    // 최근 3개만 선택
    const finalData = unsubmittedBooks.slice(0, 3)
    
    const mapped = finalData.map((r: any) => ({
      id: r.id,
      book_title: r.book_title,
      book_author: r.book_author,
      book_cover_url: r.book_cover_url,
      book_publisher: r.book_publisher,
      book_isbn: r.book_isbn,
      book_publication_year: r.book_publication_year || null,
      book_total_pages: r.book_total_pages,
    }))
    
    console.log('[Record] Final recent records:', mapped.length, 'items (unsubmitted books only)')
    setRecentRecords(mapped)
  }

  useEffect(() => {
    loadRecentRecords()
  }, [])

  function handleBookSelect(book: { 
    title: string
    author: string
    coverUrl: string | null
    isbn?: string | null
    publisher?: string | null
    publicationYear?: string | null
    totalPages?: number | null
  }) {
    setBookTitle(book.title)
    setBookAuthor(book.author)
    setBookCoverUrl(book.coverUrl)
    setBookPublisher(book.publisher || '')
    setBookIsbn(book.isbn || '')
    setBookPublicationYear(book.publicationYear || '')
    setBookTotalPages(book.totalPages?.toString() || '')
    setRating(null)
  }

  function handleRecentBookSelect(record: typeof recentRecords[0]) {
    setBookTitle(record.book_title || '')
    setBookAuthor(record.book_author || '')
    setBookCoverUrl(record.book_cover_url)
    setBookPublisher(record.book_publisher || '')
    setBookIsbn(record.book_isbn || '')
    setBookPublicationYear(record.book_publication_year || '')
    setBookTotalPages(record.book_total_pages?.toString() || '')
    setRating(null)
  }

  function handleClearBook() {
    setBookTitle('')
    setBookAuthor('')
    setBookCoverUrl(null)
    setBookPublisher('')
    setBookIsbn('')
    setBookPublicationYear('')
    setBookTotalPages('')
    setRating(null)
    setContentText('')
    setImageFile(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)
    const supabase = getSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      setMessage('로그인이 필요합니다.')
      return
    }

    let contentImageUrl: string | null = null
    if (imageFile) {
      // 클라이언트 측에서 한 번 더 검증 (보안)
      if (!imageFile.type.startsWith('image/')) {
        setSubmitting(false)
        setMessage('이미지 파일만 업로드 가능합니다.')
        return
      }
      
      if (imageFile.size > MAX_FILE_SIZE) {
        setSubmitting(false)
        setMessage(`파일 크기가 5MB를 초과합니다. (현재: ${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`)
        return
      }
      
      // 파일명을 URL-safe하게 변환 (한글, 특수문자 처리)
      const sanitizeFileName = (filename: string): string => {
        // 확장자 추출
        const lastDot = filename.lastIndexOf('.')
        const ext = lastDot > 0 ? filename.substring(lastDot) : ''
        const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename
        
        // 한글, 공백, 특수문자를 언더스코어로 변환하고 길이 제한
        const sanitized = nameWithoutExt
          .replace(/[^\w\-_.]/g, '_') // 한글, 특수문자를 언더스코어로
          .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
          .substring(0, 100) // 길이 제한
          .replace(/^_+|_+$/g, '') // 앞뒤 언더스코어 제거
        
        return sanitized + ext
      }
      
      const sanitizedFileName = sanitizeFileName(imageFile.name)
      const path = `${user.id}/${Date.now()}_${sanitizedFileName}`
      
      console.log('[Record] Uploading image:', { original: imageFile.name, sanitized: sanitizedFileName, path })
      
      const { data, error } = await supabase.storage.from('reading-uploads').upload(path, imageFile)
      if (error) {
        setSubmitting(false)
        console.error('[Record] Image upload error:', error)
        
        // 에러 타입별 친화적 메시지
        let errorMessage = '이미지 업로드 실패'
        if (error.message.includes('Invalid key')) {
          errorMessage = '파일명에 사용할 수 없는 문자가 포함되어 있습니다. 파일명을 변경해주세요.'
        } else if (error.message.includes('not found') || error.message.includes('row-level security') || error.message.includes('RLS')) {
          errorMessage = `저장소 권한 오류: ${error.message}. Storage 버킷의 RLS 정책을 확인해주세요.`
        } else if (error.message.includes('size') || error.message.includes('too large')) {
          errorMessage = '파일 크기가 너무 큽니다. 5MB 이하의 이미지를 선택해주세요.'
        } else {
          errorMessage = `이미지 업로드 실패: ${error.message}`
        }
        
             console.error('[Record] Upload error details:', {
               message: error.message,
               error
             })
        
        setMessage(errorMessage)
        return
      }
      const { data: urlData } = supabase.storage.from('reading-uploads').getPublicUrl(data.path)
      contentImageUrl = urlData.publicUrl
      console.log('[Record] Image uploaded successfully:', contentImageUrl)
    }

    // 출판연도를 date 형식으로 변환 (YYYY 형식인 경우 YYYY-01-01로 변환)
    let publicationDateValue: string | null = null
    if (bookPublicationYear) {
      // YYYY 형식인 경우 YYYY-01-01로 변환
      if (/^\d{4}$/.test(bookPublicationYear)) {
        publicationDateValue = `${bookPublicationYear}-01-01`
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(bookPublicationYear)) {
        publicationDateValue = bookPublicationYear
      }
    }

  // 전체 페이지 수 숫자 변환
  const totalPagesValue = bookTotalPages ? parseInt(bookTotalPages, 10) : null

    const { error: insertError } = await supabase.from('book_records').insert({
      user_id: user.id,
      book_title: bookTitle || null,
      book_author: bookAuthor || null,
      book_cover_url: bookCoverUrl,
      book_publisher: bookPublisher || null,
      book_isbn: bookIsbn || null,
      book_publication_date: publicationDateValue,
      book_total_pages: totalPagesValue,
      content_text: contentText || null,
      content_image_url: contentImageUrl,
      rating: rating || null,
      status: 'pending'
    })

    setSubmitting(false)
    if (insertError) setMessage(`제출 실패: ${insertError.message}`)
    else {
      setBookTitle('')
      setBookAuthor('')
      setBookCoverUrl(null)
      setBookPublisher('')
      setBookIsbn('')
      setBookPublicationYear('')
      setBookTotalPages('')
      setContentText('')
      setRating(null)
      setImageFile(null)
      setMessage('제출되었습니다. 승인 대기 중입니다!')
      // 최근 기록 다시 로드 (loadRecentRecords 함수 재사용)
      await loadRecentRecords()
    }
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <style dangerouslySetInnerHTML={{__html: `
        input::placeholder,
        textarea::placeholder {
          font-size: 80% !important;
        }
      `}} />
      <div className="card" style={{ marginTop: 'var(--card-spacing)' }}>
        <h1>독서록</h1>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
          {/* 책 선택: 내 책장에서만 선택 가능 - 모달 열기 */}
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ margin: 0 }}>책 선택</label>
              <small className="text-tertiary" style={{ fontSize: 'var(--font-size-xs)', color: '#999' }}>
                독서록을 쓰려면 책장에 먼저 추가하세요.
              </small>
            </div>
            <div style={{ display: 'flex', gap: 'var(--grid-gap-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn primary" onClick={() => setPickerOpen(true)}>책장에서 선택</button>
              {bookTitle && <span style={{ color: '#666' }}>{bookTitle}{bookAuthor ? ` · ${bookAuthor}` : ''}</span>}
            </div>
            {recentRecords.length > 0 && (
              <div style={{ marginTop: 'var(--grid-gap-sm)' }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginBottom: 'var(--grid-gap-xs)' }}>최근에 읽은 책</div>
                <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', flexWrap: 'wrap' }}>
                  {recentRecords.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => handleRecentBookSelect(record)}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        padding: 8,
                        border: '1px solid var(--color-border-medium)',
                        borderRadius: 'var(--radius-small)',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        maxWidth: 200
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                        e.currentTarget.style.borderColor = 'var(--color-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.borderColor = 'var(--color-border-medium)'
                      }}
                    >
                      {record.book_cover_url && (
                        <img
                          src={record.book_cover_url}
                          alt={record.book_title || ''}
                          style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {record.book_title || '제목 없음'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {record.book_author || '저자 없음'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {bookCoverUrl && (
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  marginTop: 'var(--grid-gap-xs)'
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget.querySelector('button') as HTMLButtonElement
                  if (btn) btn.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget.querySelector('button') as HTMLButtonElement
                  if (btn) btn.style.opacity = '0'
                }}
              >
                <img
                  src={bookCoverUrl}
                  alt={bookTitle}
                  style={{ 
                    width: 100, 
                    height: 140, 
                    objectFit: 'cover', 
                    borderRadius: 'var(--radius-small)', 
                    boxShadow: 'var(--shadow-card)',
                    display: 'block'
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearBook()
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    zIndex: 10
                  }}
                  title="선택 해제"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {pickerOpen && (
            <BookPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onSelect={(b) => {
                setSelectedBookId(b.id)
                handleBookSelect(b)
                setPickerOpen(false)
              }}
            />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--grid-gap-md)' }}>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
              <label htmlFor="book-title">책 제목</label>
              <input 
                id="book-title"
                name="book-title"
                type="text"
                value={bookTitle} 
                onChange={(e) => setBookTitle(e.target.value)} 
                placeholder="책 제목을 입력하거나 검색으로 선택하세요"
              />
            </div>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
              <label htmlFor="book-author">저자</label>
              <input 
                id="book-author"
                name="book-author"
                type="text"
                value={bookAuthor} 
                onChange={(e) => setBookAuthor(e.target.value)} 
                placeholder="저자명을 입력하거나 검색으로 선택하세요"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--grid-gap-md)' }}>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
              <label htmlFor="book-publisher">출판사</label>
              <input 
                id="book-publisher"
                name="book-publisher"
                type="text"
                value={bookPublisher} 
                onChange={(e) => setBookPublisher(e.target.value)} 
                placeholder="출판사명을 입력하거나 검색으로 선택하세요"
              />
            </div>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
              <label>별점</label>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 32,
                      lineHeight: 1,
                      color: rating && star <= rating ? '#FFD700' : '#ddd',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!rating) {
                        e.currentTarget.style.color = '#FFD700'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!rating || star > rating) {
                        e.currentTarget.style.color = '#ddd'
                      }
                    }}
                  >
                    ★
                  </button>
                ))}
                {rating && (
                  <span style={{ marginLeft: 8, color: '#666', fontSize: 'var(--font-size-sm)' }}>
                    {rating}점
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="content-text">책을 읽고 생각하거나 느낀 점</label>
            <textarea 
              id="content-text"
              name="content-text"
              value={contentText} 
              onChange={(e) => setContentText(e.target.value)} 
              rows={6} 
              placeholder="책을 읽고 생각하거나 느낀 점을 적어보세요"
            />
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="image-file">사진 첨부(선택)</label>
            <input 
              id="image-file"
              name="image-file"
              type="file" 
              accept="image/*" 
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setFileError(null)
                
                if (file) {
                  // 파일 타입 검증
                  if (!file.type.startsWith('image/')) {
                    setFileError('이미지 파일만 업로드 가능합니다.')
                    setImageFile(null)
                    e.target.value = '' // 입력 초기화
                    return
                  }
                  
                  // 파일 크기 검증
                  if (file.size > MAX_FILE_SIZE) {
                    setFileError(`파일 크기가 5MB를 초과합니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
                    setImageFile(null)
                    e.target.value = '' // 입력 초기화
                    return
                  }
                }
                
                setImageFile(file)
              }} 
              title="이미지 파일만 업로드 가능하며, 최대 5MB까지 업로드할 수 있습니다"
            />
            {fileError && (
              <small className="text-negative" style={{ fontSize: 'var(--font-size-xs)' }}>
                {fileError}
              </small>
            )}
            {imageFile && !fileError && (
              <small className="text-secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                선택된 파일: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
              </small>
            )}
          </div>
          {message && (
            <div 
              className={message.includes('실패') || message.includes('오류') ? 'bg-negative-light text-negative' : 'bg-positive-light text-positive'}
              style={{ 
                padding: 'var(--grid-gap-sm) var(--grid-gap-md)', 
                borderRadius: 'var(--radius-small)',
                fontSize: 'var(--font-size-sm)'
              }}
            >
              {message}
            </div>
          )}
          <button className="btn primary" disabled={submitting} type="submit" style={{ width: '100%' }}>
            {submitting ? '제출 중...' : '제출하기'}
          </button>
        </form>
      </div>
    </main>
  )
}


