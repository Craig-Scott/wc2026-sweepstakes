import type { AppConfig } from '@/types'

// ── Prize configuration ───────────────────────────────────────────────────────
// All percentages MUST sum to 100.
// entryFee is in the same currency as the prize pool display (GBP by default).

export const DEFAULT_CONFIG: AppConfig = {
  entryFee: 10,
  additionalPrize: 0,
  prizes: {
    winner:       30,
    runnerUp:     20,
    thirdPlace:   15,
    dirtiestTeam: 10,
    longestGoal:   8,
    woodenSpoon:   7,
    nostradamus:  10,
  },
  tournamentYear: 2026,
}

// Podium prizes shown first, then special prizes — used for consistent display ordering.
export const PODIUM_PRIZES:  (keyof AppConfig['prizes'])[] = ['winner', 'runnerUp', 'thirdPlace']
export const SPECIAL_PRIZES: (keyof AppConfig['prizes'])[] = ['dirtiestTeam', 'longestGoal', 'woodenSpoon', 'nostradamus']

export const PRIZE_LABELS: Record<keyof AppConfig['prizes'], string> = {
  winner:       '🏆 World Cup Winner',
  runnerUp:     '🥈 Runner Up',
  thirdPlace:   '🥉 Third Place',
  dirtiestTeam: '🟨 Dirtiest Team',
  longestGoal:  '📏 Longest Goal',
  woodenSpoon:  '🥄 Wooden Spoon',
  nostradamus:  '🔮 Nostradamus',
}

export const PRIZE_DESCRIPTIONS: Record<keyof AppConfig['prizes'], string> = {
  winner:       "Participant whose team lifts the trophy",
  runnerUp:     "Participant whose team finishes as runners-up",
  thirdPlace:   "Participant whose team wins the third-place playoff",
  dirtiestTeam: "Most card points (Yellow = 1pt, Red = 3pts)",
  longestGoal:  "Goal scored from the greatest distance",
  woodenSpoon:  "First team statistically eliminated from the tournament",
  nostradamus:  "Most correct match predictions (result 3pts, exact score 6pts)",
}
