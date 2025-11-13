'use client'

import { FormEvent, useEffect, useState } from 'react'
import styles from './students.module.css'

type TabKey = 'names' | 'numberRange' | 'numbers'

type Props = {
  open: boolean
  onOpenChange: (next: boolean) => void
  onSubmitNames: (rawInput: string) => Promise<void>
  onSubmitRange: (firstNumber: number, lastNumber: number) => Promise<void>
  onSubmitNumbers: (numbers: number[]) => Promise<void>
  isPending: boolean
  error: string | null
  onErrorClear: () => void
}

export function AddStudentDialog({
  open,
  onOpenChange,
  onSubmitNames,
  onSubmitRange,
  onSubmitNumbers,
  isPending,
  error,
  onErrorClear
}: Props) {
  const [tab, setTab] = useState<TabKey>('names')
  const [namesInput, setNamesInput] = useState('')
  const [firstNumber, setFirstNumber] = useState('')
  const [lastNumber, setLastNumber] = useState('')
  const [numbersInput, setNumbersInput] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setNamesInput('')
      setFirstNumber('')
      setLastNumber('')
      setNumbersInput('')
      setLocalError(null)
    }
  }, [open])

  const handleClose = () => {
    if (isPending) return
    setNamesInput('')
    setFirstNumber('')
    setLastNumber('')
    setNumbersInput('')
    setLocalError(null)
    onErrorClear()
    onOpenChange(false)
  }

  const handleNamesSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!namesInput.trim()) {
      setLocalError('학생 이름을 입력해주세요.')
      return
    }
    setLocalError(null)
    onErrorClear()
    onSubmitNames(namesInput).catch(() => {
      // 오류 메시지는 상위 컴포넌트에서 전달됨
    })
  }

  const parseNumber = (value: string) => {
    if (!value) return null
    const parsed = Number(value)
    if (!Number.isInteger(parsed)) return null
    return parsed
  }

  const handleRangeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const start = parseNumber(firstNumber)
    const end = parseNumber(lastNumber)

    if (start === null || end === null) {
      setLocalError('첫 번호와 마지막 번호를 정수로 입력해주세요.')
      return
    }

    if (start <= 0 || end <= 0) {
      setLocalError('번호는 1 이상이어야 합니다.')
      return
    }

    setLocalError(null)
    onErrorClear()
    onSubmitRange(start, end).catch(() => {
      // 오류 메시지는 상위 컴포넌트에서 전달됨
    })
  }

  const handleNumbersSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const candidates = numbersInput
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (candidates.length === 0) {
      setLocalError('학생 번호를 하나 이상 입력해주세요.')
      return
    }

    const numbers = candidates.map((item) => Number(item))

    const hasInvalid = numbers.some((num) => !Number.isInteger(num) || num <= 0)
    if (hasInvalid) {
      setLocalError('번호는 1 이상의 정수로 입력해주세요.')
      return
    }

    setLocalError(null)
    onErrorClear()
    onSubmitNumbers(numbers).catch(() => {
      // 오류 메시지는 상위 컴포넌트에서 전달됨
    })
  }

  const handleTabChange = (next: TabKey) => {
    if (isPending) return
    setTab(next)
    setLocalError(null)
    onErrorClear()
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
            onClick={() => handleTabChange('names')}
          >
            이름으로 추가
          </button>
          <button
            type='button'
            className={tab === 'numberRange' ? styles.tabActive : styles.tab}
            onClick={() => handleTabChange('numberRange')}
          >
            번호 범위로 추가
          </button>
          <button
            type='button'
            className={tab === 'numbers' ? styles.tabActive : styles.tab}
            onClick={() => handleTabChange('numbers')}
          >
            번호 직접 입력
          </button>
        </nav>

        {tab === 'names' && (
          <form className={styles.dialogBody} onSubmit={handleNamesSubmit}>
            <p className={styles.dialogDescription}>
              개인정보 보호를 위해 학생의 성을 제외한 닉네임만 입력하는 것을 권장합니다.
              쉼표, 띄어쓰기, 줄바꿈으로 여러 명을 한 번에 추가할 수 있습니다.
            </p>

            <label className={styles.inputLabel}>
              학생 이름(닉네임) 입력 *
              <textarea
                className={styles.textarea}
                placeholder='예: 민성, 주희 사랑, 민지'
                value={namesInput}
                onChange={(event) => setNamesInput(event.target.value)}
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

        {tab === 'numberRange' && (
          <form className={styles.dialogBody} onSubmit={handleRangeSubmit}>
            <p className={styles.dialogDescription}>
              지정한 범위의 번호로 학생을 한 번에 생성합니다. 이름은 기본값(예: 학생5)으로 등록됩니다.
            </p>

            <div className={styles.rangeRow}>
              <label className={styles.rangeField}>
                첫 번호 *
                <input
                  type='number'
                  min={1}
                  className={styles.numberInput}
                  value={firstNumber}
                  onChange={(event) => setFirstNumber(event.target.value)}
                  disabled={isPending}
                />
              </label>
              <label className={styles.rangeField}>
                마지막 번호 *
                <input
                  type='number'
                  min={1}
                  className={styles.numberInput}
                  value={lastNumber}
                  onChange={(event) => setLastNumber(event.target.value)}
                  disabled={isPending}
                />
              </label>
            </div>

            <p className={styles.hint}>
              예: 1번부터 30번까지 총 {(() => {
                const start = parseNumber(firstNumber)
                const end = parseNumber(lastNumber)
                if (start !== null && end !== null && end >= start) {
                  return `${end - start + 1}명`
                }
                return 'N명의'
              })()} 학생이 생성됩니다.
            </p>

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

        {tab === 'numbers' && (
          <form className={styles.dialogBody} onSubmit={handleNumbersSubmit}>
            <p className={styles.dialogDescription}>
              특정 번호만 골라서 학생을 생성합니다. 쉼표, 띄어쓰기, 줄바꿈으로 번호를 구분해주세요.
            </p>

            <label className={styles.inputLabel}>
              학생 번호 직접 입력 *
              <textarea
                className={styles.textarea}
                placeholder='예: 1, 3, 5, 9 또는 줄바꿈으로 구분'
                value={numbersInput}
                onChange={(event) => setNumbersInput(event.target.value)}
                disabled={isPending}
              />
            </label>

            <ul className={styles.bulletList}>
              <li>쉼표(,), 띄어쓰기, 줄바꿈으로 번호를 구분해주세요.</li>
              <li>번호는 중복 없이 1 이상의 정수로 입력해야 합니다.</li>
              <li>입력한 번호는 자동으로 오름차순 정렬되어 생성됩니다.</li>
            </ul>

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
      </div>
    </div>
  )
}

