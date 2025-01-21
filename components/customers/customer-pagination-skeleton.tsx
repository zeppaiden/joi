export function CustomerPaginationSkeleton() {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-[70px] animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-[100px] animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
} 