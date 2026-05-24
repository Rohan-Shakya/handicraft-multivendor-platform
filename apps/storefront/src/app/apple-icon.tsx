import { ImageResponse } from "next/og";

import { rugIconElement } from "@/lib/pwa-icon";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(rugIconElement({ size: 180, maskable: false }), {
    ...size,
  });
}
