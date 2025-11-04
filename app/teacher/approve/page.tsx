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
  user_nickname?: string | null
}

export default function ApprovePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})

  async function load() {
    setLoading(true)
    const supabase = getSupabaseClient()
    
    // 먼저 기록을 가져오고
    const { data: records, error: recordsError } = await supabase
      .from('book_records')
      .select('id, user_id, book_title, book_author, content_text, content_image_url')
      .eq('status', 'pending')
      .order('id', { ascending: false })
    
    if (recordsError) {
      setError(recordsError.message)
      console.error('[Approve] Load error:', recordsError)
      setLoading(false)
      return
    }
    
    if (!records || records.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    
    // 각 기록의 user_id로 프로필 정보 가져오기
    const userIds = [...new Set(records.map(r => r.user_id))]
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', userIds)
    
    if (profilesError) {
      console.error('[Approve] Profiles load error:', profilesError)
    }
    
    // 프로필 맵 생성
    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p.nickname])
    )
    
    // 기록과 프로필 정보 결합
    setRows(records.map(record => ({
      id: record.id,
      user_id: record.user_id,
      book_title: record.book_title,
      book_author: record.book_author,
      content_text: record.content_text,
      content_image_url: record.content_image_url,
      user_nickname: profileMap.get(record.user_id) || null
    })))
    
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(id: number) {
    setError(null)
    const supabase = getSupabaseClient()
    
    // 먼저 승인 처리
    console.log('[Approve] Calling approve_record_and_reward with id:', id)
    const { data, error: rpcError } = await supabase.rpc('approve_record_and_reward', { p_record_id: id })
    if (rpcError) {
      console.error('[Approve] RPC error:', rpcError)
      setError(`승인 실패: ${rpcError.message}${rpcError.details ? ` (${rpcError.details})` : ''}${rpcError.hint ? ` 힌트: ${rpcError.hint}` : ''}`)
      return
    }
    console.log('[Approve] RPC success:', data)
    
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
    
    // 먼저 기록 정보 가져오기 (알림 생성용)
    const { data: record } = await supabase
      .from('book_records')
      .select('user_id, book_title')
      .eq('id', id)
      .single()
    
    if (!record) {
      setError('기록을 찾을 수 없습니다.')
      return
    }
    
    // 기록 반려 처리
    const { error } = await supabase
      .from('book_records')
      .update({ status: 'rejected', teacher_comment: comment })
      .eq('id', id)
    
    if (error) {
      setError(error.message)
      return
    }
    
    // 반려 알림 생성
    const rejectionMessage = comment 
      ? `"${record.book_title || '독서 기록'}"이 반려되었습니다. 반려 사유: ${comment}`
      : `"${record.book_title || '독서 기록'}"이 반려되었습니다.`
    
    const { error: notifError } = await supabase.rpc('create_notification', {
      p_user_id: record.user_id,
      p_type: 'rejection',
      p_title: '❌ 독서 기록이 반려되었어요',
      p_message: rejectionMessage,
      p_related_record_id: id
    })
    
    if (notifError) {
      console.error('[Reject] Notification creation failed:', notifError)
      // 알림 생성 실패해도 반려는 처리되었으므로 계속 진행
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
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {r.book_title ?? '(제목 없음)'}
              {r.book_author && <small style={{ color: '#666', marginLeft: 8 }}>{r.book_author}</small>}
            </div>
            {r.user_nickname && (
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                👤 학생: <strong>{r.user_nickname}</strong>
              </div>
            )}
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


