import { createClient } from '@/lib/supabase/server'
import GuestManager from './GuestManager'

export default async function GuestsPage() {
  const supabase = await createClient()

  const [{ data: guests }, { data: stores }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, store:stores(id, name)')
      .eq('role', 'guest')
      .order('created_at', { ascending: false }),
    supabase.from('stores').select('id, name'),
  ])

  return (
    <div className="pt-16 md:pt-0 px-4 py-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ゲスト管理</h2>
      <GuestManager guests={guests ?? []} stores={stores ?? []} />
    </div>
  )
}
