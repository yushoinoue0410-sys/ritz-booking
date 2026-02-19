'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  UserCog,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard, exact: true },
  { href: '/admin/slots', label: '予約枠管理', icon: CalendarDays },
  { href: '/admin/bookings', label: '予約一覧', icon: BookOpen },
  { href: '/admin/guests', label: 'ゲスト管理', icon: Users },
  { href: '/admin/staff', label: 'スタッフ管理', icon: UserCog },
]

export default function AdminNav({ profile }: { profile: Profile }) {
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
      {/* PC サイドバー */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-indigo-950 flex-col z-50">
        <div className="p-6 border-b border-indigo-800">
          <h1 className="text-2xl font-bold text-white tracking-widest">RITZ</h1>
          <p className="text-indigo-400 text-xs mt-0.5">管理者：{profile.name}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            ログアウト
          </button>
        </div>
      </aside>

      {/* スマホ トップバー */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-indigo-950 z-50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-widest">RITZ</h1>
        <button onClick={handleLogout} className="text-indigo-300">
          <LogOut size={20} />
        </button>
      </header>

      {/* スマホ ボトムナビ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
              isActive(href, exact)
                ? 'text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            <Icon size={20} />
            <span>{label.replace('管理', '').replace('一覧', '')}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
