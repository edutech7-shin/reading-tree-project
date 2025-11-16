import Link from 'next/link'
import ClassTree from '../components/ClassTree'
import { createSupabaseServerClient } from '../lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createSupabaseServerClient()
  const { data: classTree } = await supabase
    .from('class_trees')
    .select('class_name, current_level, current_leaves, level_up_target')
    .limit(1)
    .maybeSingle()

  const level = classTree?.current_level ?? 1
  const currentLeaves = classTree?.current_leaves ?? 0
  const targetLeaves = classTree?.level_up_target ?? 50
  const remaining = Math.max(0, targetLeaves - currentLeaves)

  return (
    <main className="container">
      <section className="hero">
        <h1>우리 반 나무</h1>
        <p className="sub">
          {remaining > 0 
            ? `다음 레벨까지 ${remaining}권 남았어요!`
            : '레벨업을 축하해요! 🎉'}
        </p>
      </section>

      <section className="treeWrap">
        <ClassTree level={level} currentLeaves={currentLeaves} targetLeaves={targetLeaves} />
      </section>

      <section className="ctaRow">
        <Link className="btn primary" href="/record">✍️ 독서 기록하기</Link>
        <Link className="btn" href="/me">내 책나무 보기</Link>
      </section>
    </main>
  )
}


