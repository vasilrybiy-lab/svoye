import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { articles } from "@/lib/articles";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Корисне: статті про вибір професії",
  description: "Статті для старшокласників і батьків: що робити, якщо не знаєш, куди вступати, як обрати спеціальність, що таке ікігай і які запитання допомагають зрозуміти себе.",
  path: "/korysne",
});

const groups = [
  { h: "Для старшокласників", k: "school" },
  { h: "Для батьків", k: "parents" },
] as const;

export default function Page() {
  return <>
    <SiteHeader />
    <main className="article section-pad">
      <p className="eyebrow">КОРИСНЕ ДЛЯ ВИБОРУ</p>
      <h1>Статті про вибір професії й навчання</h1>
      <p className="article-lead">Практичні матеріали для тих, хто шукає напрям після школи, і для батьків, які хочуть підтримати цей пошук.</p>
      {groups.map((g) => <section key={g.k}><h2>{g.h}</h2><ul className="hub-list">{articles.filter((a) => a.audience === g.k).map((a) => <li key={a.slug}><a href={`/${a.slug}`}><strong>{a.title}</strong><span>{a.description}</span></a></li>)}</ul></section>)}
    </main>
    <SiteFooter />
  </>;
}
