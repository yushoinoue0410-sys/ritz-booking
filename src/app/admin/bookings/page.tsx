import { createClient } from '@/lib/supabase/server'
import AdminBookings from './AdminBookings'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      guest:profiles(id, name, email, phone),
      slot:availability_slots(
        id, start_time, end_time, is_published,
        store:stores(name),
        staff:staff(name),
        service:services(name, duration_minutes, color)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="pt-16 md:pt-0 px-4 py-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">予約一覧</h2>
      <AdminBookings bookings={bookings ?? []} />
    </div>
  )
}
