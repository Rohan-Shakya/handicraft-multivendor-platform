export default function Loading() {
  return (
    <main className="mx-auto max-w-8xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mb-4 h-3 w-40 rounded skeleton-shimmer" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,1fr)]">
        <div className="flex gap-3">
          <div className="hidden flex-col gap-2 lg:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="size-16 rounded-lg skeleton-shimmer" />
            ))}
          </div>
          <div className="aspect-square flex-1 rounded-2xl skeleton-shimmer" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-3 w-24 rounded skeleton-shimmer" />
          <div className="h-9 w-3/4 rounded skeleton-shimmer" />
          <div className="h-5 w-24 rounded skeleton-shimmer" />
          <div className="h-8 w-32 rounded skeleton-shimmer" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-10 rounded skeleton-shimmer" />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-32 rounded-xl skeleton-shimmer" />
            <div className="h-11 flex-1 rounded-xl skeleton-shimmer" />
          </div>
          <div className="h-28 rounded-xl skeleton-shimmer" />
        </div>
      </div>
    </main>
  );
}
