export const runtime = 'nodejs'

export async function GET() {
  return Response.json({ ok: true, message: 'reminder route alive' })
}