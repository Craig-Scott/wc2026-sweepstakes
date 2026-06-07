import { Fragment } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useParticipants } from '@/hooks/useParticipants'
import { TeamBadge } from '@/components/shared/TeamBadge'
import type { Match, MatchStage, Participant } from '@/types'
import { BracketSkeleton } from '@/components/shared/Skeleton'

// All knockout stages in bracket order, left → right.
// The widest stage (R32, 16 matches) defines the total height.
// Every subsequent stage has half the matches, so items are automatically
// centred between their parent pair — forming a right-pointing arrow.
const ARROW_STAGES: MatchStage[] = [
  'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL',
]

const MIN_SLOT_H = 56  // px per match slot (pill ~48px + breathing room)
const LABEL_H    = 24  // px — stage label row
const PILL_W     = 176 // px — w-44
const CONN_W     = 28  // px — connector SVG width

const STAGE_LABEL: Partial<Record<MatchStage, string>> = {
  ROUND_OF_32:         'R32',
  ROUND_OF_16:         'R16',
  QUARTER_FINAL:       'QF',
  SEMI_FINAL:          'SF',
  THIRD_PLACE_PLAYOFF: '3rd Place',
  FINAL:               'Final',
}

// Item vertical centres with justify-around: (2i+1) * H / (2N)
function itemCentres(count: number, totalH: number): number[] {
  return Array.from({ length: count }, (_, i) => (2 * i + 1) * totalH / (2 * count))
}

function KnockoutMatchPill({ match, participants }: { match: Match; participants: Participant[] }) {
  const hasScore    = match.score.home !== null
  const placeholder = !match.homeTeam.code || match.homeTeam.code === 'TBD'
  const homeWins    = hasScore && match.score.home! > match.score.away!
  const awayWins    = hasScore && match.score.away! > match.score.home!
  const findOwner   = (code: string) => participants.find(p => p.teamCodes.includes(code))?.name

  const Row = ({ code, name, score, winner }: {
    code: string; name: string; score: number | null; winner: boolean
  }) => (
    <div className={`flex items-center justify-between px-2 py-1 ${winner ? 'bg-brand-50' : ''}`}>
      <div className="flex flex-col min-w-0">
        {placeholder
          ? <span className="text-gray-400 italic text-xs">TBD</span>
          : <TeamBadge code={code} name={name} size="sm" />
        }
        {!placeholder && findOwner(code) && (
          <span className="text-gray-400 text-xs pl-6 truncate">{findOwner(code)}</span>
        )}
      </div>
      <span className="font-bold tabular-nums ml-1 text-gray-500 text-xs shrink-0">
        {hasScore ? score : '-'}
      </span>
    </div>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden"
      style={{ width: PILL_W }}>
      <Row code={match.homeTeam.code} name={match.homeTeam.name}
        score={match.score.home} winner={homeWins} />
      <div className="border-t border-gray-100" />
      <Row code={match.awayTeam.code} name={match.awayTeam.name}
        score={match.score.away} winner={awayWins} />
    </div>
  )
}

// SVG bracket lines connecting a left stage (leftCount items) to the right
// stage (leftCount / 2 items). For each pair of left items, draws:
//   horizontal stub → vertical brace → horizontal stub to the right item.
function BracketConnector({ leftCount, totalH }: { leftCount: number; totalH: number }) {
  const rightCount = leftCount / 2
  const leftC  = itemCentres(leftCount, totalH)
  const rightC = itemCentres(rightCount, totalH)
  const midX   = CONN_W / 2
  const stroke = '#e2e8f0'
  const sw     = 1.5

  return (
    <svg width={CONN_W} height={totalH} style={{ display: 'block', flexShrink: 0 }}>
      {rightC.map((ry, i) => {
        const ty = leftC[i * 2]
        const by = leftC[i * 2 + 1]
        return (
          <g key={i}>
            <line x1={0}    y1={ty} x2={midX}  y2={ty} stroke={stroke} strokeWidth={sw} />
            <line x1={midX} y1={ty} x2={midX}  y2={by} stroke={stroke} strokeWidth={sw} />
            <line x1={0}    y1={by} x2={midX}  y2={by} stroke={stroke} strokeWidth={sw} />
            <line x1={midX} y1={ry} x2={CONN_W} y2={ry} stroke={stroke} strokeWidth={sw} />
          </g>
        )
      })}
    </svg>
  )
}

export function KnockoutBracket() {
  const { matches, isLoading } = useMatches()
  const { participants } = useParticipants()

  if (isLoading) return <BracketSkeleton />

  const knockout = matches.filter(m => m.stage !== 'GROUP')
  if (knockout.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Knockout bracket will appear once the group stage is complete.
      </div>
    )
  }

  const byStage: Record<string, Match[]> = {}
  for (const m of knockout) {
    byStage[m.stage] = [...(byStage[m.stage] ?? []), m]
  }

  const arrowStages  = ARROW_STAGES.filter(s => (byStage[s]?.length ?? 0) > 0)
  const thirdPlace   = byStage['THIRD_PLACE_PLAYOFF'] ?? []

  // Height driven by the widest stage so all columns share the same container.
  const widestCount = arrowStages.reduce((max, s) => Math.max(max, byStage[s]?.length ?? 0), 1)
  const totalH      = widestCount * MIN_SLOT_H

  return (
    <div className="space-y-6">
      {/* Arrow bracket — all knockout rounds */}
      {arrowStages.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex items-start">
            {arrowStages.map((stage, i) => (
              <Fragment key={stage}>
                <div style={{ width: PILL_W }}>
                  <div className="text-xs font-semibold text-gray-500 text-center"
                    style={{ height: LABEL_H, lineHeight: `${LABEL_H}px` }}>
                    {STAGE_LABEL[stage]}
                  </div>
                  <div className="flex flex-col justify-around" style={{ height: totalH }}>
                    {(byStage[stage] ?? []).map(m => (
                      <KnockoutMatchPill key={m.id} match={m} participants={participants} />
                    ))}
                  </div>
                </div>

                {i < arrowStages.length - 1 && (
                  <div style={{ paddingTop: LABEL_H }}>
                    <BracketConnector
                      leftCount={(byStage[stage] ?? []).length}
                      totalH={totalH}
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* 3rd place playoff below the main bracket */}
      {thirdPlace.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 mb-2">
            {STAGE_LABEL['THIRD_PLACE_PLAYOFF']}
          </h4>
          <KnockoutMatchPill match={thirdPlace[0]} participants={participants} />
        </div>
      )}
    </div>
  )
}
