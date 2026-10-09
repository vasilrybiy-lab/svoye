import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Своє — знайти напрям через дію",
  description: "Розмова, напрями, які варто спробувати, практичні задачі та варіанти навчання для старшокласників і їхніх родин.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uk"><body>{children}</body></html>;
}
