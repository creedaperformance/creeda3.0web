import type { Metadata } from "next";

export function createNoIndexMetadata(
  title?: string,
): Metadata {
  return {
    ...(title ? { title } : {}),
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      googleBot: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        "max-snippet": 0,
        "max-image-preview": "none",
        "max-video-preview": 0,
      },
    },
  };
}
