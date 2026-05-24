import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import { eq, and, isNull, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  customers,
  users,
  vendorMemberships,
  vendors,
  refreshTokens,
  user2fa,
} from "../../db/schema/index.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { generateId } from "../../lib/id.js";
import { logAudit, auditActorId, auditRequestContext } from "../../lib/audit.js";
import {
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
} from "../../lib/login-lockout.js";
import { BadRequestError } from "../../lib/errors.js";
import { fireWebhook } from "../../lib/webhooks.js";
import { sendEmail } from "../../lib/email.js";
import { welcomeEmail, passwordResetEmail, vendorWelcomeEmail, twoFactorStatusEmail } from "../../lib/email-templates.js";
import { getEnv } from "../../lib/env.js";
import {
  generateTotpSecret,
  verifyTotpCode,
  generateBackupCodes,
  verifyBackupCode,
} from "../../lib/totp.js";

// Stricter rate limit for auth endpoints (brute-force protection)
const authRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  bodyLimit: 16 * 1024, // 16KB — auth payloads are small
};

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const customerRegisterSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(10),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const vendorRegisterSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with dashes"),
  email: z.string().email().toLowerCase(),
  password: z.string().min(10),
  legalName: z.string().optional(),
  bio: z.string().optional(),
  primaryEmail: z.string().email().toLowerCase().optional(),
  primaryPhone: z.string().optional(),
});

const vendorLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  vendorId: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function parseExpiresIn(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60; // default 15 minutes
  const num = parseInt(match[1]!);
  switch (match[2]) {
    case "s":
      return num;
    case "m":
      return num * 60;
    case "h":
      return num * 3600;
    case "d":
      return num * 86400;
    default:
      return 900;
  }
}

async function createTokenPair(
  app: FastifyInstance,
  payload: { id: string; type: string; role?: string; vendorId?: string }
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const env = getEnv();
  const expiresIn = parseExpiresIn(env.JWT_ACCESS_EXPIRES_IN);

  const accessToken = app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const refreshExpiresSeconds = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);

  await db.insert(refreshTokens).values({
    id: generateId(),
    tokenHash,
    actorType: payload.type as "admin" | "vendor" | "customer",
    userId: payload.type !== "customer" ? payload.id : null,
    customerId: payload.type === "customer" ? payload.id : null,
    vendorId: payload.vendorId ?? null,
    vendorRole: payload.type === "vendor" ? (payload.role ?? null) : null,
    adminRole: payload.type === "admin" ? (payload.role ?? null) : null,
    expiresAt: new Date(Date.now() + refreshExpiresSeconds * 1000),
  });

  return { accessToken, refreshToken: rawRefreshToken, expiresIn };
}

async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
}

const REFRESH_COOKIE = "refresh_token";

function setRefreshCookie(reply: FastifyReply, rawToken: string, maxAgeSeconds: number) {
  // SameSite=None + Secure required for cross-origin cookies (admin ≠ API origin).
  // Browsers treat localhost as a secure context, so Secure works in dev too.
  const parts = [
    `${REFRESH_COOKIE}=${encodeURIComponent(rawToken)}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/auth",
    `Max-Age=${maxAgeSeconds}`,
  ];
  reply.header("Set-Cookie", parts.join("; "));
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.header(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; HttpOnly; Secure; SameSite=None; Path=/auth; Max-Age=0`
  );
}

