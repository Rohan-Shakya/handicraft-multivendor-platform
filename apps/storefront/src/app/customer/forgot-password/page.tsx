"use client";

import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/customer/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
      });
      setSubmitted(true);
    } catch {
      // Always show success to avoid email enumeration.
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-8rem)] lg:-mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Right: Form ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:order-2 lg:px-16">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 flex w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Home"
          >
            <BrandMark />
          </Link>

          {submitted ? (
            <div role="status" aria-live="polite">
              <span
                aria-hidden
                className="mb-6 inline-flex size-12 items-center justify-center rounded-full bg-primary/15 text-accent-foreground"
              >
                <Mail className="size-5" />
              </span>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                Check your inbox
              </p>
              <h1
                className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Link <span className="italic text-primary">on the way.</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                If an account with{" "}
                <span className="font-medium text-foreground">{email || "that email"}</span>{" "}
                exists, we&rsquo;ve sent a password-reset link. Check your inbox
                and spam folder — the link expires in 30 minutes.
              </p>

              <div className="mt-6 rounded-2xl border bg-muted/40 p-4 text-xs text-muted-foreground">
                Didn&rsquo;t get it? Wait a minute, then{" "}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  try a different email
                </button>
                .
              </div>

              <Link
                href="/customer/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                Reset password
              </p>
              <h1
                className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Forgot your{" "}
                <span className="italic text-primary">password?</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Enter the email tied to your account and we&rsquo;ll send a
                secure link to set a new one.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-4"
                noValidate
                method="post"
                action="#"
              >
                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3" aria-hidden />
                For your security, we never reveal whether an email is registered.
              </p>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link
                  href="/customer/login"
                  className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Left: Visual panel (desktop only) ───────────────────────────── */}
      <aside
        className="relative hidden overflow-hidden bg-cream lg:order-1 lg:flex lg:items-center lg:justify-center lg:px-16"
        aria-hidden="true"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            color: "var(--cream-foreground)",
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 size-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative max-w-md text-cream-foreground">
          <KeyIllustration />
          <p className="mt-8 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
            <span className="h-px w-6 bg-primary/60" />
            Locked out
          </p>
          <h2
            className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            We&rsquo;ll get you back{" "}
            <span className="italic text-primary">in.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-foreground/75">
            One email is all it takes — we&rsquo;ll never share it, sell it, or
            auto-subscribe you to anything.
          </p>
        </div>
      </aside>
    </main>
  );
}

// ─── Illustration ──────────────────────────────────────────────────────────────

function KeyIllustration() {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="A key over an envelope"
      className="h-40 w-auto"
    >
      <defs>
        <linearGradient id="keyHalo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="92" rx="108" ry="58" fill="url(#keyHalo)" />

      {/* Envelope */}
      <g transform="translate(60 50)">
        <rect
          width="120"
          height="76"
          rx="6"
          fill="var(--background)"
          stroke="var(--cream-foreground)"
          strokeOpacity="0.2"
        />
        <path
          d="M0 6 L60 46 L120 6"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M0 76 L46 38"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <path
          d="M120 76 L74 38"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
      </g>

      {/* Key */}
      <g transform="translate(140 32) rotate(28)">
        <circle r="14" fill="var(--background)" stroke="var(--primary)" strokeWidth="2.2" />
        <circle r="6" fill="none" stroke="var(--primary)" strokeWidth="1.8" />
        <rect x="10" y="-2.5" width="34" height="5" rx="1" fill="var(--primary)" />
        <rect x="34" y="2.5" width="6" height="6" fill="var(--primary)" />
        <rect x="26" y="2.5" width="4" height="5" fill="var(--primary)" />
      </g>

      {/* Sparkles */}
      <g fill="var(--primary)" fillOpacity="0.55">
        <circle cx="34" cy="40" r="2" />
        <circle cx="208" cy="120" r="2.5" />
        <circle cx="216" cy="36" r="1.6" />
        <circle cx="26" cy="118" r="1.8" />
      </g>
    </svg>
  );
}
