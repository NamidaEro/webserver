import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WoW 경매장 데이터',
  description: '월드 오브 워크래프트 경매장 데이터 분석 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700 py-4">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold text-blizzard-blue">WoW 경매장 데이터</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="bg-gray-800 border-t border-gray-700 py-4 mt-8">
          <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
            <p>이 웹사이트는 Blizzard Entertainment의 공식 사이트가 아니며, Blizzard Entertainment와 무관합니다.</p>
            <p>© 2023 WoW 경매장 데이터. World of Warcraft 및 Blizzard Entertainment는 Blizzard Entertainment, Inc의 상표 또는 등록 상표입니다.</p>
          </div>
        </footer>
      </body>
    </html>
  )
} 