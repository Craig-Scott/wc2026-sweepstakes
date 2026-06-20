import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '@/hooks/useMatches'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useParticipants } from '@/hooks/useParticipants'
import { usePredictionsForParticipant, useAllPredictions } from '@/hooks/usePredictions'
import { PredictionForm } from '@/components/predictions/PredictionForm'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { HomeMatchSectionSkeleton } from '@/components/shared/Skeleton'
import { formatKickoffFull, formatKickoffDateFull, formatKickoffTime } from '@/utils/dates'
import { predictionLabel, isMatchLocked } from '@/utils/predictions'
import { useESPNLiveScore } from '@/hooks/useESPNLiveScore'
import { STAGE_LABELS } from '@/config/tournament'
import { getUKBroadcast } from '@/config/broadcastUK'
import type { Match, Prediction, Participant } from '@/types'

type Tab = 'predict' | 'results'

function MatchPreview({ match, participants }: { match: Match; participants: Participant[] }) {
  const findOwner = (code: string) => participants.find(p => p.teamCodes.includes(code))?.name
  const ukChannel = getUKBroadcast(match.homeTeam.code, match.awayTeam.code)
  return (
    <div className="relative flex items-center justify-between">
      <div className="flex flex-col items-start gap-1">
        <TeamBadge code={match.homeTeam.code} name={match.homeTeam.name} size="md" smSize="lg" bold nameClassName="max-w-[120px] sm:max-w-none truncate" />
        {findOwner(match.homeTeam.code) && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
            {findOwner(match.homeTeam.code)}
          </span>
        )}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none text-center">
        <span className="text-xs text-gray-400">{formatKickoffDateFull(match.kickoff)}</span>
        <span className="text-xs text-gray-400">
          {formatKickoffTime(match.kickoff)}{ukChannel ? ` – ${ukChannel}` : ''}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <TeamBadge code={match.awayTeam.code} name={match.awayTeam.name} size="md" smSize="lg" bold reverse nameClassName="max-w-[120px] sm:max-w-none truncate" />
        {findOwner(match.awayTeam.code) && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
            {findOwner(match.awayTeam.code)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Live match card ──────────────────────────────────────────────────────────

export function LiveMatchCard({ match, prediction, participants, matchPredictions }: {
  match: Match; prediction?: Prediction; participants: Participant[]; matchPredictions: Prediction[]
}) {
  const [picksOpen, setPicksOpen] = useState(false)
  const findOwner = (code: string) => participants.find(p => p.teamCodes.includes(code))?.name

  const myLabel = prediction
    ? predictionLabel(prediction.predictedHome, prediction.predictedAway, match.homeTeam.name, match.awayTeam.name)
    : null

  const espn = useESPNLiveScore(match.espnEventId)

  const scoreHome = espn?.home ?? match.score.home
  const scoreAway = espn?.away ?? match.score.away
  const scorers = espn?.scorers ?? match.scorers
  const cards = espn?.cards ?? match.cards

  const isHome = (t: string) => t === match.homeTeam.code || t === match.homeTeam.name
  const homeScorers = scorers.filter(s => isHome(s.team))
  const awayScorers = scorers.filter(s => !isHome(s.team))
  const homeYellow = cards.filter(c => isHome(c.team) && c.type === 'YELLOW').length
  const homeRed = cards.filter(c => isHome(c.team) && c.type !== 'YELLOW').length
  const awayYellow = cards.filter(c => !isHome(c.team) && c.type === 'YELLOW').length
  const awayRed = cards.filter(c => !isHome(c.team) && c.type !== 'YELLOW').length
  const hasScorers = scorers.length > 0

  // Use ESPN's live minute (accurate, refreshed every 30s). When it isn't available we show
  // "LIVE" rather than a guessed wall-clock minute — the old estimate drifted to a wrong 90'
  // because the sync no longer rewrites currentMinute/updatedAt on every live tick.
  const liveMinute: number | null = espn?.minute ?? null
  const ukChannel = getUKBroadcast(match.homeTeam.code, match.awayTeam.code)

  const sorted = [...participants].sort((a, b) => a.name.localeCompare(b.name))
  const others = sorted.filter(p => p.id !== prediction?.participantId)

  const renderPickCell = (p: Participant) => {
    const pick = matchPredictions.find(pred => pred.participantId === p.id)
    if (!pick) return (
      <div key={p.id} className="rounded-lg border border-dashed border-gray-200 p-2 flex flex-col gap-1 opacity-50">
        <span className="text-xs font-semibold text-gray-500">{p.name}</span>
        <span className="text-xs text-gray-300 italic">No pick</span>
      </div>
    )
    const label = predictionLabel(pick.predictedHome, pick.predictedAway, match.homeTeam.name, match.awayTeam.name)
    return (
      <div key={p.id} className="rounded-lg p-2 flex flex-col gap-1 bg-gray-50">
        <span className="text-xs font-semibold truncate text-gray-700">{p.name}</span>
        <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          <span className="flex-1 min-w-0 truncate">{label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-3 ring-2 ring-brand-500/30">
      {/* Stage + UK broadcaster */}
      <div className="text-xs text-gray-400">
        {STAGE_LABELS[match.stage] ?? match.stage}{match.group ? ` · Group ${match.group}` : ''}{ukChannel ? ` · 📺 ${ukChannel}` : ''}
      </div>

      {/* Teams + score */}
      <div className={`flex ${hasScorers ? 'items-start' : 'items-center'} gap-4`}>
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
            {scoreHome ?? '–'} <span className="text-gray-300">–</span> {scoreAway ?? '–'}
          </div>
          <div className="flex flex-col items-center gap-1 mt-0.5">
            <div className="text-xs font-semibold text-brand-600 tracking-wide">
              {match.status === 'PAUSED' ? 'HT' : liveMinute != null ? `${liveMinute}'` : 'LIVE'}
            </div>
            <div className="relative h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute inset-0" style={{ animation: 'pill-lr 2s ease-in-out infinite' }}>
                <div className="absolute top-0 left-0 h-1 w-3 bg-brand-500 rounded-full" />
              </div>
            </div>
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

      {/* Picks */}
      <div className="border-t border-gray-100 pt-2">
        <div className="flex items-start gap-2">
          {prediction && myLabel && (
            <div className="w-1/2 lg:w-1/3 shrink-0 rounded-lg p-2 flex flex-col gap-1 bg-gray-50 ring-1 ring-brand-600/40">
              <span className="text-xs font-semibold text-brand-700">Your prediction</span>
              <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                <span className="flex-1 min-w-0 truncate">{myLabel}</span>
              </div>
            </div>
          )}
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
    </div>
  )
}

// ── Result card with prediction overlay ──────────────────────────────────────

export function ResultWithPrediction({ match, prediction, participants, matchPredictions }: {
  match: Match; prediction?: Prediction; participants: Participant[]; matchPredictions: Prediction[]
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

  return (
    <div className="card p-4 space-y-3">
      {/* Stage + date */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{STAGE_LABELS[match.stage] ?? match.stage}{match.group ? ` · Group ${match.group}` : ''}</span>
        <span>{formatKickoffFull(match.kickoff)}</span>
      </div>

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
            {match.score.home} <span className="text-gray-300">–</span> {match.score.away}
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
        const myPts = prediction?.pointsAwarded ?? null
        const myLabel = prediction
          ? predictionLabel(prediction.predictedHome, prediction.predictedAway, match.homeTeam.name, match.awayTeam.name)
          : null
        const myPillCls = myPts === 9 ? 'bg-brand-600/10 text-brand-700'
          : myPts === 3 ? 'bg-blue-100 text-blue-700'
          : myPts === 0 ? 'bg-red-100 text-red-600'
          : 'bg-gray-100 text-gray-500'
        const myIcon = myPts === 0 ? '✗' : myPts !== null ? '✓' : null

        const sorted = [...participants].sort((a, b) => {
          const pa = matchPredictions.find(p => p.participantId === a.id)
          const pb = matchPredictions.find(p => p.participantId === b.id)
          return (pb?.pointsAwarded ?? -1) - (pa?.pointsAwarded ?? -1)
        })
        const others = sorted.filter(p => p.id !== prediction?.participantId)

        const renderPickCell = (p: Participant) => {
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
        }

        return (
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-start gap-2">
              {prediction && myLabel && (
                <div className="w-1/2 lg:w-1/3 shrink-0 rounded-lg p-2 flex flex-col gap-1 bg-gray-50 ring-1 ring-brand-600/40">
                  <span className="text-xs font-semibold text-brand-700">Your prediction</span>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${myPillCls}`}>
                    {myIcon && <span className="shrink-0">{myIcon}</span>}
                    <span className="flex-1 min-w-0 truncate">{myLabel}</span>
                    {myPts !== null && <span className="shrink-0 font-bold">{myPts}pts</span>}
                  </div>
                </div>
              )}
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

// ── Main section ──────────────────────────────────────────────────────────────

export function HomeMatchSection() {
  const [tab, setTab] = useState<Tab>('predict')
  const { matches, isLoading } = useMatches()
  const { firebaseUser, userRecord } = useCurrentUser()
  const { participants } = useParticipants()
  const participantId = userRecord?.participantId ?? null
  const { predictions } = usePredictionsForParticipant(participantId)
  const predsByMatch = new Map(predictions.map(p => [p.matchId, p]))
  const { predictions: allPredictions } = useAllPredictions()
  const allPredsByMatch = new Map<number, Prediction[]>()
  for (const p of allPredictions) {
    const list = allPredsByMatch.get(p.matchId) ?? []
    list.push(p)
    allPredsByMatch.set(p.matchId, list)
  }

  const liveMatches = matches.filter(m =>
    ['IN_PLAY', 'PAUSED'].includes(m.status) ||
    (['SCHEDULED', 'TIMED'].includes(m.status) && isMatchLocked(m))
  )

  const predictMatches = matches
    .filter(m => ['SCHEDULED', 'TIMED'].includes(m.status) && !isMatchLocked(m))
    .slice(0, 10)

  const finishedMatches = matches
    .filter(m => m.status === 'FINISHED')
    .slice(-10)
    .reverse()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['predict', 'results'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t === 'predict' ? 'Predict' : 'Prediction Results'}
            </button>
          ))}
        </div>
        <Link to="/predictions" className="text-xs text-brand-600 hover:underline font-medium">
          All predictions →
        </Link>
      </div>

      {isLoading ? (
        <HomeMatchSectionSkeleton />
      ) : tab === 'predict' ? (
        liveMatches.length === 0 && predictMatches.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">No upcoming matches right now.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {liveMatches.map(match => (
              <LiveMatchCard
                key={match.id}
                match={match}
                prediction={predsByMatch.get(match.id)}
                participants={participants}
                matchPredictions={allPredsByMatch.get(match.id) ?? []}
              />
            ))}
            {!firebaseUser && predictMatches.length > 0 && (
              <div className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-navy-900">Want to play?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sign in to make predictions and compete on the leaderboard.</p>
                </div>
                <Link
                  to="/login"
                  className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
            {predictMatches.map(match => (
              <div key={match.id} className="card p-4">
                {firebaseUser && participantId ? (
                  <PredictionForm
                    match={match}
                    participantId={participantId}
                    uid={firebaseUser.uid}
                    existingPrediction={predsByMatch.get(match.id)}
                  />
                ) : (
                  <MatchPreview match={match} participants={participants} />
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        finishedMatches.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">No results yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {finishedMatches.map(match => (
              <ResultWithPrediction
                key={match.id}
                match={match}
                prediction={predsByMatch.get(match.id)}
                participants={participants}
                matchPredictions={allPredsByMatch.get(match.id) ?? []}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
