'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AvailabilitySlot, Store, Staff, Service } from '@/types/database'
import { format, addMinutes, parseISO, startOfDay, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Plus, Eye, EyeOff, Trash2, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

interface Props {
  slots: AvailabilitySlot[]
  stores: Pick<Store, 'id' | 'name'>[]
  staff: (Pick<Staff, 'id' | 'name' | 'store_id'>)[]
  services: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'color' | 'category'>[]
}

// 30分刻みの時刻オプション
function generateTimeOptions() {
  const options: string[] = []
  for (let h = 6; h <= 22; h++) {
    options.push(`${String(h).padStart(2, '0')}:00`)
    options.push(`${String(h).padStart(2, '0')}:30`)
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

export default function SlotManager({ slots, stores, staff, services }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterStore, setFilterStore] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    store_id: stores[0]?.id ?? '',
    staff_id: '',
    service_id: services[0]?.id ?? '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '10:00',
  })
  const router = useRouter()

  // 選択店舗のスタッフ
  const filteredStaff = useMemo(
    () => staff.filter((s) => s.store_id === form.store_id),
    [staff, form.store_id]
  )

  // 選択サービスの duration
  const selectedService = services.find((s) => s.id === form.service_id)

  // 日付フィルタリング
  const daySlots = useMemo(() => {
    return slots.filter((s) => {
      const sameDay = isSameDay(parseISO(s.start_time), selectedDate)
      const storeMatch = filterStore === 'all' || s.store_id === filterStore
      return sameDay && storeMatch
    })
  }, [slots, selectedDate, filterStore])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staff_id) { alert('スタッフを選択してください'); return }
    setLoading(true)

    const service = services.find((s) => s.id === form.service_id)
    if (!service) return

    const startDt = new Date(`${form.date}T${form.start_time}:00`)
    const endDt = addMinutes(startDt, service.duration_minutes)

    const supabase = createClient()
    const { error } = await supabase.from('availability_slots').insert({
      store_id: form.store_id,
      staff_id: form.staff_id,
      service_id: form.service_id,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      is_published: false,
    })

    if (error) {
      alert('エラー: ' + (error.message.includes('overlap') ? 'この時間帯はすでに枠が存在します' : error.message))
    } else {
      setShowForm(false)
      setSelectedDate(startDt)
      router.refresh()
    }
    setLoading(false)
  }

  const handleTogglePublish = async (slot: AvailabilitySlot) => {
    const supabase = createClient()
    await supabase
      .from('availability_slots')
      .update({ is_published: !slot.is_published })
      .eq('id', slot.id)
    router.refresh()
  }

  const handleDelete = async (slot: AvailabilitySlot) => {
    if (slot.booking) {
      alert('予約済みの枠は削除できません')
      return
    }
    if (!confirm('この枠を削除しますか？')) return
    const supabase = createClient()
    await supabase.from('availability_slots').delete().eq('id', slot.id)
    router.refresh()
  }

  const moveDay = (days: number) => {
    setSelectedDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + days)
      return next
    })
  }

  const bookingStatusColor = (slot: AvailabilitySlot) => {
    if (slot.booking) return 'bg-green-50 border-green-200'
    if (slot.is_published) return 'bg-white border-indigo-200'
    return 'bg-gray-50 border-gray-200'
  }

  return (
    <div>
      {/* コントロールバー */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => {
            setForm((f) => ({ ...f, store_id: stores[0]?.id ?? '', staff_id: '', date: format(new Date(), 'yyyy-MM-dd') }))
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          枠を作成
        </button>

        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">全店舗</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* 日付ナビ */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => moveDay(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold text-gray-800">
            {format(selectedDate, 'M月d日（EEE）', { locale: ja })}
          </div>
        </div>
        <button onClick={() => moveDay(1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => setSelectedDate(new Date())}
          className="text-xs text-indigo-600 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          今日
        </button>
      </div>

      {/* 枠一覧 */}
      <div className="space-y-3">
        {daySlots.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl">
            この日の予約枠はありません
          </div>
        ) : (
          daySlots.map((slot) => (
            <div
              key={slot.id}
              className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${bookingStatusColor(slot)}`}
            >
              {/* 時刻 */}
              <div className="flex-shrink-0 text-center min-w-[60px]">
                <div className="text-sm font-bold text-gray-800">
                  {format(parseISO(slot.start_time), 'HH:mm')}
                </div>
                <div className="text-xs text-gray-400">
                  {format(parseISO(slot.end_time), 'HH:mm')}
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: (slot.service as any)?.color ?? '#4F46E5' }}
                  >
                    {(slot.service as any)?.name}
                  </span>
                  {slot.is_published ? (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">公開中</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">非公開</span>
                  )}
                  {slot.booking && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">予約済</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-1.5 flex items-center gap-2">
                  <span>{(slot.store as any)?.name}</span>
                  <span>・</span>
                  <span>{(slot.staff as any)?.name}</span>
                </div>
                {slot.booking && (
                  <div className="text-xs text-green-700 font-medium mt-1">
                    👤 {(slot.booking as any).guest?.name}
                  </div>
                )}
              </div>

              {/* アクション */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleTogglePublish(slot)}
                  className={`p-2 rounded-lg transition-colors ${
                    slot.is_published
                      ? 'text-indigo-600 hover:bg-indigo-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={slot.is_published ? '非公開にする' : '公開する'}
                >
                  {slot.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(slot)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                  title="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 作成フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">予約枠を作成</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">店舗</label>
                <select
                  value={form.store_id}
                  onChange={(e) => setForm({ ...form, store_id: e.target.value, staff_id: '' })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">スタッフ</label>
                <select
                  value={form.staff_id}
                  onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">選択してください</option>
                  {filteredStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">サービス</label>
                <select
                  value={form.service_id}
                  onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {selectedService && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                    <Clock size={12} />
                    {selectedService.duration_minutes}分
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始時刻</label>
                <select
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {selectedService && form.start_time && (
                  <div className="text-xs text-gray-400 mt-1.5">
                    終了: {format(
                      addMinutes(
                        new Date(`2000-01-01T${form.start_time}:00`),
                        selectedService.duration_minutes
                      ),
                      'HH:mm'
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {loading ? '作成中...' : '枠を作成'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
