"use client";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  passwordStrength,
  validateEmail,
  validatePassword,
} from "@/lib/validation";

/** Clamp `next` to our own origin so we don't open-redirect offsite. */
function safeNext(raw: string | null): string {
  if (!raw) return "/customer/account";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/customer/account";
}

const PERKS = [
  "Track every order in one place",
  "Save pieces to your wishlist across devices",
  "Faster checkout with saved addresses",
  "Member-only previews and seasonal edits",
];

export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <RegisterPageInner />
    </React.Suspense>
  );
}

function RegisterPageInner() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const prefilledEmail = searchParams.get("email") ?? "";

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState(prefilledEmail);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const strength = React.useMemo(() => passwordStrength(password), [password]);

  const errorRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      errorRef.current.focus();
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setError(null);

    const trimmedEmail = email.trim();
    const emailErr = validateEmail(trimmedEmail);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: trimmedEmail,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      router.push(nextPath);
    } catch (err: unknown) {
      const ex = err as { statusCode?: number; message?: string };
      if (ex?.statusCode === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (ex?.statusCode === 409) {
        setError(
          "An account with this email already exists. Try signing in instead."
        );
      } else if (typeof ex?.statusCode !== "number") {
        setError(
          "We couldn't reach the sign-up service. Check your connection and try again."
        );
      } else {
        setError(ex?.message ?? "Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-8rem)] lg:-mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Left: Visual panel (desktop only) ──────────────────────────── */}
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
          <SparkRugIllustration />
          <p className="mt-8 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-foreground">
            <span className="h-px w-6 bg-primary/60" />
            Free to join
          </p>
          <h2
            className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Step into{" "}
            <span className="italic text-primary">{brand.shortName}.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-foreground/75">
            Create your account to unlock perks, faster checkout, and a
            personal shortlist that follows you across devices.
          </p>

          <ul className="mt-7 space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-accent-foreground">
                  <Check className="size-3" aria-hidden />
                </span>
                <span className="text-cream-foreground/85">{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

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
            Create account
          </p>
          <h1
            className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Make it{" "}
            <span className="italic text-primary">yours.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Takes under a minute — no payment required to browse.
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 rounded-full"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 rounded-full"
                />
              </div>
            </div>

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

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-full pr-11"
                  aria-describedby={password.length > 0 ? "pwd-strength" : undefined}
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
              {password.length > 0 && (
                <div id="pwd-strength" aria-live="polite" className="mt-1.5 space-y-1.5">
                  <div className="flex gap-1" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i < strength.score
                            ? strength.score <= 1
                              ? "bg-destructive"
                              : strength.score === 2
                              ? "bg-amber-500"
                              : strength.score === 3
                              ? "bg-lime-500"
                              : "bg-emerald-500"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength:{" "}
                    <span className="font-medium text-foreground">
                      {strength.label}
                    </span>
                    {strength.reasons.length > 0 && (
                      <> — try {strength.reasons[0].toLowerCase()}</>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Create account
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              By creating an account, you agree to our{" "}
              <Link
                href="/pages/terms"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/pages/privacy"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3" aria-hidden />
            Your details are encrypted in transit and at rest.
          </p>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/customer/login"
              className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Illustration ──────────────────────────────────────────────────────────────

function SparkRugIllustration() {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="A loom and rug pattern with sparkles"
      className="h-40 w-auto"
    >
      <defs>
        <linearGradient id="rugRegHalo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="92" rx="110" ry="56" fill="url(#rugRegHalo)" />

      {/* Tilted rug */}
      <g transform="translate(120 86) rotate(-6) translate(-72 -50)">
        <rect
          width="144"
          height="100"
          rx="2"
          fill="var(--background)"
          stroke="var(--cream-foreground)"
          strokeOpacity="0.18"
        />
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
        {/* Diamond medallion */}
        <path
          d="M72 26 L102 50 L72 74 L42 50 Z"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeOpacity="0.6"
          strokeWidth="1.4"
        />
        <path
          d="M72 38 L92 50 L72 62 L52 50 Z"
          fill="var(--primary)"
          fillOpacity="0.18"
        />
        <circle cx="72" cy="50" r="4" fill="var(--accent-foreground)" fillOpacity="0.7" />
        {/* Fringes */}
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
      <g fill="var(--primary)" fillOpacity="0.6">
        <path d="M30 30 L32 24 L34 30 L40 32 L34 34 L32 40 L30 34 L24 32 Z" />
        <circle cx="214" cy="124" r="2.5" />
        <circle cx="220" cy="40" r="2" />
        <circle cx="22" cy="120" r="1.8" />
      </g>
    </svg>
  );
}
