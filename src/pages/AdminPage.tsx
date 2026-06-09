import { useState, useRef, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useParticipants } from '@/hooks/useParticipants'
import { useConfig } from '@/hooks/useConfig'
import { AdminSkeleton } from '@/components/shared/Skeleton'
import {
  setParticipantPaid,
  saveConfig,
  updateParticipantTeams,
  uploadParticipantPhoto,
  removeParticipantPhoto,
} from '@/services/admin.service'
import { PRIZE_LABELS, PODIUM_PRIZES, SPECIAL_PRIZES } from '@/config/prizes'
import { WC2026_TEAMS } from '@/config/tournament'
import { calculatePrizePool, formatCurrency } from '@/utils/prizes'
import type { AppConfig, PrizePercentages } from '@/types'

function PaymentToggle({ id, hasPaid }: { id: string; hasPaid: boolean }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        await setParticipantPaid(id, !hasPaid).finally(() => setLoading(false))
      }}
      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
        hasPaid
          ? 'bg-green-100 text-brand-600 hover:bg-green-200'
          : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
      } disabled:opacity-50`}
    >
      {loading ? '…' : hasPaid ? '✓ Paid' : '⏳ Pending'}
    </button>
  )
}


function TeamMultiSelect({ codes, onChange }: {
  codes: string[]
  onChange: (codes: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = WC2026_TEAMS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (code: string) => {
    onChange(codes.includes(code) ? codes.filter(c => c !== code) : [...codes, code])
  }

  return (
    <div ref={ref} className="relative">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-1 mb-1.5 min-h-[22px]">
        {codes.length === 0
          ? <span className="text-xs text-gray-500 italic">No teams selected</span>
          : codes.map(code => {
              const name = WC2026_TEAMS.find(t => t.code === code)?.name ?? code
              return (
                <span key={code} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 text-xs px-2 py-0.5 rounded-full">
                  {name}
                  <button
                    onClick={() => toggle(code)}
                    className="text-brand-400 hover:text-red-500 leading-none"
                  >
                    ×
                  </button>
                </span>
              )
            })
        }
      </div>

      {/* Dropdown trigger */}
      <button
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
      >
        {open ? 'Close' : 'Select teams…'}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg w-56">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full text-xs border border-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.map(team => {
              const selected = codes.includes(team.code)
              return (
                <li key={team.code}>
                  <button
                    onClick={() => toggle(team.code)}
                    className={`w-full text-left text-xs px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                      selected ? 'text-brand-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="w-3 shrink-0 text-brand-600">{selected ? '✓' : ''}</span>
                    <span className="flex-1">{team.name}</span>
                    <span className="text-gray-500 font-mono">{team.code}</span>
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-500 italic">No teams found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}


