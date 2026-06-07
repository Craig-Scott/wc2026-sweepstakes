import type { GroupStanding } from '@/types'
import { TeamBadge } from '@/components/shared/TeamBadge'
import { useParticipants } from '@/hooks/useParticipants'

interface Props {
  standing: GroupStanding
}

export function GroupTable({ standing }: Props) {
  const { participants } = useParticipants()

  return (
    <div className="card overflow-hidden">
      <div className="bg-gray-50 px-3 py-2.5 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Group {standing.group}</h3>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100">
            <th className="px-2 py-1.5 text-left font-medium w-6">#</th>
            <th className="px-2 py-1.5 text-left font-medium">Team</th>
            <th className="px-1 py-1.5 text-center font-medium">P</th>
            <th className="px-1 py-1.5 text-center font-medium">W</th>
            <th className="px-1 py-1.5 text-center font-medium">D</th>
            <th className="px-1 py-1.5 text-center font-medium">L</th>
            <th className="px-1 py-1.5 text-center font-medium">GD</th>
            <th className="px-1 py-1.5 text-center font-medium font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standing.table.map((row, i) => {
            const participant = participants.find(p => p.teamCodes.includes(row.teamCode))
            const qualified = i < 2
            return (
              <tr
                key={row.teamCode}
                className={`border-b border-gray-100 last:border-0 ${
                  qualified ? 'bg-brand-50' : ''
                }`}
              >
                <td className="px-2 py-1.5 text-gray-500">{row.position}</td>
                <td className="px-2 py-2">
                  <div className="flex items-start gap-2">
                    <TeamBadge code={row.teamCode} showName={false} size="ml" />
                    <div className="flex flex-col gap-[3px] min-w-0 justify-center">
                      <span className="text-sm font-medium text-gray-800 truncate leading-tight">{row.teamName}</span>
                      {participant && (
                        <span className="text-xs text-gray-400 leading-tight">{participant.name}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-1 py-1.5 text-center">{row.played}</td>
                <td className="px-1 py-1.5 text-center">{row.won}</td>
                <td className="px-1 py-1.5 text-center">{row.drawn}</td>
                <td className="px-1 py-1.5 text-center">{row.lost}</td>
                <td className={`px-1 py-1.5 text-center ${
                  row.goalDifference > 0 ? 'text-brand-600' : row.goalDifference < 0 ? 'text-red-500' : ''
                }`}>
                  {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                </td>
                <td className="px-1 py-1.5 text-center font-bold">{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
