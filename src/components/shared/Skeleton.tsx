/** Base shimmer block — use to compose component-shaped skeletons. */
export function Bone({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-lg ${className}`} />
}

// ── Home page ─────────────────────────────────────────────────────────────────

export function LatestMatchSkeleton() {
  return (
    <div className="card p-5 space-y-4 min-h-[130px]">
      <div className="flex justify-between items-center">
        <Bone className="h-4 w-24" />
        <Bone className="h-3 w-20" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Bone className="w-10 h-10 rounded-full" />
          <Bone className="h-4 w-24" />
        </div>
        <Bone className="h-12 w-24 rounded-xl" />
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Bone className="h-4 w-24" />
          <Bone className="w-10 h-10 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bone className="w-10 h-10 rounded-full" />
          <Bone className="h-5 w-28" />
        </div>
        <Bone className="h-3 w-12" />
        <div className="flex items-center gap-2 justify-end">
          <Bone className="h-5 w-28" />
          <Bone className="w-10 h-10 rounded-full" />
        </div>
      </div>
      <Bone className="h-10 w-full rounded-xl" />
      <Bone className="h-10 w-full rounded-xl" />
    </div>
  )
}

// Only skeletonises the match list — the tabs and link above are static chrome
// that the parent always renders, so they must not appear in this skeleton.
export function HomeMatchSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map(i => <MatchCardSkeleton key={i} />)}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function PrizeBreakdownSkeleton() {
  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Bone className="h-4 w-24" />
          <Bone className="h-3 w-36" />
        </div>
        <Bone className="h-10 w-20 rounded-xl" />
      </div>
      <div className="border-t border-gray-100 pt-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between items-center">
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex justify-between items-center">
            <Bone className="h-3 w-28" />
            <Bone className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LeaderboardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <Bone className="h-4 w-40 mb-1" />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Bone className="h-3 w-4 rounded" />
          <Bone className="h-3 flex-1" />
          <Bone className="h-3 w-10" />
        </div>
      ))}
    </div>
  )
}

// ── Predictions page ──────────────────────────────────────────────────────────

export function PredictionsPageSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <MatchCardSkeleton key={i} />)}
    </div>
  )
}

// ── Results page ──────────────────────────────────────────────────────────────

function ResultCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex justify-between">
        <Bone className="h-3 w-24" />
        <Bone className="h-3 w-28" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <Bone className="w-7 h-7 rounded-full" />
          <Bone className="h-4 w-20" />
        </div>
        <Bone className="h-10 w-20 rounded-xl" />
        <div className="flex-1 flex items-center gap-2 justify-end">
          <Bone className="h-4 w-20" />
          <Bone className="w-7 h-7 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function ResultsPageSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => <ResultCardSkeleton key={i} />)}
    </div>
  )
}

// ── Participants page ─────────────────────────────────────────────────────────

export function ParticipantsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="card p-4 flex flex-col items-center gap-3">
          <Bone className="w-28 h-28 rounded-full" />
          <Bone className="h-4 w-24" />
          <Bone className="h-5 w-16 rounded-full" />
          <div className="flex gap-1">
            <Bone className="w-5 h-5 rounded-full" />
            <Bone className="w-5 h-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tournament page ───────────────────────────────────────────────────────────

function GroupTableSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="bg-gray-50 px-3 py-2.5 border-b border-gray-100">
        <Bone className="h-3 w-16" />
      </div>
      <div className="p-2 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <Bone className="w-4 h-3 rounded" />
            <Bone className="w-9 h-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Bone className="h-3 w-24" />
              <Bone className="h-2.5 w-16" />
            </div>
            <Bone className="h-3 w-4" />
            <Bone className="h-3 w-4" />
            <Bone className="h-3 w-4" />
            <Bone className="h-3 w-4" />
            <Bone className="h-3 w-5" />
            <Bone className="h-3 w-5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GroupGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <GroupTableSkeleton key={i} />)}
    </div>
  )
}

export function BracketSkeleton() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {[16, 8, 4, 2, 1].map((count, col) => (
        <div key={col} className="flex flex-col gap-2 shrink-0">
          <Bone className="h-3 w-8 mb-1" />
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <div key={i} className="w-44 card overflow-hidden">
              <div className="p-2 space-y-1">
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Admin page ────────────────────────────────────────────────────────────────

export function AdminSkeleton() {
  return (
    <div>
      <Bone className="h-7 w-32 mb-6" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(i => <Bone key={i} className="h-9 w-28 rounded-lg" />)}
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 space-y-1">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-48" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 flex-1 rounded-lg" />
              <Bone className="h-7 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
