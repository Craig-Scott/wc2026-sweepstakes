import { useState, useEffect, useRef } from 'react'
import type { GoalScorer, Card } from '@/types'

interface ESPNLiveData {
  home: number
  away: number
  minute: number | null
  status: string
  scorers: GoalScorer[]
  cards: Card[]
}

export function useESPNLiveScore(espnEventId: string | null | undefined): ESPNLiveData | null {
  const [data, setData] = useState<ESPNLiveData | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!espnEventId) return

    async function fetchData() {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnEventId}`
        )
        if (!res.ok) return
        const json = await res.json() as Record<string, unknown>

        const comp = (json?.header as Record<string, unknown>)?.competitions as Record<string, unknown>[] | undefined
        const header = comp?.[0]
        if (!header) return

        const competitors = (header.competitors as Array<Record<string, unknown>>) ?? []
        const homeComp = competitors.find(c => c.homeAway === 'home')
        const awayComp = competitors.find(c => c.homeAway === 'away')
        if (!homeComp || !awayComp) return

        const statusType = ((header.status as Record<string, unknown>)?.type as Record<string, unknown>)?.name as string ?? ''
        const clockValue = (header.status as Record<string, unknown>)?.clock as number ?? 0
        const minute = clockValue > 0 ? Math.round(clockValue / 60) : null

        const keyEvents = (json.keyEvents as Record<string, unknown>[]) ?? []

        const bsTeams = ((json.boxscore as Record<string, unknown>)?.teams as Record<string, unknown>[] | undefined) ?? []
        const teamAbbr = new Map<string, string>()
        for (const t of bsTeams) {
          const info = t.team as Record<string, unknown>
          if (info?.displayName && info?.abbreviation) {
            teamAbbr.set(info.displayName as string, info.abbreviation as string)
          }
        }
        const resolveTeam = (displayName: string) => teamAbbr.get(displayName) ?? displayName

        const scorers: GoalScorer[] = keyEvents
          .filter(e => e.scoringPlay === true)
          .map(e => {
            const type = (e.type as Record<string, unknown>)?.type as string
            const min = Math.round(((e.clock as Record<string, unknown>)?.value as number ?? 0) / 60)
            const displayName = (e.team as Record<string, unknown>)?.displayName as string ?? ''
            const participants = (e.participants as Record<string, unknown>[]) ?? []
            const player = (participants[0]?.athlete as Record<string, unknown>)?.displayName as string ?? 'Unknown'
            return {
              player,
              team: resolveTeam(displayName),
              minute: min,
              distanceMeters: null,
              isOwnGoal: type === 'own-goal',
              isPenalty: type === 'penalty-goal' || type === 'penalty',
            }
          })

        const cards: Card[] = keyEvents
          .filter(e => ['yellow-card', 'red-card', 'yellow-red-card'].includes(
            (e.type as Record<string, unknown>)?.type as string
          ))
          .map(e => {
            const type = (e.type as Record<string, unknown>)?.type as string
            const min = Math.round(((e.clock as Record<string, unknown>)?.value as number ?? 0) / 60)
            const displayName = (e.team as Record<string, unknown>)?.displayName as string ?? ''
            const participants = (e.participants as Record<string, unknown>[]) ?? []
            const player = (participants[0]?.athlete as Record<string, unknown>)?.displayName as string ?? 'Unknown'
            return {
              player,
              team: resolveTeam(displayName),
              minute: min,
              type: type === 'red-card' ? 'RED' : type === 'yellow-red-card' ? 'YELLOW_RED' : 'YELLOW',
            }
          })

        setData({
          home: parseInt(homeComp.score as string, 10) || 0,
          away: parseInt(awayComp.score as string, 10) || 0,
          minute,
          status: statusType,
          scorers,
          cards,
        })
      } catch {
        // non-fatal — keep showing Firestore data
      }
    }

    fetchData()
    intervalRef.current = setInterval(fetchData, 30_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [espnEventId])

  return data
}
