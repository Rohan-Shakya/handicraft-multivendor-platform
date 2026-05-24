/**
 * Shared rug-themed icon used by all PWA icon routes (icon-192, icon-512,
 * icon-maskable-512, apple-icon). Centralised so the brand mark stays in sync
 * when we tweak it.
 *
 * `maskable` controls inner padding so the safe zone (40% radius) is honoured
 * by Android's icon mask.
 */

interface IconOpts {
  size: number;
  maskable: boolean;
}

export function rugIconElement({ size, maskable }: IconOpts) {
  // For maskable icons, render the rug at ~60% size so it survives the
  // platform mask (which clips to a circle/squircle of ~80% radius).
  const innerScale = maskable ? 0.6 : 0.78;
  const inner = Math.round(size * innerScale);
  const rugW = inner;
  const rugH = Math.round(inner * 0.66);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #3a4d3a 0%, #2d3d2d 100%)",
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      <div
        style={{
          width: rugW,
          height: rugH,
          background: "#f0e9da",
          borderRadius: Math.round(size * 0.02),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          boxShadow: `inset 0 0 0 ${Math.max(2, Math.round(size * 0.012))}px rgba(166,90,60,0.55)`,
        }}
      >
        <div
          style={{
            width: Math.round(rugW * 0.55),
            height: Math.round(rugH * 0.55),
            border: `${Math.max(2, Math.round(size * 0.012))}px solid rgba(166,90,60,0.9)`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: Math.round(rugW * 0.28),
              height: Math.round(rugH * 0.28),
              background: "rgba(166,90,60,0.55)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: Math.round(size * 0.05),
                height: Math.round(size * 0.05),
                background: "#3a4d3a",
                borderRadius: "50%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
