import { PrizeBreakdown } from '@/components/prizes/PrizeBreakdown'
import { PredictionLeaderboard } from '@/components/prizes/PredictionLeaderboard'
import { LiveStatCards } from '@/components/prizes/LiveStatCards'

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col gap-6 w-80 shrink-0">
      <PrizeBreakdown />
      <PredictionLeaderboard />
      <LiveStatCards />
    </aside>
  )
}
