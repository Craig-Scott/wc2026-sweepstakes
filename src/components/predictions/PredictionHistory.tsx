import { useState } from 'react'
import type { Match, Prediction, Participant } from '@/types'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { predictionLabel } from '@/utils/predictions'

interface Props {
  predictions: Prediction[]
  matchesById: Map<number, Match>
  participants: Participant[]
  allPredsByMatch: Map<number, Prediction[]>
}

function MatchPredictionEntry({ pred, match, participants, matchPredictions }: {
  pred: Prediction
  match: Match
  participants: Participant[]
  matchPredictions: Prediction[]
}) {
  const [picksOpen, setPicksOpen] = useState(false)
  const findOwner = (code: string) => participants.find(p => p.teamCodes.includes(code))?.name

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
    <div className="py-4 first:pt-0 last:pb-0 space-y-3">

      {/* Teams + score */}
      <div className={`flex ${hasScorers ? 'items-start' : 'items-center'} justify-between`}>
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
              {findOwner(match.homeTeam.code) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                  {findOwner(match.homeTeam.code)}
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
        <div className="text-center shrink-0 px-2">
          <div className="font-display font-bold text-4xl text-navy-900 tabular-nums leading-none">
            {match.score.home ?? '–'} <span className="text-gray-300">–</span> {match.score.away ?? '–'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-end">
              <span className="text-sm sm:text-lg font-bold max-w-[120px] sm:max-w-none truncate">{match.awayTeam.name}</span>
              {findOwner(match.awayTeam.code) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                  {findOwner(match.awayTeam.code)}
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

      {/* All picks */}
      {(() => {
        const myPts = pred.pointsAwarded ?? null
        const myLabel = predictionLabel(pred.predictedHome, pred.predictedAway, match.homeTeam.name, match.awayTeam.name)
        const myPillCls = (myPts ?? -1) >= 9 ? 'bg-brand-600/10 text-brand-700'
          : myPts === 3 ? 'bg-blue-100 text-blue-700'
          : myPts === 0 ? 'bg-red-100 text-red-600'
          : 'bg-gray-100 text-gray-500'
        const myIcon = myPts === 0 ? '✗' : myPts !== null ? '✓' : null
        const others = sorted.filter(p => p.id !== pred.participantId)

        const renderPickCell = (p: Participant) => {
          const pick = matchPredictions.find(mp => mp.participantId === p.id)
          if (!pick) return (
            <div key={p.id} className="rounded-lg border border-dashed border-gray-200 p-2 flex flex-col gap-1 opacity-50">
              <span className="text-xs font-semibold text-gray-500">{p.name}</span>
              <span className="text-xs text-gray-300 italic">No pick</span>
            </div>
          )
          const label = predictionLabel(pick.predictedHome, pick.predictedAway, match.homeTeam.name, match.awayTeam.name)
          const pickPts = pick.pointsAwarded
          const pillCls = (pickPts ?? -1) >= 9 ? 'bg-brand-600/10 text-brand-700'
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
        }

        return (
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-start gap-2">
              <div className="w-1/2 lg:w-1/3 shrink-0 rounded-lg p-2 flex flex-col gap-1 bg-gray-50 ring-1 ring-brand-600/40">
                <span className="text-xs font-semibold text-brand-700">Your prediction</span>
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${myPillCls}`}>
                  {myIcon && <span className="shrink-0">{myIcon}</span>}
                  <span className="flex-1 min-w-0 truncate">{myLabel}</span>
                  {myPts !== null && <span className="shrink-0 font-bold">{myPts}pts</span>}
                </div>
              </div>
              <button
                onClick={() => setPicksOpen(o => !o)}
                className="ml-auto shrink-0 flex items-center gap-1 text-xs text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 self-center"
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
                {others.map(renderPickCell)}
              </div>
            )}
          </div>
        )
      })()}

    </div>
  )
}

export function PredictionHistory({ predictions, matchesById, participants, allPredsByMatch }: Props) {
  const finished = predictions
    .filter(p => matchesById.get(p.matchId)?.status === 'FINISHED')
    .sort((a, b) => {
      const ma = matchesById.get(a.matchId)
      const mb = matchesById.get(b.matchId)
      return (mb?.kickoff.toDate().getTime() ?? 0) - (ma?.kickoff.toDate().getTime() ?? 0)
    })

  if (finished.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No completed matches with predictions yet.
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {finished.map(pred => {
        const match = matchesById.get(pred.matchId)
        if (!match) return null
        return (
          <MatchPredictionEntry
            key={`${pred.participantId}_${pred.matchId}`}
            pred={pred}
            match={match}
            participants={participants}
            matchPredictions={allPredsByMatch.get(pred.matchId) ?? []}
          />
        )
      })}
    </div>
  )
}
