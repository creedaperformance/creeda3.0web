import type { MetadataRoute } from "next";

import {
  SITE_BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_THEME_COLOR,
} from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CREEDA — Digital Sports Scientist",
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: SITE_BACKGROUND_COLOR,
    theme_color: SITE_THEME_COLOR,
    lang: "en-IN",
    dir: "ltr",
    categories: ["sports", "fitness", "health"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Features",
        short_name: "Features",
        description: "Review CREEDA product capabilities.",
        url: "/features",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Mission",
        short_name: "Mission",
        description: "Read the company mission and India-first positioning.",
        url: "/mission",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Trust",
        short_name: "Trust",
        description: "Open the public trust and legal documentation hub.",
        url: "/consent",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
    launch_handler: {
      client_mode: "focus-existing",
    },
    prefer_related_applications: false,
  };
}
