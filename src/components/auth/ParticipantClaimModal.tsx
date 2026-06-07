import { useState } from 'react'
import { useParticipants } from '@/hooks/useParticipants'
import { claimParticipant } from '@/services/admin.service'
import type { Participant } from '@/types'

interface Props {
  uid: string
}

export function ParticipantClaimModal({ uid }: Props) {
  const { participants, isLoading } = useParticipants()
  const [selected, setSelected] = useState<Participant | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unclaimed = participants.filter(p => p.uid === null)

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await claimParticipant(selected.id, uid, selected.name)
    } catch {
      setError('Something went wrong — please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 w-full max-w-sm p-6">

        {!selected ? (
          <>
            <div className="text-3xl mb-3">👋</div>
            <h2 className="text-lg font-bold text-navy-900 mb-1">Who are you?</h2>
            <p className="text-sm text-gray-500 mb-5">
              Pick your name from the sweepstake list.
            </p>

            {isLoading ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading…</p>
            ) : unclaimed.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                All participant slots have been claimed. Contact an admin.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {unclaimed.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="text-left px-4 py-3 rounded-xl border border-gray-100 hover:border-brand-400 hover:bg-brand-50 transition-colors text-sm font-medium text-gray-800"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-3xl mb-3">🤔</div>
            <h2 className="text-lg font-bold text-navy-900 mb-2">Just to confirm…</h2>
            <p className="text-sm text-gray-500 mb-6">
              You're signing in as{' '}
              <span className="font-semibold text-navy-900">{selected.name}</span>.
              Is that right?
            </p>

            {error && (
              <p className="text-xs text-red-500 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setSelected(null); setError(null) }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-100 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Go back
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : "Yes, that's me"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
