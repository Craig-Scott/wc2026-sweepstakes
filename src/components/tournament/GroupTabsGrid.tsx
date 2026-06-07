import { useStandings } from '@/hooks/useStandings'
import { GroupTable } from './GroupTable'
import { GroupGridSkeleton } from '@/components/shared/Skeleton'

export function GroupTabsGrid() {
  const { standings, isLoading } = useStandings()

  if (isLoading) return <GroupGridSkeleton />
  if (standings.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Group standings will appear here once the tournament begins.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {standings.map(standing => (
        <GroupTable key={standing.group} standing={standing} />
      ))}
    </div>
  )
}
