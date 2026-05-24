"use client";

import { CheckCircle2,Eye, EyeOff, KeyRound,Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import * as React from "react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { passwordStrength, validatePassword } from "@/lib/validation";

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordPageInner />
    </React.Suspense>
  );
}

function ResetPasswordPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const strength = React.useMemo(() => passwordStrength(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
      await apiFetch("/auth/customer/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/customer/login");
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This reset link is invalid or has expired. Please request a new one."
      );
    } finally {
      setLoading(false);
    }
  }

  // No token present — show error state
  if (!token) {
    return (
      <main className="min-h-[calc(100vh-8rem)] grid lg:-mb-20 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-12 lg:order-2 lg:px-12">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-8 inline-flex">
              <BrandMark />
            </Link>

            <h1 className="text-2xl font-bold tracking-tight mb-1">
              Invalid reset link
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              This password reset link is missing or invalid. Please request a
              new one.
            </p>

            <Button asChild className="rounded-xl h-11 text-sm font-semibold">
              <Link href="/customer/forgot-password">Request new link</Link>
            </Button>
          </div>
        </div>

        {/* ── Left: Visual panel (desktop only) ──────────────────────── */}
        <div className="relative hidden overflow-hidden bg-cream lg:order-1 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 size-56 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="relative max-w-sm text-center text-cream-foreground">
            <div className="mb-6 inline-flex rounded-2xl bg-primary/15 p-5">
              <KeyRound className="size-8 text-primary" aria-hidden />
            </div>
            <h2
              className="mb-3 text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Set a new password.
            </h2>
            <p className="text-sm leading-relaxed text-cream-foreground/75">
              Choose a strong password to keep your account secure.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] grid lg:-mb-20 lg:grid-cols-2">
      {/* ── Right: Form ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-6 py-12 lg:order-2 lg:px-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <Link href="/" className="mb-8 inline-flex">
            <BrandMark />
          </Link>

          {success ? (
            <div className="space-y-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                <CheckCircle2 className="size-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                Password reset successful
              </h1>
              <p className="text-sm text-muted-foreground">
                Your password has been updated. You&apos;ll be redirected to the
                sign in page shortly.
              </p>
              <Link
                href="/customer/login"
                className="inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline mt-4"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                Set a new password
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Enter your new password below. It must be at least 8 characters
                long.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium">
                    New password
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
                      className="rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div aria-live="polite" className="mt-1 space-y-1">
                      <div className="flex gap-1" aria-hidden>
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < strength.score
                                ? strength.score <= 1
                                  ? "bg-destructive"
                                  : strength.score === 2
                                  ? "bg-amber-500"
                                  : strength.score === 3
                                  ? "bg-lime-500"
                                  : "bg-emerald-500"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Strength: <span className="font-medium">{strength.label}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm new password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl h-11 text-sm font-semibold"
                  disabled={loading}
                >
                  {loading && <Loader2 className="animate-spin size-4" />}
                  {loading ? "Resetting password..." : "Reset password"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/customer/login"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Left: Visual panel (desktop only) ───────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-cream lg:order-1 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 size-56 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative max-w-sm text-center text-cream-foreground">
          <div className="mb-6 inline-flex rounded-2xl bg-primary/15 p-5">
            <KeyRound className="size-8 text-primary" aria-hidden />
          </div>
          <h2
            className="mb-3 text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Set a new password.
          </h2>
          <p className="text-sm leading-relaxed text-cream-foreground/75">
            Choose a strong password to keep your account secure.
          </p>
        </div>
      </div>
    </main>
  );
}
