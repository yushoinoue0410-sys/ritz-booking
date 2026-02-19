import { createClient } from '@/lib/supabase/server'
import SlotManager from './SlotManager'

export default async function SlotsPage() {
  const supabase = await createClient()

  const [{ data: slots }, { data: stores }, { data: staff }, { data: services }] = await Promise.all([
    supabase
      .from('availability_slots')
      .select(`
        *,
        store:stores(id, name),
        staff:staff(id, name),
        service:services(id, name, duration_minutes, color),
        booking:bookings(id, status, guest:profiles(name))
      `)
      .order('start_time', { ascending: true })
      .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('stores').select('id, name'),
    supabase.from('staff').select('id, name, store_id').eq('is_active', true),
    supabase.from('services').select('id, name, duration_minutes, color, category').order('category'),
  ])

  return (
    <div className="pt-16 md:pt-0 px-4 py-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">予約枠管理</h2>
      <SlotManager
        slots={slots ?? []}
        stores={stores ?? []}
        staff={staff ?? []}
        services={services ?? []}
      />
    </div>
  )
}
