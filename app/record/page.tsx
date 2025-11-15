'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import BookSearch from '../../components/BookSearch'

export default function RecordPage() {
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null)
  const [bookPublisher, setBookPublisher] = useState('')
  const [bookIsbn, setBookIsbn] = useState('')
  const [bookPublicationYear, setBookPublicationYear] = useState('')
  const [contentText, setContentText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  function handleBookSelect(book: { 
    title: string
    author: string
    coverUrl: string | null
    isbn?: string | null
    publisher?: string | null
    publicationYear?: string | null
  }) {
    setBookTitle(book.title)
    setBookAuthor(book.author)
    setBookCoverUrl(book.coverUrl)
    setBookPublisher(book.publisher || '')
    setBookIsbn(book.isbn || '')
    setBookPublicationYear(book.publicationYear || '')
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

    const { error: insertError } = await supabase.from('book_records').insert({
      user_id: user.id,
      book_title: bookTitle || null,
      book_author: bookAuthor || null,
      book_cover_url: bookCoverUrl,
      book_publisher: bookPublisher || null,
      book_isbn: bookIsbn || null,
      book_publication_date: publicationDateValue,
      content_text: contentText || null,
      content_image_url: contentImageUrl,
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
      setContentText('')
      setImageFile(null)
      setMessage('제출되었습니다. 승인 대기 중입니다!')
    }
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <div className="card" style={{ marginTop: 'var(--card-spacing)' }}>
        <h1>독서 기록하기</h1>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
          {/* 검색창을 맨 상단에 배치 */}
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label>책 검색</label>
            <BookSearch onSelect={handleBookSelect} />
            {bookCoverUrl && (
              <img
                src={bookCoverUrl}
                alt={bookTitle}
                style={{ 
                  width: 100, 
                  height: 140, 
                  objectFit: 'cover', 
                  borderRadius: 'var(--radius-small)', 
                  marginTop: 'var(--grid-gap-xs)',
                  boxShadow: 'var(--shadow-card)'
                }}
              />
            )}
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="book-title">책 제목</label>
            <input 
              id="book-title"
              name="book-title"
              type="text"
              value={bookTitle} 
              onChange={(e) => setBookTitle(e.target.value)} 
              placeholder="예: 해리포터 또는 검색으로 입력" 
            />
            <small className="text-tertiary" style={{ fontSize: 'var(--font-size-xs)' }}>
              책 제목을 입력하거나 검색으로 선택하세요.
            </small>
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="book-author">저자</label>
            <input 
              id="book-author"
              name="book-author"
              type="text"
              value={bookAuthor} 
              onChange={(e) => setBookAuthor(e.target.value)} 
              placeholder="예: J.K. 롤링 또는 검색으로 입력" 
            />
            <small className="text-tertiary" style={{ fontSize: 'var(--font-size-xs)' }}>
              저자명을 입력하거나 검색으로 선택하세요.
            </small>
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="book-publisher">출판사</label>
            <input 
              id="book-publisher"
              name="book-publisher"
              type="text"
              value={bookPublisher} 
              onChange={(e) => setBookPublisher(e.target.value)} 
              placeholder="예: 문학수첩 또는 검색으로 입력" 
            />
            <small className="text-tertiary" style={{ fontSize: 'var(--font-size-xs)' }}>
              출판사명을 입력하거나 검색으로 선택하세요.
            </small>
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="book-isbn">ISBN</label>
            <input 
              id="book-isbn"
              name="book-isbn"
              type="text"
              value={bookIsbn} 
              onChange={(e) => setBookIsbn(e.target.value)} 
              placeholder="예: 9788936434267 또는 검색으로 입력" 
            />
            <small className="text-tertiary" style={{ fontSize: 'var(--font-size-xs)' }}>
              ISBN을 입력하거나 검색으로 선택하세요.
            </small>
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="book-publication-year">출판연도</label>
            <input 
              id="book-publication-year"
              name="book-publication-year"
              type="text"
              value={bookPublicationYear} 
              onChange={(e) => setBookPublicationYear(e.target.value)} 
              placeholder="예: 2023 (YYYY 형식)" 
            />
            <small className="text-tertiary" style={{ fontSize: 'var(--font-size-xs)' }}>
              출판연도를 YYYY 형식으로 입력하세요.
            </small>
          </div>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
            <label htmlFor="content-text">감상(텍스트)</label>
            <textarea 
              id="content-text"
              name="content-text"
              value={contentText} 
              onChange={(e) => setContentText(e.target.value)} 
              rows={6} 
              placeholder="느낀 점을 적어보세요" 
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
            />
            <small className="text-tertiary" style={{ fontSize: 'var(--font-size-xs)' }}>
              이미지 파일만 업로드 가능하며, 최대 5MB까지 업로드할 수 있습니다.
            </small>
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


