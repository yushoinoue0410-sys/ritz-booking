'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { XCircle } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props {
  bookings: any[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: '確定', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
}

export default function AdminBookings({ bookings }: Props) {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const filtered = bookings.filter((b) => filter === 'all' || b.status === filter)

  const handleCancel = async (bookingId: string) => {
    if (!confirm('この予約をキャンセルしますか？')) return
    setLoading(bookingId)
    const supabase = createClient()
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div>
      {/* フィルタ */}
      <div className="flex gap-2 mb-6">
        {(['all', 'confirmed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? '全て' : f === 'confirmed' ? '確定' : 'キャンセル'}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 flex items-center">
          {filtered.length}件
        </span>
      </div>

      {/* 予約カード */}
      <div className="space-y-3">
        {filtered.map((b) => {
          const slot = b.slot as any
          const guest = b.guest as any
          const service = slot?.service
          const statusInfo = STATUS_LABELS[b.status] ?? STATUS_LABELS.confirmed

          return (
            <div key={b.id} className={`bg-white rounded-2xl p-4 shadow-sm ${b.status === 'cancelled' ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* ヘッダー */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {service && (
                      <span
                        className="text-xs font-medium px-2.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: service.color ?? '#4F46E5' }}
                      >
                        {service.name}
                      </span>
                    )}
                  </div>

                  {/* ゲスト情報 */}
                  <div className="font-semibold text-gray-800">{guest?.name}</div>
                  <div className="text-xs text-gray-500">{guest?.email}</div>
                  {guest?.phone && <div className="text-xs text-gray-500">{guest.phone}</div>}

                  {/* 枠情報 */}
                  {slot && (
                    <div className="mt-2 text-sm text-gray-600">
                      <div>{slot.store?.name} ・ {slot.staff?.name}</div>
                      <div className="font-medium text-gray-800">
                        {slot.start_time
                          ? format(parseISO(slot.start_time), 'M月d日（EEE） HH:mm', { locale: ja })
                          : '-'}
                        {' 〜 '}
                        {slot.end_time ? format(parseISO(slot.end_time), 'HH:mm') : '-'}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-1">
                    予約日時: {format(parseISO(b.created_at), 'M/d HH:mm')}
                  </div>
                </div>

                {/* キャンセルボタン */}
                {b.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={loading === b.id}
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
            予約はありません
          </div>
        )}
      </div>
    </div>
  )
}
