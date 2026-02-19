import { createClient } from '@/lib/supabase/server'
import GuestBookings from './GuestBookings'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, created_at, notes,
      slot:availability_slots(
        start_time, end_time,
        store:stores(name),
        staff:staff(name),
        service:services(name, color, duration_minutes)
      )
    `)
    .eq('guest_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">予約一覧</h2>
      <GuestBookings bookings={(bookings ?? []) as any[]} />
    </div>
  )
}
