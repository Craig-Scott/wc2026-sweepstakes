import { AppShell } from '@/components/layout/AppShell'
import { ParticipantsTable } from '@/components/participants/ParticipantsTable'

export function ParticipantsPage() {
  return (
    <AppShell>
      <div>
        <h1 className="text-xl font-bold text-navy-900 mb-6">Participants</h1>
        <ParticipantsTable />
      </div>
    </AppShell>
  )
}
