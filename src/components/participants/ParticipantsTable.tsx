import { useParticipants } from '@/hooks/useParticipants'
import { useConfig } from '@/hooks/useConfig'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { ParticipantsGridSkeleton } from '@/components/shared/Skeleton'
import { calculatePrizePool, formatCurrency } from '@/utils/prizes'

function ParticipantAvatar({ name, photoURL, size = 'lg' }: {
  name: string
  photoURL?: string | null
  size?: 'sm' | 'lg'
}) {
  const initial = name.charAt(0).toUpperCase()
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-28 h-28 text-3xl'

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={`${dim} rounded-full object-cover`}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  return (
    <div className={`${dim} rounded-full bg-brand-600 flex items-center justify-center font-bold text-white shrink-0`}>
      {initial}
    </div>
  )
}

export function ParticipantsTable() {
  const { participants, isLoading } = useParticipants()
  const { config } = useConfig()

  if (isLoading) return <ParticipantsGridSkeleton />

  const paidCount = participants.filter(p => p.hasPaid).length
  const prizePool = calculatePrizePool(participants, config.entryFee)

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {participants.map(p => (
          <div key={p.id} className="card p-4 flex flex-col items-center text-center gap-3">
            <ParticipantAvatar name={p.name} photoURL={p.photoURL} />

            <div>
              <p className="font-semibold text-sm text-navy-900">{p.name}</p>
              {p.hasPaid ? (
                <span className="text-xs text-brand-600 font-medium bg-brand-600/30 px-2.5 py-0.5 rounded-full">Paid</span>
              ) : (
                <span className="text-xs text-amber-600 font-medium bg-amber-500/30 px-2.5 py-0.5 rounded-full">Unpaid</span>
              )}
            </div>

            {p.teamCodes.length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-center">
                {p.teamCodes.map(code => (
                  <TeamBadge key={code} code={code} showName={false} size="sm" />
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Draw pending</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-6 text-sm text-gray-500">
        <span>{paidCount}/{participants.length} paid</span>
        <span className="font-semibold text-brand-600">
          Prize pool: {formatCurrency(prizePool)}
        </span>
      </div>
    </div>
  )
}
