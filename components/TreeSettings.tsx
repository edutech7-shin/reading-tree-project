'use client'

import { useState } from 'react'
import { getSupabaseClient } from '../lib/supabase/client'

type Props = {
  treeId: number
  currentTarget: number
  className: string
}

export default function TreeSettings({ treeId, currentTarget, className }: Props) {
  const [target, setTarget] = useState(currentTarget)
  const [classNameInput, setClassNameInput] = useState(className)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const supabase = getSupabaseClient()
    
    const updates: { level_up_target?: number; class_name?: string } = {}
    if (target !== currentTarget) {
      updates.level_up_target = target
    }
    if (classNameInput !== className) {
      updates.class_name = classNameInput
    }

    if (Object.keys(updates).length === 0) {
      setSaving(false)
      setMessage('변경사항이 없습니다.')
      return
    }

    const { error } = await supabase
      .from('class_trees')
      .update(updates)
      .eq('id', treeId)

    setSaving(false)
    if (error) {
      setMessage(`저장 실패: ${error.message}`)
    } else {
      setMessage('저장되었습니다!')
      setTimeout(() => setMessage(null), 2000)
    }
  }

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>나무 설정</h3>
      
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>반 이름</label>
          <input
            type="text"
            value={classNameInput}
            onChange={(e) => setClassNameInput(e.target.value)}
            placeholder="예: 3학년 1반"
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>다음 레벨업 목표 (잎사귀 수)</label>
          <input
            type="number"
            min="1"
            value={target}
            onChange={(e) => setTarget(parseInt(e.target.value) || 50)}
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          />
          <small style={{ color: '#666', fontSize: 12 }}>현재 목표: {currentTarget}권</small>
        </div>

        {message && (
          <div style={{ 
            padding: 8, 
            borderRadius: 4,
            backgroundColor: message.includes('실패') ? '#fee' : '#efe',
            color: message.includes('실패') ? '#c33' : '#363'
          }}>
            {message}
          </div>
        )}

        <button 
          className="btn primary" 
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saving ? '저장 중...' : '설정 저장하기'}
        </button>
      </div>
    </div>
  )
}

