"use client";

import {
  BellRing,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CustomerShell } from "@/components/CustomerShell";
import { Button } from "@/components/ui/button";
import { prompt as promptDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { brand } from "@/config/brand";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  passwordStrength,
  validateEmail,
  validatePassword,
} from "@/lib/validation";

export default function SettingsPage() {
  const { customer, token, logout } = useAuth();
  const router = useRouter();

  // Profile
  const [firstName, setFirstName] = React.useState(customer?.firstName ?? "");
  const [lastName, setLastName] = React.useState(customer?.lastName ?? "");
  const [email, setEmail] = React.useState(customer?.email ?? "");
  const [phone, setPhone] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);
  const strength = React.useMemo(
    () => passwordStrength(newPassword),
    [newPassword]
  );

  // Preferences
  const [marketingEmails, setMarketingEmails] = React.useState(true);
  const [orderUpdates, setOrderUpdates] = React.useState(true);
  const [productReviews, setProductReviews] = React.useState(true);
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  // Sync local form state to customer once it hydrates from storage.
  React.useEffect(() => {
    if (!customer) return;
    setFirstName(customer.firstName ?? "");
    setLastName(customer.lastName ?? "");
    setEmail(customer.email ?? "");
  }, [customer]);

  // Load preferences + profile
  React.useEffect(() => {
    if (!token) return;
    apiFetch<{
      phone?: string | null;
      preferences?: {
        marketingEmails?: boolean;
        orderUpdates?: boolean;
        productReviews?: boolean;
      };
    }>("/storefront/customer/me")
      .then((data) => {
        if (data.phone) setPhone(data.phone);
        if (data.preferences) {
          setMarketingEmails(data.preferences.marketingEmails ?? true);
          setOrderUpdates(data.preferences.orderUpdates ?? true);
          setProductReviews(data.preferences.productReviews ?? true);
        }
      })
      .catch(() => {});
  }, [token]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      toast({ title: emailErr, variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      await apiFetch("/storefront/customer/me", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: firstName || null,
          lastName: lastName || null,
          email,
          phone: phone || null,
        }),
      });
      toast({
        title: "Profile updated",
        description: "Your changes are saved.",
      });
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not save profile";
      toast({
        title: "Save failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      toast({ title: pwErr, variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/storefront/customer/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast({
        title: "Password updated",
        description: "Use your new password next time you sign in.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not change password";
      toast({
        title: "Password change failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function savePreferences() {
    setSavingPrefs(true);
    try {
      await apiFetch("/storefront/customer/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          preferences: { marketingEmails, orderUpdates, productReviews },
        }),
      });
      toast({ title: "Preferences saved" });
    } catch {
      toast({
        title: "Couldn't save preferences",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  async function deleteAccount() {
    const sure = await promptDialog({
      title: "Delete your account?",
      description: (
        <span>
          This permanently removes your profile, saved addresses and wishlist.
          Order history is retained for tax purposes (Nepal Income Tax Act).{" "}
          <strong className="text-foreground">This cannot be undone.</strong>
        </span>
      ),
      label: 'Type "delete" to confirm',
      placeholder: "delete",
      confirmText: "Delete account",
      variant: "destructive",
      required: true,
      validate: (v) =>
        v.trim().toLowerCase() === "delete"
          ? null
          : 'Please type "delete" exactly to confirm.',
    });
    if (sure === null) {
      // User cancelled. No toast — silent cancellation matches modern UX.
      return;
    }
    try {
      await apiFetch("/storefront/customer/me", { method: "DELETE" });
      toast({
        title: "Account deleted",
        description: "We're sorry to see you go.",
      });
      await logout();
      router.push("/");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Could not delete account";
      toast({
        title: "Deletion failed",
        description: msg,
        variant: "destructive",
      });
    }
  }

  return (
    <CustomerShell
      title="Settings"
      description="Update your profile, security, and notification preferences."
      breadcrumbs={[
        { label: "Account", href: "/customer/account" },
        { label: "Settings" },
      ]}
      active="settings"
    >
      <div className="flex flex-col gap-6">
        {/* Profile */}
        <SettingsCard
          icon={UserIcon}
          title="Profile"
          description="Your name and contact information."
        >
          <form onSubmit={saveProfile} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="firstName"
                label="First name"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
              />
              <Field
                id="lastName"
                label="Last name"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
              />
            </div>
            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              id="phone"
              label="Phone (optional)"
              type="tel"
              value={phone}
              onChange={setPhone}
              autoComplete="tel"
            />
            <div className="mt-1 flex justify-end">
              <Button
                type="submit"
                disabled={savingProfile}
                className="h-11 rounded-full px-6 font-semibold"
              >
                {savingProfile && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                Save profile
              </Button>
            </div>
          </form>
        </SettingsCard>

        {/* Password */}
        <SettingsCard
          icon={KeyRound}
          title="Password"
          description="Use 12+ characters with a mix of letters, numbers, and symbols."
        >
          <form onSubmit={savePassword} className="flex flex-col gap-4" noValidate>
            <Field
              id="currentPassword"
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              required
            />
            <div className="flex flex-col gap-1.5">
              <Field
                id="newPassword"
                label="New password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                required
              />
              {newPassword.length > 0 && (
                <div aria-live="polite">
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    Strength:{" "}
                    <span className="font-medium text-foreground">
                      {strength.label}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <Field
              id="confirmPassword"
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              required
            />
            <div className="mt-1 flex justify-end">
              <Button
                type="submit"
                disabled={savingPassword}
                className="h-11 rounded-full px-6 font-semibold"
              >
                {savingPassword && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                Update password
              </Button>
            </div>
          </form>
        </SettingsCard>

        {/* Preferences */}
        <SettingsCard
          icon={BellRing}
          title="Email preferences"
          description="Choose what you'd like to hear about."
        >
          <div className="flex flex-col gap-1">
            <Pref
              label="Marketing emails"
              description={`Deals, new arrivals, and ${brand.shortName} updates.`}
              checked={marketingEmails}
              onCheckedChange={setMarketingEmails}
            />
            <Pref
              label="Order updates"
              description="Confirmations, shipping, and delivery."
              checked={orderUpdates}
              onCheckedChange={setOrderUpdates}
            />
            <Pref
              label="Review requests"
              description="Invites to review products you've purchased."
              checked={productReviews}
              onCheckedChange={setProductReviews}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              onClick={savePreferences}
              disabled={savingPrefs}
              className="h-11 rounded-full px-6 font-semibold"
            >
              {savingPrefs && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Save preferences
            </Button>
          </div>
        </SettingsCard>

        {/* Two-factor — placeholder */}
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-inset ring-border">
            <ShieldCheck
              className="size-5 text-muted-foreground"
              aria-hidden
            />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              Two-factor authentication
              <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Coming soon
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add an extra step at sign-in to keep your account secure.
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-5 py-4 sm:px-6">
            <Trash2 className="size-4 text-destructive" aria-hidden />
            <h2 className="text-base font-semibold text-destructive">
              Delete account
            </h2>
          </div>
          <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
            <p className="text-sm text-muted-foreground">
              Permanently remove your account, order history, and saved
              addresses. This action can&apos;t be undone.
            </p>
            <div>
              <Button
                variant="destructive"
                onClick={deleteAccount}
                className="h-10 rounded-full px-5"
              >
                Delete my account
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Need help?{" "}
          <Link
            href="/pages/help"
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Visit the help center
          </Link>{" "}
          or email{" "}
          <a
            href="mailto:support@shophub.example"
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Mail className="mr-0.5 inline size-3" aria-hidden />
            support
          </a>
          .
        </p>
      </div>
    </CustomerShell>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <header className="border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {label}
        {required && (
          <span aria-label="required" className="text-destructive">
            *
          </span>
        )}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="h-11 rounded-xl"
      />
    </div>
  );
}

function Pref({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-muted/40">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </label>
  );
}
