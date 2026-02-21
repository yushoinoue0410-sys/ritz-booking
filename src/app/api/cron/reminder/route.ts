export const runtime = 'nodejs'

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    // 明日の0:00〜23:59を取得
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const end = new Date(tomorrow)
    end.setHours(23, 59, 59, 999)

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        availability_slots!bookings_slot_id_fkey(start_time),
        profiles!bookings_guest_id_fkey(email, name)
      `)
      .gte('availability_slots.start_time', tomorrow.toISOString())
      .lte('availability_slots.start_time', end.toISOString())

    if (error) {
      console.error(error)
      return Response.json({ error }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return Response.json({ message: 'No bookings tomorrow' })
    }

    let sent = 0

    for (const booking of bookings as any[]) {
      const profile = booking.profiles
      const slot = booking.availability_slots

      const email = profile?.email
      const name = profile?.name || 'お客様'
      const slotStart = slot?.start_time

      if (!email || !slotStart) continue

      // ✅ JST固定で表示
      const time = new Date(slotStart).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })

      await resend.emails.send({
        from: 'Ritz <noreply@ritz-personalgym.com>',
        to: email,
        subject: '【Ritz】明日のご予約リマインド',
        html: `
          <h2>ご予約リマインド</h2>
          <p>${name} 様</p>
          <p>明日のご予約は以下の通りです。</p>
          <p><strong>${time}</strong></p>
          <p>お待ちしております。</p>
        `,
      })

      sent++
    }

    return Response.json({ success: true, sent })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}