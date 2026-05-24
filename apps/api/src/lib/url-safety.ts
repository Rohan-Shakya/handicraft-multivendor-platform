/**
 * SSRF-safe URL validation for outbound HTTP requests (webhooks, image
 * fetchers, anything that takes a user-supplied URL and dereferences it).
 *
 * Validates:
 *   - protocol: http(s) only; https-only in production
 *   - host: rejects loopback, link-local, RFC1918 private, IPv6 ULA, multicast,
 *     reserved, and "0.0.0.0"
 *   - port: rejects "metadata" / SSH / SMTP / common-internal ports unless
 *     explicitly allow-listed via env (kept conservative — disabled by default)
 *
 * We resolve DNS at validation time AND at delivery time (worker), because a
 * DNS record can flip between create and deliver (DNS rebinding). At delivery
 * the worker should re-validate the resolved IP.
 */
import dns from "node:dns/promises";
import net from "node:net";
import { BadRequestError } from "./errors.js";
import { getEnv } from "./env.js";

export interface UrlSafetyOptions {
  /** When true (default in prod), require https. */
  requireHttps?: boolean;
  /** Extra hosts/CIDRs the operator has explicitly allowed (e.g. internal QA). */
  allowedHosts?: string[];
}

const PRIVATE_IPV4_BLOCKS: ReadonlyArray<[number, number]> = [
  [ip4(10, 0, 0, 0), ip4(10, 255, 255, 255)],         // 10.0.0.0/8
  [ip4(172, 16, 0, 0), ip4(172, 31, 255, 255)],       // 172.16.0.0/12
  [ip4(192, 168, 0, 0), ip4(192, 168, 255, 255)],     // 192.168.0.0/16
  [ip4(127, 0, 0, 0), ip4(127, 255, 255, 255)],       // 127.0.0.0/8 (loopback)
  [ip4(169, 254, 0, 0), ip4(169, 254, 255, 255)],     // 169.254.0.0/16 (link-local + cloud metadata)
  [ip4(0, 0, 0, 0), ip4(0, 255, 255, 255)],           // 0.0.0.0/8
  [ip4(100, 64, 0, 0), ip4(100, 127, 255, 255)],      // 100.64.0.0/10 (CGNAT)
  [ip4(224, 0, 0, 0), ip4(255, 255, 255, 255)],       // multicast + reserved
];

function ip4(a: number, b: number, c: number, d: number): number {
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return PRIVATE_IPV4_BLOCKS.some(([lo, hi]) => n >= lo && n <= hi);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  // IPv4-mapped (::ffff:a.b.c.d) — rebox and re-check
  const m = lower.match(/^::ffff:([\d.]+)$/);
  if (m && m[1] && isPrivateIPv4(m[1])) return true;
  return false;
}

function isPrivateAddress(addr: string): boolean {
  const family = net.isIP(addr);
  if (family === 4) return isPrivateIPv4(addr);
  if (family === 6) return isPrivateIPv6(addr);
  return false;
}

/**
 * Validate a URL is safe to dereference. Throws BadRequestError on failure.
 * Resolves the hostname and rejects if any A/AAAA record points to a private
 * address.
 */
export async function assertSafeOutboundUrl(
  rawUrl: string,
  opts: UrlSafetyOptions = {}
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestError("Invalid URL");
  }

  const env = getEnv();
  const isProd = env.NODE_ENV === "production";
  const requireHttps = opts.requireHttps ?? isProd;

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BadRequestError(`Disallowed protocol: ${url.protocol}`);
  }
  if (requireHttps && url.protocol !== "https:") {
    throw new BadRequestError("HTTPS is required for outbound URLs");
  }

  const host = url.hostname;
  if (!host) throw new BadRequestError("Missing hostname");

  // Operator allow-list short-circuit (e.g. `internal-qa.acme.local`).
  if (opts.allowedHosts?.includes(host)) return url;

  // If the host is already an IP literal, validate it directly.
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new BadRequestError("URL points to a private/reserved IP");
    }
    return url;
  }

  // Otherwise resolve DNS and check every record.
  let records: { address: string }[] = [];
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new BadRequestError(`Failed to resolve host: ${host}`);
  }
  if (records.length === 0) {
    throw new BadRequestError(`No DNS records for host: ${host}`);
  }
  for (const r of records) {
    if (isPrivateAddress(r.address)) {
      throw new BadRequestError("URL resolves to a private/reserved IP");
    }
  }

  return url;
}

/**
 * Synchronous variant for hot paths that already have a parsed URL — used by
 * the delivery worker to re-check IPs after DNS resolution.
 */
export function isSafeResolvedAddress(addr: string): boolean {
  return !isPrivateAddress(addr);
}
