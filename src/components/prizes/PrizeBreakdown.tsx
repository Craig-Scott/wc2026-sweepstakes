import { useConfig } from '@/hooks/useConfig'
import { PrizeBreakdownSkeleton } from '@/components/shared/Skeleton'
import { useParticipants } from '@/hooks/useParticipants'
import { calculatePrizeAmounts, formatCurrency } from '@/utils/prizes'
import { PRIZE_LABELS, PRIZE_DESCRIPTIONS, PODIUM_PRIZES, SPECIAL_PRIZES } from '@/config/prizes'
import type { PrizePercentages } from '@/types'

function PrizeRow({ prizeKey, amount, showTooltip = true }: {
  prizeKey: keyof PrizePercentages
  amount: number
  showTooltip?: boolean
}) {
  const description = showTooltip ? PRIZE_DESCRIPTIONS[prizeKey] : undefined
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="relative group inline-flex items-center cursor-default">
        <span className="text-xs font-medium text-gray-800">{PRIZE_LABELS[prizeKey]}</span>
        {description && (
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            {description}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </span>
        )}
      </span>
      <span className="text-sm font-semibold text-gray-700 shrink-0">
        {formatCurrency(amount)}
      </span>
    </li>
  )
}

export function PrizeBreakdown() {
  const { config, isLoading: configLoading } = useConfig()
  const { participants, isLoading: participantsLoading } = useParticipants()

  if (configLoading || participantsLoading) return <PrizeBreakdownSkeleton />

  const amounts = calculatePrizeAmounts(config, participants)
  const paidCount = participants.filter(p => p.hasPaid).length
  const prizePool = paidCount * config.entryFee + (config.additionalPrize ?? 0)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-navy-900">Prize Pool</h2>
          <p className="text-xs text-gray-500 mt-0.5">{paidCount}/{participants.length} paid · £{config.entryFee} entry</p>
        </div>
        <span className="font-display font-bold text-5xl text-brand-600">{formatCurrency(prizePool)}</span>
      </div>

      <div className="my-4 mx-6 border-t border-gray-100" />

      <ul className="space-y-3">
        {PODIUM_PRIZES.map(key => (
          <PrizeRow key={key} prizeKey={key} amount={amounts[key]} showTooltip={false} />
        ))}
      </ul>

      <div className="my-4 mx-6 border-t border-gray-100" />

      <ul className="space-y-3">
        {SPECIAL_PRIZES.map(key => (
          <PrizeRow key={key} prizeKey={key} amount={amounts[key]} />
        ))}
      </ul>
    </div>
  )
}
