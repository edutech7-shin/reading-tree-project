import Link from 'next/link'
import ClassTree from '../components/ClassTree'

export default function Home() {
  const level = 2
  const currentLeaves = 30
  const targetLeaves = 50

  return (
    <main className="container">
      <section className="hero">
        <h1>우리 반 나무</h1>
        <p className="sub">다음 레벨까지 {currentLeaves}/{targetLeaves}권 남았어요!</p>
      </section>

      <section className="treeWrap">
        <ClassTree level={level} currentLeaves={currentLeaves} targetLeaves={targetLeaves} />
      </section>

      <section className="ctaRow">
        <Link className="btn primary" href="/record">✍️ 독서 기록하기</Link>
        <Link className="btn" href="/me">내 나무 보기</Link>
      </section>
    </main>
  )
}


