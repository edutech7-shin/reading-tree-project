import type { Metadata } from 'next'
import './globals.css'
import TopNav from '../components/TopNav'

export const metadata: Metadata = {
  title: 'Reading Tree',
  description: 'Reading Tree Next.js app'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  )
}


