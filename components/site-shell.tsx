import Link from "@/components/link";
import MobileMenu from "@/components/mobile-menu";

export function SiteHeader() {
  return <header className="site-header"><Link className="logo" href="/" aria-label="Своє — головна сторінка">своє<span>.</span></Link>
    <nav aria-label="Основна навігація"><a href="/approach">Підхід</a><a href="/parents">Батькам</a><a href="/about">Про мене</a><a href="/korysne">Корисне</a></nav>
    <MobileMenu /><Link className="header-cta" href="/#contact">Поговорімо</Link></header>;
}

export function SiteFooter() {
  return <footer><Link className="logo" href="/">своє<span>.</span></Link><p>Простір для вибору, який починається з людини.</p><Link href="/">На головну</Link><small>© {new Date().getFullYear()} своє.</small></footer>;
}
