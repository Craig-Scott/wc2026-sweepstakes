/**
 * Reports Firestore read usage, broken down by source.
 *
 * DEFAULT (free): reads the app-maintained `usage/{date}` doc — tallies written
 * by the web app (per collection) and the sync job. Shows where the day's reads
 * went. Counts only reads our own code makes (≈ all of them); excludes e.g.
 * browsing the Firebase console Data tab.
 *
 * MONITORING=true: queries the authoritative Cloud Monitoring API instead — true
 * totals incl. console browsing, but REQUIRES BILLING (Blaze) to be enabled.
 *
 * Usage:
 *   npm run usage                  # today (Pacific), from the usage doc
 *   DATE=2026-06-18 npm run usage  # a specific day
 *   MONITORING=true npm run usage  # authoritative totals (needs billing)
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const SA_PATH = '/Users/craigs/Downloads/wc2026sweep-4a731-firebase-adminsdk-fbsvc-3b4776ea40.json'
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? readFileSync(SA_PATH, 'utf8'))
const projectId: string = sa.project_id

const READ_LIMIT = 50_000 // Spark free-tier daily reads

const pacificDate = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())

const bar = (n: number, max: number, width = 28) => '█'.repeat(Math.max(0, Math.round((n / (max || 1)) * width)))

if (process.env.MONITORING === 'true') {
  await runMonitoring()
} else {
  await runUsageDoc()
}

// ── Default: app-maintained usage doc (free) ───────────────────────────────────
async function runUsageDoc() {
  initializeApp({ credential: cert(sa) })
  const db = getFirestore()
  const date = process.env.DATE ?? pacificDate()

  const snap = await db.collection('usage').doc(date).get()
  console.log(`\n  Firestore reads by source — ${date} (Pacific)`)
  if (!snap.exists) {
    console.log(`\n  No usage recorded for ${date} yet.`)
    console.log(`  (The app/sync write this doc as they run — deploy + some traffic needed first.)\n`)
    return
  }
  const reads = (snap.data()?.reads ?? {}) as Record<string, number>
  const entries = Object.entries(reads).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, n]) => s + n, 0)
  const max = Math.max(1, ...entries.map(([, n]) => n))

  console.log('')
  for (const [src, n] of entries) {
    console.log(`    ${src.padEnd(18)} ${String(n).padStart(7)}  ${bar(n, max)}`)
  }
  const pct = Math.round((total / READ_LIMIT) * 100)
  console.log(`    ${'─'.repeat(18)}`)
  console.log(`    ${'TOTAL'.padEnd(18)} ${String(total).padStart(7)} / ${READ_LIMIT.toLocaleString()}  (${pct}%)${pct >= 80 ? '  ⚠️' : ''}`)
  console.log(`\n  Note: counts reads from our code only (web app + sync). Excludes console browsing.\n`)
}

// ── Optional: authoritative Cloud Monitoring (needs billing) ───────────────────
async function runMonitoring() {
  const { GoogleAuth } = await import('google-auth-library')
  const end = new Date()
  const start = process.env.HOURS
    ? new Date(end.getTime() - Number(process.env.HOURS) * 3600_000)
    : midnightPacificUTC()

  const auth = new GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/monitoring.read'], projectId })
  const client = await auth.getClient()

  const fetchMetric = async (metric: string) => {
    const params = new URLSearchParams({
      'filter': `metric.type="firestore.googleapis.com/document/${metric}"`,
      'interval.startTime': start.toISOString(),
      'interval.endTime': end.toISOString(),
      'aggregation.alignmentPeriod': '3600s',
      'aggregation.perSeriesAligner': 'ALIGN_SUM',
      'aggregation.crossSeriesReducer': 'REDUCE_SUM',
    })
    const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`
    const res = await client.request<{ timeSeries?: { points?: { interval: { startTime: string }; value: { int64Value?: string } }[] }[] }>({ url })
    const byHour = new Map<string, number>()
    let total = 0
    for (const series of res.data.timeSeries ?? []) {
      for (const pt of series.points ?? []) {
        const v = Number(pt.value.int64Value ?? 0)
        total += v
        const hour = pt.interval.startTime.slice(0, 13) + ':00'
        byHour.set(hour, (byHour.get(hour) ?? 0) + v)
      }
    }
    return { total, byHour }
  }

  console.log(`\n  Firestore usage (Cloud Monitoring) — ${projectId}`)
  console.log(`  ${start.toISOString()} → ${end.toISOString()}\n`)
  try {
    const [r, w, d] = await Promise.all([fetchMetric('read_count'), fetchMetric('write_count'), fetchMetric('delete_count')])
    const line = (label: string, total: number, limit: number) =>
      console.log(`  ${label.padEnd(8)} ${total.toLocaleString().padStart(8)} / ${limit.toLocaleString().padStart(7)}  (${Math.round(total / limit * 100)}%)`)
    line('reads', r.total, 50_000)
    line('writes', w.total, 20_000)
    line('deletes', d.total, 20_000)
    const hours = [...r.byHour.keys()].sort()
    if (hours.length) {
      const max = Math.max(...r.byHour.values())
      console.log(`\n  Reads by hour (UTC):`)
      for (const h of hours) console.log(`    ${h}Z  ${String(r.byHour.get(h)!).padStart(6)}  ${bar(r.byHour.get(h)!, max)}`)
    }
    console.log('')
  } catch (e) {
    console.error(`\n  ✗ Cloud Monitoring failed: ${(e as { message?: string }).message ?? e}`)
    console.error(`  (This path needs billing/Blaze enabled. Use the default mode — drop MONITORING=true — for the free usage doc.)\n`)
    process.exit(1)
  }
}

function midnightPacificUTC(): Date {
  const now = new Date()
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(now).map(x => [x.type, x.value]),
  ) as Record<string, string>
  const wallAsUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  const offsetMs = wallAsUTC - now.getTime()
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0) - offsetMs)
}
