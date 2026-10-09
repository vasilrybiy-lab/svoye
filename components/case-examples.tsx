"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const examples = [
  {
    id: "tech", name: "Логіка й техніка", signal: "Цікавість до логічних і цифрових задач", context: "Є досвід самостійного навчання і роботи з комп’ютером. Поки незрозуміло, яка саме щоденна робота за цим інтересом стоїть.",
    directions: ["Створення програм", "Захист цифрових систем", "Поєднання коду й пристрою"],
    trials: ["Програма для конкретної потреби", "Пояснене рішення навчальної задачі з безпеки", "Симуляція пристрою, що реагує на умови"],
    question: "Що захопило, що виснажило, чи хочеться продовжувати?",
  },
  {
    id: "stories", name: "Люди й історії", signal: "Інтерес до біології, людей і візуальних історій", context: "Уже був невеликий творчий досвід. Треба перевірити окремо інтерес до фактів, сценічної форми й організації процесу.",
    directions: ["Доступне пояснення складної теми", "Вигадана сцена про спілкування", "Координація малого творчого проєкту"],
    trials: ["Пояснити біологічне явище через сцену", "Порівняти два способи слухати в уявному діалозі", "Узгодити ролі й довести малу роботу до відгуку"],
    question: "Що сподобалося: факти, створення, розмова чи командні домовленості? Показ може лишитися приватним.",
  },
];

export default function CaseExamples({ audience = "parent" }: { audience?: "teen" | "parent" }) {
  const isTeen = audience === "teen";
  return <section className="case-section section-pad" id="case" aria-labelledby="case-title">
    <div className="case-heading">
      <div><p className="eyebrow">ПРИКЛАДИ З ПІЛОТНОЇ РОБОТИ</p><h2 id="case-title">{isTeen ? <>Що цікаво —<br/><em>що спробувати.</em></> : <>Від сигналів —<br/><em>до перевірки.</em></>}</h2></div>
      <p>{isTeen ? "Два знеособлені приклади з пілотної роботи з родинами. Подивись, як різні інтереси підказують напрями, які варто спробувати, і конкретні задачі для перевірки." : "Два знеособлені приклади з пілотної роботи з родинами. Вони показують, як інтереси перетворюються на робочі гіпотези та план практичних проб."}</p>
    </div>
    <Tabs defaultValue="tech" className="case-tabs">
      <TabsList className="case-list" aria-label="Приклади з пілотної роботи">{examples.map(example => <TabsTrigger value={example.id} key={example.id} className="case-trigger">{example.name}</TabsTrigger>)}</TabsList>
      {examples.map(example => <TabsContent value={example.id} key={example.id} className="case-content">
        <div className="case-board">
          <div className="case-column"><span className="case-number">01 / ПОЧУЛИ</span><h3>{example.signal}</h3><p>{example.context}</p></div>
          <div className="case-column"><span className="case-number">02 / {isTeen ? "ОБРАЛИ НАПРЯМИ" : "ПРИПУСТИЛИ"}</span><h3>{isTeen ? "Напрями, які варто спробувати" : "Три робочі напрями"}</h3><ul>{example.directions.map(item => <li key={item}>{item}</li>)}</ul><p>{isTeen ? "Кожен напрям ще треба перевірити в дії. Можна змінити думку після проби." : "Це гіпотези для перевірки, а не перелік «призначених» професій."}</p></div>
          <div className="case-column case-action"><span className="case-number">03 / ПЛАН ПЕРЕВІРКИ</span><h3>Заплановані проби</h3><ul>{example.trials.map(item => <li key={item}>{item}</li>)}</ul><p>Що обговорити після проби: {example.question}</p></div>
        </div>
      </TabsContent>)}
    </Tabs>
    <p className="case-caption">Приклади адаптовано з матеріалів пілотної роботи з родинами: імена та особисті обставини вилучено, формулювання скорочено. Тут показано {isTeen ? "напрями" : "гіпотези"} й заплановані проби, а не підтверджені результати їх виконання. Повні презентації не публікуються.</p>
  </section>;
}
