import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO, isPast } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarPlus, ArrowRight } from 'lucide-react'

export default async function GuestHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, store:stores(name)')
    .eq('id', user!.id)
    .single()

  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select(`
      id, status, created_at,
      slot:availability_slots(
        start_time, end_time,
        service:services(name, color),
        staff:staff(name),
        store:stores(name)
      )
    `)
    .eq('guest_id', user!.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(3)

  const futureBookings = upcomingBookings?.filter(
    (b) => b.slot && !isPast(parseISO((b.slot as any).start_time))
  ) ?? []

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* ウェルカム */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white mb-6">
        <p className="text-indigo-200 text-sm mb-1">ようこそ</p>
        <h2 className="text-2xl font-bold">{profile?.name} さん</h2>
        {(profile?.store as any)?.name && (
          <p className="text-indigo-200 text-sm mt-1">{(profile.store as any).name}</p>
        )}
      </div>

      {/* 予約ボタン */}
      <Link
        href="/guest/book"
        className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow mb-6 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <CalendarPlus size={20} />
          </div>
          <div>
            <div className="font-semibold text-gray-800">予約する</div>
            <div className="text-xs text-gray-500">空き枠を確認して予約</div>
          </div>
        </div>
        <ArrowRight size={18} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
      </Link>

      {/* 直近の予約 */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">今後の予約</h3>
        <Link href="/guest/bookings" className="text-xs text-indigo-600 hover:underline">
          全て見る
        </Link>
      </div>

      {futureBookings.length > 0 ? (
        <div className="space-y-3">
          {futureBookings.map((b) => {
            const slot = b.slot as any
            return (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: slot?.service?.color ?? '#4F46E5' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-sm">{slot?.service?.name}</div>
                    <div className="text-gray-600 text-sm mt-0.5">
                      {slot?.start_time && format(parseISO(slot.start_time), 'M月d日（EEE） HH:mm', { locale: ja })}
                      {' 〜 '}
                      {slot?.end_time && format(parseISO(slot.end_time), 'HH:mm')}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {slot?.store?.name} ・ {slot?.staff?.name}
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full self-start">
                    確定
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm">
          今後の予約はありません
          <div className="mt-2">
            <Link href="/guest/book" className="text-indigo-600 font-medium hover:underline text-sm">
              予約する →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
