import type { Metadata } from "next";

import { SEO_SCOPE_KEYPHRASES } from "@/lib/seo/marketing-scopes";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.creeda.in"
).replace(/\/+$/, "");

const defaultSocialImage = {
  url: "/creeda-performance-bgr.png",
  width: 1200,
  height: 630,
  alt: "CREEDA Performance",
} as const;

type CreatePageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
};

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
}: CreatePageMetadataOptions): Metadata {
  const uniqueKeywords = Array.from(
    new Set([...SEO_SCOPE_KEYPHRASES, ...keywords]),
  );

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    keywords: uniqueKeywords,
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path}`,
      siteName: "CREEDA",
      type: "website",
      locale: "en_IN",
      images: [defaultSocialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultSocialImage.url],
    },
  };
}
