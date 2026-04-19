import type { Metadata } from "next";

import { CREEDA_LEGAL_ENTITY } from "@/lib/legal/constants";
import { SEO_SCOPE_KEYPHRASES } from "@/lib/seo/marketing-scopes";
import {
  DEFAULT_SOCIAL_IMAGE,
  SITE_ALTERNATE_LOCALES,
  SITE_LOCALE,
  SITE_NAME,
  getAbsoluteUrl,
} from "@/lib/seo/site";

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
    category: "sports science",
    alternates: {
      canonical: path,
    },
    creator: CREEDA_LEGAL_ENTITY,
    keywords: uniqueKeywords,
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(path),
      siteName: SITE_NAME,
      type: "website",
      locale: SITE_LOCALE,
      alternateLocale: [...SITE_ALTERNATE_LOCALES],
      images: [
        {
          url: getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE.path),
          width: DEFAULT_SOCIAL_IMAGE.width,
          height: DEFAULT_SOCIAL_IMAGE.height,
          alt: DEFAULT_SOCIAL_IMAGE.alt,
        },
      ],
    },
    publisher: CREEDA_LEGAL_ENTITY,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE.path)],
    },
  };
}
