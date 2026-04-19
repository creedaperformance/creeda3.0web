import { NextResponse } from "next/server";

import {
  CREEDA_LEGAL_ENTITY,
  CREEDA_LEGAL_ENTITY_TYPE,
  CREEDA_OWNER_NAME,
  CREEDA_REGISTERED_ADDRESS,
} from "@/lib/legal/constants";
import { PUBLIC_URLS } from "@/lib/seo/public-urls";
import { SITE_SUPPORT_EMAIL, SITE_SUPPORT_PHONE, getBaseUrl } from "@/lib/seo/site";

export function GET() {
  const siteUrl = getBaseUrl();
  const publicPages = PUBLIC_URLS.map((entry) => `- ${entry.title}: ${siteUrl}${entry.path}`);

  const body = [
    "/* TEAM */",
    `Product: CREEDA`,
    `Legal Entity: ${CREEDA_LEGAL_ENTITY} (${CREEDA_LEGAL_ENTITY_TYPE})`,
    `Owner: ${CREEDA_OWNER_NAME}`,
    `Contact: ${SITE_SUPPORT_EMAIL} | ${SITE_SUPPORT_PHONE}`,
    `Location: ${CREEDA_REGISTERED_ADDRESS}`,
    "",
    "/* SITE */",
    `Canonical URL: ${siteUrl}`,
    "Stack: Next.js 16, React 19, TypeScript, Supabase",
    "",
    "/* PUBLIC PAGES */",
    ...publicPages,
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
