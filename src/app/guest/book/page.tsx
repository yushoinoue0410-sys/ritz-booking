import { createClient } from '@/lib/supabase/server'
import BookingFlow from './BookingFlow'

export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: stores }, { data: services }] = await Promise.all([
    supabase.from('stores').select('id, name, slug'),
    supabase.from('services').select('id, name, duration_minutes, color, category').order('category'),
  ])

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">予約する</h2>
      <BookingFlow
        guestId={user!.id}
        stores={stores ?? []}
        services={services ?? []}
      />
    </div>
  )
}
