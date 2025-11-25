'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabaseClient } from '../../../../lib/supabase/client'
import Link from 'next/link'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function MissionCompletePage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.assignmentId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  
  const [assignment, setAssignment] = useState<any>(null)
  const [mission, setMission] = useState<any>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  
  const [proofText, setProofText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'student' || !profile.name) {
        setMessage('학생 계정만 미션을 완료할 수 있습니다.')
        setLoading(false)
        return
      }

      // class_students에서 student_id 찾기
      const { data: classStudent } = await supabase
        .from('class_students')
        .select('id')
        .eq('name', profile.name)
        .limit(1)
        .maybeSingle()

      if (!classStudent) {
        setMessage('학급에 등록되지 않은 학생입니다.')
        setLoading(false)
        return
      }

      setStudentId(classStudent.id)

      // 미션 할당 정보 가져오기
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('mission_assignments')
        .select(`
          id,
          status,
          start_date,
          end_date,
          missions (
            id,
            title,
            description,
            type,
            verification_method,
            book_title,
            book_author,
            mission_content,
            points
          )
        `)
        .eq('id', assignmentId)
        .eq('student_id', classStudent.id)
        .maybeSingle()

      if (assignmentError || !assignmentData) {
        setMessage('미션 정보를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      if (assignmentData.status !== 'active') {
        setMessage('이 미션은 이미 완료되었거나 만료되었습니다.')
        setLoading(false)
        return
      }

      setAssignment(assignmentData)
      setMission(assignmentData.missions)
      setLoading(false)
    }

    loadData()
  }, [assignmentId, router])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      setFileError(null)
      return
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      setFileError('이미지 파일만 업로드 가능합니다.')
      setImageFile(null)
      setImagePreview(null)
      return
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`파일 크기가 5MB를 초과합니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      setImageFile(null)
      setImagePreview(null)
      return
    }

    setFileError(null)
    setImageFile(file)

    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setFileError(null)
    setSubmitting(true)

    if (!proofText.trim() && !imageFile) {
      setMessage('증빙 자료(텍스트 또는 이미지)를 입력해주세요.')
      setSubmitting(false)
      return
    }

    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !studentId || !assignment) {
      setMessage('로그인이 필요합니다.')
      setSubmitting(false)
      return
    }

    let proofImageUrl: string | null = null

    // 이미지 업로드
    if (imageFile) {
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
      const path = `missions/${user.id}/${Date.now()}_${sanitizedFileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(path, imageFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('[Mission Complete] Upload error:', uploadError)
        setMessage('이미지 업로드에 실패했습니다.')
        setSubmitting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('content-images')
        .getPublicUrl(path)

      proofImageUrl = urlData.publicUrl
    }

    // 미션 완료 기록 생성
    const { data: completion, error: completionError } = await supabase
      .from('mission_completions')
      .insert({
        assignment_id: assignment.id,
        student_id: studentId,
        verified_by: mission.verification_method || 'self',
        verification_status: mission.verification_method === 'self' ? 'approved' : 'pending',
        proof_text: proofText.trim() || null,
        proof_image_url: proofImageUrl,
        points_awarded: mission.verification_method === 'self' ? mission.points : 0
      })
      .select()
      .single()

    if (completionError) {
      console.error('[Mission Complete] Completion error:', completionError)
      setMessage('미션 완료 처리에 실패했습니다.')
      setSubmitting(false)
      return
    }

    // 자체 검증(self)인 경우 즉시 포인트 지급
    if (mission.verification_method === 'self' && mission.points > 0) {
      // 현재 포인트 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single()

      if (!profileError && profile) {
        // 프로필 포인트 업데이트
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: (profile.points || 0) + mission.points })
          .eq('id', user.id)

        if (pointsError) {
          console.error('[Mission Complete] Points update error:', pointsError)
          // 포인트 업데이트 실패해도 완료는 기록됨
        }
      }
    }

    // 성공 메시지 표시 후 미션 페이지로 리다이렉트
    setMessage('미션 완료가 등록되었습니다!')
    setTimeout(() => {
      router.push('/missions')
    }, 1500)
  }

  if (loading) {
    return (
      <main className="container">
        <h1>미션 완료</h1>
        <p>로딩 중...</p>
      </main>
    )
  }

  if (!assignment || !mission) {
    return (
      <main className="container">
        <h1>미션 완료</h1>
        <div className="card" style={{ marginTop: 'var(--grid-gap-md)' }}>
          <p>{message || '미션 정보를 불러올 수 없습니다.'}</p>
          <Link href="/missions" className="btn primary" style={{ marginTop: 'var(--grid-gap-sm)', display: 'inline-block' }}>
            미션 목록으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      <h1>미션 완료</h1>

      <div className="card" style={{ marginTop: 'var(--grid-gap-md)' }}>
        <h2 style={{ marginTop: 0 }}>{mission.title}</h2>
        
        {mission.description && (
          <p style={{ color: 'var(--color-text-secondary)' }}>{mission.description}</p>
        )}

        {mission.mission_content && (
          <div style={{ marginTop: 'var(--grid-gap-sm)' }}>
            <strong>미션 내용:</strong>
            <p style={{ marginTop: 'var(--grid-gap-xs)', whiteSpace: 'pre-wrap' }}>
              {mission.mission_content}
            </p>
          </div>
        )}

        <div style={{ marginTop: 'var(--grid-gap-sm)' }}>
          <strong>보상:</strong> {mission.points} 포인트
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 'var(--grid-gap-md)' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>증빙 자료</h3>
          
          <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
              <label htmlFor="proof-text">
                완료 증빙 (텍스트) <span style={{ fontSize: 'var(--font-size-xs)', color: '#666', fontWeight: 'normal' }}>선택</span>
              </label>
              <textarea
                id="proof-text"
                name="proof-text"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="미션 완료 증빙을 텍스트로 작성해주세요"
                rows={6}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
              <label htmlFor="proof-image">
                완료 증빙 (이미지) <span style={{ fontSize: 'var(--font-size-xs)', color: '#666', fontWeight: 'normal' }}>선택</span>
              </label>
              <input
                id="proof-image"
                name="proof-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {fileError && (
                <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                  {fileError}
                </p>
              )}
              {imagePreview && (
                <div style={{ marginTop: 'var(--grid-gap-xs)' }}>
                  <img
                    src={imagePreview}
                    alt="미리보기"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: 'var(--radius-small)',
                      border: '1px solid var(--color-border)'
                    }}
                  />
                </div>
              )}
            </div>

            {!proofText.trim() && !imageFile && (
              <p style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                텍스트 또는 이미지 중 하나는 반드시 입력해주세요.
              </p>
            )}
          </div>
        </div>

        {message && (
          <div
            className="card"
            style={{
              marginTop: 'var(--grid-gap-md)',
              backgroundColor: message.includes('실패') || message.includes('오류')
                ? 'var(--color-error-light)'
                : 'var(--color-success-light)',
              color: message.includes('실패') || message.includes('오류')
                ? 'var(--color-error)'
                : 'var(--color-success)'
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', marginTop: 'var(--grid-gap-md)' }}>
          <Link href="/missions" className="btn" style={{ display: 'inline-block' }}>
            취소
          </Link>
          <button
            type="submit"
            className="btn primary"
            disabled={submitting || (!proofText.trim() && !imageFile)}
          >
            {submitting ? '제출 중...' : '완료 제출하기'}
          </button>
        </div>
      </form>
    </main>
  )
}

