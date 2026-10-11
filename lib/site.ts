import type { Metadata } from "next";

// Змініть на власний домен, коли він з’явиться (також у public/robots.txt і public/sitemap.xml).
export const SITE_URL = "https://svoye-career-path.vasil-rybiy.chatgpt.site";
export const OG_IMAGE = { url: "/og-image.jpg", width: 1200, height: 630, alt: "Своє: знайди свій напрям, перевір його в дії" };

type Meta = { title: string; description: string; path: string; noindex?: boolean };

export function pageMeta({ title, description, path, noindex }: Meta): Metadata {
  const full = `${title} | Своє`;
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "uk_UA", siteName: "Своє", url: path, title: full, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: full, description, images: [OG_IMAGE.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
