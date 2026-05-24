/**
 * Storefront → API analytics helpers for marketing campaigns.
 *
 * Impressions fire on banner render but are de-duped per (campaignId, surface)
 * within a session — scrolling past the banner 20 times in one session counts
 * once. Clicks fire on CTA activation.
 *
 * Uses `navigator.sendBeacon` so a click that immediately navigates away still
 * delivers the event reliably (regular `fetch` would be aborted by the page
 * unload).
 */

const SEEN_KEY_PREFIX = "campaign-seen:";
const SESSION_ID_KEY = "rugs-nepal-session-id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function endpoint(): string {
  const apiUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : "http://localhost:4000";
  return `${apiUrl.replace(/\/$/, "")}/storefront/campaigns/events`;
}

function send(body: object): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(body);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(endpoint(), blob);
      return;
    }
  } catch {
    /* fall through */
  }
  // Fallback: best-effort fetch.
  fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Record a banner / landing impression. De-duped per session per (campaign, surface).
 */
export function trackCampaignImpression(
  campaignId: string,
  surface: "homepage" | "landing" | "footer" = "homepage"
): void {
  if (typeof window === "undefined") return;
  const key = `${SEEN_KEY_PREFIX}${campaignId}:${surface}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage blocked — still fire (worse: over-counts, better than nothing)
  }
  send({
    campaignId,
    type: "impression",
    sessionId: getSessionId(),
    surface,
  });
}

/** Record a click on the banner CTA. Not de-duped — multiple clicks count. */
export function trackCampaignClick(
  campaignId: string,
  surface: "homepage" | "landing" | "footer" = "homepage"
): void {
  send({
    campaignId,
    type: "click",
    sessionId: getSessionId(),
    surface,
  });
}
