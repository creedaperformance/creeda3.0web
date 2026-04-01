import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Devanagari, Poppins } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { NavbarWrapper } from "@/components/navbar-wrapper";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Toaster } from "sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FF9933",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Creeda — Digital Sports Scientist for Athletes and Everyday India",
  description:
    "AI-powered guidance for athlete performance, recovery, healthier living, and sport entry. Built for Indian athletes and everyday Indian routines.",
  keywords: [
    "sports science India",
    "video analysis cricket",
    "athlete training app",
    "healthy living app India",
    "fitness guidance India",
    "pose estimation",
    "badminton form analysis",
    "Indian sports technology",
    "fitness app India",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Creeda",
  },
  openGraph: {
    title: "Creeda — Digital Sports Scientist for Athletes and Everyday India",
    description:
      "AI-powered performance and healthy-living guidance for Indian athletes and individuals",
    type: "website",
    locale: "en_IN",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body
        className={`${poppins.variable} ${geistMono.variable} ${notoDevanagari.variable} antialiased`}
      >
        <LanguageProvider>
          <NavbarWrapper>
            <Navbar />
          </NavbarWrapper>
          <main className="min-h-[100dvh]">{children}</main>
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: {
                background: "var(--card)",
                border: "1px solid var(--border-bright)",
                color: "var(--foreground)",
              },
            }}
          />
        </LanguageProvider>
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
              if ('serviceWorker' in navigator && !isLocalHost) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => {
                      reg.update();
                      console.log('[SW] Registered:', reg.scope);
                    })
                    .catch(err => console.log('[SW] Registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
