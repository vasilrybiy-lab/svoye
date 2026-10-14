# T02 — ізольований тест повторного Telegram-підтвердження

**Дата:** 14.10.2026  
**Статус:** тестовий ручний запуск n8n **перевірено / PASS_READ_ONLY**; повний Telegram callback та інтеграційна маршрутизація **ще не перевірені**. T02 залишається в роботі.  
**Дозвіл власника:** створити неопубліковану ізольовану тестову копію й перевірити синтетичні повторні натискання, без зміни робочого бота, реального Google Calendar і робочої Neon.

## 1. Створено ізольований n8n workflow

- Назва: `SvoyeChat — Callback Double Click TEST (ISOLATED)`
- Workflow ID: `4C57GJpxcdSNHMTE`
- URL: https://svoyechat.app.n8n.cloud/workflow/4C57GJpxcdSNHMTE
- Розміщення: особистий проєкт n8n `svoyechat` (root, без окремої папки).
- **Неопублікований та неактивний:** `active=false`, `activeVersionId=null`.
- 4 вузли: лише `Manual Trigger`, генератор двох однакових синтетичних callback, PostgreSQL read-only node і локальна перевірка відображення статусів.
- Жодного вузла Telegram, Google Calendar, Google Meet, webhook чи schedule trigger.
- Єдиний DB credential: `Postgres — SvoyeChat TEST`, ID `Eud66ZqcjWP2ssI4`; зіставлений з credential в наявному ізольованому Booking Engine TEST.
- SQL у новому workflow — лише `SELECT`, без `INSERT/UPDATE/DELETE/DDL`.
- Код workflow **пройшов SDK-валидацію** (4 вузли). Весь граф після створення повторно прочитано та звірено.

**Технічна пересторога:** під час створення n8n автоматично вибрав `Postgres account` замість TEST credential. **До будь-якого запуску** його замінено на правильний credential ID `Eud66ZqcjWP2ssI4`, потім перевірено повторним read-only читанням нод. З помилковим credential тест **не запускався**.

## 2. Синтетичний double-click на Neon TEST — виконано

**База:** `morning-cake-04594300`, **гілка:** `test/booking-engine-v1` (`br-delicate-heart-b7h6nwzw`).

Створено **одну** синтетичну pending-заявку (ID із суфіксом `9401`) на 18.11.2026 14:00–14:30 за Києвом; вигаданий telegram user/chat ID, несправжній номер, SHA-256 від вигаданого токена. До вставляння перевірено відсутність колізій ID, hash та слота.

Виконано двічі `svoye_claim_booking` з **ідентичними параметрами**:

| Виклик | Очікувано | Фактично | Результат |
| --- | --- | --- | --- |
| Перший callback, pending → processing | `claimed` | `claimed` | PASS |
| Повтор того самого callback | `already_processing` | `already_processing` | PASS |

Після двох викликів: **1** slot `held`, **0** slot `booked`, **0** slot `needs_review`; заявка в `processing`, термін hold дійсний. Другий виклик не створив додаткового слота. Жодних календарних операцій і реальних повідомлень.

**Очищення:** одна транзакція видалила рівно **1** створений slot `held` та **1** синтетичну booking request. Незалежна повторна перевірка: залишок **0 заявок / 0 слотів**, перетинів активних слотів **0**, `booked=2`, `needs_review=3`, `held=0` — попередні контрольні значення збережені.

## 3. Перевірено SQL, використаний у новому n8n workflow

Точний SELECT із неопублікованого workflow запущено окремо на **Neon TEST** без змін даних.

- Mock-fixture `…9201`: `booked` → `already_booked`; ознака `test://mock-no-real-meet/` присутня.
- Mock-fixture `…9203`: `needs_review` → `already_needs_review`.
- Обидві перевірки `safe_fixture = true`.

Це доводить правильність SQL і станів fixtures у тестовій БД; **не є доказом виконання цього workflow в n8n**.

## 4. Обмеження та блокери

