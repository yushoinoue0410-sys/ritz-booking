import { createClient } from '@/lib/supabase/server'
import { CalendarDays, BookOpen, Users, UserCog } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: slotCount },
    { count: bookingCount },
    { count: guestCount },
    { count: staffCount },
    { data: upcomingBookings },
  ] = await Promise.all([
    supabase.from('availability_slots').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'guest').eq('is_active', true),
    supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('bookings')
      .select(`
        id, created_at, status,
        guest:profiles(name),
        slot:availability_slots(start_time, end_time,
          service:services(name),
          staff:staff(name),
          store:stores(name)
        )
      `)
      .eq('status', 'confirmed')
      .gte('slot.start_time', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: '公開中の予約枠', value: slotCount ?? 0, icon: CalendarDays, href: '/admin/slots', color: 'bg-indigo-50 text-indigo-600' },
    { label: '予約件数（確定）', value: bookingCount ?? 0, icon: BookOpen, href: '/admin/bookings', color: 'bg-green-50 text-green-600' },
    { label: 'ゲスト数', value: guestCount ?? 0, icon: Users, href: '/admin/guests', color: 'bg-amber-50 text-amber-600' },
    { label: 'スタッフ数', value: staffCount ?? 0, icon: UserCog, href: '/admin/staff', color: 'bg-rose-50 text-rose-600' },
  ]

  return (
    <div className="pt-16 md:pt-0 px-4 py-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h2>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={href} href={href}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-2 rounded-xl mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      {/* 直近の予約 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">直近の予約</h3>
          <Link href="/admin/bookings" className="text-sm text-indigo-600 hover:underline">
            全て見る
          </Link>
        </div>
        {upcomingBookings && upcomingBookings.length > 0 ? (
          <div className="space-y-3">
            {upcomingBookings.map((b: any) => (
              <div key={b.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm">{b.guest?.name}</span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {b.slot?.service?.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {b.slot?.store?.name} ・ {b.slot?.staff?.name} ・{' '}
                    {b.slot?.start_time
                      ? new Date(b.slot.start_time).toLocaleString('ja-JP', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })
                      : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">予約はありません</p>
        )}
      </div>
    </div>
  )
}
