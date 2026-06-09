import { useParticipants } from '@/hooks/useParticipants'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { ParticipantsGridSkeleton } from '@/components/shared/Skeleton'

export function ParticipantsTable() {
  const { participants, isLoading } = useParticipants()
  if (isLoading) return <ParticipantsGridSkeleton />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {participants.map(p => (
        <div key={p.id} className="card overflow-hidden flex flex-col">

          {/* Soccer card image — 2:3 aspect ratio */}
          <div className="aspect-[2/3] bg-gray-100 relative">
            {p.photoURL ? (
              <img
                src={p.photoURL}
                alt={p.name}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl font-bold text-gray-200 select-none">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info strip */}
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm text-navy-900 truncate">{p.name}</p>
              {p.hasPaid ? (
                <span className="shrink-0 text-xs text-brand-600 font-medium bg-brand-600/30 px-2 py-0.5 rounded-full">Paid</span>
              ) : (
                <span className="shrink-0 text-xs text-amber-600 font-medium bg-amber-500/30 px-2 py-0.5 rounded-full">Unpaid</span>
              )}
            </div>
            {p.teamCodes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {p.teamCodes.map(code => (
                  <span key={code} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full pl-0.5 pr-2 py-0.5">
                    <TeamBadge code={code} size="sm" />
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Draw pending</span>
            )}
          </div>

        </div>
      ))}
    </div>
  )
}
