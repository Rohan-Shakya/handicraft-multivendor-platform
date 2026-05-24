import { ImageResponse } from "next/og";

import { rugIconElement } from "@/lib/pwa-icon";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(rugIconElement({ size: 512, maskable: true }), {
    width: 512,
    height: 512,
  });
}
