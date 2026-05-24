import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-8xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-56 rounded skeleton-shimmer" />
      <div className="mb-6 h-10 w-64 rounded skeleton-shimmer" />
      <div className="flex gap-8">
        <div className="hidden w-64 shrink-0 lg:block" aria-hidden>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-full rounded skeleton-shimmer" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-4 w-32 rounded skeleton-shimmer" />
            <div className="h-8 w-40 rounded-full skeleton-shimmer" />
          </div>
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </main>
  );
}
