import { TeamBadge } from './TeamBadge'

interface Props {
  name: string
  teamCodes: string[]
  size?: 'sm' | 'md'
}

export function ParticipantBadge({ name, teamCodes, size = 'md' }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={size === 'sm' ? 'text-xs font-medium' : 'text-sm font-medium'}>
        {name}
      </span>
      {teamCodes.map(code => (
        <TeamBadge key={code} code={code} size="sm" showName={false} />
      ))}
    </span>
  )
}
