import type { MetadataRoute } from "next";

import { PUBLIC_URLS } from "@/lib/seo/public-urls";
import { getAbsoluteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_URLS.map((entry) => ({
    url: getAbsoluteUrl(entry.path),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
