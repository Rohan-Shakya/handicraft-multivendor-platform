import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.shortName,
    description: brand.tagline,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "any",
    background_color: "#fbfaf6",
    theme_color: "#3a4d3a",
    lang: "en",
    dir: "ltr",
    categories: ["shopping", "lifestyle", "business"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: `Shop ${brand.productNounPlural}`,
        short_name: "Shop",
        description: `Browse the full ${brand.shortName} catalogue`,
        url: "/products",
      },
      {
        name: "My cart",
        short_name: "Cart",
        url: "/cart",
      },
      {
        name: "My orders",
        short_name: "Orders",
        url: "/customer/orders",
      },
      {
        name: "Wishlist",
        short_name: "Saved",
        url: "/wishlist",
      },
    ],
    prefer_related_applications: false,
  };
}
