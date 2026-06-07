import { AppShell } from '@/components/layout/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { LatestMatchCard } from '@/components/home/LatestMatchCard'
import { HomeMatchSection } from '@/components/home/HomeMatchSection'
import { PrizeBreakdown } from '@/components/prizes/PrizeBreakdown'
import { PredictionLeaderboard } from '@/components/prizes/PredictionLeaderboard'

export function HomePage() {
  return (
    <AppShell sidebar={<Sidebar />}>
      <LatestMatchCard />
      <HomeMatchSection />
      {/* Mobile: show prize + leaderboard below main content */}
      <div className="lg:hidden flex flex-col gap-6">
        <PrizeBreakdown />
        <PredictionLeaderboard />
      </div>
    </AppShell>
  )
}
