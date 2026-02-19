import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GuestNav from '@/components/GuestNav'

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'guest') redirect('/admin')
  if (!profile.is_active) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <GuestNav profile={profile} />
      <main className="pb-24 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  )
}
