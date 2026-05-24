import { useState, useRef, useEffect, type FormEvent } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Store,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorMembership {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorStatus: string;
  memberRole: string;
  memberStatus: string;
}

type Step = "credentials" | "select-vendor" | "2fa";

export function VendorLoginPage() {
  const { actor, vendorLogin, verify2FA, fetchVendorMemberships } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<VendorMembership[]>([]);
  const [loggingInVendorId, setLoggingInVendorId] = useState<string | null>(null);

  // 2FA state
  const [tempToken, setTempToken] = useState("");
  const [twoFACode, setTwoFACode] = useState("");

  const errorRef = useRef<HTMLDivElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const twoFARef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      errorRef.current.focus();
    }
  }, [error]);

  // If already logged in as vendor, redirect
  if (actor?.type === "vendor") {
    return <Navigate to="/vendor" replace />;
  }

  function loginErrorMessage(err: unknown, fallback: string): string {
    const e = err as { statusCode?: number; message?: string };
    if (e?.statusCode === 429) {
      return "Too many sign-in attempts. Please wait a minute and try again.";
    }
    if (e?.statusCode === 403) {
      return "Your account is disabled. Contact platform support.";
    }
    if (e?.statusCode === 401) {
      return "Invalid email or password. Please try again.";
    }
    if (typeof e?.statusCode !== "number") {
      return "We couldn't reach the sign-in service. Check your connection and try again.";
    }
    return e?.message || fallback;
  }

  async function handleCredentials(e: FormEvent<HTMLFormElement>) {
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
      const list = await fetchVendorMemberships(trimmedEmail, password);
      if (list.length === 0) {
        setError("No active vendor memberships found for this account.");
        setPassword("");
        passwordRef.current?.focus();
        return;
      }
      if (list.length === 1) {
        // Only one vendor — skip selection, log in directly
        const result = await vendorLogin(trimmedEmail, password, list[0]!.vendorId);
        if (result.requires2FA) {
          setTempToken(result.challenge.tempToken);
          setStep("2fa");
          return;
        }
        navigate("/vendor");
        return;
      }
      // Multiple vendors — show selection
      setMemberships(list);
      setStep("select-vendor");
    } catch (err: unknown) {
      setError(loginErrorMessage(err, "Invalid email or password."));
      setPassword("");
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectVendor(vendorId: string) {
    setError(null);
    setLoggingInVendorId(vendorId);
    try {
      const result = await vendorLogin(email.trim(), password, vendorId);
      if (result.requires2FA) {
        setTempToken(result.challenge.tempToken);
        setStep("2fa");
        return;
      }
      navigate("/vendor");
    } catch (err: unknown) {
      setError(loginErrorMessage(err, "Could not sign you in to that vendor."));
    } finally {
      setLoggingInVendorId(null);
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
      navigate("/vendor");
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
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
        className="relative hidden w-[480px] shrink-0 flex-col overflow-hidden bg-primary lg:flex"
        aria-hidden="true"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            color: "white",
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 size-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex h-14 items-center gap-2.5 px-10">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm">
            <Store className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-white">Vendor Portal</span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-10 pb-20">
          <LoomIllustration />

          <p className="mt-9 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
            <span className="h-px w-6 bg-white/40" />
            For artisans &amp; workshops
          </p>
          <h2 className="mt-3 text-[28px] font-medium leading-[1.1] text-white">
            Your workshop. Your{" "}
            <span className="italic">marketplace.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Inventory, custom commissions, fulfilment and payouts from your
            Kathmandu studio. Track reviews, restock materials, and grow with the
            platform.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {[
              { stat: "NPR + USD", label: "Pricing" },
              { stat: "Daily", label: "Payouts" },
              { stat: "60+", label: "Markets" },
              { stat: "Audit", label: "Tracked" },
            ].map(({ stat, label }) => (
              <li
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
              >
                <p className="text-base font-semibold tabular-nums text-white/95">
                  {stat}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/55">
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
            <span className="text-sm font-semibold tracking-tight">Vendor Portal</span>
          </div>

          {step === "credentials" ? (
            <>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                Vendor
              </p>
              <h1
                className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
                style={{ fontFamily: "var(--font-display, ui-serif), serif" }}
              >
                Back to the{" "}
                <span className="italic text-primary">workshop.</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Sign in to manage your atelier on {brand.name} — products,
                inventory, orders, fulfilment, and payouts.
              </p>

              <form
                onSubmit={handleCredentials}
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
                    placeholder="vendor@himalayan-crafts.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error}
                    required
                    className="h-11 rounded-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
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
                      Continue
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3" aria-hidden />
                Industry-standard encryption · sessions audit-logged.
              </p>
            </>
          ) : step === "select-vendor" ? (
            <>
              <button
                type="button"
                onClick={() => { setStep("credentials"); setError(null); }}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Back
              </button>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                <span aria-hidden className="h-px w-6 bg-primary/60" />
                Choose store
              </p>
              <h1
                className="mt-2 text-3xl font-medium leading-[1.1] tracking-[-0.015em] sm:text-4xl"
                style={{ fontFamily: "var(--font-display, ui-serif), serif" }}
              >
                Pick your{" "}
                <span className="italic text-primary">atelier.</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                You have access to multiple stores. Choose one to continue.
              </p>

              {error && (
                <div
                  ref={errorRef}
                  role="alert"
                  aria-live="assertive"
                  tabIndex={-1}
                  className="mt-6 flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <ul className="mt-6 space-y-2">
                {memberships.map((m) => (
                  <li key={m.vendorId}>
                    <button
                      type="button"
                      onClick={() => handleSelectVendor(m.vendorId)}
                      disabled={loggingInVendorId !== null}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
                        loggingInVendorId === m.vendorId && "border-primary bg-muted/50"
                      )}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                        {m.vendorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{m.vendorName}</p>
                        <p className="text-xs text-muted-foreground">
                          /{m.vendorSlug} · {m.memberRole.replace(/_/g, " ")}
                        </p>
                      </div>
                      {loggingInVendorId === m.vendorId ? (
                        <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
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

          <div className="mt-8 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Link
            to="/admin/login"
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign in as platform admin
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Illustration ──────────────────────────────────────────────────────────
//
// An artisan workbench with a bronze Buddha statue mid-cast, a singing bowl
// and a chisel — the Himalayan Crafts equivalent of a "workshop in motion".
// Tinted for the dark vendor panel.

function LoomIllustration() {
  return (
    <svg
      viewBox="0 0 280 180"
      role="img"
      aria-label="An artisan workbench"
      className="h-44 w-auto text-white/85"
    >
      <defs>
        <linearGradient id="bench-halo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.2" />
          <stop offset="100%" stopColor="white" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="bench-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="bowl-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* Glow */}
      <ellipse cx="140" cy="100" rx="128" ry="64" fill="url(#bench-halo)" />

      {/* Workbench */}
      <g transform="translate(28 118)">
        <rect width="224" height="20" rx="2" fill="url(#bench-top)" stroke="white" strokeOpacity="0.32" />
        <g stroke="white" strokeOpacity="0.22" strokeWidth="0.8">
          <line x1="4" y1="6" x2="220" y2="6" />
          <line x1="4" y1="12" x2="220" y2="12" />
        </g>
        {/* Legs */}
        <rect x="6" y="20" width="6" height="22" rx="1" fill="white" fillOpacity="0.55" />
        <rect x="212" y="20" width="6" height="22" rx="1" fill="white" fillOpacity="0.55" />
        {/* Floor shadow */}
        <ellipse cx="112" cy="44" rx="100" ry="3" fill="white" fillOpacity="0.08" />
      </g>

      {/* Buddha statue (center) */}
      <g transform="translate(140 118)">
        {/* Lotus base */}
        <path d="M-22 0 Q-22 -6 -16 -8 Q-8 -10 0 -10 Q8 -10 16 -8 Q22 -6 22 0 Z" fill="white" fillOpacity="0.3" stroke="white" strokeOpacity="0.55" />
        <path d="M-16 -8 Q-12 -12 -8 -10 M0 -12 Q4 -12 0 -10 M16 -8 Q12 -12 8 -10" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.9" />
        {/* Robe / body */}
        <path d="M-14 -10 Q-18 -42 -8 -56 Q-10 -68 0 -70 Q10 -68 8 -56 Q18 -42 14 -10 Z" fill="white" fillOpacity="0.22" stroke="white" strokeOpacity="0.55" strokeWidth="1.1" />
        {/* Folded hands */}
        <ellipse cx="0" cy="-28" rx="9" ry="3" fill="white" fillOpacity="0.4" />
        {/* Head */}
        <ellipse cx="0" cy="-78" rx="8" ry="9" fill="white" fillOpacity="0.32" stroke="white" strokeOpacity="0.6" strokeWidth="1.1" />
        {/* Ushnisha */}
        <ellipse cx="0" cy="-89" rx="3.4" ry="3.4" fill="white" fillOpacity="0.55" />
        {/* Halo */}
        <circle cx="0" cy="-78" r="15" fill="none" stroke="white" strokeOpacity="0.32" strokeWidth="1" />
        <circle cx="0" cy="-78" r="20" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="0.8" />
      </g>

      {/* Singing bowl (left of statue) */}
      <g transform="translate(70 110)">
        <path
          d="M-20 0 Q-20 14 0 16 Q20 14 20 0 Z"
          fill="url(#bowl-fill)"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="1.1"
        />
        <ellipse cx="0" cy="0" rx="20" ry="3" fill="white" fillOpacity="0.55" />
        <ellipse cx="0" cy="0" rx="14" ry="1.4" fill="white" fillOpacity="0.85" />
      </g>

      {/* Chisel & hammer (right of statue) */}
      <g transform="translate(210 100)">
        {/* Chisel */}
        <g transform="rotate(-18)">
          <rect x="-2" y="-18" width="4" height="22" rx="1" fill="white" fillOpacity="0.85" />
          <path d="M-3 4 L3 4 L0 9 Z" fill="white" fillOpacity="0.95" />
        </g>
        {/* Hammer */}
        <g transform="translate(14 -2) rotate(22)">
          <rect x="-1" y="-2" width="24" height="3" rx="1" fill="white" fillOpacity="0.7" />
          <rect x="-8" y="-6" width="10" height="11" rx="1.5" fill="white" fillOpacity="0.95" />
        </g>
      </g>

      {/* Sparkles */}
      <g fill="white" fillOpacity="0.6">
        <circle cx="248" cy="44" r="2" />
        <circle cx="20" cy="50" r="1.6" />
        <circle cx="258" cy="148" r="2.2" />
      </g>
    </svg>
  );
}
