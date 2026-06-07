import type { AppConfig, PrizePercentages } from '@/types'
import type { Participant } from '@/types'

export function calculatePrizePool(
  participants: Pick<Participant, 'hasPaid'>[],
  entryFee: number,
): number {
  return participants.filter(p => p.hasPaid).length * entryFee
}

export function calculatePrizeAmounts(
  config: AppConfig,
  participants: Pick<Participant, 'hasPaid'>[],
): Record<keyof PrizePercentages, number> {
  const pool = calculatePrizePool(participants, config.entryFee)
  return Object.fromEntries(
    Object.entries(config.prizes).map(([key, pct]) => [
      key,
      Math.floor(pool * pct / 100),
    ]),
  ) as Record<keyof PrizePercentages, number>
}

export function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString()}`
}
