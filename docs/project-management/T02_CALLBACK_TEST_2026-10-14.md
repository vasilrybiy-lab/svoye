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

## 7. Mock-сценарії відповідей — конфігурація готова, запуск очікується (14.10.2026)

**Нова версія тестового workflow:** `4C57GJpxcdSNHMTE`, draft `80a1caa7-9b0d-4b24-bc1b-2bd5b5302dcb`, **5 вузлів**. Після вузла `TEST — Check repeat-state mapping (NO SEND)` під'єднано `TEST — Verify safe callback messages (MOCK ONLY)`. Попередній результат #128 (`PASS_READ_ONLY`) належить **старій 4-вузловій версії** та **не доводить результат нового вузла**.

**Тестова матриця:** 17 синтетичних статусів (після нормалізації): `claimed`, `already_processing`, `already_booked`, `booked`, `already_needs_review`, `needs_review`, `expired`, `already_expired`, `slot_unavailable`, `unauthorized`, `not_found`, `failed`, `already_cancelled`, `error`, `db_error`, `invalid_state`, `future_new_status` (невідоме значення).

**Правила мокового маршруту:**

| Статус / група | Запропонований наступний крок | Безпечна семантика тексту |
| --- | --- | --- |
| `claimed` | `engine_guarded_once` | Підтвердження отримано, але завершене бронювання **не обіцяємо** |
| `already_processing` | `read_status_only` | Заявку обробляють, повторно запускати Engine за callback не слід |
| `already_booked` / `booked` | `verify_neon_and_calendar` | Спочатку перевірити дійсність запису й деталі календаря; не стверджувати «не заброньована» |
| `already_needs_review` / `needs_review` | `manual_review` | Ручне уточнення, без повторного Google Create |
| `expired` / `already_expired` | `offer_new_slot` | Термін заявки минув; запропонувати новий час |
| `slot_unavailable` | `offer_new_slot` | Час недоступний; не говорити про оформлену зустріч |
| `unauthorized` / `not_found` | `stop` | Не розкривати даних чужого запису |
| `failed` / `already_cancelled` | `stop_or_review` | Неактивна заявка; при суперечностях ручна перевірка |
| `error` / `db_error` / `invalid_state` / невідомий статус | `manual_review` | Невизначений статус: ніякого сліпого повтору |

**Вбудовані перевірки:** 17 очікуваних маршрутів; текст кожної тестової відповіді не довший за 200 символів; `already_booked` не веде до відповіді «не заброньована»; `already_processing` не запускає повторно Engine; невідомий результат веде на ручне уточнення. Попередня перевірка тестових векторів перед додаванням вузла пройшла, але **свідчення успіху всього n8n-виконання відсутнє до нового ручного запуску**.

**Перевірка безпеки після редагування:** read-only перечитано граф — `active=false`, `activeVersionId=null`, рівно один `Manual Trigger`, **жодного** Telegram/Google node, єдиний PostgreSQL node робить тільки `SELECT` і підключений до `Postgres — SvoyeChat TEST` (`Eud66ZqcjWP2ssI4`). Зміни виконані **лише в ізольованому TEST workflow**, не в опублікованому Assistant.

