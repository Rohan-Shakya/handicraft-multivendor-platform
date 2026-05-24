import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand cache invalidation endpoint.
 *
 * Called by the API server (or any trusted service) after a mutation so the
 * Next.js Data Cache reflects the change immediately instead of waiting for
 * the per-page `revalidate` TTL.
 *
 * Auth: shared secret in the `x-revalidate-secret` header that matches
 * `REVALIDATE_SECRET`. Without a secret set the endpoint refuses every call —
 * fail-closed so a misconfigured production doesn't silently expose it.
 *
 * Body: `{ tags?: string[]; paths?: string[] }`.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET not configured" },
      { status: 503 }
    );
  }
  if (req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body" },
      { status: 400 }
    );
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === "string" && p.length > 0)
    : [];

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ ok: true, tags, paths });
}
