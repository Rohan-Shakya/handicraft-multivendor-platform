import { ImageResponse } from "next/og";

import { rugIconElement } from "@/lib/pwa-icon";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(rugIconElement({ size: 192, maskable: false }), {
    width: 192,
    height: 192,
  });
}
