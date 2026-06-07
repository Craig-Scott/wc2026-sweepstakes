import { AppShell } from '@/components/layout/AppShell'
import { TournamentProgress } from '@/components/home/TournamentProgress'

export function TournamentPage() {
  return (
    <AppShell wide>
      <h1 className="text-xl font-bold text-navy-900 mb-6">Tournament</h1>
      <TournamentProgress />
    </AppShell>
  )
}
