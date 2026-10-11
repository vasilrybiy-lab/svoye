import Link from "@/components/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { articles, type ArticleData } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

const MONTHS = ["січня","лютого","березня","квітня","травня","червня","липня","серпня","вересня","жовтня","листопада","грудня"];
const fmt = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

export default function Article({ article }: { article: ArticleData }) {
  const url = `${SITE_URL}/${article.slug}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, inLanguage: "uk",
    datePublished: "2026-10-10", dateModified: article.updated, mainEntityOfPage: url, image: `${SITE_URL}/og-image.jpg`,
    author: { "@type": "Organization", name: "Своє", url: SITE_URL }, publisher: { "@type": "Organization", name: "Своє", url: SITE_URL },
  };
  const related = articles.filter((a) => a.slug !== article.slug);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    <SiteHeader />
    <main className="article section-pad">
      <p className="eyebrow">КОРИСНЕ ДЛЯ ВИБОРУ</p>
      <h1>{article.title}</h1>
      <p className="article-meta">Команда «Своє» · Оновлено {fmt(article.updated)}</p>
      <p className="article-lead">{article.lead}</p>
      {article.sections.map((s) => <section key={s.h}><h2>{s.h}</h2>{s.p?.map((t) => <p key={t}>{t}</p>)}{s.list && <ul>{s.list.map((i) => <li key={i}>{i}</li>)}</ul>}</section>)}
      <aside className="article-cta"><p>{article.cta.text}</p><Link href={article.cta.href}>{article.cta.label}</Link></aside>
      <section className="related"><h2>Читайте також</h2><ul className="related-list">{related.map((a) => <li key={a.slug}><a href={`/${a.slug}`}>{a.title}</a></li>)}<li><a href="/korysne">Усі статті</a></li></ul></section>
    </main>
    <SiteFooter />
  </>;
}
