import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useMatches } from '@/hooks/useMatches'
import { MatchResultCard } from '@/components/results/MatchResultCard'
import { ResultsPageSkeleton } from '@/components/shared/Skeleton'
import { STAGE_LABELS, STAGE_ORDER } from '@/config/tournament'
import type { MatchStage } from '@/types'

type StageFilter = 'ALL' | MatchStage

export function ResultsPage() {
  const { matches, isLoading } = useMatches()
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [search, setSearch] = useState('')

  const finished = matches.filter(m => m.status === 'FINISHED')

  const filtered = finished.filter(m => {
    const matchesStage = stageFilter === 'ALL' || m.stage === stageFilter
    const matchesSearch = search === '' ||
      m.homeTeam.name.toLowerCase().includes(search.toLowerCase()) ||
      m.awayTeam.name.toLowerCase().includes(search.toLowerCase())
    return matchesStage && matchesSearch
  })

  const availableStages = [...new Set(finished.map(m => m.stage))]
    .sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b))

  return (
    <AppShell>
      <div>
        <h1 className="text-xl font-bold text-navy-900 mb-4">Results</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="search"
            placeholder="Search team…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
          />
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setStageFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                stageFilter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {availableStages.map(s => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  stageFilter === s ? 'bg-brand-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {STAGE_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <ResultsPageSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-12">
            {finished.length === 0 ? 'No completed matches yet.' : 'No matches match your filter.'}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(m => <MatchResultCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}
