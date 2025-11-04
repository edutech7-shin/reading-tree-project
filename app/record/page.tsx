'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import BookSearch from '../../components/BookSearch'

export default function RecordPage() {
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null)
  const [contentText, setContentText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function handleBookSelect(book: { title: string; author: string; coverUrl: string | null }) {
    setBookTitle(book.title)
    setBookAuthor(book.author)
    setBookCoverUrl(book.coverUrl)
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
      const path = `${user.id}/${Date.now()}_${imageFile.name}`
      const { data, error } = await supabase.storage.from('reading-uploads').upload(path, imageFile)
      if (error) {
        setSubmitting(false)
        setMessage(`이미지 업로드 실패: ${error.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('reading-uploads').getPublicUrl(data.path)
      contentImageUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('book_records').insert({
      user_id: user.id,
      book_title: bookTitle || null,
      book_author: bookAuthor || null,
      book_cover_url: bookCoverUrl,
      content_text: contentText || null,
      content_image_url: contentImageUrl,
      status: 'pending'
    })

    setSubmitting(false)
    if (insertError) setMessage(`제출 실패: ${insertError.message}`)
    else {
      setBookTitle(''); setBookAuthor(''); setBookCoverUrl(null); setContentText(''); setImageFile(null)
      setMessage('제출되었습니다. 승인 대기 중입니다!')
    }
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <h1>독서 기록하기</h1>
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
          <input 
            id="image-file"
            name="image-file"
            type="file" 
            accept="image/*" 
            onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
          />
          <small>주의: Supabase Storage 버킷 'reading-uploads'가 필요합니다.</small>
        </div>
        {message && <div>{message}</div>}
        <button className="btn primary" disabled={submitting}>{submitting ? '제출 중...' : '제출하기'}</button>
      </form>
    </main>
  )
}