function ParticipantRow({ participant: p }: { participant: { id: string; name: string; teamCodes: string[]; hasPaid: boolean; photoURL?: string | null } }) {
  const [preview, setPreview] = useState(p.photoURL ?? '')
  const [uploading, setUploading] = useState(false)
  const [photoDone, setPhotoDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setPhotoDone(false)
    try {
      const url = await uploadParticipantPhoto(p.id, file)
      setPreview(url)
      setPhotoDone(true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 align-top">
      <td className="px-4 py-3 font-medium text-sm">{p.name}</td>
      <td className="px-4 py-3">
        <TeamMultiSelect
          codes={p.teamCodes}
          onChange={codes => updateParticipantTeams(p.id, codes)}
        />
        </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
            {preview
              ? <img src={preview} alt={p.name} className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-gray-400">{p.name.charAt(0)}</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {uploading ? 'Uploading…' : photoDone ? '✓' : preview ? 'Change' : 'Upload'}
          </button>
          {preview && !uploading && (
            <button onClick={async () => { await removeParticipantPhoto(p.id); setPreview(''); setPhotoDone(false) }}
              className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Remove
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <PaymentToggle id={p.id} hasPaid={p.hasPaid} />
      </td>
    </tr>
  )
}

function PrizeConfigEditor({ config }: { config: AppConfig }) {
  const { participants } = useParticipants()
  const [prizes, setPrizes] = useState(config.prizes)
  const [entryFee, setEntryFee] = useState(config.entryFee)
  const [additionalPrize, setAdditionalPrize] = useState(config.additionalPrize ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const sum = Object.values(prizes).reduce((a, b) => a + b, 0)
  const prizePool = calculatePrizePool(participants, entryFee, additionalPrize)
  const PrizeRow = ({ k }: { k: keyof PrizePercentages }) => (
    <tr key={k}>
      <td className="py-2 text-sm text-gray-700">{PRIZE_LABELS[k]}</td>
      <td className="py-2">
        <div className="flex items-center gap-1 justify-end">
          <input
            type="number"
            min={0}
            max={100}
            value={prizes[k]}
            onChange={e => {
              setPrizes(p => ({ ...p, [k]: Number(e.target.value) }))
              setSaved(false)
              setError(null)
            }}
            className="border border-gray-200 rounded px-2 py-0.5 text-sm w-14 text-right focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
      </td>
      <td className="py-2 text-right text-sm font-medium text-gray-700 tabular-nums pl-4">
        {formatCurrency(Math.floor(prizePool * prizes[k] / 100))}
      </td>
    </tr>
  )

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-navy-900 mb-4">Prize Configuration</h2>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Entry fee (£)</label>
          <input
            type="number"
            value={entryFee}
            onChange={e => { setEntryFee(Number(e.target.value)); setSaved(false) }}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Additional prize (£)</label>
          <input
            type="number"
            min={0}
            value={additionalPrize}
            onChange={e => { setAdditionalPrize(Number(e.target.value)); setSaved(false) }}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left pb-2">Prize</th>
            <th className="text-right pb-2">Weight</th>
            <th className="text-right pb-2 pl-4">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {PODIUM_PRIZES.map(k => <PrizeRow key={k} k={k} />)}
          <tr><td colSpan={3} className="py-0"><div className="mx-8 border-t border-gray-100" /></td></tr>
          {SPECIAL_PRIZES.map(k => <PrizeRow key={k} k={k} />)}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-100">
            <td className="pt-2 text-sm font-semibold text-gray-700">Total</td>
            <td className="pt-2 text-right">
              <span className={`text-sm font-bold ${sum === 100 ? 'text-brand-600' : 'text-red-500'}`}>
                {sum}%
              </span>
            </td>
            <td className="pt-2 text-right pl-4 text-sm font-semibold text-gray-700 tabular-nums">
              {formatCurrency(prizePool)}
            </td>
          </tr>
        </tfoot>
      </table>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button
        disabled={saving || sum !== 100}
        onClick={async () => {
          setSaving(true)
          setError(null)
          try {
            await saveConfig({ ...config, entryFee, additionalPrize, prizes })
            setSaved(true)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed')
          } finally {
            setSaving(false)
          }
        }}
        className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Config'}
      </button>
    </div>
  )
}

export function AdminPage() {
  const { isAdmin, isLoading } = useCurrentUser()
  const { participants } = useParticipants()
  const { config } = useConfig()
  const [tab, setTab] = useState<'participants' | 'prizes'>('participants')

  if (isLoading) return <AdminSkeleton />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <AppShell>
      <div>
        <h1 className="text-xl font-bold text-navy-900 mb-4">Admin Panel</h1>

        <div className="flex gap-2 mb-6">
          {(['participants', 'prizes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'participants' && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-navy-900">Participants</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage photos, team draws and payment status</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-4 py-2">Participant</th>
                  <th className="text-left px-4 py-2">Teams</th>
                  <th className="text-left px-4 py-2">Photo</th>
                  <th className="text-center px-4 py-2">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map(p => (
                  <ParticipantRow key={p.id} participant={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'prizes' && <PrizeConfigEditor config={config} />}

      </div>
    </AppShell>
  )
}
