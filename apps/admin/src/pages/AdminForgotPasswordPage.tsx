import { useState, type FormEvent } from "react";
import { brand } from "@/config/brand";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
    setLoading(true);
    try {
      await apiFetch("/auth/admin/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
      });
      setSent(true);
    } catch {
      // Always show success to avoid email enumeration.
      setSent(true);
    } finally {
      setLoading(false);
    }
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
              Reset your password
            </p>
            <p className="text-sm leading-relaxed text-white/50">
              Enter your email address and we'll send you a link to reset your password.
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

          <Link
            to="/admin/login"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </Link>

          {sent ? (
            <div className="space-y-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="size-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                If an account with that email exists, we've sent a password reset link. Check your inbox and spam folder.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and we'll send you a reset link.
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
                  <Label htmlFor="email">Email address</Label>
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
                    autoFocus
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending…
                    </span>
                  ) : (
                    "Send reset link"
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
