'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, isPast } from 'date-fns'
import { ja } from 'date-fns/locale'
import { XCircle, Clock } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props {
  bookings: any[]
}

export default function GuestBookings({ bookings }: Props) {
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = bookings.filter((b) => {
    const slotTime = (b.slot as any)?.start_time
    if (filter === 'upcoming') return b.status === 'confirmed' && slotTime && !isPast(parseISO(slotTime))
    if (filter === 'past') return b.status === 'confirmed' && slotTime && isPast(parseISO(slotTime))
    return b.status === 'cancelled'
  })

  const handleCancel = async (bookingId: string) => {
    setCancelling(bookingId)
    const supabase = createClient()
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    setCancelling(null)
    setConfirmId(null)
    router.refresh()
  }

  return (
    <div>
      {/* フィルタタブ */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {([
          { key: 'upcoming', label: '予定' },
          { key: 'past', label: '履歴' },
          { key: 'cancelled', label: 'キャンセル' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 予約リスト */}
      <div className="space-y-3">
        {filtered.map((b) => {
          const slot = b.slot as any
          const service = slot?.service
          const isPastSlot = slot?.start_time ? isPast(parseISO(slot.start_time)) : false

          return (
            <div
              key={b.id}
              className={`bg-white rounded-2xl p-4 shadow-sm ${b.status === 'cancelled' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* カラーバー */}
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: service?.color ?? '#4F46E5' }}
                />

                <div className="flex-1 min-w-0">
                  {/* サービス名 */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{service?.name}</span>
                    {b.status === 'cancelled' && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        キャンセル済
                      </span>
                    )}
                    {b.status === 'confirmed' && isPastSlot && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        完了
                      </span>
                    )}
                  </div>

                  {/* 日時 */}
                  <div className="text-gray-800 font-medium text-sm">
                    {slot?.start_time && (
                      <>
                        {format(parseISO(slot.start_time), 'M月d日（EEE）', { locale: ja })}{' '}
                        {format(parseISO(slot.start_time), 'HH:mm')}〜
                        {slot.end_time && format(parseISO(slot.end_time), 'HH:mm')}
                      </>
                    )}
                  </div>

                  {/* 店舗・スタッフ */}
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock size={11} />
                    {slot?.store?.name} ・ {slot?.staff?.name}
                  </div>
                </div>

                {/* キャンセルボタン（今後の予約のみ） */}
                {b.status === 'confirmed' && !isPastSlot && (
                  <button
                    onClick={() => setConfirmId(b.id)}
                    className="flex-shrink-0 p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                    title="キャンセル"
                  >
                    <XCircle size={20} />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl">
            {filter === 'upcoming' && '予定している予約はありません'}
            {filter === 'past' && '過去の予約はありません'}
            {filter === 'cancelled' && 'キャンセル済みの予約はありません'}
          </div>
        )}
      </div>

      {/* キャンセル確認モーダル */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-2">予約をキャンセルしますか？</h3>
            <p className="text-sm text-gray-500 mb-6">
              キャンセル後は元に戻せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={() => handleCancel(confirmId)}
                disabled={cancelling === confirmId}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium text-sm transition-colors"
              >
                {cancelling === confirmId ? 'キャンセル中...' : 'キャンセルする'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
