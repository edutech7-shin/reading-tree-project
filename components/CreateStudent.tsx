'use client'

import { useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'

type Props = {
  onCreated: () => void
}

export default function CreateStudent({ onCreated }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      
      // Service Role Key는 클라이언트에서 사용할 수 없으므로
      // API Route를 통해 처리하거나, 직접 auth.admin.createUser를 사용할 수 없음
      // 대신 일반 회원가입 방식으로 처리하되, 프로필을 교사가 생성한 것으로 표시
      
      // 실제로는 서버 API를 통해 처리해야 함
      const response = await fetch('/api/teacher/create-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '학생 계정 생성에 실패했습니다.')
      }

      setSuccess(true)
      setEmail('')
      setPassword('')
      setName('')
      
      setTimeout(() => {
        setShowModal(false)
        setSuccess(false)
        onCreated()
      }, 1500)
    } catch (err: any) {
      setError(err.message || '계정 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="btn primary" onClick={() => setShowModal(true)}>
        + 학생 계정 생성
      </button>

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
          onClick={() => {
            if (!loading) setShowModal(false)
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 24,
              maxWidth: 480,
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>학생 계정 생성</h3>

            {success && (
              <div style={{ 
                padding: 12, 
                backgroundColor: '#efe', 
                color: '#363', 
                borderRadius: 4, 
                marginBottom: 16 
              }}>
                ✅ 학생 계정이 생성되었습니다!
              </div>
            )}

            {error && (
              <div style={{ 
                padding: 12, 
                backgroundColor: '#fee', 
                color: '#c33', 
                borderRadius: 4, 
                marginBottom: 16 
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                  disabled={loading || success}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>임시 비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="최소 6자 이상"
                  required
                  minLength={6}
                  disabled={loading || success}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                />
                <small style={{ color: '#666', fontSize: 12 }}>
                  학생이 로그인 후 비밀번호를 변경할 수 있습니다.
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>학생 이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                  disabled={loading || success}
                  style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={loading || success}
                  style={{ flex: 1 }}
                >
                  {loading ? '생성 중...' : success ? '생성 완료' : '계정 생성'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (!loading) setShowModal(false)
                  }}
                  disabled={loading}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

