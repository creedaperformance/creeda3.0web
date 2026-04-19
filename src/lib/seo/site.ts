import { getSiteUrl } from "@/lib/env";
import {
  CREEDA_LEGAL_ENTITY,
  CREEDA_SUPPORT_EMAIL,
  CREEDA_SUPPORT_PHONE,
} from "@/lib/legal/constants";

export const SITE_NAME = "CREEDA";
export const SITE_TITLE =
  "CREEDA — Digital Sports Scientist for Athletes and Everyday India";
export const SITE_DESCRIPTION =
  "AI-powered sports science, recovery, performance, and healthy-living guidance built for Indian athletes, coaches, and everyday routines.";
export const SITE_THEME_COLOR = "#FF5F1F";
export const SITE_BACKGROUND_COLOR = "#04070A";
export const SITE_LOCALE = "en_IN";
export const SITE_LANGUAGE = "en-IN";
export const SITE_ALTERNATE_LOCALES = ["hi_IN"] as const;
export const SITE_LANGUAGES = ["en-IN", "hi-IN"] as const;
export const SITE_CREATOR = CREEDA_LEGAL_ENTITY;
export const SITE_SUPPORT_EMAIL = CREEDA_SUPPORT_EMAIL;
export const SITE_SUPPORT_PHONE = CREEDA_SUPPORT_PHONE;

export const DEFAULT_SOCIAL_IMAGE = {
  path: "/creeda-performance-bgr.png",
  width: 1200,
  height: 800,
  alt: "CREEDA Performance brand artwork",
} as const;

export function getBaseUrl() {
  return getSiteUrl();
}

export function getAbsoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, getBaseUrl()).toString();
}

export function getCanonicalHost() {
  return new URL(getBaseUrl()).host;
}

export function getCanonicalProtocol() {
  return new URL(getBaseUrl()).protocol;
}
