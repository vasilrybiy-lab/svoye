import type { Metadata } from "next";
import "./globals.css";

// Змініть на власний домен, коли він з'явиться (також у public/robots.txt і public/sitemap.xml).
const SITE_URL = "https://svoye-career-path.vasil-rybiy.chatgpt.site";
const TITLE = "Своє — профорієнтація для старшокласників";
const DESCRIPTION = "Не знаєш, куди вступати після школи? Розмова, малі проби й план: напрями, навчання та перспективи. Для старшокласників і батьків.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | Своє" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website", locale: "uk_UA", siteName: "Своє", url: "/",
    title: TITLE, description: DESCRIPTION,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Своє: знайди свій напрям, перевір його в дії" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.jpg"] },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Своє",
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: "uk",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uk"><body>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    {children}
  </body></html>;
}
