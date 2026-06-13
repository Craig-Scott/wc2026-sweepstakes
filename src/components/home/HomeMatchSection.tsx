import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '@/hooks/useMatches'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useParticipants } from '@/hooks/useParticipants'
import { usePredictionsForParticipant } from '@/hooks/usePredictions'
import { PredictionForm } from '@/components/predictions/PredictionForm'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { HomeMatchSectionSkeleton } from '@/components/shared/Skeleton'
import { formatKickoffFull, formatKickoffDateFull, formatKickoffTime } from '@/utils/dates'
import { isCanonicalPrediction, predictionLabel } from '@/utils/predictions'
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

// ── Result card with prediction overlay ──────────────────────────────────────

function ResultWithPrediction({ match, prediction, participants }: {
  match: Match; prediction?: Prediction; participants: Participant[]
}) {
  const homeWin = (match.score.home ?? 0) > (match.score.away ?? 0)
  const awayWin = (match.score.away ?? 0) > (match.score.home ?? 0)
  const findOwner = (code: string) => participants.find(p => p.teamCodes.includes(code))?.name

  const pts = prediction?.pointsAwarded ?? null
  const ptsColor = pts === 9 ? 'text-brand-600' : pts === 3 ? 'text-blue-600' : 'text-gray-400'

  const predText = prediction
    ? predictionLabel(
        prediction.predictedHome,
        prediction.predictedAway,
        match.homeTeam.name,
        match.awayTeam.name,
      )
    : null

  const predIsScore = prediction && !isCanonicalPrediction(prediction.predictedHome, prediction.predictedAway)

  const outcome =
    pts === 9 ? 'Exact score ✓'
    : pts === 3 ? 'Correct result ✓'
    : pts === 0 ? 'Incorrect ✗'
    : null

  const outcomeColor =
    pts === 9 ? 'text-brand-600'
    : pts === 3 ? 'text-blue-600'
    : pts === 0 ? 'text-red-400'
    : 'text-gray-400'

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
      <div className={`flex ${hasScorers ? 'items-start' : 'items-center'} gap-4`}>
        <div className={`flex-1 flex flex-col items-start gap-0.5 min-w-0 ${homeWin ? '' : 'opacity-50'}`}>
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-start">
              <TeamBadge code={match.homeTeam.code} showName={false} />
              {(homeYellow > 0 || homeRed > 0) && (
                <div className="flex items-center gap-1 mt-0.5">
                  {homeYellow > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-yellow-400">{homeYellow}</span>}
                  {homeRed > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-red-500">{homeRed}</span>}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm">{match.homeTeam.name}</span>
              {findOwner(match.homeTeam.code) && (
                <span className="text-xs text-gray-400">{findOwner(match.homeTeam.code)}</span>
              )}
              {homeScorers.length > 0 && (
                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
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
        <div className="font-display font-bold text-4xl text-navy-900 tabular-nums leading-none text-center shrink-0">
          {match.score.home} <span className="text-gray-300">–</span> {match.score.away}
        </div>
        <div className={`flex-1 flex flex-col items-end gap-0.5 min-w-0 ${awayWin ? '' : 'opacity-50'}`}>
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col items-end">
              <span className="text-sm">{match.awayTeam.name}</span>
              {findOwner(match.awayTeam.code) && (
                <span className="text-xs text-gray-400">{findOwner(match.awayTeam.code)}</span>
              )}
              {awayScorers.length > 0 && (
                <div className="mt-1 space-y-0.5 text-xs text-gray-500 text-right">
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
              <TeamBadge code={match.awayTeam.code} showName={false} />
              {(awayYellow > 0 || awayRed > 0) && (
                <div className="flex items-center gap-1 mt-0.5">
                  {awayYellow > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-yellow-400">{awayYellow}</span>}
                  {awayRed > 0 && <span className="w-3.5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-[5px] bg-red-500">{awayRed}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prediction summary */}
      <div className="border-t border-gray-100 pt-2">
        {prediction ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Your pick:{' '}
              <span className="font-medium text-gray-700">
                {predText}
                {predIsScore && (
                  <span className="text-gray-400 ml-1 font-normal">
                    ({prediction.predictedHome}–{prediction.predictedAway})
                  </span>
                )}
              </span>
            </span>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {outcome && <span className={`font-medium ${outcomeColor}`}>{outcome}</span>}
              {pts !== null && <span className={`font-bold ${ptsColor}`}>{pts}pts</span>}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No prediction made</p>
        )}
      </div>
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

  const predictMatches = matches
    .filter(m => ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED'].includes(m.status))
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
        predictMatches.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">No upcoming matches right now.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {!firebaseUser && (
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
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
