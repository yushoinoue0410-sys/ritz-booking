'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Store } from '@/types/database'
import { Plus, UserX, UserCheck, X } from 'lucide-react'

interface Props {
  guests: (Profile & { store?: Store })[]
  stores: Pick<Store, 'id' | 'name'>[]
}

export default function GuestManager({ guests, stores }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', store_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // 管理者クライアントでユーザー作成できないため、
    // signUp + metadata で対応 (Supabase Auth → trigger → profiles)
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'guest',
          name: form.name,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // profilesをアップデート（phone, store_id）
    if (data.user) {
      await supabase.from('profiles').update({
        phone: form.phone,
        store_id: form.store_id || null,
      }).eq('id', data.user.id)
    }

    setLoading(false)
    setShowForm(false)
    setForm({ name: '', email: '', password: '', phone: '', store_id: '' })
    router.refresh()
  }

  const handleToggleActive = async (g: Profile) => {
    const supabase = createClient()
    await supabase.from('profiles').update({ is_active: !g.is_active }).eq('id', g.id)
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium mb-6 transition-colors"
      >
        <Plus size={16} />
        ゲストを追加
      </button>

      {/* フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">新規ゲスト登録</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">お名前</label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="山田 花子"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="guest@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">初期パスワード</label>
                <input
                  type="password" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="8文字以上"
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号（任意）</label>
                <input
                  type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="090-0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当店舗（任意）</label>
                <select
                  value={form.store_id}
                  onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">指定なし</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{error}</div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {loading ? '登録中...' : '登録する'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ゲスト一覧 */}
      <div className="space-y-3">
        {guests.map((g) => (
          <div key={g.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${!g.is_active ? 'opacity-50' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold flex-shrink-0">
              {g.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 text-sm">{g.name}</span>
                {!g.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">無効</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{g.email}</div>
              <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                {g.phone && <span>{g.phone}</span>}
                {g.store?.name && <span>{g.store.name}</span>}
              </div>
            </div>
            <button
              onClick={() => handleToggleActive(g)}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                g.is_active
                  ? 'text-red-400 hover:bg-red-50'
                  : 'text-green-400 hover:bg-green-50'
              }`}
              title={g.is_active ? '無効にする' : '有効にする'}
            >
              {g.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
            </button>
          </div>
        ))}

        {guests.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            ゲストがいません。追加してください。
          </div>
        )}
      </div>
    </div>
  )
}
