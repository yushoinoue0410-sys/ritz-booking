'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Staff, Store } from '@/types/database'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

interface Props {
  staff: (Staff & { store?: Store })[]
  stores: Pick<Store, 'id' | 'name'>[]
}

export default function StaffManager({ staff, stores }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Staff | null>(null)
  const [form, setForm] = useState({ name: '', store_id: '', bio: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', store_id: stores[0]?.id ?? '', bio: '' })
    setShowForm(true)
  }

  const openEdit = (s: Staff) => {
    setEditTarget(s)
    setForm({ name: s.name, store_id: s.store_id, bio: s.bio ?? '' })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    if (editTarget) {
      await supabase.from('staff').update(form).eq('id', editTarget.id)
    } else {
      await supabase.from('staff').insert(form)
    }

    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  const handleToggleActive = async (s: Staff) => {
    const supabase = createClient()
    await supabase.from('staff').update({ is_active: !s.is_active }).eq('id', s.id)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このスタッフを削除しますか？')) return
    const supabase = createClient()
    await supabase.from('staff').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={openCreate}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium mb-6 transition-colors"
      >
        <Plus size={16} />
        スタッフを追加
      </button>

      {/* フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                {editTarget ? 'スタッフ編集' : 'スタッフ追加'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">店舗</label>
                <select
                  value={form.store_id}
                  onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="田中 太郎"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">紹介文（任意）</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  placeholder="専門・資格など"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* スタッフ一覧 */}
      <div className="space-y-3">
        {staff.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
              {s.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 text-sm">{s.name}</span>
                {!s.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">非公開</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{s.store?.name}</div>
              {s.bio && <div className="text-xs text-gray-400 mt-0.5 truncate">{s.bio}</div>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggleActive(s)}
                title={s.is_active ? '非表示にする' : '表示する'}
                className={`p-2 rounded-lg transition-colors ${s.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => openEdit(s)}
                className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            スタッフがいません。追加してください。
          </div>
        )}
      </div>
    </div>
  )
}
