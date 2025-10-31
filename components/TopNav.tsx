import Link from 'next/link'

export default function TopNav() {
  return (
    <header className="topnav">
      <nav>
        <Link href="/">우리 반 나무</Link>
        <Link href="/record">기록하기</Link>
        <Link href="/me">내 나무</Link>
        <span className="spacer" />
        <Link href="/teacher">교사용</Link>
      </nav>
    </header>
  )
}