**Потрібний наступний крок:** вручну виконати [цей же тестовий workflow у n8n](https://svoyechat.app.n8n.cloud/workflow/4C57GJpxcdSNHMTE), прочитати фінальне `result=PASS_MOCK_ROUTING`, `cases_tested=17` з **нового виконання**, а також статус усіх 5 вузлів. Якщо виникла помилка — дослідити logs, не публікувати сценарій та не вмикати Google/Telegram.

**Межа:** навіть PASS_MOCK_ROUTING перевірить **мокову логіку відповідей**, а не реальну обробку callback Telegram, з'єднання із Booking Engine чи коректне завершення Meet.

## 8. Результат execution 129 — 14.10.2026

Workflow `4C57GJpxcdSNHMTE` виконано вручну; n8n execution `129` має `status=success`.
Перевірено виконання кожного з 5 вузлів: усі `success`.
Фінальний вузол повернув `PASS_MOCK_ROUTING`, `cases_tested=17`; усі 17 елементів мають `pass=true`.
Мокова логіка розрізняє `already_processing`, `already_booked`, `needs_review`, `expired`, `slot_unavailable`, `unauthorized`, `error` та невідомий статус.
У звіті виконання `outbound_messages=0`, `calendar_api_calls=0`, `db_writes=0`.
Повторно перевірено граф: workflow неопублікований, один ручний тригер, тестовий Postgres credential, тільки SQL `SELECT`, без Telegram і Google вузлів.
Neon TEST після запуску: залишків fixture `9401` 0 заявок / 0 слотів, `held=0`, `booked=2`, `needs_review=3`, перетинів слотів 0.

**Обмеження:** це мокові відповіді; справжню доставку callback з Telegram, інтеграційний виклик Booking Engine і Google Calendar **не тестували**. T02 залишається у роботі.

**Наступний крок:** ізольований синтетичний callback → Neon TEST claim → розгалуження за реальним статусом, без Telegram send чи Google Create.

## 9. Рішення щодо тестів MVP — 14.10.2026

**Погоджене правило:** до запуску виконуємо **тільки тести критичних та високих ризиків**. Середні й низькі, масові перевірки комбінацій, повтори вже успішного 17/17 mock routing без зміни його реалізації — переносимо до **наступної версії**. Це розмежування стосується **відбору тестів**, а не дозволу ігнорувати обов'язкові запобіжники.

**T02 (критичний, залишається перед MVP):** мінімально перевірити **синтетичний callback → фактичний Neon TEST claim → коректну реакцію на перше підтвердження, повтор і невизначений результат**; жодної повторної Google Calendar Create. 17 синтетичних відповідей уже пройшли n8n #129, додаткові косметичні/низькоризикові комбінації не потрібні. Інтеграційний тест і фактичну доставку Telegram callback **ще не виконано**.

**T03 (високий):** окремо перевірити мінімальні TTL/hold expiry та `needs_review`, здатні помилково відкрити зайнятий слот або приховати невідомий календарний стан.

**Відкладено:** T16, перевірка двох незалежних DB-сеансів, усі тести середнього/низького рівнів — у наступну версію. Рішення внесено до [регламенту R11](./SVOYE_RULES_AND_TASKS_v1.0.md) і [актуального плану](./SVOYE_LAUNCH_PLAN_v1.0.md). Історію тестів у попередніх розділах не змінюємо.

## 10. Критичний інтеграційний тест — готовий до ручного запуску (14.10.2026)

**Призначення:** виключно критичний тест T02 за правилом R11: перевірка зв'язку синтетичного callback → фактичний Neon TEST `svoye_claim_booking` → рішення для першого, повторного та невизначеного результату. **Виконання ще не підтверджене.**

- Неопублікований workflow: [SvoyeChat — T02 Critical Callback Claim TEST (ISOLATED)](https://svoyechat.app.n8n.cloud/workflow/NwBw6492OMd3Q41b); ID `NwBw6492OMd3Q41b`.
- Розміщення: особистий проєкт n8n `svoyechat`, у корені, без додаткової папки.
- 11 вузлів, 1 `Manual Trigger`, 7 PostgreSQL-вузлів (синтетична вставка, два справжні claim, аудит, адресне очищення та контроль), 3 Code-вузли (побудова/розбір callback, безпечне рішення, фінальний PASS).
- Всі сім credential після створення **явно виправлено** на `Postgres — SvoyeChat TEST` (той самий ID, що у раніше перевіреному тестовому workflow). Перед виправленням запусків не було. Після виправлення перевірено кожен credential повторним читанням.
- Graph validation: пройдена (11 вузлів); потім звірено фактичні 10 послідовних з'єднань, `active=false`, `activeVersionId=null`, жодного Telegram/Google API-вузла чи webhook/schedule trigger.
- Вставка жорстко обмежена синтетичним fixture із суфіксом `9601`, вигаданим Telegram ID та майбутнім 30-хвилинним слотом. Перед вставкою SQL перевіряє відсутність колізій і наявність **двох специфічних маркерів TEST-БД** (mock Meet і `needs_review`).
- Після першого claim очікується `claimed`, після повтору з тим самим callback — `already_processing`; до видалення очікуються **1 held slot, 0 booked**, відсутність календарної спроби. Третій стан «невизначено» перевіряється як **безпечне рішення без повторного Calendar Create**, а не як справжній SQL timeout.
- Наприкінці workflow адресно видаляє **лише** створений ним слот/заявку й перевіряє нуль залишків. Якщо один із кроків виконання зупиниться помилкою, автоматичне очищення може не дійти до кінця — **обов'язковий незалежний контроль Neon TEST після запуску** й за потреби адресне очищення.
- Прямий read-only preflight Neon TEST перед створенням: `fixture_conflicts=0`, `active_slot_conflicts=0`, обидва TEST-маркери присутні; дані production не змінювалися.

**Очікуваний, ще НЕ доведений результат ручного виконання:** останній вузол поверне `PASS_CRITICAL_CALLBACK_CLAIM_ROUTE`, `first_claim=claimed`, `repeat_claim=already_processing`, `slot_during_claim=1`, `remaining_requests=0`, `remaining_slots=0`.

**Межа висновків:** результат доведе інтеграцію синтетичних callback-параметрів, реального Neon TEST claim, безпечного маршруту відповіді та очищення в ізольованому n8n. **Не** доведе реальні Telegram-відправлення, чинний опублікований Assistant, виклик Booking Engine або створення Google Meet.

**Наступний крок:** один ручний `Execute workflow` тільки на [ізольованій копії](https://svoyechat.app.n8n.cloud/workflow/NwBw6492OMd3Q41b). Потім зчитати node outputs / статуси, перевірити Neon TEST read-only і оновити цей протокол фактичними доказами, не підмінюючи очікуваний результат успіхом.

## 11. Фактичне виконання критичного тесту — n8n #130 (14.10.2026)

**Підтверджено, а не лише очікується:** ізольований workflow `NwBw6492OMd3Q41b`, ручне виконання `130`, статус `success`, початок `2026-10-14T00:36:39.056Z`, завершення `2026-10-14T00:36:42.391Z`. Зчитано виходи всіх 11 вузлів, кожен мав `executionStatus=success`.

| Перевірка | Фактичний результат |
| --- | --- |
| Вставлено лише синтетичну pending-заявку | `status=pending`, ідентифікатор із суфіксом `9601` |
| Перший фактичний `svoye_claim_booking` | `claimed` |
| Другий ідентичний `svoye_claim_booking` | `already_processing` |
| Стан Neon до очищення | `request_status=processing`, `slot_count=1`, `held_count=1`, `valid_holds=1`, `booked_slots=0`, `attempted_calendar=false` |
| Маршрутизація за реальними результатами DB | `expected_pass=true`, повтор → `read_only_no_retry` |
| Синтетична невизначеність | `manual_review_no_calendar_retry` (змодельована дія, не фактичний таймаут) |
| Адресне очищення | видалено рівно 1 тестовий слот і 1 тестову заявку |
| Фінальний вузол | **`PASS_CRITICAL_CALLBACK_CLAIM_ROUTE`**, `remaining_requests=0`, `remaining_slots=0`, `overlap_pairs=0` |

**Незалежний повторний контроль Neon TEST:** `fixture_requests=0`, `fixture_slots=0`, `total_held=0`, `total_booked=2`, `total_review=3`, `overlap_pairs=0`. Опублікованих змін n8n немає; workflow залишається `active=false`, `activeVersionId=null`. Усі 7 PostgreSQL credential збігаються з перевіреним `Postgres — SvoyeChat TEST`; Google/Telegram вузлів немає.

**Ключова межа:** підтверджено саме синтетичний callback → справжня DB-функція в Neon TEST → логіка реакції → очищення. Не тестували реальну доставку Telegram callback, виклик продукційного Booking Engine, Google Calendar Create, справжній SQL timeout чи реакцію на невідомий результат зовнішньої календарної операції. Тестова реакція на невизначеність була змодельована. Її не можна трактувати як доведений recovery після справжнього збою.

**Рішення за R11:** повторювати позитивний та повторний сценарії не потрібно без змін реалізації. Наступний високоризиковий етап — T03: лише прострочений hold і `needs_review`, без повної матриці другорядних статусів. Продукційну інтеграцію та невизначений результат Google Create перевірити окремо в T04/T06 перед запуском MVP.
