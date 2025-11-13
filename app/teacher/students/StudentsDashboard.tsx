'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addStudentsByNamesAction,
  addStudentsByNumberListAction,
  addStudentsByNumberRangeAction,
  deleteStudentsAction
} from './actions'
import styles from './students.module.css'
import { AddStudentDialog } from './AddStudentDialog'
import { DeleteStudentDialog } from './DeleteStudentDialog'

export type DashboardStudent = {
  id: string
  studentNumber: number
  name: string
  level: number
  leaves: number
  avatarType: string
}

type Props = {
  students: DashboardStudent[]
}

const tierMap = [
  { maxLevel: 5, label: '루키' },
  { maxLevel: 10, label: '브론즈' },
  { maxLevel: 15, label: '실버' },
  { maxLevel: 20, label: '골드' },
  { maxLevel: Infinity, label: '마스터' }
]

function resolveTier(level: number) {
  const tier = tierMap.find((item) => level <= item.maxLevel)
  return tier?.label ?? '루키'
}

export function StudentsDashboard({ students }: Props) {
  const [showLevel, setShowLevel] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  const stats = useMemo(() => {
    const total = students.length
    const levelSum = students.reduce((sum, student) => sum + (student.level ?? 0), 0)
    const average = total === 0 ? 0 : Math.round((levelSum / total) * 10) / 10
    return {
      total,
      average
    }
  }, [students])

  const handleAddStudentsByNames = async (input: string) => {
    try {
      setIsPending(true)
      setAddError(null)
      await addStudentsByNamesAction(input)
      setIsAddOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : '학생을 추가할 수 없습니다.'
      setAddError(message)
      throw error
    } finally {
      setIsPending(false)
    }
  }

  const handleAddStudentsByNumberRange = async (firstNumber: number, lastNumber: number) => {
    try {
      setIsPending(true)
      setAddError(null)
      await addStudentsByNumberRangeAction(firstNumber, lastNumber)
      setIsAddOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : '학생을 추가할 수 없습니다.'
      setAddError(message)
      throw error
    } finally {
      setIsPending(false)
    }
  }

  const handleAddStudentsByNumberList = async (numbers: number[]) => {
    try {
      setIsPending(true)
      setAddError(null)
      await addStudentsByNumberListAction(numbers)
      setIsAddOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : '학생을 추가할 수 없습니다.'
      setAddError(message)
      throw error
    } finally {
      setIsPending(false)
    }
  }

  const handleDeleteStudents = async (ids: string[]) => {
    try {
      setIsPending(true)
      setDeleteError(null)
      await deleteStudentsAction(ids)
      setIsDeleteOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : '학생을 삭제할 수 없습니다.'
      setDeleteError(message)
      throw error
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>학생 목록</h1>
          <p className={styles.subtitle}>현재 {stats.total}/30 학생 사용 중</p>
        </div>

        <div className={styles.controls}>
          <label className={styles.toggleLabel}>
            <span>레벨 표시</span>
            <button
              type='button'
              className={showLevel ? styles.toggleOn : styles.toggleOff}
              onClick={() => setShowLevel((prev) => !prev)}
              aria-pressed={showLevel}
            >
              <span className={styles.toggleHandle} />
            </button>
          </label>

          <button
            type='button'
            className={styles.guideButton}
            disabled={isPending}
          >
            등급 안내
          </button>

          <button
            type='button'
            className={styles.deleteButton}
            onClick={() => setIsDeleteOpen(true)}
            disabled={students.length === 0 || isPending}
          >
            학생 삭제
          </button>

          <button
            type='button'
            className={styles.addButton}
            onClick={() => setIsAddOpen(true)}
            disabled={isPending}
          >
            학생 추가
          </button>
        </div>

        <div className={styles.averageBlock}>
          <span className={styles.averageLabel}>평균 레벨</span>
          <span className={styles.averageValue}>
            {stats.average.toFixed(1)}
            <span className={styles.averageSuffix}> ({stats.total}명)</span>
          </span>
        </div>
      </header>

      <div className={styles.grid}>
        {students.map((student) => (
          <article key={student.id} className={styles.card}>
            <span className={styles.badge}>{student.studentNumber}번</span>
            <div className={styles.avatarWrapper}>
              <span className={styles.avatar} data-variant={student.avatarType}>
                {student.name.slice(0, 1)}
              </span>
            </div>
            <h2 className={styles.name}>{student.name}</h2>
            <p className={styles.tier}>{resolveTier(student.level)}</p>
            {showLevel && (
              <span className={styles.levelBadge}>Lv.{student.level}</span>
            )}
            <span className={styles.leafBadge}>🍃 {student.leaves}</span>
          </article>
        ))}
        {students.length === 0 && (
          <div className={styles.empty}>
            아직 등록된 학생이 없습니다. 학생 추가 버튼을 눌러 첫 번째 학생을 등록해보세요.
          </div>
        )}
      </div>

      <AddStudentDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmitNames={handleAddStudentsByNames}
        onSubmitRange={handleAddStudentsByNumberRange}
        onSubmitNumbers={handleAddStudentsByNumberList}
        isPending={isPending}
        error={addError}
        onErrorClear={() => setAddError(null)}
      />

      <DeleteStudentDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        students={students}
        onDelete={handleDeleteStudents}
        isPending={isPending}
        error={deleteError}
        onErrorClear={() => setDeleteError(null)}
      />
    </section>
  )
}

