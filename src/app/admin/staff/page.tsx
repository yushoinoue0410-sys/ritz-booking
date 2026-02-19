import { createClient } from '@/lib/supabase/server'
import StaffManager from './StaffManager'

export default async function StaffPage() {
  const supabase = await createClient()

  const [{ data: staff }, { data: stores }] = await Promise.all([
    supabase
      .from('staff')
      .select('*, store:stores(id, name)')
      .order('created_at'),
    supabase.from('stores').select('id, name').order('name'),
  ])

  return (
    <div className="pt-16 md:pt-0 px-4 py-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">スタッフ管理</h2>
      <StaffManager staff={staff ?? []} stores={stores ?? []} />
    </div>
  )
}
