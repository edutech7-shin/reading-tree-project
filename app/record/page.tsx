'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import BookPicker from '../../components/BookPicker'

export default function RecordPage() {
  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기 (한국 표준시)
  const getTodayDate = () => {
    const now = new Date()
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const year = koreaTime.getFullYear()
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0')
    const day = String(koreaTime.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null)
  const [bookPublisher, setBookPublisher] = useState('')
  const [bookIsbn, setBookIsbn] = useState('')
  const [bookPublicationYear, setBookPublicationYear] = useState('')
  const [bookTotalPages, setBookTotalPages] = useState('')
  const [recordDate, setRecordDate] = useState<string>(getTodayDate())
  const [shortComment, setShortComment] = useState('')
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1) // 단계별 진행
  const [imagePreview, setImagePreview] = useState<string | null>(null) // 이미지 미리보기
  const [autoSaved, setAutoSaved] = useState(false) // 자동 저장 상태

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const STORAGE_KEY = 'reading-record-draft' // 로컬 스토리지 키

  // 파일 선택 처리 함수
  const handleFileSelect = (file: File, inputElement?: HTMLInputElement) => {
    setFileError(null)
    setImagePreview(null)
    
    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      setFileError('이미지 파일만 업로드 가능합니다.')
      setImageFile(null)
      if (inputElement) inputElement.value = ''
      return
    }
    
    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      setFileError('파일이 너무 커요. 더 작은 사진을 선택해주세요.')
      setImageFile(null)
      if (inputElement) inputElement.value = ''
      return
    }
    
    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    
    setImageFile(file)
  }

  // 포인트 계산 함수
  const calculatePoints = () => {
    let points = 0
    if (rating) points += 1
    if (shortComment.trim()) points += 2
    if (contentText.trim()) points += 5
    if (imageFile) points += 2
    return points
  }

  // 단계별 유효성 검사
  const canProceedToStep2 = () => {
    return !!(bookTitle && bookAuthor)
  }

  const canProceedToStep3 = () => {
    return canProceedToStep2() && !!(rating || shortComment.trim() || contentText.trim())
  }

  const canSubmit = () => {
    return canProceedToStep2() && (rating || shortComment.trim() || contentText.trim() || imageFile)
  }

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
    
    // 자동 저장된 데이터 복원
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const data = JSON.parse(savedData)
        if (data.bookTitle && data.bookAuthor) {
          setBookTitle(data.bookTitle || '')
          setBookAuthor(data.bookAuthor || '')
          setBookPublisher(data.bookPublisher || '')
          setRecordDate(data.recordDate || getTodayDate())
          setShortComment(data.shortComment || '')
          setContentText(data.contentText || '')
          setRating(data.rating || null)
          setCurrentStep(data.currentStep || 1)
          // 이미지는 복원하지 않음 (File 객체는 직렬화 불가)
        }
      } catch (e) {
        console.error('[Record] Failed to restore saved data:', e)
      }
    }
  }, [])

  // 자동 저장 함수
  const saveToLocalStorage = () => {
    const dataToSave = {
      bookTitle,
      bookAuthor,
      bookPublisher,
      recordDate,
      shortComment,
      contentText,
      rating,
      currentStep
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    setAutoSaved(true)
    setTimeout(() => setAutoSaved(false), 2000) // 2초 후 표시 제거
  }

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (bookTitle || bookAuthor || shortComment || contentText || rating) {
      const timer = setTimeout(() => {
        saveToLocalStorage()
      }, 1000) // 1초 후 자동 저장
      return () => clearTimeout(timer)
    }
  }, [bookTitle, bookAuthor, bookPublisher, recordDate, shortComment, contentText, rating, currentStep])

  // 자동 저장된 데이터 삭제
  const clearAutoSave = () => {
    localStorage.removeItem(STORAGE_KEY)
  }

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
    // 책 선택 후 자동으로 2단계로 이동
    if (book.title && book.author) {
      setCurrentStep(2)
    }
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
    // 책 선택 후 자동으로 2단계로 이동
    if (record.book_title && record.book_author) {
      setCurrentStep(2)
    }
  }

  function handleClearBook() {
    setBookTitle('')
    setBookAuthor('')
    setBookCoverUrl(null)
    setBookPublisher('')
    setBookIsbn('')
    setBookPublicationYear('')
    setBookTotalPages('')
    setRecordDate(getTodayDate())
    setShortComment('')
    setRating(null)
    setContentText('')
    setImageFile(null)
    setImagePreview(null)
    setCurrentStep(1)
    clearAutoSave() // 선택 해제 시 자동 저장 데이터 삭제
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

    // 작성 날짜를 date 형식으로 변환
    const recordDateValue = recordDate || getTodayDate()

    const { error: insertError } = await supabase.from('book_records').insert({
      user_id: user.id,
      book_title: bookTitle || null,
      book_author: bookAuthor || null,
      book_cover_url: bookCoverUrl,
      book_publisher: bookPublisher || null,
      book_isbn: bookIsbn || null,
      book_publication_date: publicationDateValue,
      book_total_pages: totalPagesValue,
      record_date: recordDateValue,
      short_comment: shortComment || null,
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
      setRecordDate(getTodayDate())
      setShortComment('')
      setContentText('')
      setRating(null)
      setImageFile(null)
      setImagePreview(null)
      setCurrentStep(1)
      clearAutoSave() // 제출 성공 시 자동 저장 데이터 삭제
      setMessage('제출되었습니다. 승인 대기 중입니다!')
      // 최근 기록 다시 로드 (loadRecentRecords 함수 재사용)
      await loadRecentRecords()
    }
  }

  // 별점 텍스트 매핑
  const getRatingText = (rating: number) => {
    const texts = { 1: '별로예요', 2: '그저 그래요', 3: '괜찮아요', 4: '좋아요', 5: '매우 좋아요' }
    return texts[rating as keyof typeof texts] || ''
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <style dangerouslySetInnerHTML={{__html: `
        input::placeholder,
        textarea::placeholder {
          font-size: 95% !important;
        }
        input[type="text"],
        input[type="date"],
        textarea {
          min-height: 44px;
          font-size: var(--font-size-md);
        }
        textarea {
          min-height: 120px;
        }
        /* 반응형 레이아웃 */
        @media (max-width: 768px) {
          .record-grid-2col {
            grid-template-columns: 1fr !important;
          }
        }
        /* 접근성: 포커스 스타일 강화 */
        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible {
          outline: 3px solid var(--color-primary);
          outline-offset: 2px;
        }
        /* 필수 필드 완료 체크 표시 */
        .field-complete::after {
          content: ' ✓';
          color: var(--color-positive);
          font-weight: bold;
        }
      `}} />
      <div className="card" style={{ marginTop: 'var(--card-spacing)' }}>
        <h1>독서록</h1>
        
        {/* 진행 단계 표시 */}
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          marginBottom: 'var(--grid-gap-md)',
          padding: 'var(--grid-gap-sm)',
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: 'var(--radius-small)'
        }}>
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: 'var(--grid-gap-xs)',
                borderRadius: 'var(--radius-small)',
                backgroundColor: currentStep === step ? 'var(--color-primary)' : 'white',
                color: currentStep === step ? 'white' : 'var(--color-text-secondary)',
                fontWeight: currentStep === step ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                fontSize: 'var(--font-size-sm)',
                transition: 'all 0.2s'
              }}
            >
              {step}단계
            </div>
          ))}
        </div>

        {/* 자동 저장 표시 */}
        {autoSaved && (
          <div style={{
            padding: 'var(--grid-gap-xs) var(--grid-gap-sm)',
            backgroundColor: 'var(--color-positive-light)',
            borderRadius: 'var(--radius-small)',
            marginBottom: 'var(--grid-gap-sm)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-positive)',
            textAlign: 'center'
          }}>
            💾 자동 저장되었습니다
          </div>
        )}

        {/* 예상 포인트 표시 */}
        {canProceedToStep2() && (
          <div style={{
            padding: 'var(--grid-gap-sm)',
            backgroundColor: 'var(--color-info-light)',
            borderRadius: 'var(--radius-small)',
            marginBottom: 'var(--grid-gap-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-info)',
            textAlign: 'center'
          }}>
            💧 지금 제출하면 <strong>물방울 +{calculatePoints()}개</strong>를 받을 수 있어요!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
          {/* 1단계: 책 선택 */}
          {currentStep === 1 && (
            <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
              <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                    책 선택 <span style={{ color: 'var(--color-negative)', fontSize: 'var(--font-size-md)' }}>*</span>
                  </label>
                </div>
                <small className="text-tertiary" style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>
                  독서록을 쓰려면 책장에 먼저 추가하세요.
                </small>
                <div style={{ display: 'flex', gap: 'var(--grid-gap-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn primary" 
                    onClick={() => setPickerOpen(true)} 
                    style={{ fontSize: 'var(--font-size-md)', padding: '12px 24px' }}
                    aria-label="책장에서 책 선택하기"
                  >
                    📚 책장에서 선택
                  </button>
                </div>
                {recentRecords.length > 0 && (
                  <div style={{ marginTop: 'var(--grid-gap-sm)' }}>
                    <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: '#333', marginBottom: 'var(--grid-gap-sm)' }}>
                      최근에 읽은 책
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: 'var(--grid-gap-md)',
                      width: '100%'
                    }}>
                      {recentRecords.map((record) => (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => handleRecentBookSelect(record)}
                          aria-label={`${record.book_title || '제목 없음'} - ${record.book_author || '저자 없음'} 선택`}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            padding: 16,
                            border: '2px solid var(--color-border-medium)',
                            borderRadius: 'var(--radius-medium)',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            minHeight: 120
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'
                            e.currentTarget.style.borderColor = 'var(--color-primary)'
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white'
                            e.currentTarget.style.borderColor = 'var(--color-border-medium)'
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleRecentBookSelect(record)
                            }
                          }}
                        >
                          {record.book_cover_url ? (
                            <img
                              src={record.book_cover_url}
                              alt=""
                              style={{ width: 70, height: 98, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ 
                              width: 70, 
                              height: 98, 
                              backgroundColor: 'var(--color-background-secondary)', 
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 'var(--font-size-xs)',
                              color: '#999',
                              flexShrink: 0
                            }}>
                              표지 없음
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6, lineHeight: 1.3 }}>
                              {record.book_title || '제목 없음'}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
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
                      marginTop: 'var(--grid-gap-sm)'
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
                        width: 120, 
                        height: 168, 
                        objectFit: 'cover', 
                        borderRadius: 'var(--radius-medium)', 
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
                        top: 8,
                        left: 8,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
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
                {bookTitle && bookAuthor && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setCurrentStep(2)}
                    style={{ marginTop: 'var(--grid-gap-md)', fontSize: 'var(--font-size-md)', padding: '14px 28px' }}
                    aria-label="다음 단계로 이동"
                  >
                    다음 단계로 →
                  </button>
                )}
                {!bookTitle || !bookAuthor ? (
                  <div style={{ 
                    padding: 'var(--grid-gap-sm)', 
                    backgroundColor: 'var(--color-warning-light)', 
                    borderRadius: 'var(--radius-small)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-warning)',
                    marginTop: 'var(--grid-gap-md)',
                    textAlign: 'center'
                  }}>
                    ⚠️ 책 제목과 저자를 먼저 선택해주세요
                  </div>
                ) : null}
              </div>
            </div>
          )}
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

          {/* 2단계: 기본 정보 */}
          {currentStep === 2 && (
            <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
              <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
                <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                  <label htmlFor="book-title" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }} className={bookTitle ? 'field-complete' : ''}>
                    책 제목 <span style={{ color: 'var(--color-negative)' }}>*</span>
                  </label>
                  <input 
                    id="book-title"
                    name="book-title"
                    type="text"
                    value={bookTitle} 
                    onChange={(e) => setBookTitle(e.target.value)} 
                    placeholder="예: 해리포터와 마법사의 돌"
                    required
                    aria-label="책 제목 입력"
                    aria-required="true"
                  />
                  <small style={{ fontSize: 'var(--font-size-xs)', color: '#666', marginTop: '-4px' }}>
                    💡 팁: 책 표지에 있는 제목을 그대로 적어주세요
                  </small>
                </div>
                <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                  <label htmlFor="book-author" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }} className={bookAuthor ? 'field-complete' : ''}>
                    저자 <span style={{ color: 'var(--color-negative)' }}>*</span>
                  </label>
                  <input 
                    id="book-author"
                    name="book-author"
                    type="text"
                    value={bookAuthor} 
                    onChange={(e) => setBookAuthor(e.target.value)} 
                    placeholder="예: J.K. 롤링"
                    required
                    aria-label="저자명 입력"
                    aria-required="true"
                  />
                  <small style={{ fontSize: 'var(--font-size-xs)', color: '#666', marginTop: '-4px' }}>
                    💡 팁: 책의 첫 페이지나 뒷표지에 있는 저자 이름을 적어주세요
                  </small>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--grid-gap-md)' }} className="record-grid-2col">
                  <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                    <label htmlFor="book-publisher" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
                      출판사
                    </label>
                    <input 
                      id="book-publisher"
                      name="book-publisher"
                      type="text"
                      value={bookPublisher} 
                      onChange={(e) => setBookPublisher(e.target.value)} 
                      placeholder="예: 문학수첩"
                      aria-label="출판사명 입력"
                    />
                  </div>
                  <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                    <label htmlFor="record-date" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
                      작성 날짜
                    </label>
                    <input 
                      id="record-date"
                      name="record-date"
                      type="date"
                      value={recordDate} 
                      onChange={(e) => setRecordDate(e.target.value)} 
                      aria-label="작성 날짜 선택"
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', marginTop: 'var(--grid-gap-md)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCurrentStep(1)}
                  style={{ flex: 1, fontSize: 'var(--font-size-md)', padding: '14px 28px' }}
                  aria-label="이전 단계로 이동"
                >
                  ← 이전
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep2()}
                  style={{ flex: 1, fontSize: 'var(--font-size-md)', padding: '14px 28px' }}
                  aria-label="다음 단계로 이동"
                >
                  다음 단계로 →
                </button>
                {!canProceedToStep2() && (
                  <div style={{ 
                    padding: 'var(--grid-gap-xs)', 
                    backgroundColor: 'var(--color-warning-light)', 
                    borderRadius: 'var(--radius-small)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-warning)',
                    textAlign: 'center',
                    gridColumn: '1 / -1'
                  }}>
                    ⚠️ 책 제목과 저자는 필수 항목입니다
                  </div>
                )}
              </div>
            </div>
          )}
          {/* 3단계: 감상 작성 */}
          {currentStep === 3 && (
            <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
              <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
                <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                  <label style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }} className={rating ? 'field-complete' : ''}>
                    별점 <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-info)', fontWeight: 'var(--font-weight-semibold)' }}>💧 [물방울+1]</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }} role="group" aria-label="별점 선택">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star)
                          // 클릭 시 애니메이션 효과
                          const button = document.getElementById(`star-${star}`)
                          if (button) {
                            button.style.transform = 'scale(1.2)'
                            setTimeout(() => {
                              button.style.transform = 'scale(1)'
                            }, 200)
                          }
                        }}
                        id={`star-${star}`}
                        aria-label={`${star}점 선택`}
                        aria-pressed={rating === star}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 8,
                          fontSize: 40,
                          lineHeight: 1,
                          color: rating && star <= rating ? '#FFD700' : '#ddd',
                          transition: 'all 0.2s',
                          transform: 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                          if (!rating) {
                            e.currentTarget.style.color = '#FFD700'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!rating || star > rating) {
                            e.currentTarget.style.color = '#ddd'
                            e.currentTarget.style.transform = 'scale(1)'
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setRating(star)
                          }
                        }}
                      >
                        ★
                      </button>
                    ))}
                    {rating && (
                      <div style={{ marginLeft: 8 }}>
                        <span style={{ color: '#333', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                          {rating}점
                        </span>
                        <span style={{ color: '#666', fontSize: 'var(--font-size-sm)', marginLeft: 8 }}>
                          ({getRatingText(rating)})
                        </span>
                      </div>
                    )}
                  </div>
                  <small style={{ fontSize: 'var(--font-size-xs)', color: '#666', marginTop: '-4px' }}>
                    💡 팁: 이 책을 얼마나 좋아했는지 별 5개 중에서 선택해주세요
                  </small>
                </div>
                <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                  <label htmlFor="short-comment" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }} className={shortComment.trim() ? 'field-complete' : ''}>
                    한 줄 소감 <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-info)', fontWeight: 'var(--font-weight-semibold)' }}>💧 [물방울+2]</span>
                  </label>
                  <input 
                    id="short-comment"
                    name="short-comment"
                    type="text"
                    value={shortComment} 
                    onChange={(e) => setShortComment(e.target.value)} 
                    placeholder="예: 정말 재미있고 흥미진진한 이야기였어요!"
                    aria-label="한 줄 소감 입력"
                  />
                  <small style={{ fontSize: 'var(--font-size-xs)', color: '#666', marginTop: '-4px' }}>
                    💡 팁: 이 책에 대한 짧은 느낌을 한 문장으로 적어보세요
                  </small>
                </div>
                <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                  <label htmlFor="content-text" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }} className={contentText.trim() ? 'field-complete' : ''}>
                    책을 읽고 생각하거나 느낀 점 <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-info)', fontWeight: 'var(--font-weight-semibold)' }}>💧 [물방울+5]</span>
                  </label>
                  <textarea 
                    id="content-text"
                    name="content-text"
                    value={contentText} 
                    onChange={(e) => setContentText(e.target.value)} 
                    rows={8} 
                    placeholder="예: 이 책을 읽으면서 주인공의 용기를 배웠어요. 어려운 상황에서도 포기하지 않고 끝까지 노력하는 모습이 정말 멋졌습니다. 나도 이 책의 주인공처럼 용감해지고 싶어요."
                    aria-label="책을 읽고 생각하거나 느낀 점 입력"
                  />
                  <small style={{ fontSize: 'var(--font-size-xs)', color: '#666', marginTop: '-4px' }}>
                    💡 팁: 이 책에서 배운 점, 인상 깊었던 장면, 느낀 점 등을 자유롭게 적어보세요
                  </small>
                </div>
                <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
                  <label htmlFor="image-file" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }} className={imageFile ? 'field-complete' : ''}>
                    파일첨부(그림, 마인드맵 등) <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-info)', fontWeight: 'var(--font-weight-semibold)' }}>💧 [물방울+2]</span>
                  </label>
                  <div
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files[0]
                      if (file) {
                        handleFileSelect(file)
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="이미지 파일 업로드 영역"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        document.getElementById('image-file')?.click()
                      }
                    }}
                    style={{
                      border: '2px dashed var(--color-border-medium)',
                      borderRadius: 'var(--radius-medium)',
                      padding: 'var(--grid-gap-md)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: imagePreview ? 'transparent' : 'var(--color-background-secondary)'
                    }}
                    onClick={() => {
                      document.getElementById('image-file')?.click()
                    }}
                  >
                    {imagePreview ? (
                      <div>
                        <img
                          src={imagePreview}
                          alt="미리보기"
                          style={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            borderRadius: 'var(--radius-medium)',
                            boxShadow: 'var(--shadow-card)',
                            border: '2px solid var(--color-border-light)',
                            marginBottom: 'var(--grid-gap-sm)'
                          }}
                        />
                        {imageFile && (
                          <div style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>
                            {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageFile(null)
                            setImagePreview(null)
                            const input = document.getElementById('image-file') as HTMLInputElement
                            if (input) input.value = ''
                          }}
                          aria-label="첨부 파일 삭제"
                          style={{
                            marginTop: 'var(--grid-gap-xs)',
                            padding: '8px 16px',
                            backgroundColor: 'var(--color-negative)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-small)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-sm)'
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--grid-gap-xs)' }}>📎</div>
                        <div style={{ fontSize: 'var(--font-size-md)', color: '#666', marginBottom: 'var(--grid-gap-xs)' }}>
                          클릭하거나 파일을 드래그해서 업로드하세요
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: '#999' }}>
                          이미지 파일만 가능 (최대 5MB)
                        </div>
                      </div>
                    )}
                  </div>
                  <input 
                    id="image-file"
                    name="image-file"
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (file) {
                        handleFileSelect(file, e.target)
                      }
                    }} 
                    style={{ display: 'none' }}
                    aria-label="이미지 파일 선택"
                  />
                  {fileError && (
                    <small className="text-negative" style={{ fontSize: 'var(--font-size-sm)' }}>
                      {fileError}
                    </small>
                  )}
                  <small style={{ fontSize: 'var(--font-size-xs)', color: '#666', marginTop: '-4px' }}>
                    💡 팁: 책을 읽고 그린 그림, 마인드맵, 독서 활동 사진 등을 첨부할 수 있어요
                  </small>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', marginTop: 'var(--grid-gap-md)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCurrentStep(2)}
                  style={{ flex: 1, fontSize: 'var(--font-size-md)', padding: '14px 28px' }}
                  aria-label="이전 단계로 이동"
                >
                  ← 이전
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setCurrentStep(4)}
                  disabled={!canProceedToStep3()}
                  style={{ flex: 1, fontSize: 'var(--font-size-md)', padding: '14px 28px' }}
                  aria-label="확인 단계로 이동"
                >
                  확인하기 →
                </button>
                {!canProceedToStep3() && (
                  <div style={{ 
                    padding: 'var(--grid-gap-xs)', 
                    backgroundColor: 'var(--color-warning-light)', 
                    borderRadius: 'var(--radius-small)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-warning)',
                    textAlign: 'center',
                    gridColumn: '1 / -1'
                  }}>
                    ⚠️ 별점, 한 줄 소감, 감상 중 하나 이상 작성해주세요
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4단계: 확인 */}
          {currentStep === 4 && (
            <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
              <div style={{ 
                padding: 'var(--grid-gap-md)', 
                backgroundColor: 'var(--color-background-secondary)', 
                borderRadius: 'var(--radius-medium)',
                border: '2px solid var(--color-primary-light)'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-md)' }}>작성 내용 확인</h3>
                <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
                  {bookCoverUrl && (
                    <div style={{ display: 'flex', gap: 'var(--grid-gap-md)', alignItems: 'flex-start' }}>
                      <img
                        src={bookCoverUrl}
                        alt={bookTitle}
                        style={{ 
                          width: 100, 
                          height: 140, 
                          objectFit: 'cover', 
                          borderRadius: 'var(--radius-small)', 
                          boxShadow: 'var(--shadow-card)'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 4 }}>
                          {bookTitle}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-md)', color: '#666', marginBottom: 8 }}>
                          {bookAuthor}
                        </div>
                        {bookPublisher && (
                          <div style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>
                            출판사: {bookPublisher}
                          </div>
                        )}
                        {rating && (
                          <div style={{ fontSize: 'var(--font-size-md)', marginTop: 8 }}>
                            별점: {'★'.repeat(rating)}{'☆'.repeat(5 - rating)} ({rating}점 - {getRatingText(rating)})
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {shortComment && (
                    <div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginBottom: 4 }}>한 줄 소감</div>
                      <div style={{ fontSize: 'var(--font-size-md)' }}>{shortComment}</div>
                    </div>
                  )}
                  {contentText && (
                    <div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginBottom: 4 }}>책을 읽고 생각하거나 느낀 점</div>
                      <div style={{ fontSize: 'var(--font-size-md)', whiteSpace: 'pre-wrap' }}>{contentText}</div>
                    </div>
                  )}
                  {imagePreview && (
                    <div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginBottom: 4 }}>첨부 파일</div>
                      <img
                        src={imagePreview}
                        alt="첨부 이미지"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 300,
                          borderRadius: 'var(--radius-small)',
                          boxShadow: 'var(--shadow-card)'
                        }}
                      />
                    </div>
                  )}
                  <div style={{ 
                    padding: 'var(--grid-gap-sm)', 
                    backgroundColor: 'var(--color-info-light)', 
                    borderRadius: 'var(--radius-small)',
                    textAlign: 'center',
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-info)'
                  }}>
                    💧 예상 포인트: 물방울 +{calculatePoints()}개
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', marginTop: 'var(--grid-gap-md)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCurrentStep(3)}
                  style={{ flex: 1, fontSize: 'var(--font-size-md)', padding: '14px 28px' }}
                  aria-label="이전 단계로 돌아가서 수정하기"
                >
                  ← 수정하기
                </button>
                <button
                  className="btn primary"
                  disabled={submitting || !canSubmit()}
                  type="submit"
                  style={{ flex: 1, fontSize: 'var(--font-size-md)', padding: '14px 28px' }}
                  aria-label="독서록 제출하기"
                >
                  {submitting ? '제출 중...' : '✅ 제출하기'}
                </button>
              </div>
            </div>
          )}
          {/* 메시지 표시 (모든 단계에서 표시) */}
          {message && (
            <div 
              className={message.includes('실패') || message.includes('오류') ? 'bg-negative-light text-negative' : 'bg-positive-light text-positive'}
              style={{ 
                padding: 'var(--grid-gap-sm) var(--grid-gap-md)', 
                borderRadius: 'var(--radius-small)',
                fontSize: 'var(--font-size-md)',
                marginTop: 'var(--grid-gap-md)'
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  )
}