function getRefreshTokenFromCookie(req: FastifyRequest): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/admin/login", authRateLimit, async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const ctx = auditRequestContext(req);

    if (await isLockedOut("admin", email)) {
      await logAudit({
        entityType: "auth",
        entityId: email,
        action: "admin.login.locked_out",
        metadata: { email },
        ...ctx,
      });
      return reply.status(429).send({
        statusCode: 429,
        message: "Too many failed attempts. Try again in 15 minutes.",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));

    // Constant-ish failure path: record + audit on every miss (no user, no
    // password, wrong password). Don't disclose which one failed.
    const failLogin = async (reason: string) => {
      const { lockedOut } = await recordFailedAttempt("admin", email);
      await logAudit({
        actorUserId: user?.id,
        entityType: "auth",
        entityId: user?.id ?? email,
        action: "admin.login.failed",
        metadata: { email, reason, lockedOut },
        ...ctx,
      });
      return reply.status(401).send({ statusCode: 401, message: "Invalid credentials" });
    };

    if (!user || !user.isActive) return failLogin("no_user_or_inactive");
    if (!user.passwordHash) return failLogin("no_password_hash");
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return failLogin("bad_password");
    if (!user.platformRole) {
      return reply
        .status(403)
        .send({ statusCode: 403, message: "Account does not have platform access" });
    }

    await clearFailedAttempts("admin", email);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const [twoFaRecord] = await db
      .select()
      .from(user2fa)
      .where(and(eq(user2fa.userId, user.id), eq(user2fa.isEnabled, true)));

    if (twoFaRecord) {
      // Return a temporary short-lived token requiring 2FA verification.
      // `aud: "2fa-pending"` is enforced as a hard reject in the `authenticate`
      // decorator so this token can never reach an authenticated route.
      const tempToken = app.jwt.sign(
        {
          id: user.id,
          type: "admin",
          role: user.platformRole,
          requires2FA: true,
          aud: "2fa-pending",
        },
        { expiresIn: "5m" }
      );

      return reply.send({
        requires2FA: true,
        tempToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    }

    const tokens = await createTokenPair(app, {
      id: user.id,
      type: "admin",
      role: user.platformRole,
    });

    const env = getEnv();
    setRefreshCookie(reply, tokens.refreshToken, parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

    await logAudit({
      actorUserId: user.id,
      entityType: "auth",
      entityId: user.id,
      action: "admin.login",
      metadata: { email: user.email, role: user.platformRole },
      ...ctx,
    });

    return reply.send({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.platformRole,
      },
    });
  });

  app.post("/auth/vendor/register", authRateLimit, async (req, reply) => {
    const { name, slug, email, password, legalName, bio, primaryEmail, primaryPhone } =
      vendorRegisterSchema.parse(req.body);

    const [existingVendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.slug, slug));
    if (existingVendor) {
      return reply.status(409).send({ statusCode: 409, message: "Vendor slug already in use" });
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));
    if (existingUser) {
      return reply.status(409).send({ statusCode: 409, message: "Email already in use" });
    }

    const userId = generateId();
    const vendorId = generateId();
    const membershipId = generateId();
    const passwordHash = await hashPassword(password);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(users).values({ id: userId, email, passwordHash });

      await tx.insert(vendors).values({
        id: vendorId,
        name,
        slug,
        status: "pending",
        legalName: legalName ?? null,
        bio: bio ?? null,
        primaryEmail: primaryEmail ?? null,
        primaryPhone: primaryPhone ?? null,
        createdBy: userId,
      });

      await tx.insert(vendorMemberships).values({
        id: membershipId,
        userId,
        vendorId,
        role: "owner",
        status: "active",
        joinedAt: now,
        acceptedAt: now,
      });
    });

    const tokens = await createTokenPair(app, {
      id: userId,
      type: "vendor",
      vendorId,
      role: "owner",
    });

    const env = getEnv();
    setRefreshCookie(reply, tokens.refreshToken, parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

    const vendorEmail = vendorWelcomeEmail({
      vendorName: name,
      loginUrl: `${env.VITE_ADMIN_URL}/login`,
    });
    sendEmail({ to: email, subject: vendorEmail.subject, html: vendorEmail.html, text: vendorEmail.text }).catch(() => {});

    return reply.status(201).send({
      ...tokens,
      user: { id: userId, email },
      vendor: { id: vendorId, name, slug, status: "pending" },
      memberRole: "owner",
    });
  });

  app.post("/auth/vendor/login", authRateLimit, async (req, reply) => {
    const { email, password, vendorId } = vendorLoginSchema.parse(req.body);
    const ctx = auditRequestContext(req);

    if (await isLockedOut("vendor", email)) {
      await logAudit({
        entityType: "auth",
        entityId: email,
        action: "vendor.login.locked_out",
        metadata: { email, vendorId },
        ...ctx,
      });
      return reply.status(429).send({
        statusCode: 429,
        message: "Too many failed attempts. Try again in 15 minutes.",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));

    const failLogin = async (reason: string) => {
      const { lockedOut } = await recordFailedAttempt("vendor", email);
      await logAudit({
        actorUserId: user?.id,
        entityType: "auth",
        entityId: user?.id ?? email,
        action: "vendor.login.failed",
        metadata: { email, vendorId, reason, lockedOut },
        ...ctx,
      });
      return reply.status(401).send({ statusCode: 401, message: "Invalid credentials" });
    };

    if (!user || !user.isActive || !user.passwordHash) return failLogin("no_user_or_inactive");
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return failLogin("bad_password");

    await clearFailedAttempts("vendor", email);

    const [membership] = await db
      .select()
      .from(vendorMemberships)
      .where(
        and(
          eq(vendorMemberships.userId, user.id),
          eq(vendorMemberships.vendorId, vendorId),
          eq(vendorMemberships.status, "active")
        )
      );

    if (!membership) {
      return reply
        .status(403)
        .send({ statusCode: 403, message: "No active membership for this vendor" });
    }

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId));
    if (!vendor || vendor.status === "rejected" || vendor.status === "suspended") {
      return reply
        .status(403)
        .send({ statusCode: 403, message: "Vendor account is not active" });
    }

    await Promise.all([
      db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)),
      db
        .update(vendorMemberships)
        .set({ lastAccessAt: new Date() })
        .where(eq(vendorMemberships.id, membership.id)),
    ]);

    const [vendorTwoFa] = await db
      .select()
      .from(user2fa)
      .where(and(eq(user2fa.userId, user.id), eq(user2fa.isEnabled, true)));

    if (vendorTwoFa) {
      const tempToken = app.jwt.sign(
        {
          id: user.id,
          type: "vendor",
          role: membership.role,
          vendorId: membership.vendorId,
          requires2FA: true,
          aud: "2fa-pending",
        },
        { expiresIn: "5m" }
      );

      return reply.send({
        requires2FA: true,
        tempToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        vendor: { id: vendor.id, name: vendor.name, slug: vendor.slug },
      });
    }

    const tokens = await createTokenPair(app, {
      id: user.id,
      type: "vendor",
      vendorId: membership.vendorId,
      role: membership.role,
    });

    const env = getEnv();
    setRefreshCookie(reply, tokens.refreshToken, parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

    await logAudit({
      actorUserId: user.id,
      entityType: "auth",
      entityId: user.id,
      action: "vendor.login",
      metadata: { email: user.email, vendorId, vendorName: vendor.name, role: membership.role },
      ...ctx,
    });

    return reply.send({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      vendor: { id: vendor.id, name: vendor.name, slug: vendor.slug },
      memberRole: membership.role,
    });
  });

  app.post("/auth/vendor/memberships", authRateLimit, async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));

    if (!user || !user.isActive || !user.passwordHash) {
      return reply.status(401).send({ statusCode: 401, message: "Invalid credentials" });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ statusCode: 401, message: "Invalid credentials" });
    }

    const memberships = await db
      .select({
        vendorId: vendors.id,
        vendorName: vendors.name,
        vendorSlug: vendors.slug,
        vendorStatus: vendors.status,
        memberRole: vendorMemberships.role,
        memberStatus: vendorMemberships.status,
      })
      .from(vendorMemberships)
      .innerJoin(vendors, eq(vendorMemberships.vendorId, vendors.id))
      .where(
        and(eq(vendorMemberships.userId, user.id), eq(vendorMemberships.status, "active"))
      );

    return reply.send({ memberships });
  });

  app.post("/auth/customer/register", authRateLimit, async (req, reply) => {
    const { email, password, firstName, lastName } = customerRegisterSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.email, email), isNull(customers.deletedAt)));
    if (existing) {
      return reply.status(409).send({ statusCode: 409, message: "Email already in use" });
    }

    const [customer] = await db
      .insert(customers)
      .values({
        id: generateId(),
        email,
        passwordHash: await hashPassword(password),
        firstName: firstName ?? null,
        lastName: lastName ?? null,
      })
      .returning();

    const tokens = await createTokenPair(app, { id: customer!.id, type: "customer" });

    const env = getEnv();
    setRefreshCookie(reply, tokens.refreshToken, parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

    const emailData = welcomeEmail({
      customerName: customer!.firstName ?? "there",
      loginUrl: `${env.STOREFRONT_URL}/account`,
    });
    sendEmail({
      to: customer!.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    }).catch(() => {});

    fireWebhook({
      topic: "customer.created",
      entityType: "customer",
      entityId: customer!.id,
      data: {
        id: customer!.id,
        email: customer!.email,
        firstName: customer!.firstName,
        lastName: customer!.lastName,
      },
    }).catch(() => {});

    return reply.status(201).send({
      ...tokens,
      customer: {
        id: customer!.id,
        email: customer!.email,
        firstName: customer!.firstName,
        lastName: customer!.lastName,
      },
    });
  });

  app.post("/auth/customer/login", authRateLimit, async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const ctx = auditRequestContext(req);

    if (await isLockedOut("customer", email)) {
      await logAudit({
        entityType: "auth",
        entityId: email,
        action: "customer.login.locked_out",
        metadata: { email },
        ...ctx,
      });
      return reply.status(429).send({
        statusCode: 429,
        message: "Too many failed attempts. Try again in 15 minutes.",
      });
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.email, email), isNull(customers.deletedAt)));

    const failLogin = async (reason: string, status: 401 | 403 = 401) => {
      const { lockedOut } = await recordFailedAttempt("customer", email);
      await logAudit({
        actorUserId: undefined,
        entityType: "auth",
        entityId: customer?.id ?? email,
        action: "customer.login.failed",
        metadata: { email, reason, lockedOut },
        ...ctx,
      });
      if (status === 403) {
        return reply.status(403).send({ statusCode: 403, message: "Account is disabled" });
      }
      return reply.status(401).send({ statusCode: 401, message: "Invalid credentials" });
    };

    if (!customer) return failLogin("no_customer");
    if (customer.state === "disabled") return failLogin("disabled", 403);
    if (!customer.passwordHash) return failLogin("no_password_hash");
    const valid = await verifyPassword(password, customer.passwordHash);
    if (!valid) return failLogin("bad_password");

    await clearFailedAttempts("customer", email);
    await db
      .update(customers)
      .set({ lastLoginAt: new Date() })
      .where(eq(customers.id, customer.id));

    const tokens = await createTokenPair(app, { id: customer.id, type: "customer" });

    const env = getEnv();
    setRefreshCookie(reply, tokens.refreshToken, parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

    await logAudit({
      actorUserId: undefined,
      entityType: "auth",
      entityId: customer.id,
      action: "customer.login",
      metadata: { email: customer.email, customerId: customer.id },
      ...ctx,
    });

    return reply.send({
      ...tokens,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  });

  app.post("/auth/refresh", authRateLimit, async (req, reply) => {
    // Accept refresh token from body (API clients) or HttpOnly cookie (browser)
    const bodyParse = refreshSchema.safeParse(req.body);
    const rawToken = bodyParse.success
      ? bodyParse.data.refreshToken
      : getRefreshTokenFromCookie(req);

    if (!rawToken) {
      return reply.status(401).send({ statusCode: 401, message: "Refresh token required" });
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt)
        )
      );

    if (!token || token.expiresAt < new Date()) {
      return reply.status(401).send({ statusCode: 401, message: "Invalid or expired refresh token" });
    }

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, token.id));

    const payload: { id: string; type: string; role?: string; vendorId?: string } = {
      id: "",
      type: token.actorType,
    };

    if (token.actorType === "admin" && token.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, token.userId), isNull(users.deletedAt)));
      if (!user || !user.isActive) {
        return reply.status(401).send({ statusCode: 401, message: "Account no longer active" });
      }
      // Re-validate the user still has a platform role. If they were demoted
      // since login, refuse the refresh instead of extending stale privileges.
      if (!user.platformRole) {
        return reply
          .status(403)
          .send({ statusCode: 403, message: "Platform access revoked" });
      }
      payload.id = user.id;
      // Prefer the CURRENT role so demotions / promotions are reflected
      // immediately on refresh rather than being carried from the old token.
      payload.role = user.platformRole;
    } else if (token.actorType === "vendor" && token.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, token.userId), isNull(users.deletedAt)));
      if (!user || !user.isActive) {
        return reply.status(401).send({ statusCode: 401, message: "Account no longer active" });
      }
      // Re-validate the vendor membership is still active and belongs to this vendor.
      if (!token.vendorId) {
        return reply.status(401).send({ statusCode: 401, message: "Invalid vendor token" });
      }
      const [currentMembership] = await db
        .select()
        .from(vendorMemberships)
        .where(
          and(
            eq(vendorMemberships.userId, user.id),
            eq(vendorMemberships.vendorId, token.vendorId),
            eq(vendorMemberships.status, "active")
          )
        );
      if (!currentMembership) {
        return reply
          .status(403)
          .send({ statusCode: 403, message: "Vendor membership no longer active" });
      }
      payload.id = user.id;
      payload.vendorId = token.vendorId;
      // Prefer current membership role so role changes take effect on refresh.
      payload.role = currentMembership.role;
    } else if (token.actorType === "customer" && token.customerId) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, token.customerId), isNull(customers.deletedAt)));
      if (!customer || customer.state === "disabled") {
        return reply.status(401).send({ statusCode: 401, message: "Account no longer active" });
      }
      payload.id = customer.id;
    } else {
      return reply.status(401).send({ statusCode: 401, message: "Invalid token" });
    }

    const tokens = await createTokenPair(app, payload);

    const env = getEnv();
    setRefreshCookie(reply, tokens.refreshToken, parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

    return reply.send(tokens);
  });

  app.post("/auth/logout", async (req, reply) => {
    // Accept refresh token from body (API clients) or HttpOnly cookie (browser)
    const body = z.object({ refreshToken: z.string().min(1) }).safeParse(req.body);
    const rawToken = body.success ? body.data.refreshToken : getRefreshTokenFromCookie(req);

    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }

    clearRefreshCookie(reply);
    return reply.send({ message: "Logged out" });
  });

  app.get(
    "/auth/customer/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      if (req.actor.type !== "customer") {
        return reply.status(403).send({ statusCode: 403, message: "Forbidden" });
      }
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, req.actor.id), isNull(customers.deletedAt)));
      if (!customer) {
        return reply.status(404).send({ statusCode: 404, message: "Customer not found" });
      }
      if (customer.state === "disabled") {
        return reply.status(403).send({ statusCode: 403, message: "Account is disabled" });
      }
      return reply.send({
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        createdAt: customer.createdAt,
      });
    }
  );

  app.get(
    "/auth/admin/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      if (req.actor.type !== "admin") {
        return reply.status(403).send({ statusCode: 403, message: "Forbidden" });
      }
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, req.actor.id), isNull(users.deletedAt)));
      if (!user) {
        return reply.status(404).send({ statusCode: 404, message: "User not found" });
      }
      if (!user.isActive) {
        return reply.status(403).send({ statusCode: 403, message: "Account is deactivated" });
      }
      return reply.send({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        platformRole: user.platformRole,
      });
    }
  );

  app.post("/auth/customer/forgot-password", authRateLimit, async (req, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const ctx = auditRequestContext(req);

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.email, email), isNull(customers.deletedAt)));

    // Log the request regardless of whether the email exists — we still want
    // forensic record of who's probing the endpoint.
    await logAudit({
      actorUserId: undefined,
      entityType: "auth",
      entityId: customer?.id ?? email,
      action: "customer.password_reset.requested",
      metadata: { email, found: !!customer },
      ...ctx,
    });

    if (customer) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(customers)
        .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
        .where(eq(customers.id, customer.id));

      const env = getEnv();
      const resetUrl = `${env.STOREFRONT_URL}/customer/reset-password?token=${token}`;
      const emailData = passwordResetEmail({
        customerName: customer.firstName ?? "Customer",
        resetUrl,
        expiresInMinutes: 60,
      });
      sendEmail({
        to: customer.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }).catch(() => {});
    }

    return reply.send({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  });

  app.post("/auth/customer/reset-password", authRateLimit, async (req, reply) => {
    const body = z
      .object({ token: z.string().min(1), password: z.string().min(10) })
      .parse(req.body);

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.passwordResetToken, body.token));

    if (
      !customer ||
      !customer.passwordResetExpiresAt ||
      customer.passwordResetExpiresAt < new Date()
    ) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(body.password);
    await db
      .update(customers)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id));

    return reply.send({ message: "Password has been reset successfully." });
  });

  app.post("/auth/admin/forgot-password", authRateLimit, async (req, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const ctx = auditRequestContext(req);

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));

    await logAudit({
      actorUserId: user?.id,
      entityType: "auth",
      entityId: user?.id ?? email,
      action: "admin.password_reset.requested",
      metadata: {
        email,
        found: !!user,
        eligible: !!(user && user.isActive && user.platformRole),
      },
      ...ctx,
    });

    if (user && user.isActive && user.platformRole) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the reset token in a refresh_tokens record with a special flag
      await db.insert(refreshTokens).values({
        id: generateId(),
        tokenHash,
        actorType: "admin",
        userId: user.id,
        adminRole: "__password_reset__",
        expiresAt,
      });

      const env = getEnv();
      const resetUrl = `${env.VITE_ADMIN_URL}/admin/reset-password?token=${token}`;
      const emailData = passwordResetEmail({
        customerName: user.firstName ?? "Admin",
        resetUrl,
        expiresInMinutes: 60,
      });
      sendEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }).catch(() => {});
    }

    return reply.send({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  });

  app.post("/auth/admin/reset-password", authRateLimit, async (req, reply) => {
    const body = z
      .object({ token: z.string().min(1), password: z.string().min(10) })
      .parse(req.body);

    const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");

    const [resetToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.adminRole, "__password_reset__"),
          isNull(refreshTokens.revokedAt)
        )
      );

    if (!resetToken || resetToken.expiresAt < new Date() || !resetToken.userId) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(body.password);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, resetToken.id));

    return reply.send({ message: "Password has been reset successfully." });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2FA (TOTP) — Admin + Vendor
  // Both actor types use the same user2fa table (keyed by userId).
  // ══════════════════════════════════════════════════════════════════════════

  const ALLOWED_2FA_TYPES = new Set(["admin", "vendor"]);

  function assert2FAActorType(req: FastifyRequest, reply: FastifyReply) {
    if (!ALLOWED_2FA_TYPES.has(req.actor.type)) {
      reply.status(403).send({ statusCode: 403, message: "Forbidden" });
      return false;
    }
    return true;
  }

  // Supports both /auth/admin/2fa/setup and /auth/2fa/setup
  const setup2FA = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!assert2FAActorType(req, reply)) return;

    const [existing] = await db
      .select()
      .from(user2fa)
      .where(eq(user2fa.userId, req.actor.id));

    if (existing?.isEnabled) {
      return reply.status(409).send({ statusCode: 409, message: "2FA is already enabled" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.actor.id));
    const email = user?.email ?? req.actor.id;

    const { secret, uri } = generateTotpSecret(email);

    if (existing) {
      await db
        .update(user2fa)
        .set({ secret, isEnabled: false, updatedAt: new Date() })
        .where(eq(user2fa.userId, req.actor.id));
    } else {
      await db.insert(user2fa).values({
        id: generateId(),
        userId: req.actor.id,
        secret,
        isEnabled: false,
        backupCodes: [],
        backupCodesUsed: [],
      });
    }

    return reply.send({ secret, uri });
  };

  app.post("/auth/admin/2fa/setup", { preHandler: [app.authenticate] }, setup2FA);
  app.post("/auth/2fa/setup", { preHandler: [app.authenticate] }, setup2FA);

  const verify2FA = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!assert2FAActorType(req, reply)) return;

    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const [twoFa] = await db
      .select()
      .from(user2fa)
      .where(eq(user2fa.userId, req.actor.id));

    if (!twoFa) {
      throw new BadRequestError("2FA setup not started. Call /auth/2fa/setup first.");
    }

    if (twoFa.isEnabled) {
      return reply.status(409).send({ statusCode: 409, message: "2FA is already enabled" });
    }

    const valid = verifyTotpCode(twoFa.secret, code);
    if (!valid) {
      throw new BadRequestError("Invalid verification code. Try again.");
    }

    const { rawCodes, hashedCodes } = await generateBackupCodes(8);

    await db
      .update(user2fa)
      .set({
        isEnabled: true,
        verifiedAt: new Date(),
        backupCodes: hashedCodes,
        backupCodesUsed: [],
        updatedAt: new Date(),
      })
      .where(eq(user2fa.userId, req.actor.id));

    await logAudit({
      actorUserId: auditActorId(req.actor),
      entityType: "auth",
      entityId: req.actor.id,
      action: "2fa.enabled",
    });

    const [userFor2fa] = await db.select().from(users).where(eq(users.id, req.actor.id));
    if (userFor2fa) {
      const emailData = twoFactorStatusEmail({ name: userFor2fa.firstName ?? userFor2fa.email, enabled: true });
      sendEmail({ to: userFor2fa.email, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
    }

    return reply.send({
      message: "2FA has been enabled successfully.",
      backupCodes: rawCodes,
    });
  };

  app.post("/auth/admin/2fa/verify", { preHandler: [app.authenticate] }, verify2FA);
  app.post("/auth/2fa/verify", { preHandler: [app.authenticate] }, verify2FA);

  const disable2FA = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!assert2FAActorType(req, reply)) return;

    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);

    const [twoFa] = await db
      .select()
      .from(user2fa)
      .where(eq(user2fa.userId, req.actor.id));

    if (!twoFa || !twoFa.isEnabled) {
      throw new BadRequestError("2FA is not enabled");
    }

    const valid = verifyTotpCode(twoFa.secret, code);
    if (!valid) {
      throw new BadRequestError("Invalid code");
    }

    await db
      .update(user2fa)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(eq(user2fa.userId, req.actor.id));

    await logAudit({
      actorUserId: auditActorId(req.actor),
      entityType: "auth",
      entityId: req.actor.id,
      action: "2fa.disabled",
    });

    const [userFor2faDisable] = await db.select().from(users).where(eq(users.id, req.actor.id));
    if (userFor2faDisable) {
      const emailData = twoFactorStatusEmail({ name: userFor2faDisable.firstName ?? userFor2faDisable.email, enabled: false });
      sendEmail({ to: userFor2faDisable.email, subject: emailData.subject, html: emailData.html, text: emailData.text }).catch(() => {});
    }

    return reply.send({ message: "2FA has been disabled." });
  };

  app.post("/auth/admin/2fa/disable", { preHandler: [app.authenticate] }, disable2FA);
  app.post("/auth/2fa/disable", { preHandler: [app.authenticate] }, disable2FA);

  const status2FA = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!assert2FAActorType(req, reply)) return;

    const [twoFa] = await db
      .select()
      .from(user2fa)
      .where(eq(user2fa.userId, req.actor.id));

    return reply.send({
      enabled: twoFa?.isEnabled ?? false,
      verifiedAt: twoFa?.verifiedAt ?? null,
    });
  };

  app.get("/auth/admin/2fa/status", { preHandler: [app.authenticate] }, status2FA);
  app.get("/auth/2fa/status", { preHandler: [app.authenticate] }, status2FA);

  // Works for both admin and vendor temp tokens.
  const authenticate2FA = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({
        tempToken: z.string().min(1),
        code: z.string().min(1),
      })
      .parse(req.body);

    let payload: { id: string; type: string; role: string; vendorId?: string; requires2FA: boolean };
    try {
      payload = await app.jwt.verify(body.tempToken);
    } catch {
      return reply.status(401).send({ statusCode: 401, message: "Invalid or expired temp token" });
    }

    if (!payload.requires2FA) {
      return reply.status(400).send({ statusCode: 400, message: "Token is not a 2FA pending token" });
    }

    const [twoFa] = await db
      .select()
      .from(user2fa)
      .where(and(eq(user2fa.userId, payload.id), eq(user2fa.isEnabled, true)));

    if (!twoFa) {
      return reply.status(400).send({ statusCode: 400, message: "2FA not configured" });
    }

    let authenticated = verifyTotpCode(twoFa.secret, body.code);

    if (!authenticated) {
      const backupIndex = await verifyBackupCode(
        body.code,
        twoFa.backupCodes as string[],
        twoFa.backupCodesUsed as string[]
      );
      if (backupIndex >= 0) {
        authenticated = true;
        const used = [...(twoFa.backupCodesUsed as string[]), (twoFa.backupCodes as string[])[backupIndex]!];
        await db
          .update(user2fa)
          .set({ backupCodesUsed: used, updatedAt: new Date() })
          .where(eq(user2fa.id, twoFa.id));
      }
    }

    if (!authenticated) {
      return reply.status(401).send({ statusCode: 401, message: "Invalid 2FA code" });
    }

    // Issue full token pair — include vendorId for vendor actors
    const tokenPayload: { id: string; type: string; role: string; vendorId?: string } = {
      id: payload.id,
      type: payload.type,
      role: payload.role,
    };
    if (payload.vendorId) {
      tokenPayload.vendorId = payload.vendorId;
    }

    const tokens = await createTokenPair(app, tokenPayload);

    const env = getEnv();
    setRefreshCookie(reply, tokens.refreshToken, parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

    await logAudit({
      actorUserId: payload.id,
      entityType: "auth",
      entityId: payload.id,
      action: `${payload.type}.2fa_authenticated`,
    });

    return reply.send(tokens);
  };

  app.post("/auth/admin/2fa/authenticate", authRateLimit, authenticate2FA);
  app.post("/auth/2fa/authenticate", authRateLimit, authenticate2FA);
}
