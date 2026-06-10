// UK broadcast channel for each group-stage fixture, keyed by "HOME_CODE|AWAY_CODE".
// Source: Independent article on WC2026 UK TV schedule (BBC/ITV rights split).
const UK_BROADCAST: Record<string, string> = {
  // Group A
  'MEX|RSA': 'ITV',       // Jun 11
  'KOR|CZE': 'ITV',       // Jun 12
  'CZE|RSA': 'BBC One',   // Jun 18
  'MEX|KOR': 'BBC One',   // Jun 19
  'CZE|MEX': 'BBC One',   // Jun 25
  'RSA|KOR': 'BBC Two',   // Jun 25

  // Group B
  'CAN|BIH': 'BBC One',   // Jun 12
  'QAT|SUI': 'ITV',       // Jun 13
  'SUI|BIH': 'ITV',       // Jun 18
  'CAN|QAT': 'ITV',       // Jun 18
  'BIH|QAT': 'ITV4',      // Jun 24
  'SUI|CAN': 'ITV',       // Jun 24

  // Group C
  'BRA|MAR': 'BBC One',   // Jun 13
  'HAI|SCO': 'BBC One',   // Jun 14
  'SCO|MAR': 'ITV',       // Jun 19
  'BRA|HAI': 'ITV',       // Jun 20
  'MAR|HAI': 'BBC Two',   // Jun 24
  'SCO|BRA': 'BBC One',   // Jun 24

  // Group D
  'USA|PAR': 'BBC One',   // Jun 13
  'AUS|TUR': 'ITV',       // Jun 14
  'USA|AUS': 'BBC One',   // Jun 19
  'TUR|PAR': 'ITV',       // Jun 20
  'PAR|AUS': 'ITV4',      // Jun 26
  'TUR|USA': 'ITV',       // Jun 26

  // Group E
  'GER|CUW': 'ITV',       // Jun 14
  'CIV|ECU': 'BBC One',   // Jun 15
  'GER|CIV': 'ITV',       // Jun 20
  'ECU|CUW': 'BBC One',   // Jun 21
  'CUW|CIV': 'BBC Two',   // Jun 25
  'ECU|GER': 'BBC One',   // Jun 25

  // Group F
  'NED|JPN': 'ITV',       // Jun 14
  'SWE|TUN': 'ITV',       // Jun 15
  'NED|SWE': 'BBC One',   // Jun 20
  'TUN|JPN': 'BBC One',   // Jun 21
  'JPN|SWE': 'BBC Two',   // Jun 26
  'TUN|NED': 'BBC One',   // Jun 26

  // Group G
  'BEL|EGY': 'BBC One',   // Jun 15
  'IRN|NZL': 'BBC One',   // Jun 16
  'BEL|IRN': 'ITV',       // Jun 21
  'NZL|EGY': 'ITV',       // Jun 22
  'EGY|IRN': 'BBC Two',   // Jun 27
  'NZL|BEL': 'BBC One',   // Jun 27

  // Group H
  'ESP|CPV': 'ITV',       // Jun 15
  'KSA|URU': 'ITV',       // Jun 15
  'ESP|KSA': 'BBC One',   // Jun 21
  'URU|CPV': 'BBC One',   // Jun 21
  'CPV|KSA': 'ITV4',      // Jun 27
  'URU|ESP': 'ITV',       // Jun 27

  // Group I
  'FRA|SEN': 'BBC One',   // Jun 16
  'IRQ|NOR': 'BBC One',   // Jun 16
  'NOR|SEN': 'ITV',       // Jun 23
  'FRA|IRQ': 'BBC One',   // Jun 22
  'NOR|FRA': 'ITV',       // Jun 26
  'SEN|IRQ': 'ITV4',      // Jun 26

  // Group J
  'ARG|ALG': 'ITV',       // Jun 17
  'AUT|JOR': 'BBC One',   // Jun 17
  'ARG|AUT': 'BBC One',   // Jun 22
  'JOR|ALG': 'ITV',       // Jun 23
  'ALG|AUT': 'BBC Two',   // Jun 28
  'JOR|ARG': 'BBC One',   // Jun 28

  // Group K
  'POR|COD': 'BBC One',   // Jun 17
  'UZB|COL': 'BBC One',   // Jun 18
  'POR|UZB': 'ITV',       // Jun 23
  'COL|COD': 'ITV',       // Jun 24
  'COL|POR': 'BBC One',   // Jun 28
  'COD|UZB': 'BBC Two',   // Jun 28

  // Group L
  'ENG|CRO': 'ITV',       // Jun 17
  'GHA|PAN': 'ITV',       // Jun 18
  'ENG|GHA': 'BBC One',   // Jun 23
  'PAN|CRO': 'BBC One',   // Jun 24
  'CRO|GHA': 'ITV4',      // Jun 27
  'PAN|ENG': 'ITV',       // Jun 27
}

export function getUKBroadcast(homeCode: string, awayCode: string): string | undefined {
  return UK_BROADCAST[`${homeCode}|${awayCode}`]
}
