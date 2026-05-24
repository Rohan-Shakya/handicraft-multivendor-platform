import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";

export const runtime = "edge";
export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #fbfaf6 0%, #f0e9da 100%)",
          color: "#1a1f1a",
          padding: "80px 96px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 60,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(166,90,60,0.18) 0%, rgba(166,90,60,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(60,80,60,0.18) 0%, rgba(60,80,60,0) 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#7a4a2e",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 48,
              height: 2,
              background: "#a65a3c",
            }}
          />
          Hand-crafted in Nepal
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 96,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-2px",
          }}
        >
          {brand.name}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            lineHeight: 1.35,
            color: "#3a4540",
            maxWidth: 880,
            fontFamily: "sans-serif",
            fontWeight: 400,
          }}
        >
          {brand.tagline}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#5a665e",
            fontSize: 22,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", gap: 36 }}>
            <span>Buddhas</span>
            <span>·</span>
            <span>Bowls</span>
            <span>·</span>
            <span>Carvings</span>
          </div>
          <div style={{ display: "flex", color: "#a65a3c", fontWeight: 600 }}>
            himalayancrafts.np
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
