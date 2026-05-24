/**
 * Decorative SVG illustration for the dashboard hero. Shop facade + boxes +
 * stars — friendly, marketplace-y, monochrome so it tints with the surrounding
 * card color (uses currentColor for the line work, white-ish washes for fills).
 *
 * No external assets — embeds inline so it ships in the JS bundle and doesn't
 * blink in on slow networks.
 */
export function MarketplaceHero({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Subtle ground shadow */}
      <ellipse cx="110" cy="160" rx="90" ry="6" fill="white" opacity="0.12" />

      {/* Back boxes (stacked) */}
      <g opacity="0.85">
        <rect x="20" y="92" width="44" height="48" rx="3" fill="white" opacity="0.18" />
        <rect x="20" y="92" width="44" height="48" rx="3" stroke="white" strokeWidth="1.5" />
        <line x1="42" y1="92" x2="42" y2="140" stroke="white" strokeWidth="1.5" />
        <line x1="20" y1="106" x2="64" y2="106" stroke="white" strokeWidth="1.5" />
      </g>

      {/* Shopping bag (front) */}
      <g>
        <path
          d="M148 80 L148 70 a14 14 0 0 1 28 0 L176 80"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <rect x="138" y="78" width="48" height="62" rx="4" fill="white" opacity="0.95" />
        <rect x="138" y="78" width="48" height="62" rx="4" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <circle cx="162" cy="100" r="3" fill="currentColor" opacity="0.4" />
      </g>

      {/* Storefront awning (center) */}
      <g>
        <rect x="76" y="72" width="68" height="68" rx="4" fill="white" opacity="0.92" />
        <rect x="76" y="72" width="68" height="68" rx="4" stroke="white" strokeWidth="1.5" opacity="0.5" />
        {/* Awning */}
        <path
          d="M72 72 L148 72 L142 60 L78 60 Z"
          fill="white"
          opacity="0.95"
        />
        <path d="M84 60 L84 72 M96 60 L96 72 M108 60 L108 72 M120 60 L120 72 M132 60 L132 72" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        {/* Door */}
        <rect x="100" y="100" width="20" height="40" fill="currentColor" opacity="0.18" />
        <circle cx="116" cy="120" r="1.4" fill="white" />
        {/* Windows */}
        <rect x="84" y="86" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.4" fill="white" />
        <rect x="124" y="86" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.4" fill="white" />
      </g>

      {/* Sparkle stars */}
      <g fill="white" opacity="0.92">
        <path d="M52 50 L54 56 L60 58 L54 60 L52 66 L50 60 L44 58 L50 56 Z" />
        <path d="M188 36 L189.5 40.5 L194 42 L189.5 43.5 L188 48 L186.5 43.5 L182 42 L186.5 40.5 Z" />
        <path d="M170 124 L171.5 128 L175.5 129.5 L171.5 131 L170 135 L168.5 131 L164.5 129.5 L168.5 128 Z" />
      </g>

      {/* Receipt (bottom-right) */}
      <g opacity="0.9">
        <path
          d="M188 130 L188 156 L184 152 L180 156 L176 152 L172 156 L168 152 L168 130 Z"
          fill="white"
          opacity="0.9"
        />
        <line x1="173" y1="138" x2="184" y2="138" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="173" y1="143" x2="184" y2="143" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="173" y1="148" x2="180" y2="148" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </g>

      {/* Location pin (over storefront) */}
      <g>
        <path
          d="M110 36 a8 8 0 0 1 8 8 c0 6 -8 16 -8 16 s-8 -10 -8 -16 a8 8 0 0 1 8 -8 Z"
          fill="white"
        />
        <circle cx="110" cy="44" r="3" fill="currentColor" opacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * Friendly empty-state illustration. Box with sparkles — used when a list/card
 * has no rows yet (vs. "loading" state). Uses currentColor for line work so
 * callers can tint via parent text color.
 */
export function EmptyStateIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Ground shadow */}
      <ellipse cx="80" cy="106" rx="50" ry="4" fill="currentColor" opacity="0.08" />

      {/* Open box */}
      <g>
        <path
          d="M40 56 L80 40 L120 56 L120 96 L80 112 L40 96 Z"
          fill="currentColor"
          fillOpacity="0.06"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M40 56 L80 72 L120 56" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M80 72 L80 112" stroke="currentColor" strokeWidth="1.5" />
        {/* Box flaps */}
        <path
          d="M62 48 L80 56 L98 48 L80 40 Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Floating sparkles around the box */}
      <g fill="currentColor" opacity="0.5">
        <path d="M28 32 L29.5 36 L33.5 37.5 L29.5 39 L28 43 L26.5 39 L22.5 37.5 L26.5 36 Z" />
        <path d="M132 28 L133 31 L136 32 L133 33 L132 36 L131 33 L128 32 L131 31 Z" />
        <path d="M128 78 L129.5 82 L133.5 83.5 L129.5 85 L128 89 L126.5 85 L122.5 83.5 L126.5 82 Z" />
      </g>
    </svg>
  );
}
