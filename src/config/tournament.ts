// WC 2026 tournament structure.
// Groups will be filled in after the official draw.
// Team codes follow FIFA 3-letter country codes.

export const WC2026_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const
export type WC2026Group = typeof WC2026_GROUPS[number]

// Full list of 48 WC 2026 qualified teams with official draw groups.
export const WC2026_TEAMS: { code: string; name: string; group: string }[] = [
  // Group A
  { code: 'MEX', name: 'Mexico',             group: 'A' },
  { code: 'CZE', name: 'Czechia',            group: 'A' },
  { code: 'RSA', name: 'South Africa',       group: 'A' },
  { code: 'KOR', name: 'South Korea',        group: 'A' },
  // Group B
  { code: 'CAN', name: 'Canada',             group: 'B' },
  { code: 'BIH', name: 'Bosnia & Herz.',     group: 'B' },
  { code: 'QAT', name: 'Qatar',              group: 'B' },
  { code: 'SUI', name: 'Switzerland',        group: 'B' },
  // Group C
  { code: 'BRA', name: 'Brazil',             group: 'C' },
  { code: 'HAI', name: 'Haiti',              group: 'C' },
  { code: 'MAR', name: 'Morocco',            group: 'C' },
  { code: 'SCO', name: 'Scotland',           group: 'C' },
  // Group D
  { code: 'USA', name: 'USA',                group: 'D' },
  { code: 'AUS', name: 'Australia',          group: 'D' },
  { code: 'PAR', name: 'Paraguay',           group: 'D' },
  { code: 'TUR', name: 'Türkiye',            group: 'D' },
  // Group E
  { code: 'GER', name: 'Germany',            group: 'E' },
  { code: 'ECU', name: 'Ecuador',            group: 'E' },
  { code: 'CUW', name: 'Curaçao',            group: 'E' },
  { code: 'CIV', name: 'Ivory Coast',        group: 'E' },
  // Group F
  { code: 'NED', name: 'Netherlands',        group: 'F' },
  { code: 'JPN', name: 'Japan',              group: 'F' },
  { code: 'SWE', name: 'Sweden',             group: 'F' },
  { code: 'TUN', name: 'Tunisia',            group: 'F' },
  // Group G
  { code: 'BEL', name: 'Belgium',            group: 'G' },
  { code: 'EGY', name: 'Egypt',              group: 'G' },
  { code: 'IRN', name: 'Iran',               group: 'G' },
  { code: 'NZL', name: 'New Zealand',        group: 'G' },
  // Group H
  { code: 'ESP', name: 'Spain',              group: 'H' },
  { code: 'URU', name: 'Uruguay',            group: 'H' },
  { code: 'KSA', name: 'Saudi Arabia',       group: 'H' },
  { code: 'CPV', name: 'Cape Verde',         group: 'H' },
  // Group I
  { code: 'FRA', name: 'France',             group: 'I' },
  { code: 'SEN', name: 'Senegal',            group: 'I' },
  { code: 'NOR', name: 'Norway',             group: 'I' },
  { code: 'IRQ', name: 'Iraq',               group: 'I' },
  // Group J
  { code: 'ARG', name: 'Argentina',          group: 'J' },
  { code: 'AUT', name: 'Austria',            group: 'J' },
  { code: 'ALG', name: 'Algeria',            group: 'J' },
  { code: 'JOR', name: 'Jordan',             group: 'J' },
  // Group K
  { code: 'POR', name: 'Portugal',           group: 'K' },
  { code: 'COL', name: 'Colombia',           group: 'K' },
  { code: 'COD', name: 'DR Congo',           group: 'K' },
  { code: 'UZB', name: 'Uzbekistan',         group: 'K' },
  // Group L
  { code: 'ENG', name: 'England',            group: 'L' },
  { code: 'CRO', name: 'Croatia',            group: 'L' },
  { code: 'PAN', name: 'Panama',             group: 'L' },
  { code: 'GHA', name: 'Ghana',              group: 'L' },
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
