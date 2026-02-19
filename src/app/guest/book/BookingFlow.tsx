'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Service, AvailabilitySlot } from '@/types/database'
import { format, parseISO, startOfDay, addDays, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, X } from 'lucide-react'

interface Props {
  guestId: string
  stores: Pick<Store, 'id' | 'name' | 'slug'>[]
  services: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'color' | 'category'>[]
}

type Step = 'store' | 'service' | 'date' | 'slot' | 'confirm' | 'done'

export default function BookingFlow({ guestId, stores, services }: Props) {
  const [step, setStep] = useState<Step>('store')
  const [selectedStore, setSelectedStore] = useState<Props['stores'][0] | null>(null)
  const [selectedService, setSelectedService] = useState<Props['services'][0] | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // 日付変更時にスロット取得
  useEffect(() => {
    if (!selectedStore || !selectedService || step !== 'slot') return

    const fetchSlots = async () => {
      setLoadingSlots(true)
      const supabase = createClient()

      const dayStart = startOfDay(selectedDate).toISOString()
      const dayEnd = addDays(startOfDay(selectedDate), 1).toISOString()

      const { data } = await supabase
        .from('availability_slots')
        .select(`
          *,
          staff:staff(id, name),
          service:services(id, name, duration_minutes, color),
          booking:bookings(id)
        `)
        .eq('store_id', selectedStore.id)
        .eq('service_id', selectedService.id)
        .eq('is_published', true)
        .gte('start_time', dayStart)
        .lt('start_time', dayEnd)
        .order('start_time')

      // 未予約のみ
      setAvailableSlots((data ?? []).filter((s: any) => !s.booking || s.booking.length === 0))
      setLoadingSlots(false)
    }

    fetchSlots()
  }, [selectedStore, selectedService, selectedDate, step])

  const handleBook = async () => {
    if (!selectedSlot) return
    setBooking(true)
    setError(null)

    const supabase = createClient()
    const { error: bookingError } = await supabase.from('bookings').insert({
      slot_id: selectedSlot.id,
      guest_id: guestId,
      status: 'confirmed',
    })

    if (bookingError) {
      if (bookingError.code === '23505') {
        setError('この枠はすでに予約されました。別の枠をお選びください。')
      } else {
        setError('予約に失敗しました: ' + bookingError.message)
      }
      setBooking(false)
      return
    }

    setStep('done')
    setBooking(false)
  }

  // 次の7日間
  const weekDates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))
  }, [])

  const stepTitles: Record<Step, string> = {
    store: '店舗を選択',
    service: 'メニューを選択',
    date: '日付を選択',
    slot: '時間を選択',
    confirm: '予約確認',
    done: '予約完了',
  }

  const STEP_ORDER: Step[] = ['store', 'service', 'date', 'slot', 'confirm', 'done']
  const currentStepIndex = STEP_ORDER.indexOf(step)

  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(STEP_ORDER[currentStepIndex - 1])
    }
  }

  return (
    <div>
      {/* プログレスバー */}
      {step !== 'done' && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {step !== 'store' && (
              <button onClick={goBack} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft size={20} />
              </button>
            )}
            <span className="text-sm font-medium text-gray-600">{stepTitles[step]}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / (STEP_ORDER.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: 店舗選択 */}
      {step === 'store' && (
        <div className="space-y-3">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => { setSelectedStore(store); setStep('service') }}
              className="w-full bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
            >
              <div>
                <div className="font-semibold text-gray-800">{store.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">タップして選択</div>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: サービス選択 */}
      {step === 'service' && (
        <div className="space-y-3">
          {/* トレーニング */}
          <div className="mb-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">トレーニング</div>
            {services.filter((s) => s.category === 'training').map((service) => (
              <button
                key={service.id}
                onClick={() => { setSelectedService(service); setStep('date') }}
                className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left flex items-center gap-4 mb-3 group"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: service.color }}
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{service.name}</div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Clock size={14} />
                  {service.duration_minutes}分
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))}
          </div>

          {/* 整体 */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">整体</div>
            {services.filter((s) => s.category === 'seitai').map((service) => (
              <button
                key={service.id}
                onClick={() => { setSelectedService(service); setStep('date') }}
                className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left flex items-center gap-4 mb-3 group"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: service.color }}
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{service.name}</div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Clock size={14} />
                  {service.duration_minutes}分
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: 日付選択 */}
      {step === 'date' && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory">
            {weekDates.map((date) => {
              const active = isSameDay(date, selectedDate)
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 snap-start flex flex-col items-center p-3 rounded-2xl w-16 transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
                  }`}
                >
                  <span className="text-xs font-medium">
                    {format(date, 'EEE', { locale: ja })}
                  </span>
                  <span className="text-xl font-bold mt-0.5">{format(date, 'd')}</span>
                  <span className={`text-xs ${active ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {format(date, 'M/d')}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setStep('slot')}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {format(selectedDate, 'M月d日（EEE）', { locale: ja })} の空き枠を見る
          </button>
        </div>
      )}

      {/* STEP 4: スロット選択 */}
      {step === 'slot' && (
        <div>
          <div className="text-sm text-gray-500 mb-4 text-center">
            {format(selectedDate, 'M月d日（EEE）', { locale: ja })} の空き枠
          </div>

          {/* 日付変更 */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-2 shadow-sm">
            <button
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="p-2 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium">
              {format(selectedDate, 'M月d日（EEE）', { locale: ja })}
            </span>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="p-2 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {loadingSlots ? (
            <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl">
              <div className="text-4xl mb-3">📅</div>
              この日の空き枠はありません
              <div className="mt-3">
                <button
                  onClick={() => setSelectedDate((d) => addDays(d, 1))}
                  className="text-indigo-600 font-medium text-sm hover:underline"
                >
                  翌日を見る →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => { setSelectedSlot(slot); setStep('confirm') }}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left flex items-center gap-4 group"
                >
                  <div className="text-center min-w-[56px]">
                    <div className="text-lg font-bold text-gray-800">
                      {format(parseISO(slot.start_time), 'HH:mm')}
                    </div>
                    <div className="text-xs text-gray-400">
                      〜{format(parseISO(slot.end_time), 'HH:mm')}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">
                      {(slot.staff as any)?.name}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 5: 確認 */}
      {step === 'confirm' && selectedSlot && (
        <div>
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">予約内容の確認</h3>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">店舗</dt>
                <dd className="font-medium text-gray-800">{selectedStore?.name}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">メニュー</dt>
                <dd className="font-medium text-gray-800">{selectedService?.name}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">スタッフ</dt>
                <dd className="font-medium text-gray-800">{(selectedSlot.staff as any)?.name}</dd>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                <dt className="text-gray-500">日時</dt>
                <dd className="font-semibold text-gray-800 text-right">
                  <div>{format(parseISO(selectedSlot.start_time), 'M月d日（EEE）', { locale: ja })}</div>
                  <div>
                    {format(parseISO(selectedSlot.start_time), 'HH:mm')}
                    {' 〜 '}
                    {format(parseISO(selectedSlot.end_time), 'HH:mm')}
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleBook}
            disabled={booking}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 rounded-xl transition-colors text-base"
          >
            {booking ? '予約中...' : 'この内容で予約する'}
          </button>
        </div>
      )}

      {/* STEP 6: 完了 */}
      {step === 'done' && selectedSlot && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">予約が完了しました</h3>
          <p className="text-gray-500 text-sm mb-6">
            {format(parseISO(selectedSlot.start_time), 'M月d日（EEE） HH:mm', { locale: ja })} 〜{' '}
            {format(parseISO(selectedSlot.end_time), 'HH:mm')}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/guest/bookings')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              予約一覧を見る
            </button>
            <button
              onClick={() => {
                setStep('store')
                setSelectedStore(null)
                setSelectedService(null)
                setSelectedSlot(null)
                setSelectedDate(new Date())
              }}
              className="w-full bg-white hover:bg-gray-50 text-gray-600 font-semibold py-3 rounded-xl transition-colors border border-gray-200"
            >
              別の予約をする
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
