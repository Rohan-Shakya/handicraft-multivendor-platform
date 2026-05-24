"use client";

import { Check,Facebook, Link2, Linkedin, Mail, Share2, Twitter } from "lucide-react";
import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { track } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

interface Props {
  url?: string;
  title: string;
  className?: string;
  compact?: boolean;
}

/**
 * Inline share buttons. Prefers the native Web Share API on supported devices
 * (mobile) and falls back to the per-network share links on desktop.
 */
export function ShareButtons({ url, title, className, compact }: Props) {
  const [copied, setCopied] = React.useState(false);

  const shareUrl =
    url ?? (typeof window !== "undefined" ? window.location.href : "");
  const enc = encodeURIComponent;

  async function nativeShare() {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> })
          .share({ title, url: shareUrl });
        track("share", { method: "native", content_type: "product", url: shareUrl });
      }
    } catch {
      /* user cancelled */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track("share", { method: "copy_link", content_type: "product", url: shareUrl });
      setTimeout(() => setCopied(false), 1800);
      toast({ title: "Link copied", description: "Paste anywhere to share." });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Copy from the address bar instead.",
        variant: "destructive",
      });
    }
  }

  const networks: Array<{
    name: string;
    icon: React.ReactNode;
    href: string;
  }> = [
    {
      name: "Twitter",
      icon: <Twitter className="size-4" aria-hidden />,
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(title)}`,
    },
    {
      name: "Facebook",
      icon: <Facebook className="size-4" aria-hidden />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="size-4" aria-hidden />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
    },
    {
      name: "Email",
      icon: <Mail className="size-4" aria-hidden />,
      href: `mailto:?subject=${enc(title)}&body=${enc(shareUrl)}`,
    },
  ];

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <button
          type="button"
          onClick={nativeShare}
          aria-label={`Share ${title}`}
          className="inline-flex size-9 items-center justify-center rounded-full border hover:bg-muted"
        >
          <Share2 className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={copyLink}
          aria-label="Copy link"
          className="inline-flex size-9 items-center justify-center rounded-full border hover:bg-muted"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {networks.map((n) => (
        <a
          key={n.name}
          href={n.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${n.name}`}
          onClick={() =>
            track("share", {
              method: n.name.toLowerCase(),
              content_type: "product",
              url: shareUrl,
            })
          }
          className="inline-flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {n.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="inline-flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
