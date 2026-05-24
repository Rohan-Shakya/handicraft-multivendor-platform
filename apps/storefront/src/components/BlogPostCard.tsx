import { ArrowUpRight,Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  type BlogPostFull,
  categoryLabel,
  formatPostDate,
  isoDate,
  postExcerpt,
  postImage,
  readingTime,
} from "@/lib/blog";
import { cn } from "@/lib/utils";

interface Props {
  post: BlogPostFull;
  blogHandle: string;
  /** Visual treatment. */
  variant?: "card" | "row" | "feature";
  /** Render image with `priority`. Set on the LCP card only. */
  priority?: boolean;
  className?: string;
}

export function BlogPostCard({
  post,
  blogHandle,
  variant = "card",
  priority,
  className,
}: Props) {
  const href = `/blogs/${blogHandle}/${post.handle}`;
  const excerpt = postExcerpt(post, variant === "feature" ? 240 : 140);
  const minutes = readingTime(post.body);
  const date = formatPostDate(post.publishedAt ?? post.createdAt, "short");
  const alt = post.imageAlt ?? post.title;
  const image = postImage(
    post,
    variant === "feature" ? "hero" : "card"
  );

  if (variant === "feature") {
    return (
      <article
        className={cn(
          "group grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12",
          className
        )}
      >
        <Link
          href={href}
          aria-labelledby={`post-${post.id}-title`}
          className="block overflow-hidden rounded-3xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative aspect-[4/3]">
            <Image
              src={image}
              alt={alt}
              fill
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          </div>
        </Link>
        <div className="flex flex-col justify-center">
          <PostMeta blogHandle={blogHandle} date={date} minutes={minutes} />
          <h2
            id={`post-${post.id}-title`}
            className="mt-4 text-3xl font-medium leading-tight tracking-[-0.01em] sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Link
              href={href}
              className="bg-[linear-gradient(var(--foreground),var(--foreground))] bg-[length:0%_1px] bg-bottom bg-no-repeat transition-[background-size] duration-300 hover:bg-[length:100%_1px]"
            >
              {post.title}
            </Link>
          </h2>
          {excerpt && (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}
          <Link
            href={href}
            className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Read the story
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </article>
    );
  }

  if (variant === "row") {
    return (
      <article
        className={cn(
          "group grid items-center gap-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8",
          className
        )}
      >
        <Link
          href={href}
          aria-labelledby={`post-${post.id}-title`}
          className="block overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative aspect-[4/3]">
            <Image
              src={image}
              alt={alt}
              fill
              sizes="(max-width: 640px) 100vw, 200px"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          </div>
        </Link>
        <div>
          <PostMeta blogHandle={blogHandle} date={date} minutes={minutes} />
          <h3
            id={`post-${post.id}-title`}
            className="mt-2 text-xl font-medium leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Link href={href}>{post.title}</Link>
          </h3>
          {excerpt && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group flex h-full flex-col",
        className
      )}
    >
      <Link
        href={href}
        aria-labelledby={`post-${post.id}-title`}
        className="block overflow-hidden rounded-3xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3]">
          <Image
            src={image}
            alt={alt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </div>
      </Link>
      <div className="mt-5 flex flex-1 flex-col">
        <PostMeta blogHandle={blogHandle} date={date} minutes={minutes} />
        <h3
          id={`post-${post.id}-title`}
          className="mt-3 text-xl font-medium leading-snug tracking-tight sm:text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Link
            href={href}
            className="bg-[linear-gradient(var(--foreground),var(--foreground))] bg-[length:0%_1px] bg-bottom bg-no-repeat transition-[background-size] duration-300 hover:bg-[length:100%_1px]"
          >
            {post.title}
          </Link>
        </h3>
        {excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {excerpt}
          </p>
        )}
        <Link
          href={href}
          className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          Read more
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function PostMeta({
  blogHandle,
  date,
  minutes,
}: {
  blogHandle: string;
  date: string | null;
  minutes: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
      <Link
        href={`/blogs/${blogHandle}`}
        className="text-primary transition-colors hover:text-foreground"
      >
        {categoryLabel(blogHandle)}
      </Link>
      <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
      {date && (
        <time dateTime={isoDate(new Date(date))} className="font-medium normal-case tracking-normal">
          {date}
        </time>
      )}
      <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
      <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal">
        <Clock className="size-3" aria-hidden />
        {minutes} min read
      </span>
    </div>
  );
}
