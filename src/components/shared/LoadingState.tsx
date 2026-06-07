interface Props {
  message?: string
}

export function LoadingState({ message = 'Loading…' }: Props) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-50 rounded-xl h-24 w-full" />
  )
}
