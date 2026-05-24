import { useState, useRef, useEffect, type FormEvent } from "react";
import { brand } from "@/config/brand";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

type Step = "credentials" | "2fa";

interface ApiError extends Error {
  statusCode?: number;
}

function loginErrorMessage(err: unknown): string {
  const e = err as ApiError;
  if (e?.statusCode === 429) {
    return "Too many sign-in attempts. Please wait a minute and try again.";
  }
  if (e?.statusCode === 403) {
    return "Your account is disabled. Contact platform support for help.";
  }
  if (e?.statusCode === 401) {
    return "Invalid email or password. Please try again.";
  }
  if (typeof e?.statusCode !== "number") {
    return "We couldn't reach the sign-in service. Check your connection and try again.";
  }
  return e?.message || "Could not sign in. Please try again.";
}

export function AdminLoginPage() {
  const { actor, login, verify2FA } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [tempToken, setTempToken] = useState("");
  const [twoFACode, setTwoFACode] = useState("");

  const errorRef = useRef<HTMLDivElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const twoFARef = useRef<HTMLInputElement | null>(null);

  // Move focus to the error banner so users (sighted + AT) notice the failure
  // — they otherwise look like the page just "refreshed".
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      errorRef.current.focus();
    }
  }, [error]);

  // If already logged in as admin, redirect
  if (actor?.type === "admin") {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setError(null);

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
      const result = await login(trimmedEmail, password);
      if (result.requires2FA) {
        setTempToken(result.challenge.tempToken);
        setStep("2fa");
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      setError(loginErrorMessage(err));
      setPassword("");
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handle2FA(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setError(null);
    if (!twoFACode.trim()) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    try {
      await verify2FA(tempToken, twoFACode.trim());
      navigate("/");
    } catch (err: unknown) {
      const e = err as ApiError;
      if (e?.statusCode === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
      } else {
        setError(e?.message || "Invalid 2FA code. Try again or use a backup code.");
      }
      setTwoFACode("");
      twoFARef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <aside
        className="relative hidden w-[480px] shrink-0 flex-col overflow-hidden bg-primary text-primary-foreground lg:flex"
        aria-hidden="true"
      >
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 size-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex h-14 items-center gap-2.5 px-10">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <Store className="size-4" aria-hidden />
          </div>
          <span className="text-sm font-semibold">{brand.shortName}</span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-10 pb-20">
          <AdminConsoleIllustration />

          <p className="mt-9 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary-foreground/60">
            <span className="h-px w-6 bg-primary-foreground/40" />
            Platform admin
          </p>
          <h2 className="mt-3 text-[28px] font-medium leading-[1.1]">
            Run the workshop from{" "}
            <span className="italic">one console.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
            Vendors, orders, customers, KYC, payouts, content, and the
            full audit trail. Tailored for {brand.name}.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {[
              { stat: "29+", label: "Modules" },
              { stat: "RBAC", label: "Per action" },
              { stat: "Audit", label: "Every change" },
              { stat: "2FA", label: "Optional" },
            ].map(({ stat, label }) => (
              <li
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
              >
                <p className="text-base font-semibold tabular-nums">{stat}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">
                  {label}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand */}
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store className="size-4" aria-hidden />
            </div>
            <span className="text-sm font-semibold tracking-tight">{brand.shortName}</span>
          </div>

          {step === "credentials" ? (
            <>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                Admin
              </p>
              <h1
                className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
                style={{ fontFamily: "var(--font-display, ui-serif), serif" }}
              >
                Sign in to the{" "}
                <span className="italic text-primary">console.</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Manage {brand.name} — vendors, orders, payouts, and the audit
                trail behind every change.
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
                    className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="admin@himalayan-crafts.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error}
                    required
                    className="h-11 rounded-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      to="/admin/forgot-password"
                      className="text-xs font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      ref={passwordRef}
                      id="password"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!error}
                      required
                      className="h-11 rounded-full pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={showPw ? "Hide password" : "Show password"}
                      aria-pressed={showPw}
                    >
                      {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
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
                Industry-standard encryption · sessions audit-logged.
              </p>

              <div className="mt-8 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Or
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Link
                to="/login"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Sign in as a vendor
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setStep("credentials"); setError(null); setTwoFACode(""); }}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Back
              </button>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                Two-factor
              </p>
              <h1
                className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
                style={{ fontFamily: "var(--font-display, ui-serif), serif" }}
              >
                Verify your{" "}
                <span className="italic text-primary">device.</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Enter the 6-digit code from your authenticator app, or a backup code.
              </p>

              <form
                onSubmit={handle2FA}
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
                    className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="2fa-code" className="text-sm font-medium">
                    Authentication code
                  </Label>
                  <Input
                    ref={twoFARef}
                    id="2fa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    aria-invalid={!!error}
                    required
                    autoFocus
                    className="h-11 rounded-full text-center tracking-[0.5em] tabular-nums"
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
                      Verify
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Illustration ──────────────────────────────────────────────────────────
//
// Editorial admin-console illustration: a stylised dashboard panel layered
// over an artisan workbench with a singing bowl and a Buddha-statue
// silhouette — tinted for the dark primary panel.

function AdminConsoleIllustration() {
  return (
    <svg
      viewBox="0 0 280 180"
      role="img"
      aria-label="Admin console illustration"
      className="h-44 w-auto text-white/85"
    >
      <defs>
        <linearGradient id="adm-halo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.2" />
          <stop offset="100%" stopColor="white" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="adm-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="adm-bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* Glow */}
      <ellipse cx="140" cy="100" rx="128" ry="64" fill="url(#adm-halo)" />

      {/* Workbench (back layer) */}
      <g transform="translate(36 116)">
        <rect width="208" height="34" rx="3" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.22" />
        {/* Wood grain */}
        <g stroke="white" strokeOpacity="0.18" strokeWidth="0.8">
          <line x1="6" y1="10" x2="202" y2="10" />
          <line x1="6" y1="18" x2="202" y2="18" />
          <line x1="6" y1="26" x2="202" y2="26" />
        </g>
        {/* Bench legs */}
        <rect x="10" y="34" width="6" height="14" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="192" y="34" width="6" height="14" rx="1" fill="white" fillOpacity="0.5" />
      </g>

      {/* Buddha statue silhouette (left, behind the card) */}
      <g transform="translate(60 44)" fill="white" fillOpacity="0.22" stroke="white" strokeOpacity="0.42" strokeWidth="1">
        {/* Lotus base */}
        <path d="M-14 70 Q0 60 14 70 L14 72 L-14 72 Z" />
        {/* Body / robe */}
        <path d="M-12 70 Q-16 46 -8 34 Q-10 24 0 22 Q10 24 8 34 Q16 46 12 70 Z" />
        {/* Head */}
        <ellipse cx="0" cy="14" rx="7" ry="8" />
        {/* Ushnisha (top knot) */}
        <ellipse cx="0" cy="5" rx="3" ry="3" />
        {/* Halo */}
        <circle cx="0" cy="14" r="13" fill="none" strokeOpacity="0.32" />
      </g>

      {/* Singing bowl with mallet (right of statue, under the card edge) */}
      <g transform="translate(110 108)">
        {/* Bowl */}
        <path
          d="M-22 0 Q-22 16 0 18 Q22 16 22 0 Z"
          fill="url(#adm-bowl)"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="1.1"
        />
        {/* Rim highlight */}
        <ellipse cx="0" cy="0" rx="22" ry="3" fill="white" fillOpacity="0.55" />
        <ellipse cx="0" cy="0" rx="16" ry="1.6" fill="white" fillOpacity="0.85" />
        {/* Mallet */}
        <g transform="translate(20 -10) rotate(28)">
          <rect x="0" y="-1" width="22" height="2" rx="1" fill="white" fillOpacity="0.8" />
          <circle cx="24" cy="0" r="3.4" fill="white" fillOpacity="0.95" />
        </g>
      </g>

      {/* Console card (front) */}
      <g transform="translate(150 64)">
        <rect
          width="116"
          height="92"
          rx="6"
          fill="url(#adm-card)"
          stroke="white"
          strokeOpacity="0.3"
        />
        {/* Title bar */}
        <rect x="10" y="10" width="42" height="6" rx="1" fill="white" fillOpacity="0.55" />
        <rect x="10" y="20" width="60" height="3" rx="1" fill="white" fillOpacity="0.32" />

        {/* KPI tiles */}
        <g transform="translate(10 32)">
          <rect width="46" height="22" rx="3" fill="white" fillOpacity="0.12" />
          <rect x="6" y="5" width="22" height="3" rx="1" fill="white" fillOpacity="0.55" />
          <rect x="6" y="12" width="14" height="5" rx="1" fill="white" fillOpacity="0.85" />
        </g>
        <g transform="translate(60 32)">
          <rect width="46" height="22" rx="3" fill="white" fillOpacity="0.12" />
          <rect x="6" y="5" width="22" height="3" rx="1" fill="white" fillOpacity="0.55" />
          <rect x="6" y="12" width="22" height="5" rx="1" fill="white" fillOpacity="0.85" />
        </g>

        {/* Spark line */}
        <g transform="translate(10 60)">
          <polyline
            points="0,18 12,12 24,16 36,8 48,11 60,4 72,9 84,2 96,6"
            fill="none"
            stroke="white"
            strokeOpacity="0.85"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Baseline */}
          <line x1="0" y1="22" x2="96" y2="22" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
        </g>
      </g>

      {/* Floating shield (security accent) */}
      <g transform="translate(36 30)">
        <circle r="14" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.45" strokeWidth="1.4" />
        <path
          d="M-6 -2 L0 -7 L6 -2 V3 a6 6 0 0 1 -6 5 a6 6 0 0 1 -6 -5 Z"
          fill="white"
          fillOpacity="0.85"
        />
        <path
          d="M-3 1 L-1 3 L3 -2"
          fill="none"
          stroke="#3a4d3a"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Sparkles */}
      <g fill="white" fillOpacity="0.6">
        <circle cx="20" cy="120" r="2" />
        <circle cx="260" cy="40" r="1.6" />
        <circle cx="262" cy="146" r="2.2" />
      </g>
    </svg>
  );
}
