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
    const { error } = await supabase.rpc('approve_record_and_reward', { p_record_id: id })
    if (error) setError(error.message); else load()
  }

  async function reject(id: number) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('book_records').update({ status: 'rejected' }).eq('id', id)
    if (error) setError(error.message); else load()
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


