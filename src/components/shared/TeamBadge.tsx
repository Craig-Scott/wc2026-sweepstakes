import { WC2026_TEAMS } from '@/config/tournament'

type Size = 'sm' | 'md' | 'ml' | 'lg'

interface Props {
  code: string
  name?: string
  size?: Size
  smSize?: Size
  showName?: boolean
  bold?: boolean
  reverse?: boolean
  nameClassName?: string
}

// FIFA 3-letter code → ISO 3166-1 alpha-2 (for flagcdn.com SVGs)
const FIFA_TO_ISO2: Record<string, string> = {
  // CONMEBOL
  ARG: 'ar', BRA: 'br', COL: 'co', ECU: 'ec', URU: 'uy', URY: 'uy',
  VEN: 've', PAR: 'py', BOL: 'bo', CHI: 'cl', PER: 'pe',
  // CONCACAF
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', JAM: 'jm', HON: 'hn',
  HAI: 'ht', CUR: 'cw', CUW: 'cw', CPV: 'cv', TRI: 'tt', CRC: 'cr', GUA: 'gt',
  // UEFA
  FRA: 'fr', ENG: 'gb-eng', GER: 'de', ESP: 'es', ITA: 'it', POR: 'pt',
  NED: 'nl', BEL: 'be', SUI: 'ch', DEN: 'dk', AUT: 'at', SCO: 'gb-sct',
  CRO: 'hr', SRB: 'rs', SVN: 'si', TUR: 'tr', SVK: 'sk', HUN: 'hu',
  UKR: 'ua', GRE: 'gr', NOR: 'no', SWE: 'se', CZE: 'cz', BIH: 'ba',
  POL: 'pl', ROU: 'ro', WAL: 'gb-wls',
  // CAF
  MAR: 'ma', SEN: 'sn', EGY: 'eg', CIV: 'ci', CMR: 'cm', GHA: 'gh',
  TUN: 'tn', MLI: 'ml', ZAF: 'za', RSA: 'za', ALG: 'dz', COD: 'cd',
  NGA: 'ng', CIV2: 'ci',
  // AFC
  JPN: 'jp', KOR: 'kr', IRN: 'ir', AUS: 'au', SAU: 'sa', KSA: 'sa',
  JOR: 'jo', IRQ: 'iq', CHN: 'cn', UZB: 'uz', QAT: 'qa', THA: 'th',
  // OFC
  NZL: 'nz',
}

const sizeClasses:   Record<Size, string> = { sm: 'w-5 h-5',       md: 'w-7 h-7',       ml: 'w-9 h-9',       lg: 'w-10 h-10'      }
const smSizeClasses: Record<Size, string> = { sm: 'sm:w-5 sm:h-5', md: 'sm:w-7 sm:h-7', ml: 'sm:w-9 sm:h-9', lg: 'sm:w-10 sm:h-10' }
const textClasses:   Record<Size, string> = { sm: 'text-xs',        md: 'text-sm',        ml: 'text-base',      lg: 'text-lg'         }
const smTextClasses: Record<Size, string> = { sm: 'sm:text-xs',     md: 'sm:text-sm',     ml: 'sm:text-base',   lg: 'sm:text-lg'      }
const gapClasses:    Record<Size, string> = { sm: 'gap-1.5',        md: 'gap-1.5',        ml: 'gap-3',          lg: 'gap-4'           }
const smGapClasses:  Record<Size, string> = { sm: 'sm:gap-1.5',     md: 'sm:gap-1.5',     ml: 'sm:gap-3',       lg: 'sm:gap-4'        }

export function TeamBadge({ code, name, size = 'md', smSize, showName = true, bold = false, reverse = false, nameClassName }: Props) {
  const teamName = name ?? WC2026_TEAMS.find(t => t.code === code)?.name ?? code
  const iso2 = FIFA_TO_ISO2[code] ?? code.toLowerCase().slice(0, 2)

  const flag = (
    <img
      src={`https://flagcdn.com/${iso2}.svg`}
      alt={teamName}
      className={`${sizeClasses[size]} ${smSize ? smSizeClasses[smSize] : ''} object-cover rounded-full shrink-0 ring-1 ring-gray-200`}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )

  const label = showName && (
    <span className={`${textClasses[size]} ${smSize ? smTextClasses[smSize] : ''} ${bold ? 'font-bold' : ''} ${nameClassName ?? ''}`}>
      {teamName}
    </span>
  )

  return (
    <span className={`inline-flex items-center ${gapClasses[size]} ${smSize ? smGapClasses[smSize] : ''}`}>
      {reverse ? <>{label}{flag}</> : <>{flag}{label}</>}
    </span>
  )
}
