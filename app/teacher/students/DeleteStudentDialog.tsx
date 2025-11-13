'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './students.module.css'
import type { DashboardStudent } from './StudentsDashboard'

type Props = {
  open: boolean
  onOpenChange: (next: boolean) => void
  students: DashboardStudent[]
  onDelete: (ids: string[]) => Promise<void>
  isPending: boolean
  error: string | null
  onErrorClear: () => void
}

export function DeleteStudentDialog({
  open,
  onOpenChange,
  students,
  onDelete,
  isPending,
  error,
  onErrorClear
}: Props) {
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setKeyword('')
      setSelected(new Set())
      setLocalError(null)
    }
  }, [open])

  const handleClose = () => {
    if (isPending) return
    setKeyword('')
    setSelected(new Set())
    setLocalError(null)
    onErrorClear()
    onOpenChange(false)
  }

  const filtered = useMemo(() => {
    if (!keyword.trim()) {
      return students
    }
    const lowered = keyword.trim().toLowerCase()
    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(lowered) ||
        student.studentNumber.toString().includes(lowered)
      )
    })
  }, [keyword, students])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDelete = () => {
    if (selected.size === 0) {
      setLocalError('삭제할 학생을 선택해주세요.')
      return
    }
    setLocalError(null)
    onErrorClear()
    onDelete(Array.from(selected)).catch(() => {
      // 오류 메시지는 상위 컴포넌트에서 처리
    })
  }

  if (!open) {
    return null
  }

  return (
    <div className={styles.dialogOverlay} onClick={handleClose}>
      <div className={styles.dialogLarge} onClick={(event) => event.stopPropagation()}>
        <header className={styles.dialogHeader}>
          <h2>삭제할 학생 선택</h2>
          <button type='button' className={styles.dialogClose} onClick={handleClose}>
            ×
          </button>
        </header>

        <div className={styles.dialogBody}>
          <p className={styles.dialogDescription}>
            삭제된 학생은 복구할 수 없습니다. 번호 또는 닉네임으로 검색해 삭제할 학생을 선택하세요.
          </p>
          <input
            type='search'
            placeholder='번호 또는 닉네임으로 검색...'
            className={styles.searchInput}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            disabled={isPending}
          />

          <div className={styles.studentGrid}>
            {filtered.map((student) => {
              const isSelected = selected.has(student.id)
              return (
                <button
                  key={student.id}
                  type='button'
                  className={isSelected ? styles.studentCardSelected : styles.studentCard}
                  onClick={() => toggle(student.id)}
                  disabled={isPending}
                >
                  <span className={styles.studentBadge}>{student.studentNumber}번</span>
                  <span className={styles.studentAvatar}>{student.name.slice(0, 1)}</span>
                  <span className={styles.studentName}>{student.name}</span>
                  {isSelected && <span className={styles.studentCheck}>✓</span>}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className={styles.empty}>
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>

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
          <button
            type='button'
            className={styles.destructiveButton}
            onClick={handleDelete}
            disabled={isPending || selected.size === 0}
          >
            {isPending ? '삭제 중...' : `선택 완료 (${selected.size}명)`}
          </button>
        </footer>
      </div>
    </div>
  )
}

