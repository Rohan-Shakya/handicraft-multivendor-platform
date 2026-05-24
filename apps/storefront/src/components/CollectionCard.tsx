import type { Collection } from "@repo/types";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type CollectionCardProps = {
  collection: Collection & {
    productCount?: number;
    image?: { url: string; altText?: string | null } | null;
  };
};

function themedFallback(handle: string, w: number, h: number): string {
  const tags = encodeURIComponent(handle.replace(/-/g, ","));
  return `https://loremflickr.com/${w}/${h}/${tags}?lock=${handle.length * 7}`;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const imageUrl =
    collection.image?.url ?? themedFallback(collection.handle, 900, 1100);
  const alt =
    collection.image?.altText ??
    `${collection.title} collection cover image`;
  const count = collection.productCount;
  const ariaLabel =
    count != null
      ? `View the ${collection.title} collection — ${count} ${
          count === 1 ? "item" : "items"
        }`
      : `View the ${collection.title} collection`;

  return (
    <Link
      href={`/collections/${collection.handle}`}
      aria-label={ariaLabel}
      className="group relative block overflow-hidden rounded-3xl bg-muted ring-1 ring-border/50 transition-shadow duration-300 hover:ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[4/5]">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent transition-opacity duration-300 group-hover:from-foreground/80"
        />

        {count != null && (
          <span
            aria-hidden
            className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm backdrop-blur-sm"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {count} {count === 1 ? "item" : "items"}
          </span>
        )}

        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
          <div className="min-w-0 text-background">
            <h3
              className="truncate text-xl font-medium tracking-tight sm:text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {collection.title}
            </h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-background/85 transition-colors group-hover:text-background">
              Shop the edit
              <span
                aria-hidden
                className="block h-px w-5 bg-background/60 transition-all duration-300 group-hover:w-7 group-hover:bg-background"
              />
            </p>
          </div>
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-foreground shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
