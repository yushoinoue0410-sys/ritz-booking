'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { LayoutDashboard, CalendarPlus, BookOpen, LogOut } from 'lucide-react'

const navItems = [
  { href: '/guest', label: 'ホーム', icon: LayoutDashboard, exact: true },
  { href: '/guest/book', label: '予約する', icon: CalendarPlus },
  { href: '/guest/bookings', label: '予約一覧', icon: BookOpen },
]

export default function GuestNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* スマホ トップバー */}
      <header className="fixed top-0 left-0 right-0 bg-indigo-950 z-50 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-widest">RITZ</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-indigo-300">{profile.name}</span>
          <button onClick={handleLogout} className="text-indigo-300">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* スマホ ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex md:hidden">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
              isActive(href, exact) ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* PC ナビ（シンプルなトップバー） */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-indigo-950 z-50 px-8 items-center h-14 gap-6">
        <h1 className="text-xl font-bold text-white tracking-widest mr-6">RITZ</h1>
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
              isActive(href, exact)
                ? 'text-white bg-indigo-700'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-4">
          <span className="text-indigo-300 text-sm">{profile.name} さん</span>
          <button onClick={handleLogout} className="text-indigo-300 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </nav>
      <div className="md:h-14" />
    </>
  )
}
