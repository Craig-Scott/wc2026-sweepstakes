import { AppShell } from '@/components/layout/AppShell'
import { ParticipantsTable } from '@/components/participants/ParticipantsTable'
import { useParticipants } from '@/hooks/useParticipants'
import { useConfig } from '@/hooks/useConfig'
import { calculatePrizePool, formatCurrency } from '@/utils/prizes'

export function ParticipantsPage() {
  const { participants } = useParticipants()
  const { config } = useConfig()
  const paidCount = participants.filter(p => p.hasPaid).length
  const prizePool = calculatePrizePool(participants, config.entryFee)

  return (
    <AppShell>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-navy-900">Participants</h1>
          {participants.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">{paidCount}/{participants.length} paid</span>
              <span className="font-semibold text-brand-600">{formatCurrency(prizePool)}</span>
            </div>
          )}
        </div>
        <ParticipantsTable />
      </div>
    </AppShell>
  )
}
