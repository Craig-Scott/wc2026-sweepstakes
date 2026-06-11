import { useState, useEffect, useRef } from 'react'
import type { Match, Prediction } from '@/types'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { formatKickoffDate, formatKickoffTime } from '@/utils/dates'
import { isMatchLocked, isCanonicalPrediction, predictionLabel } from '@/utils/predictions'
import { savePrediction } from '@/services/predictions.service'
import { useParticipants } from '@/hooks/useParticipants'
import { getUKBroadcast } from '@/config/broadcastUK'

interface Props {
  match: Match
  participantId: string
  uid: string
  existingPrediction?: Prediction
}

type ResultChoice = 'home' | 'draw' | 'away'
type SaveStatus = 'idle' | 'saving' | 'error'

const RESULT_OPTIONS: { value: ResultChoice; label: (m: Match) => string }[] = [
  { value: 'home', label: m => `${m.homeTeam.name} Win` },
  { value: 'draw', label: () => 'Draw' },
  { value: 'away', label: m => `${m.awayTeam.name} Win` },
]

function resultFromScores(home: number, away: number): ResultChoice {
  return home > away ? 'home' : home === away ? 'draw' : 'away'
}

function canonicalScores(result: ResultChoice): [number, number] {
  if (result === 'home') return [99, 0]
  if (result === 'draw') return [99, 99]
  return [0, 99]
}


