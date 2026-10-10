export default function MobileMenu() {
  return <details className="mobile-menu"><summary aria-label="Відкрити меню">Меню</summary>
    <div className="mobile-menu-panel">
      <a href="/approach">Підхід</a><a href="/#results">Результат</a><a href="/#useful">Корисне</a>
      <a href="/parents">Батькам</a><a href="/about">Про мене</a><a href="/reviews">Відгуки</a><a href="/#contact">Поговорімо</a>
    </div></details>;
}
