"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { useDebounce } from "@/hooks/useDebounce";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  passwordStrength,
  validateEmail,
  validatePassword,
} from "@/lib/validation";

const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

const PERKS = [
  "List unlimited products with no monthly fee",
  "Reach engaged shoppers from day one",
  "Full storefront analytics + payouts dashboard",
  "Dedicated seller support team",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface VendorRegisterResponse {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; email: string };
  vendor: { id: string; name: string; slug: string; status: string };
}

export default function VendorRegisterPage() {
  // Form state
  const [storeName, setStoreName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [bio, setBio] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);

  // UX state
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{
    name: string;
    slug: string;
  } | null>(null);

  // Slug availability check (debounced)
  const debouncedSlug = useDebounce(slug, 350);
  const [slugStatus, setSlugStatus] = React.useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  React.useEffect(() => {
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (!SLUG_PATTERN.test(slug) || slug.length < 2) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
  }, [slug]);

  React.useEffect(() => {
    let cancelled = false;
    if (!debouncedSlug || !SLUG_PATTERN.test(debouncedSlug)) return;

    apiFetch(`/storefront/vendors/${debouncedSlug}`)
      .then(() => {
        if (!cancelled) setSlugStatus("taken");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { statusCode?: number };
        if (e?.statusCode === 404) setSlugStatus("available");
        else setSlugStatus("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSlug]);

  // Auto-generate slug as user types store name (until they edit slug)
  React.useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(storeName));
  }, [storeName, slugTouched]);

  const strength = React.useMemo(() => passwordStrength(password), [password]);

  function validate(): string | null {
    if (!storeName.trim() || storeName.trim().length < 2)
      return "Please enter your store name.";
    if (!SLUG_PATTERN.test(slug))
      return "Store handle must be lowercase letters, numbers, and dashes only.";
    if (slug.length < 2) return "Store handle is too short.";
    if (slugStatus === "taken")
      return "That store handle is already taken — try another.";
    const emailErr = validateEmail(email);
    if (emailErr) return emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) return pwErr;
    if (!acceptedTerms) return "Please accept the seller terms to continue.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<VendorRegisterResponse>(
        "/auth/vendor/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: storeName.trim(),
            slug,
            email: email.trim().toLowerCase(),
            password,
            bio: bio.trim() || undefined,
          }),
        }
      );
      // Persist the access token so the new vendor is signed in to the API.
      // Vendor portal lives in the admin app — we direct them there next.
      if (typeof window !== "undefined" && result.accessToken) {
        setToken(result.accessToken);
      }
      setSuccess({ name: result.vendor.name, slug: result.vendor.slug });
    } catch (err) {
      const e = err as { statusCode?: number; message?: string };
      if (e?.statusCode === 409) {
        setError(
          e.message?.toLowerCase().includes("slug")
            ? "That store handle is already taken — try another."
            : "An account with that email already exists. Try signing in instead."
        );
      } else if (e?.statusCode === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(e?.message ?? "Could not create your store. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <SuccessView vendor={success} />;
  }

  return (
    <main className="grid min-h-[calc(100vh-8rem)] lg:-mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Left: Visual / value panel ───────────────────────────────── */}
      <aside
        className="relative hidden overflow-hidden bg-cream lg:order-1 lg:flex lg:items-center lg:justify-center lg:px-16"
        aria-hidden="true"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            color: "var(--cream-foreground)",
          }}
        />
        <div className="relative max-w-md">
          <BrandMark />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-cream-foreground/60">
            Become a vendor
          </p>
          <h2
            className="mt-3 text-4xl font-bold tracking-tight text-cream-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Open your store on {brand.shortName}.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-cream-foreground/75">
            Join independent makers reaching shoppers who care about the story
            behind the products they buy.
          </p>
          <ul className="mt-8 space-y-3">
            {PERKS.map((perk) => (
              <li
                key={perk}
                className="flex items-start gap-3 text-sm text-cream-foreground/85"
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-cream-foreground/10 text-cream-foreground">
                  <CheckCircle2 className="size-3.5" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Right: Form ──────────────────────────────────────────────── */}
      <section className="flex items-center justify-center px-4 py-12 sm:px-6 lg:order-2 lg:px-12">
        <div className="w-full max-w-md">
          <Link
            href="/sell"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" aria-hidden />
            Back to sell on {brand.shortName}
          </Link>

          <h1
            className="mt-3 text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Apply to become a vendor
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us about your store. This takes about two minutes.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {/* Store name */}
            <div>
              <label
                htmlFor="storeName"
                className="mb-1.5 block text-sm font-medium"
              >
                Store name <span className="text-destructive">*</span>
              </label>
              <Input
                id="storeName"
                name="storeName"
                type="text"
                autoComplete="organization"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Acme Atelier"
                required
                disabled={submitting}
                className="h-11 rounded-full"
                aria-required
              />
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="slug"
                className="mb-1.5 block text-sm font-medium"
              >
                Store handle <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  aria-hidden
                >
                  yourstore.com/
                </span>
                <Input
                  id="slug"
                  name="slug"
                  type="text"
                  autoComplete="off"
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugTouched(true);
                  }}
                  required
                  disabled={submitting}
                  className="h-11 rounded-full pl-[6.5rem] pr-11"
                  aria-required
                  aria-describedby="slug-status"
                  pattern="[a-z0-9-]+"
                />
                <span
                  id="slug-status"
                  aria-live="polite"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {slugStatus === "checking" && (
                    <Loader2
                      className="size-4 animate-spin text-muted-foreground"
                      aria-label="Checking availability"
                    />
                  )}
                  {slugStatus === "available" && (
                    <CheckCircle2
                      className="size-4 text-emerald-600"
                      aria-label="Available"
                    />
                  )}
                  {(slugStatus === "taken" || slugStatus === "invalid") && (
                    <span
                      className="grid size-4 place-items-center rounded-full bg-destructive/10 text-[10px] font-bold text-destructive"
                      aria-label={
                        slugStatus === "taken" ? "Taken" : "Invalid"
                      }
                    >
                      !
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {slugStatus === "taken" ? (
                  <span className="text-destructive">
                    That handle is already taken — try another.
                  </span>
                ) : slugStatus === "invalid" ? (
                  <span className="text-destructive">
                    Use lowercase letters, numbers, and dashes only.
                  </span>
                ) : slugStatus === "available" ? (
                  <span className="text-emerald-600">
                    Available — your store will live at /{slug}.
                  </span>
                ) : (
                  <>Lowercase letters, numbers and dashes. Used in your store URL.</>
                )}
              </p>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Account email <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={submitting}
                className="h-11 rounded-full"
                aria-required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium"
              >
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  disabled={submitting}
                  minLength={8}
                  className="h-11 rounded-full pr-11"
                  aria-required
                  aria-describedby="password-strength"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              {password && (
                <div id="password-strength" className="mt-2">
                  <div
                    className="flex gap-1"
                    role="progressbar"
                    aria-valuenow={strength.score}
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-label={`Password strength: ${strength.label}`}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i < strength.score
                            ? strength.score >= 3
                              ? "bg-emerald-500"
                              : strength.score >= 2
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {strength.label}
                    {strength.reasons[0] ? ` — ${strength.reasons[0]}` : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Bio (optional) */}
            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">
                Short bio{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A sentence or two about your craft and what makes your store unique."
                rows={3}
                maxLength={500}
                disabled={submitting}
                className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {bio.length}/500
              </p>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-required
              />
              <span className="text-muted-foreground">
                I agree to the{" "}
                <Link
                  href="/pages/seller-terms"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  seller terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/pages/privacy"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  privacy policy
                </Link>
                .
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || slugStatus === "taken"}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Creating your store…
                </>
              ) : (
                <>
                  Create my store
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              We never share your data. You can delete your store at any time.
            </p>

            <p className="text-center text-sm text-muted-foreground">
              Already have a vendor account?{" "}
              <a
                href={`${ADMIN_URL}/login`}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Sign in
              </a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

/* ── Success step ────────────────────────────────────────────────────────── */

function SuccessView({ vendor }: { vendor: { name: string; slug: string } }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="mb-6 grid size-16 place-items-center rounded-full bg-emerald-50">
        <CheckCircle2
          className="size-9 text-emerald-600"
          aria-hidden
          strokeWidth={1.6}
        />
      </div>
      <h1
        className="text-3xl font-bold tracking-tight sm:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        You&rsquo;re in, {vendor.name}!
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Your application is in review. We&rsquo;ll email you within 1–3
        business days. In the meantime, head to your dashboard to set up your
        storefront, upload a logo &amp; banner, and add your first products.
      </p>

      <ol className="mt-10 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
        {[
          {
            icon: Store,
            title: "Brand your storefront",
            desc: "Logo, banner and a short story.",
          },
          {
            icon: Sparkles,
            title: "Add your first products",
            desc: "Bulk import or one-by-one.",
          },
          {
            icon: ShieldCheck,
            title: "Get verified",
            desc: "Submit tax info to start payouts.",
          },
        ].map(({ icon: Icon, title, desc }, i) => (
          <li
            key={title}
            className="rounded-2xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                aria-hidden
              >
                {i + 1}
              </span>
              <Icon
                className="size-4 text-muted-foreground"
                aria-hidden
              />
            </div>
            <h2 className="mt-3 text-sm font-bold">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          href={`${ADMIN_URL}/login`}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Go to vendor dashboard
          <ArrowRight className="size-4" aria-hidden />
        </a>
        <Link
          href={`/${vendor.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Preview my store page
        </Link>
      </div>
    </main>
  );
}