- Доступний конектор n8n підтримує створення, редагування, читання, історію та перегляд виконань, **але не має дії для запуску тестового workflow**. Тому ручний запуск n8n тут не виконували й **не позначаємо його як PASS**.
- На цьому кроці протестовано **два послідовні однакові виклики DB-функції**, а не два доставлені callback Telegram і не справжню конкурентність двох DB-сесій (остання відкладена як T16 після MVP).
- Поточна неопублікована чернетка робочого Assistant досі направляє `already_booked` та `already_processing` до загальної відповіді «зустріч не заброньована», що потребує виправлення **у тестовій копії перед майбутньою публікацією**. Основний Assistant не змінювався.
- Створений n8n workflow — безпечний **read-only harness для перевірки граничних статусів**, не заміна повного інтеграційного тесту Telegram callback → Claim → Engine.

## 5. Наступний крок

1. У n8n **лише вручну** натиснути `Execute workflow` на [неопублікованій тестовій копії](https://svoyechat.app.n8n.cloud/workflow/4C57GJpxcdSNHMTE) і перед запуском звірити, що вузол `TEST Neon — Read fixture statuses ONLY` використовує `Postgres — SvoyeChat TEST`. Очікується `PASS_READ_ONLY`. Якщо є підозра на production-з'єднання — не запускати.
2. Прочитати виконання, задокументувати результат або причину помилки. **Не робити висновок, що Telegram доставив callback**, навіть якщо read-only harness виконався.
3. Підготувати ізольовану тестову гілку з моковим Telegram callback і відокремленими, правдивими відповідями для `claimed`, `already_processing`, `already_booked`, `needs_review`, `expired`, `slot_unavailable` і `error`; без реальних відправлень і створення Google Meet.
4. Після інтеграційної перевірки — T03 TTL/hold expiry, не повторюючи сліпо можливий Calendar Create.

**Повʼязані документи:** [Реєстр задач](./SVOYE_RULES_AND_TASKS_v1.0.md) · [Оперативний план](./SVOYE_LAUNCH_PLAN_v1.0.md) · [Попередній протокол T02](./T02_TEST_REPORT_2026-10-14.md).


## 6. Перевірений ручний запуск n8n — execution #128 (14.10.2026)

**Доказ:** ізольований workflow `4C57GJpxcdSNHMTE`, виконання `128`, `mode=manual`, `status=success`, початок `2026-10-14T00:14:10.012Z`, завершення `2026-10-14T00:14:12.642Z`.

Прочитано **фактичні outputs усіх чотирьох вузлів**, а не лише загальний статус n8n:

| Вузол | Статус | Перевірений вихід |
| --- | --- | --- |
| `TEST — Manual Trigger (read-only)` | success | {} |
| `TEST — Two identical synthetic callbacks` | success | `source=SYNTHETIC_TEST_ONLY`, `same_data=true`; обидва сформовані callback payload ідентичні (без реальної доставки) |
| `TEST Neon — Read fixture statuses ONLY` | success | 2 fixture-рядки: `booked → already_booked`, `needs_review → already_needs_review`; для обох `safe_fixture=true` |
| `TEST — Check repeat-state mapping (NO SEND)` | success | **`result=PASS_READ_ONLY`**, `outbound_messages=0`, `calendar_operations=0`, `db_writes=0` |

**Після запуску:** повторно перевірено незалежним `SELECT` із прямим зазначенням гілки Neon TEST: раніше використаний синтетичний fixture `…9401` має 0 залишкових заявок і 0 слотів; активних held=0; booked=2, needs_review=3 (попередні контрольні значення).

Повторно прочитано граф n8n: **`active=false`**, **`activeVersionId=null`**, 4 вузли, PostgreSQL має credential `Postgres — SvoyeChat TEST` (той самий id, що у Booking Engine TEST), SQL містить лише `SELECT`; Telegram/Google вузли відсутні. Твердження про нуль зовнішніх дій підтримується графом виконання, не тільки текстом Code-вузла.

**Межі результату:** це підтверджений ручний n8n read-only сценарій, а НЕ реальна подвійна доставка callback, НЕ два одночасні SQL claim, НЕ тест Google Calendar та НЕ реалізована маршрутизація клієнтських повідомлень.

**Актуальний наступний крок:** окремо в TEST-маршруті змоделювати та перевірити розрізнення `claimed`, `already_processing`, `already_booked`, `already_needs_review`, `expired`, `slot_unavailable`, `unauthorized` та SQL-error так, щоб відповідь не містила неправдивого «зустріч не заброньована» для `already_booked` і щоб жодна невизначена відповідь не запускала повторний Google Create. Жодних реальних відправлень.
