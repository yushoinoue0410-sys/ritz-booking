import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/guest')

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav profile={profile} />
      <main className="pb-20 md:pb-0 md:pl-64">
        {children}
      </main>
    </div>
  )
}
