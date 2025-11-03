'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../../lib/supabase/client'

type Row = {
  id: number
  user_id: string
  book_title: string | null
  book_author: string | null
  content_text: string | null
  content_image_url: string | null
}

export default function ApprovePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})

  async function load() {
    setLoading(true)
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('book_records')
      .select('id, user_id, book_title, book_author, content_text, content_image_url')
      .eq('status', 'pending')
      .order('id', { ascending: false })
    setLoading(false)
    if (error) setError(error.message)
    else setRows(data as Row[])
  }

  useEffect(() => { load() }, [])

  async function approve(id: number) {
    setError(null)
    const supabase = getSupabaseClient()
    
    // 먼저 승인 처리
    const { error: rpcError } = await supabase.rpc('approve_record_and_reward', { p_record_id: id })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    
    // 코멘트가 있으면 업데이트
    const comment = comments[id]?.trim()
    if (comment) {
      const { error: updateError } = await supabase
        .from('book_records')
        .update({ teacher_comment: comment })
        .eq('id', id)
      if (updateError) {
        setError(updateError.message)
        return
      }
    }
    
    // 코멘트 상태 초기화
    setComments(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    load()
  }

  async function reject(id: number) {
    setError(null)
    const supabase = getSupabaseClient()
    const comment = comments[id]?.trim() || null
    
    const { error } = await supabase
      .from('book_records')
      .update({ status: 'rejected', teacher_comment: comment })
      .eq('id', id)
    
    if (error) {
      setError(error.message)
      return
    }
    
    // 코멘트 상태 초기화
    setComments(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    load()
  }

  return (
    <main className="container">
      <h1>독서 기록 승인</h1>
      {loading && <div>불러오는 중...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map(r => (
          <div className="card" key={r.id}>
            <div style={{ fontWeight: 600 }}>{r.book_title ?? '(제목 없음)'} <small>{r.book_author}</small></div>
            {r.content_text && <p style={{ marginTop: 8 }}>{r.content_text}</p>}
            {r.content_image_url && (
              <a className="btn" style={{ marginTop: 8 }} href={r.content_image_url} target="_blank" rel="noreferrer">이미지 보기</a>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>교사 코멘트 (선택)</label>
              <textarea
                value={comments[r.id] || ''}
                onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                placeholder="피드백을 입력하세요..."
                rows={2}
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn primary" onClick={() => approve(r.id)}>👍 승인하기</button>
              <button className="btn" onClick={() => reject(r.id)}>↩️ 반려하기</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}


