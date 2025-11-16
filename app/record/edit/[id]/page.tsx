'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '../../../../lib/supabase/client'
import BookSearch from '../../../../components/BookSearch'

export default function EditRecordPage() {
  const params = useParams()
  const router = useRouter()
  const recordId = params?.id ? parseInt(String(params.id)) : null

  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null)
  const [contentText, setContentText] = useState('')
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  useEffect(() => {
    async function loadRecord() {
      if (!recordId) {
        setError('기록 ID가 없습니다.')
        setLoading(false)
        return
      }

      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      // 기록 가져오기
      const { data: record, error: recordError } = await supabase
        .from('book_records')
        .select('*')
        .eq('id', recordId)
        .eq('user_id', user.id)
        .single()

      if (recordError || !record) {
        setError('기록을 찾을 수 없거나 수정 권한이 없습니다.')
        setLoading(false)
        return
      }

      // 승인된 기록은 수정 불가
      if (record.status === 'approved') {
        setError('승인된 기록은 수정할 수 없습니다.')
        setLoading(false)
        return
      }

      // 폼에 기존 데이터 채우기
      setBookTitle(record.book_title || '')
      setBookAuthor(record.book_author || '')
      setBookCoverUrl(record.book_cover_url)
      setContentText(record.content_text || '')
      setExistingImageUrl(record.content_image_url)
      
      setLoading(false)
    }

    loadRecord()
  }, [recordId])

  function handleBookSelect(book: { title: string; author: string; coverUrl: string | null }) {
    setBookTitle(book.title)
    setBookAuthor(book.author)
    setBookCoverUrl(book.coverUrl)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setSubmitting(true)
    const supabase = getSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      setError('로그인이 필요합니다.')
      return
    }

    if (!recordId) {
      setSubmitting(false)
      setError('기록 ID가 없습니다.')
      return
    }

    let contentImageUrl: string | null = existingImageUrl
    
    // 새 이미지가 업로드된 경우
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
      
      // 파일명을 URL-safe하게 변환
      const sanitizeFileName = (filename: string): string => {
        const lastDot = filename.lastIndexOf('.')
        const ext = lastDot > 0 ? filename.substring(lastDot) : ''
        const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename
        
        const sanitized = nameWithoutExt
          .replace(/[^\w\-_.]/g, '_')
          .replace(/_+/g, '_')
          .substring(0, 100)
          .replace(/^_+|_+$/g, '')
        
        return sanitized + ext
      }
      
      const sanitizedFileName = sanitizeFileName(imageFile.name)
      const path = `${user.id}/${Date.now()}_${sanitizedFileName}`
      
      const { data, error: uploadError } = await supabase.storage.from('reading-uploads').upload(path, imageFile)
      if (uploadError) {
        setSubmitting(false)
        console.error('[EditRecord] Image upload error:', uploadError)
        setMessage(`이미지 업로드 실패: ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('reading-uploads').getPublicUrl(data.path)
      contentImageUrl = urlData.publicUrl
    }

    // 기록 업데이트 (반려된 기록은 다시 pending으로 변경)
    const { error: updateError } = await supabase
      .from('book_records')
      .update({
        book_title: bookTitle || null,
        book_author: bookAuthor || null,
        book_cover_url: bookCoverUrl,
        content_text: contentText || null,
        content_image_url: contentImageUrl,
        status: 'pending', // 수정 시 다시 승인 대기 상태로 변경
        teacher_comment: null // 교사 코멘트 초기화
      })
      .eq('id', recordId)
      .eq('user_id', user.id)

    setSubmitting(false)
    if (updateError) {
      setMessage(`수정 실패: ${updateError.message}`)
    } else {
      setMessage('수정되었습니다. 다시 승인 대기 중입니다!')
      setTimeout(() => {
        router.push('/me')
      }, 1500)
    }
  }

  if (loading) {
    return (
      <main className="container" style={{ maxWidth: 720 }}>
        <h1>독서 기록 수정</h1>
        <div>불러오는 중...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container" style={{ maxWidth: 720 }}>
        <h1>독서 기록 수정</h1>
        <div style={{ color: 'crimson', marginBottom: 16 }}>{error}</div>
        <button className="btn" onClick={() => router.push('/me')}>
          책장으로 돌아가기
        </button>
      </main>
    )
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <h1>독서 기록 수정</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>책 정보</label>
          <BookSearch onSelect={handleBookSelect} />
          {bookCoverUrl && (
            <img
              src={bookCoverUrl}
              alt={bookTitle}
              style={{ width: 100, height: 140, objectFit: 'cover', borderRadius: 4, marginTop: 8 }}
            />
          )}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="book-title">책 제목</label>
          <input 
            id="book-title"
            name="book-title"
            value={bookTitle} 
            onChange={(e) => setBookTitle(e.target.value)} 
            placeholder="예: 해리포터 또는 검색으로 입력" 
          />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="book-author">저자</label>
          <input 
            id="book-author"
            name="book-author"
            value={bookAuthor} 
            onChange={(e) => setBookAuthor(e.target.value)} 
            placeholder="예: J.K. 롤링 또는 검색으로 입력" 
          />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
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
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="image-file">사진 첨부(선택)</label>
          {existingImageUrl && !imageFile && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 14, marginBottom: 4 }}>현재 이미지:</p>
              <img
                src={existingImageUrl}
                alt="현재 이미지"
                style={{ width: 200, maxHeight: 200, objectFit: 'contain', borderRadius: 4, border: '1px solid #ddd' }}
              />
              <small style={{ display: 'block', marginTop: 4, color: '#666' }}>
                새 이미지를 선택하면 기존 이미지가 교체됩니다.
              </small>
            </div>
          )}
          <input 
            id="image-file"
            name="image-file"
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              setFileError(null)
              
              if (file) {
                if (!file.type.startsWith('image/')) {
                  setFileError('이미지 파일만 업로드 가능합니다.')
                  setImageFile(null)
                  e.target.value = ''
                  return
                }
                
                if (file.size > MAX_FILE_SIZE) {
                  setFileError(`파일 크기가 5MB를 초과합니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
                  setImageFile(null)
                  e.target.value = ''
                  return
                }
              }
              
              setImageFile(file)
            }} 
          />
          <small style={{ color: '#666', fontSize: 12 }}>
            이미지 파일만 업로드 가능하며, 최대 5MB까지 업로드할 수 있습니다.
          </small>
          {fileError && (
            <small style={{ color: '#c33', fontSize: 12 }}>
              {fileError}
            </small>
          )}
          {imageFile && !fileError && (
            <small style={{ color: '#666' }}>
              선택된 파일: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
            </small>
          )}
        </div>
        {message && (
          <div style={{ 
            padding: 12, 
            borderRadius: 4,
            backgroundColor: message.includes('실패') || message.includes('오류') ? '#fee' : '#efe',
            color: message.includes('실패') || message.includes('오류') ? '#c33' : '#363'
          }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ 
            padding: 12, 
            borderRadius: 4,
            backgroundColor: '#fee',
            color: '#c33'
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" disabled={submitting} type="submit">
            {submitting ? '수정 중...' : '수정하기'}
          </button>
          <button 
            className="btn" 
            type="button"
            onClick={() => router.push('/me')}
            disabled={submitting}
          >
            취소
          </button>
        </div>
      </form>
    </main>
  )
}

