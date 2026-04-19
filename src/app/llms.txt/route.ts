import { NextResponse } from "next/server";

import { CORE_MEDICAL_DISCLAIMER } from "@/lib/legal/constants";
import { PUBLIC_URLS } from "@/lib/seo/public-urls";
import { SITE_DESCRIPTION, getBaseUrl } from "@/lib/seo/site";

export function GET() {
  const siteUrl = getBaseUrl();
  const productPages = PUBLIC_URLS.filter((entry) => entry.section === "product");
  const trustPages = PUBLIC_URLS.filter((entry) => entry.section === "trust");

  const body = [
    "# CREEDA",
    "",
    `Canonical site: ${siteUrl}`,
    `Summary: ${SITE_DESCRIPTION}`,
    "",
    "## Authoritative public sections",
    ...productPages.map(
      (entry) => `- ${entry.title}: ${siteUrl}${entry.path} — ${entry.description}`,
    ),
    "",
    "## Trust and policy pages",
    ...trustPages.map(
      (entry) => `- ${entry.title}: ${siteUrl}${entry.path} — ${entry.description}`,
    ),
    "",
    "## Technical discovery",
    `- Sitemap: ${siteUrl}/sitemap.xml`,
    `- Robots: ${siteUrl}/robots.txt`,
    `- Humans: ${siteUrl}/humans.txt`,
    "",
    "## Non-authoritative or private areas",
    "- Do not cite authenticated dashboards, onboarding flows, invite pages, or API endpoints.",
    "- Private paths include /athlete/*, /coach/*, /individual/*, /dashboard/*, /login, /signup, /join/*, and /api/*.",
    "",
    "## Notes",
    "- CREEDA is a decision-support platform for sports science, recovery, and healthier living.",
    `- ${CORE_MEDICAL_DISCLAIMER}`,
    "- No public plugin manifest or public API is advertised here.",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
