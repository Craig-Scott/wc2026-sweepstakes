// WC 2026 tournament structure.
// Groups will be filled in after the official draw.
// Team codes follow FIFA 3-letter country codes.

export const WC2026_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const
export type WC2026Group = typeof WC2026_GROUPS[number]

// Full list of 48 WC 2026 qualified teams.
// Fill in 'group' values after the official FIFA draw.
export const WC2026_TEAMS: { code: string; name: string; group: string }[] = [
  // CONMEBOL
  { code: 'ARG', name: 'Argentina',   group: 'TBD' },
  { code: 'BRA', name: 'Brazil',      group: 'TBD' },
  { code: 'COL', name: 'Colombia',    group: 'TBD' },
  { code: 'ECU', name: 'Ecuador',     group: 'TBD' },
  { code: 'URU', name: 'Uruguay',     group: 'TBD' },
  { code: 'VEN', name: 'Venezuela',   group: 'TBD' },
  // CONCACAF
  { code: 'USA', name: 'USA',         group: 'TBD' },
  { code: 'MEX', name: 'Mexico',      group: 'TBD' },
  { code: 'CAN', name: 'Canada',      group: 'TBD' },
  { code: 'PAN', name: 'Panama',      group: 'TBD' },
  { code: 'JAM', name: 'Jamaica',     group: 'TBD' },
  { code: 'HON', name: 'Honduras',    group: 'TBD' },
  // UEFA
  { code: 'FRA', name: 'France',      group: 'TBD' },
  { code: 'ENG', name: 'England',     group: 'TBD' },
  { code: 'GER', name: 'Germany',     group: 'TBD' },
  { code: 'ESP', name: 'Spain',       group: 'TBD' },
  { code: 'ITA', name: 'Italy',       group: 'TBD' },
  { code: 'POR', name: 'Portugal',    group: 'TBD' },
  { code: 'NED', name: 'Netherlands', group: 'TBD' },
  { code: 'BEL', name: 'Belgium',     group: 'TBD' },
  { code: 'SUI', name: 'Switzerland', group: 'TBD' },
  { code: 'DEN', name: 'Denmark',     group: 'TBD' },
  { code: 'AUT', name: 'Austria',     group: 'TBD' },
  { code: 'SCO', name: 'Scotland',    group: 'TBD' },
  { code: 'CRO', name: 'Croatia',     group: 'TBD' },
  { code: 'SRB', name: 'Serbia',      group: 'TBD' },
  { code: 'SVN', name: 'Slovenia',    group: 'TBD' },
  { code: 'TUR', name: 'Turkey',      group: 'TBD' },
  { code: 'SVK', name: 'Slovakia',    group: 'TBD' },
  { code: 'HUN', name: 'Hungary',     group: 'TBD' },
  { code: 'UKR', name: 'Ukraine',     group: 'TBD' },
  { code: 'GRE', name: 'Greece',      group: 'TBD' },
  // CAF
  { code: 'MAR', name: 'Morocco',     group: 'TBD' },
  { code: 'SEN', name: 'Senegal',     group: 'TBD' },
  { code: 'EGY', name: 'Egypt',       group: 'TBD' },
  { code: 'CIV', name: 'Ivory Coast', group: 'TBD' },
  { code: 'CMR', name: 'Cameroon',    group: 'TBD' },
  { code: 'GHA', name: 'Ghana',       group: 'TBD' },
  { code: 'TUN', name: 'Tunisia',     group: 'TBD' },
  { code: 'MLI', name: 'Mali',        group: 'TBD' },
  { code: 'ZAF', name: 'South Africa',group: 'TBD' },
  // AFC
  { code: 'JPN', name: 'Japan',       group: 'TBD' },
  { code: 'KOR', name: 'South Korea', group: 'TBD' },
  { code: 'IRN', name: 'Iran',        group: 'TBD' },
  { code: 'AUS', name: 'Australia',   group: 'TBD' },
  { code: 'SAU', name: 'Saudi Arabia',group: 'TBD' },
  { code: 'JOR', name: 'Jordan',      group: 'TBD' },
  { code: 'IRQ', name: 'Iraq',        group: 'TBD' },
  // OFC / Playoff
  { code: 'NZL', name: 'New Zealand', group: 'TBD' },
]

export const STAGE_LABELS: Record<string, string> = {
  GROUP:               'Group Stage',
  ROUND_OF_32:         'Round of 32',
  ROUND_OF_16:         'Round of 16',
  QUARTER_FINAL:       'Quarter-Finals',
  SEMI_FINAL:          'Semi-Finals',
  THIRD_PLACE_PLAYOFF: '3rd Place Playoff',
  FINAL:               'Final',
}

export const STAGE_ORDER: string[] = [
  'GROUP',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE_PLAYOFF',
  'FINAL',
]
