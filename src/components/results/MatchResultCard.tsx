import { useState } from 'react'
import type { Match, Participant, Prediction } from '@/types'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { STAGE_LABELS } from '@/config/tournament'
import { predictionLabel } from '@/utils/predictions'

interface Props {
  match: Match
  participants: Participant[]
  matchPredictions: Prediction[]
}

export function MatchResultCard({ match, participants, matchPredictions }: Props) {
  const [picksOpen, setPicksOpen] = useState(false)

  const findParticipant = (teamCode: string) =>
    participants.find(p => p.teamCodes.includes(teamCode))

  const homeParticipant = findParticipant(match.homeTeam.code)
  const awayParticipant = findParticipant(match.awayTeam.code)

  const isHome = (t: string) => t === match.homeTeam.code || t === match.homeTeam.name
  const homeScorers = match.scorers.filter(s => isHome(s.team))
  const awayScorers = match.scorers.filter(s => !isHome(s.team))
  const homeYellow = match.cards.filter(c => isHome(c.team) && c.type === 'YELLOW').length
  const homeRed = match.cards.filter(c => isHome(c.team) && c.type !== 'YELLOW').length
  const awayYellow = match.cards.filter(c => !isHome(c.team) && c.type === 'YELLOW').length
  const awayRed = match.cards.filter(c => !isHome(c.team) && c.type !== 'YELLOW').length
  const hasScorers = match.scorers.length > 0

  const sorted = [...participants].sort((a, b) => {
    const pa = matchPredictions.find(p => p.participantId === a.id)
    const pb = matchPredictions.find(p => p.participantId === b.id)
    return (pb?.pointsAwarded ?? -1) - (pa?.pointsAwarded ?? -1)
  })

  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 mb-3">
        {STAGE_LABELS[match.stage] ?? match.stage}{match.group ? ` · Group ${match.group}` : ''}
      </div>

      <div className={`flex ${hasScorers ? 'items-start' : 'items-center'} justify-between`}>
        {/* Home */}
        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-start">
              <TeamBadge code={match.homeTeam.code} size="md" smSize="lg" showName={false} />
              {(homeYellow > 0 || homeRed > 0) && (
                <div className="flex flex-col gap-0.5 mt-7">
                  {homeYellow > 0 && <span className="w-3 h-4 flex items-center justify-center text-xs font-bold text-white rounded-[3px] bg-yellow-400">{homeYellow}</span>}
                  {homeRed > 0 && <span className="w-3 h-4 flex items-center justify-center text-xs font-bold text-white rounded-[3px] bg-red-500">{homeRed}</span>}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm sm:text-lg font-bold max-w-[120px] sm:max-w-none truncate">{match.homeTeam.name}</span>
              {homeParticipant && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                  {homeParticipant.name}
                </span>
              )}
              {homeScorers.length > 0 && (
                <div className="mt-5 space-y-0.5 text-xs text-gray-500">
                  {homeScorers.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-gray-400 shrink-0">{s.minute}'</span>
                      {s.isOwnGoal && <span className="text-red-400">(OG)</span>}
                      {s.isPenalty && <span className="text-gray-400">(pen)</span>}
                      <span>{s.player}</span>
                      {s.distanceMeters && <span className="text-brand-600 font-medium">{s.distanceMeters}m</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="text-center shrink-0 px-2">
          <div className="font-display font-bold tabular-nums text-4xl text-navy-900 leading-none">
            {match.score.home ?? '–'} <span className="text-gray-300">–</span> {match.score.away ?? '–'}
          </div>
        </div>

        {/* Away */}
        <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-end">
              <span className="text-sm sm:text-lg font-bold max-w-[120px] sm:max-w-none truncate">{match.awayTeam.name}</span>
              {awayParticipant && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                  {awayParticipant.name}
                </span>
              )}
              {awayScorers.length > 0 && (
                <div className="mt-5 space-y-0.5 text-xs text-gray-500 text-right">
                  {awayScorers.map((s, i) => (
                    <div key={i} className="flex items-center justify-end gap-1">
                      {s.distanceMeters && <span className="text-brand-600 font-medium">{s.distanceMeters}m</span>}
                      <span>{s.player}</span>
                      {s.isOwnGoal && <span className="text-red-400">(OG)</span>}
                      {s.isPenalty && <span className="text-gray-400">(pen)</span>}
                      <span className="text-gray-400 shrink-0">{s.minute}'</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <TeamBadge code={match.awayTeam.code} size="md" smSize="lg" showName={false} />
              {(awayYellow > 0 || awayRed > 0) && (
                <div className="flex flex-col gap-0.5 mt-7">
                  {awayYellow > 0 && <span className="w-3 h-4 flex items-center justify-center text-xs font-bold text-white rounded-[3px] bg-yellow-400">{awayYellow}</span>}
                  {awayRed > 0 && <span className="w-3 h-4 flex items-center justify-center text-xs font-bold text-white rounded-[3px] bg-red-500">{awayRed}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Picks */}
      <div className="border-t border-gray-100 pt-2 mt-3">
        <div className="flex justify-end">
          <button
            onClick={() => setPicksOpen(o => !o)}
            className="flex items-center gap-1 text-xs text-gray-400 px-2 py-0.5 rounded-full border border-gray-200"
          >
            {picksOpen ? (
              <>Hide Predictions <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg></>
            ) : (
              <>Show All Predictions <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></>
            )}
          </button>
        </div>
        {picksOpen && (
          <div className="mt-2 grid grid-cols-2 lg:grid-cols-3 gap-2">
            {sorted.map(p => {
              const pick = matchPredictions.find(pred => pred.participantId === p.id)
              if (!pick) return (
                <div key={p.id} className="rounded-lg border border-dashed border-gray-200 p-2 flex flex-col gap-1 opacity-50">
                  <span className="text-xs font-semibold text-gray-500">{p.name}</span>
                  <span className="text-xs text-gray-300 italic">No pick</span>
                </div>
              )
              const label = predictionLabel(pick.predictedHome, pick.predictedAway, match.homeTeam.name, match.awayTeam.name)
              const pickPts = pick.pointsAwarded
              const pillCls = pickPts === 9 ? 'bg-brand-600/10 text-brand-700'
                : pickPts === 3 ? 'bg-blue-100 text-blue-700'
                : pickPts === 0 ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-500'
              const icon = pickPts === 0 ? '✗' : pickPts !== null ? '✓' : null
              return (
                <div key={p.id} className="rounded-lg p-2 flex flex-col gap-1 bg-gray-50">
                  <span className="text-xs font-semibold truncate text-gray-700">{p.name}</span>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${pillCls}`}>
                    {icon && <span className="shrink-0">{icon}</span>}
                    <span className="flex-1 min-w-0 truncate">{label}</span>
                    {pickPts !== null && <span className="shrink-0 font-bold">{pickPts}pts</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
