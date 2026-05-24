"use client";

import { Check, Copy, Facebook, Linkedin, Twitter } from "lucide-react";
import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  /** Absolute URL for share targets. Falls back to current URL on click. */
  url?: string;
  className?: string;
  layout?: "horizontal" | "vertical";
}

export function BlogShareBar({ title, url, className, layout = "horizontal" }: Props) {
  const [copied, setCopied] = React.useState(false);

  function getUrl(): string {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      toast({ title: "Link copied", description: "Share away." });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Long-press the URL bar instead.",
        variant: "destructive",
      });
    }
  }

  const targets = [
    {
      label: "Share on X",
      icon: Twitter,
      href: () =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          title
        )}&url=${encodeURIComponent(getUrl())}`,
    },
    {
      label: "Share on Facebook",
      icon: Facebook,
      href: () =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          getUrl()
        )}`,
    },
    {
      label: "Share on LinkedIn",
      icon: Linkedin,
      href: () =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          getUrl()
        )}`,
    },
  ] as const;

  return (
    <div
      role="group"
      aria-label="Share this post"
      className={cn(
        "flex items-center gap-2",
        layout === "vertical" && "flex-col",
        className
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
          layout === "vertical" && "[writing-mode:vertical-rl] [transform:rotate(180deg)]"
        )}
      >
        Share
      </span>
      {targets.map(({ label, icon: Icon, href }) => (
        <a
          key={label}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const w = window.open(
              href(),
              "share",
              "noopener,noreferrer,width=640,height=540"
            );
            if (w) w.opener = null;
          }}
          aria-label={label}
          title={label}
          className="grid size-10 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Icon className="size-4" aria-hidden />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? "Link copied" : "Copy link"}
        title={copied ? "Copied" : "Copy link"}
        className={cn(
          "grid size-10 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground",
          copied && "border-primary bg-primary text-primary-foreground"
        )}
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
