import { useState, type FormEvent } from "react";
import { brand } from "@/config/brand";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ShieldCheck, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export function AdminResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/admin/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e?.statusCode === 400 || e?.statusCode === 401) {
        setError(
          "This reset link is invalid or has expired. Please request a new one."
        );
      } else if (typeof e?.statusCode !== "number") {
        setError(
          "We couldn't reach the server. Check your connection and try again."
        );
      } else {
        setError(e?.message || "Failed to reset password.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-[360px] space-y-4 text-center">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <h1 className="text-xl font-bold">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/admin/forgot-password">
            <Button variant="outline" className="mt-2">Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="relative hidden w-[460px] shrink-0 flex-col overflow-hidden bg-primary text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,white 39px,white 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,white 39px,white 40px)",
          }}
        />
        <div className="relative flex h-14 items-center gap-2.5 px-8">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm">
            <Store className="size-4 text-slate-950" />
          </div>
          <span className="text-sm font-semibold">{brand.shortName}</span>
        </div>
        <div className="relative flex flex-1 flex-col justify-center px-10 pb-20">
          <div className="space-y-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <p className="text-[22px] font-medium leading-relaxed text-white/90">
              Set a new password
            </p>
            <p className="text-sm leading-relaxed text-white/50">
              Choose a strong password with at least 8 characters.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[360px] space-y-7">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" />
            </div>
            <span className="text-sm font-semibold">{brand.shortName}</span>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="size-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Password reset</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <Button className="w-full" onClick={() => navigate("/admin/login")}>
                Go to sign in
              </Button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your new password below.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate
                method="post"
                action="#"
              >
                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!error}
                      required
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPw ? "Hide password" : "Show password"}
                      aria-pressed={showPw}
                    >
                      {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={!!error}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Resetting…
                    </span>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
