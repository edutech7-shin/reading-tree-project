'use client'

import { FormEvent, useEffect, useState } from 'react'
import styles from './students.module.css'

type Props = {
  open: boolean
  onOpenChange: (next: boolean) => void
  onSubmit: (rawInput: string) => Promise<void>
  isPending: boolean
  error: string | null
  onErrorClear: () => void
}

export function AddStudentDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
  onErrorClear
}: Props) {
  const [tab, setTab] = useState<'names' | 'numberRange' | 'numbers'>('names')
  const [input, setInput] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setInput('')
      setLocalError(null)
    }
  }, [open])

  const handleClose = () => {
    if (isPending) return
    setInput('')
    setLocalError(null)
    onErrorClear()
    onOpenChange(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim()) {
      setLocalError('학생 이름을 입력해주세요.')
      return
    }
    setLocalError(null)
    onErrorClear()
    onSubmit(input).catch(() => {
      // 오류 메시지는 상위 컴포넌트에서 전달됨
    })
  }

  if (!open) {
    return null
  }

  return (
    <div className={styles.dialogOverlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
        <header className={styles.dialogHeader}>
          <h2>새 학생 추가</h2>
          <button type='button' className={styles.dialogClose} onClick={handleClose}>
            ×
          </button>
        </header>

        <nav className={styles.tabList} aria-label='학생 추가 방식'>
          <button
            type='button'
            className={tab === 'names' ? styles.tabActive : styles.tab}
            onClick={() => setTab('names')}
          >
            이름으로 추가
          </button>
          <button
            type='button'
            className={tab === 'numberRange' ? styles.tabActive : styles.tab}
            onClick={() => setTab('numberRange')}
            disabled
          >
            번호 범위로 추가
          </button>
          <button
            type='button'
            className={tab === 'numbers' ? styles.tabActive : styles.tab}
            onClick={() => setTab('numbers')}
            disabled
          >
            번호 직접 입력
          </button>
        </nav>

        {tab === 'names' && (
          <form className={styles.dialogBody} onSubmit={handleSubmit}>
            <p className={styles.dialogDescription}>
              개인정보 보호를 위해 학생의 성을 제외한 닉네임만 입력하는 것을 권장합니다.
              쉼표, 띄어쓰기, 줄바꿈으로 여러 명을 한 번에 추가할 수 있습니다.
            </p>

            <label className={styles.inputLabel}>
              학생 이름(닉네임) 입력 *
              <textarea
                className={styles.textarea}
                placeholder='예: 민성, 주희 사랑, 민지'
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isPending}
              />
            </label>

            {localError && <p className={styles.errorMessage}>{localError}</p>}
            {error && <p className={styles.errorMessage}>{error}</p>}

            <footer className={styles.dialogFooter}>
              <button
                type='button'
                className={styles.ghostButton}
                onClick={handleClose}
                disabled={isPending}
              >
                취소
              </button>
              <button type='submit' className={styles.primaryButton} disabled={isPending}>
                {isPending ? '생성 중...' : '학생 생성하기'}
              </button>
            </footer>
          </form>
        )}

        {tab !== 'names' && (
          <div className={styles.dialogBody}>
            <div className={styles.placeholderCard}>
              이 기능은 곧 제공될 예정입니다.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

