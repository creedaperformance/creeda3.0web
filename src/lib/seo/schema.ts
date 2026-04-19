import {
  CREEDA_LEGAL_ENTITY,
  CREEDA_OWNER_NAME,
  CREEDA_REGISTERED_ADDRESS,
} from "@/lib/legal/constants";
import {
  DEFAULT_SOCIAL_IMAGE,
  SITE_DESCRIPTION,
  SITE_LANGUAGES,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_SUPPORT_EMAIL,
  SITE_SUPPORT_PHONE,
  getAbsoluteUrl,
  getBaseUrl,
} from "@/lib/seo/site";

type WebPageType = "WebPage" | "CollectionPage" | "AboutPage";

export function getOrganizationId() {
  return `${getBaseUrl()}/#organization`;
}

export function getWebsiteId() {
  return `${getBaseUrl()}/#website`;
}

export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": getOrganizationId(),
    name: SITE_NAME,
    legalName: CREEDA_LEGAL_ENTITY,
    url: getBaseUrl(),
    logo: getAbsoluteUrl("/icons/icon-512.png"),
    image: getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE.path),
    email: SITE_SUPPORT_EMAIL,
    telephone: SITE_SUPPORT_PHONE,
    founder: {
      "@type": "Person",
      name: CREEDA_OWNER_NAME,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "11, Rajshi Mansion, 4th Pasta Lane, Colaba",
      addressLocality: "Mumbai",
      addressRegion: "Maharashtra",
      postalCode: "400005",
      addressCountry: "IN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE_SUPPORT_EMAIL,
        telephone: SITE_SUPPORT_PHONE,
        areaServed: "IN",
        availableLanguage: [...SITE_LANGUAGES],
      },
    ],
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    knowsLanguage: [...SITE_LANGUAGES],
    description: `${SITE_DESCRIPTION} Registered address: ${CREEDA_REGISTERED_ADDRESS}.`,
  };
}

export function createWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": getWebsiteId(),
    url: getBaseUrl(),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: [...SITE_LANGUAGES],
    publisher: {
      "@id": getOrganizationId(),
    },
  };
}

type CreateWebPageSchemaOptions = {
  description: string;
  imagePath?: string;
  path: string;
  title: string;
  type?: WebPageType;
};

export function createWebPageSchema({
  description,
  imagePath = DEFAULT_SOCIAL_IMAGE.path,
  path,
  title,
  type = "WebPage",
}: CreateWebPageSchemaOptions) {
  const url = getAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: SITE_LANGUAGE,
    isPartOf: {
      "@id": getWebsiteId(),
    },
    about: {
      "@id": getOrganizationId(),
    },
    publisher: {
      "@id": getOrganizationId(),
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: getAbsoluteUrl(imagePath),
    },
  };
}

export function createWebApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${getBaseUrl()}/#webapplication`,
    name: SITE_NAME,
    url: getBaseUrl(),
    description: SITE_DESCRIPTION,
    applicationCategory: "Sports science and healthy-living web application",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and a modern browser.",
    inLanguage: [...SITE_LANGUAGES],
    creator: {
      "@id": getOrganizationId(),
    },
    publisher: {
      "@id": getOrganizationId(),
    },
    image: getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE.path),
    featureList: [
      "Athlete readiness and load guidance",
      "Coach intervention and team review workflows",
      "Healthy-living and recovery recommendations",
      "Video analysis and phone-based testing",
      "Explainable confidence and data-quality signals",
    ],
  };
}