export function PredictionForm({ match, participantId, uid, existingPrediction }: Props) {
  const locked = isMatchLocked(match)
  const { participants } = useParticipants()
  const findOwner = (code: string) => participants.find(p => p.teamCodes.includes(code))?.name

  const initResult: ResultChoice | null = existingPrediction
    ? resultFromScores(existingPrediction.predictedHome, existingPrediction.predictedAway)
    : null

  const initScoreEnabled = !!existingPrediction && !isCanonicalPrediction(existingPrediction.predictedHome, existingPrediction.predictedAway)
  const [result, setResult] = useState<ResultChoice | null>(initResult)
  const [scoreEnabled, setScoreEnabled] = useState(initScoreEnabled)
  const [homeScore, setHomeScore] = useState(existingPrediction?.predictedHome ?? 0)
  const [awayScore, setAwayScore] = useState(existingPrediction?.predictedAway ?? 0)
  const [homeScoreInput, setHomeScoreInput] = useState(initScoreEnabled ? String(existingPrediction!.predictedHome) : '')
  const [awayScoreInput, setAwayScoreInput] = useState(initScoreEnabled ? String(existingPrediction!.predictedAway) : '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')


  // Sync state once when existingPrediction arrives from Firestore after initial render
  const syncedRef = useRef(!!existingPrediction)
  useEffect(() => {
    if (syncedRef.current || !existingPrediction) return
    syncedRef.current = true
    setResult(resultFromScores(existingPrediction.predictedHome, existingPrediction.predictedAway))
    setHomeScore(existingPrediction.predictedHome)
    setAwayScore(existingPrediction.predictedAway)
    const nonCanonical = !isCanonicalPrediction(existingPrediction.predictedHome, existingPrediction.predictedAway)
    setScoreEnabled(nonCanonical)
    if (nonCanonical) {
      setHomeScoreInput(String(existingPrediction.predictedHome))
      setAwayScoreInput(String(existingPrediction.predictedAway))
    }
  }, [existingPrediction])

  const doSave = async (home: number, away: number) => {
    setSaveStatus('saving')
    try {
      await savePrediction(participantId, uid, match.id, home, away)
      setSaveStatus('idle')
    } catch (e) {
      console.error('Prediction save failed:', e)
      setSaveStatus('error')
    }
  }

  // Debounced auto-save for score input changes
  useEffect(() => {
    if (!scoreEnabled || result === null) return
    const timer = setTimeout(() => doSave(homeScore, awayScore), 600)
    return () => clearTimeout(timer)
  }, [homeScore, awayScore, scoreEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResultChange = (choice: ResultChoice) => {
    const [h, a] = canonicalScores(choice)
    setResult(choice)
    setHomeScore(h)
    setAwayScore(a)
    setHomeScoreInput('')
    setAwayScoreInput('')
    setScoreEnabled(false)
    doSave(h, a)
  }

  const handleScoreInputChange = (field: 'home' | 'away', raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    const num = digits === '' ? 0 : Math.min(20, parseInt(digits))
    const h = field === 'home' ? num : homeScore
    const a = field === 'away' ? num : awayScore
    if (field === 'home') setHomeScoreInput(digits)
    else setAwayScoreInput(digits)
    setHomeScore(h)
    setAwayScore(a)
    setResult(resultFromScores(h, a))
  }

  const handleScoreBlur = () => {
    if (scoreEnabled && result !== null) doSave(homeScore, awayScore)
  }

  // ── In-play locked state ──────────────────────────────────────────────────
  if (locked) {
    const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'

    return (
      <div className="space-y-3">
        {/* Teams + score */}
        <div className="relative flex items-center justify-between">
          <div className="flex flex-col items-start gap-1">
            <TeamBadge code={match.homeTeam.code} name={match.homeTeam.name} size="md" smSize="lg" bold nameClassName="max-w-[120px] sm:max-w-none truncate" />
            {findOwner(match.homeTeam.code) && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
                {findOwner(match.homeTeam.code)}
              </span>
            )}
          </div>
          <div className="text-center shrink-0 px-2">
            <div className="font-display font-bold text-4xl text-navy-900 tabular-nums leading-none">
              {match.score.home ?? '–'} <span className="text-gray-300">–</span> {match.score.away ?? '–'}
            </div>
            {isLive && (
              <span className="text-xs font-semibold text-red-500 tracking-wide">LIVE</span>
            )}
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

        {/* Scorers */}
        {match.scorers.length > 0 && (
          <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
            {match.scorers.map((s, i) => (
              <div key={i} className="flex gap-1.5">
                <span className="text-gray-400 w-6 text-right shrink-0">{s.minute}'</span>
                <span>
                  {s.isOwnGoal && <span className="text-red-400 mr-1">(OG)</span>}
                  {s.isPenalty && <span className="text-gray-400 mr-1">(pen)</span>}
                  {s.player}
                  <span className="text-gray-400 ml-1 text-xs">({s.team})</span>
                  {s.distanceMeters && (
                    <span className="ml-1 text-brand-600 font-medium">{s.distanceMeters}m</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        {match.cards.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs border-t border-gray-100 pt-2">
            {match.cards.map((c, i) => (
              <span key={i} className="flex items-center gap-1 text-gray-500">
                {c.type === 'YELLOW' ? '🟨' : '🟥'} {c.player} {c.minute}'
              </span>
            ))}
          </div>
        )}

        {/* User's prediction */}
        {existingPrediction ? (
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs border-t border-gray-100 pt-3 mt-1">
            <span className="text-gray-500">
              Your pick:{' '}
              <span className="font-medium text-gray-700">
                {predictionLabel(
                  existingPrediction.predictedHome,
                  existingPrediction.predictedAway,
                  match.homeTeam.name,
                  match.awayTeam.name,
                )}
                {!isCanonicalPrediction(existingPrediction.predictedHome, existingPrediction.predictedAway) && (
                  <span className="text-gray-400 ml-1 font-normal">
                    ({existingPrediction.predictedHome}–{existingPrediction.predictedAway})
                  </span>
                )}
              </span>
            </span>
            {existingPrediction.pointsAwarded !== null && (
              <span className={`font-bold shrink-0 ml-3 ${
                existingPrediction.pointsAwarded === 9 ? 'text-brand-600'
                : existingPrediction.pointsAwarded === 3 ? 'text-blue-600'
                : 'text-gray-400'
              }`}>
                {existingPrediction.pointsAwarded}pts
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center border-t border-gray-100 pt-2">No prediction made</p>
        )}
      </div>
    )
  }

  // ── Editable form ──────────────────────────────────────────────────────────
  const ukChannel = getUKBroadcast(match.homeTeam.code, match.awayTeam.code)
  const sliderIndex = result === null ? -1 : RESULT_OPTIONS.findIndex(o => o.value === result)

  // Only slide when moving between two already-selected states.
  // On first reveal, appear directly at the chosen position (no left animation).
  const prevResultRef = useRef(result)
  const wasAlreadySelected = prevResultRef.current !== null && result !== null
  useEffect(() => { prevResultRef.current = result }, [result])

  return (
    <div className="relative space-y-2">

      {/* Teams + kickoff */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex flex-col items-start gap-1">
          <TeamBadge code={match.homeTeam.code} name={match.homeTeam.name} size="md" smSize="lg" bold nameClassName="max-w-[120px] sm:max-w-none truncate" />
          {findOwner(match.homeTeam.code) && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600/10 text-brand-700">
              {findOwner(match.homeTeam.code)}
            </span>
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none text-center">
          <span className="text-xs text-gray-500">{formatKickoffDate(match.kickoff)}</span>
          <span className="text-xs text-gray-500">
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

      {/* Result picker — green pill slides to selection */}
      <div
        className={`relative flex h-10 items-center bg-gray-100 rounded-xl transition-opacity duration-200 ${
          scoreEnabled ? 'opacity-40 hover:opacity-100' : 'opacity-100'
        }`}
      >
        <div
          className={`absolute inset-y-1 rounded-lg bg-brand-600 pointer-events-none ease-out ${
            wasAlreadySelected ? 'transition-all duration-200' : 'transition-opacity duration-150'
          }`}
          style={{
            width: 'calc(33.333% - 8px)',
            left: sliderIndex >= 0 ? `calc(${sliderIndex} * 33.333% + 4px)` : '4px',
            opacity: sliderIndex >= 0 ? 1 : 0,
          }}
        />
        {RESULT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleResultChange(opt.value)}
            className={`relative z-10 flex-1 h-full px-2 text-xs font-semibold text-center rounded-xl transition-colors duration-150 truncate ${
              result === opt.value ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-brand-600/20'
            }`}
          >
            {opt.label(match)}
          </button>
        ))}
      </div>

      {/* Score row */}
      {!scoreEnabled ? (
        <button
          onClick={() => {
            setScoreEnabled(true)
            setHomeScoreInput('')
            setAwayScoreInput('')
            if (!result) setResult('draw')
          }}
          className="w-full h-10 flex items-center justify-center bg-gray-100 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors duration-150"
        >
          Predict exact score
        </button>
      ) : (
        <div className="flex h-10 items-center justify-center gap-4 bg-gray-100 rounded-xl">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            value={homeScoreInput} placeholder="0"
            onChange={e => handleScoreInputChange('home', e.target.value)}
            onBlur={handleScoreBlur}
            className="w-12 text-center text-lg font-bold bg-white border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-gray-400 font-medium">–</span>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            value={awayScoreInput} placeholder="0"
            onChange={e => handleScoreInputChange('away', e.target.value)}
            onBlur={handleScoreBlur}
            className="w-12 text-center text-lg font-bold bg-white border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {saveStatus === 'error' && <p className="text-xs text-red-500 text-center">Failed to save — please try again</p>}
    </div>
  )
}
