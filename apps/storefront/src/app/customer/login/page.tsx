"use client";

import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";

/** Clamp `next` to same-origin so we don't open-redirect offsite. */
function safeNext(raw: string | null): string {
  if (!raw) return "/customer/account";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/customer/account";
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageInner />
    </React.Suspense>
  );
}

function LoginPageInner() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const errorRef = React.useRef<HTMLDivElement | null>(null);
  const passwordRef = React.useRef<HTMLInputElement | null>(null);

  // Move focus to the error banner so screen readers + sighted users
  // both notice the failure without thinking the page "refreshed".
  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      errorRef.current.focus();
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Belt-and-braces: prevent default on both the synthetic and native
    // event so nothing can trigger a full-page navigation.
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setError(null);

    // Lightweight client-side guards before hitting the API.
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      router.push(nextPath);
    } catch (err: unknown) {
      const ex = err as { statusCode?: number; message?: string };
      if (ex?.statusCode === 429) {
        setError(
          "Too many sign-in attempts. Please wait a minute and try again."
        );
      } else if (ex?.statusCode === 403) {
        setError(
          "Your account is disabled. Please contact support for help."
        );
      } else if (ex?.statusCode === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (typeof ex?.statusCode !== "number") {
        // Network error — most common cause of an apparent "refresh".
        setError(
          "We couldn't reach the sign-in service. Check your connection and try again."
        );
      } else {
        setError(ex?.message ?? "Invalid email or password.");
      }
      // Clear the password (security best practice on failed sign-in)
      // and return focus to the password field for a quick retry.
      setPassword("");
      passwordRef.current?.focus();
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
            aria-label={`${brand.shortName} home`}
          >
            <BrandMark />
          </Link>

          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
            <span aria-hidden className="h-px w-6 bg-primary/60" />
            Sign in
          </p>
          <h1
            className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome <span className="italic text-primary">back.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sign in to access your account, orders, and saved pieces.
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
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive"
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
                inputMode="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                className="h-11 rounded-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/customer/forgot-password"
                  className="text-xs font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  className="h-11 rounded-full pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
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
                  Sign in
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>
          </form>

          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3" aria-hidden />
            Secured with industry-standard encryption.
          </p>

          <div className="mt-8 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              New here
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Link
            href={`/customer/register${
              nextPath !== "/customer/account"
                ? `?next=${encodeURIComponent(nextPath)}`
                : ""
            }`}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Create an account
          </Link>
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
        <div className="pointer-events-none absolute -bottom-16 -right-16 size-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative max-w-md text-cream-foreground">
          <RugIllustration />
          <p className="mt-8 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
            <span className="h-px w-6 bg-primary/60" />
            Hand-made, not algorithm-picked
          </p>
          <h2
            className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pick up where you{" "}
            <span className="italic text-primary">left off.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-foreground/75">
            Your saved pieces, recent orders and addresses are waiting.
          </p>

          <ul className="mt-8 grid grid-cols-3 gap-3">
            {[
              { stat: "500+", label: "Vendors" },
              { stat: "10k+", label: brand.productNounPlural },
              { stat: "30-day", label: "Returns" },
            ].map(({ stat, label }) => (
              <li
                key={label}
                className="rounded-2xl border border-cream-foreground/10 bg-background/55 p-3 backdrop-blur-sm"
              >
                <p
                  className="text-base font-medium tabular text-cream-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-cream-foreground/60">
                  {label}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}

// ─── Illustration ──────────────────────────────────────────────────────────────

function RugIllustration() {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="A hand-cast Himalayan sculpture motif"
      className="h-40 w-auto"
    >
      <defs>
        <linearGradient id="rugHalo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="92" rx="110" ry="58" fill="url(#rugHalo)" />

      {/* Rug rectangle */}
      <g transform="translate(48 30)">
        <rect
          width="144"
          height="100"
          rx="2"
          fill="var(--background)"
          stroke="var(--cream-foreground)"
          strokeOpacity="0.18"
        />
        {/* Outer border */}
        <rect
          x="6"
          y="6"
          width="132"
          height="88"
          rx="1"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeOpacity="0.5"
          strokeWidth="1.2"
        />
        {/* Inner border (dashed) */}
        <rect
          x="14"
          y="14"
          width="116"
          height="72"
          rx="1"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.4"
          strokeDasharray="3 3"
        />
        {/* Medallion */}
        <ellipse
          cx="72"
          cy="50"
          rx="34"
          ry="22"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeOpacity="0.6"
          strokeWidth="1.4"
        />
        <ellipse
          cx="72"
          cy="50"
          rx="22"
          ry="14"
          fill="var(--primary)"
          fillOpacity="0.18"
        />
        <ellipse
          cx="72"
          cy="50"
          rx="10"
          ry="6"
          fill="var(--accent-foreground)"
          fillOpacity="0.55"
        />
        {/* Corner ornaments */}
        {[
          [22, 22],
          [122, 22],
          [22, 78],
          [122, 78],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="3" fill="var(--primary)" fillOpacity="0.35" />
            <circle cx={cx} cy={cy} r="1.4" fill="var(--accent-foreground)" fillOpacity="0.7" />
          </g>
        ))}
        {/* Top + bottom fringes */}
        <g
          stroke="var(--cream-foreground)"
          strokeOpacity="0.42"
          strokeWidth="1"
          strokeLinecap="round"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`t-${i}`} x1={6 + i * 8} y1="0" x2={6 + i * 8} y2="-5" />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`b-${i}`} x1={6 + i * 8} y1="100" x2={6 + i * 8} y2="105" />
          ))}
        </g>
      </g>

      {/* Sparkles */}
      <g fill="var(--primary)" fillOpacity="0.55">
        <circle cx="30" cy="34" r="2" />
        <circle cx="214" cy="124" r="2.5" />
        <circle cx="216" cy="34" r="1.6" />
        <circle cx="22" cy="120" r="1.8" />
      </g>
    </svg>
  );
}
