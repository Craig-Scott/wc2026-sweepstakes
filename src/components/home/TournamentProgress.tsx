import { useState } from 'react'
import { GroupTabsGrid } from '@/components/tournament/GroupTabsGrid'
import { KnockoutBracket } from '@/components/tournament/KnockoutBracket'

type Tab = 'groups' | 'bracket'

export function TournamentProgress() {
  const [tab, setTab] = useState<Tab>('groups')

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        <h2 className="font-semibold text-navy-900 mr-3">Tournament</h2>
        {(['groups', 'bracket'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-brand-600 text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t === 'groups' ? 'Groups' : 'Knockout Phase'}
          </button>
        ))}
      </div>
      {tab === 'groups' ? <GroupTabsGrid /> : <KnockoutBracket />}
    </div>
  )
}
