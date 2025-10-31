'use client'

type Props = {
  level: number
  currentLeaves: number
  targetLeaves: number
}

function levelEmoji(level: number) {
  if (level <= 1) return '🌱'
  if (level === 2) return '🌿'
  if (level === 3) return '🌳'
  return '🌳'
}

export default function ClassTree({ level, currentLeaves, targetLeaves }: Props) {
  const ratio = Math.max(0, Math.min(1, currentLeaves / Math.max(1, targetLeaves)))

  return (
    <div className="card center">
      <div className="treeEmoji" aria-label={`Lv.${level}`}>
        {levelEmoji(level)}
      </div>
      <div className="gauge" role="progressbar" aria-valuemin={0} aria-valuemax={targetLeaves} aria-valuenow={currentLeaves}>
        <div className="gaugeFill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="gaugeLabel">Lv.{level} · {currentLeaves} / {targetLeaves}</div>
    </div>
  )
}


