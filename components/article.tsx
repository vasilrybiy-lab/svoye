import Link from "next/link";
import MobileMenu from "@/components/mobile-menu";

export type Section = { h: string; p?: string[]; list?: string[] };
type Props = { title: string; lead: string; sections: Section[]; cta: { text: string; href: string; label: string } };

export default function Article({ title, lead, sections, cta }: Props) {
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: title, inLanguage: "uk", datePublished: "2026-10-10", publisher: { "@type": "Organization", name: "Своє" } };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    <header className="site-header"><Link className="logo" href="/" aria-label="Своє — головна сторінка">своє<span>.</span></Link><MobileMenu /><Link className="header-cta" href="/#contact">Поговорімо</Link></header>
    <main className="article section-pad">
      <p className="eyebrow">КОРИСНЕ ДЛЯ ВИБОРУ</p>
      <h1>{title}</h1>
      <p className="article-lead">{lead}</p>
      {sections.map((s) => <section key={s.h}><h2>{s.h}</h2>{s.p?.map((t) => <p key={t}>{t}</p>)}{s.list && <ul>{s.list.map((i) => <li key={i}>{i}</li>)}</ul>}</section>)}
      <aside className="article-cta"><p>{cta.text}</p><Link href={cta.href}>{cta.label}</Link></aside>
    </main>
    <footer><Link className="logo" href="/">своє<span>.</span></Link><p>Простір для вибору, який починається з людини.</p><Link href="/">На головну</Link><small>© {new Date().getFullYear()} своє.</small></footer>
  </>;
}
