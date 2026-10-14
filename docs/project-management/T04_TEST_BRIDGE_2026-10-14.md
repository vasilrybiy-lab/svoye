# T04 — критичний тест зв’язку Telegram callback → Neon → Booking Engine

**Дата підготовки:** 14.10.2026  
**Статус:** ізольований Parent→Child TEST **успішно виконано (#131, #132)**. Критична інтеграція production і реальні Telegram/Google Calendar далі **НЕ перевірені**.  
**Рівень ризику:** критичний — неправдиве підтвердження й подвійна календарна операція. За правилом R11 тести лише критичних сценаріїв до MVP.

## 1. Виявлена різниця між чернетками і production

- Опублікований Telegram Assistant `EIMvqNhFPhr6CdVW`: **5** вузлів; чернетка — **30**. У чернетці `Claim Booking — Neon → Booking Claimed?` при `claimed` веде на `Booking Reserved — Test.` → тестову Telegram-відповідь, а **не** на Booking Engine. Інші стани часто ведуть до загального «не заброньовано», що небезпечно для `already_booked`. Credential у чернетці має назву `Postgres account`; TEST прив’язка не доведена.
- Опублікований Booking Engine `NFz6ZNJuQKZkxzKU`: **13** вузлів; чернетка — **37**. `Create an event` вимкнений, його вхід від `Calendar Create Granted?` відсутній; одна гілка рішення не має маршруту до підтвердження.
- Booking Request `Eq18xvcRLJ901HoM` неопублікований; його тестова логіка окремо очікує інтеграції.
- На цьому етапі **жодну production-чернетку/опубліковану версію не редагували й не запускали**.

## 2. Створені два ізольовані тестові workflow

**Parent:** [SvoyeChat — T04 Telegram to Engine TEST (ISOLATED)](https://svoyechat.app.n8n.cloud/workflow/Zqq2NzKmho6rAkP4), ID `Zqq2NzKmho6rAkP4`.

- **14** вузлів, тільки `Manual Trigger`, 7 PostgreSQL-вузлів, 1 справжній `Execute Sub-workflow`; **жодних** Telegram/Google вузлів.
- Створює одну синтетичну TEST заявку `…9701` на 23.11.2026 14:00–14:30 Europe/Kyiv, парсить синтетичний callback тієї самої форми `confirm:COMPACT_UUID:TOKEN`, викликає реальну `svoye_claim_booking`, передає дані в дочірній Engine, після його результату повторює claim (очікувано `already_processing`), перевіряє рівно 1 `held` та 0 `booked`, виконує адресне очищення і перевіряє 0 залишків.
- На вході виклику дочірнього Engine передає всі **5 полів реального контракту**: `booking_id`, `telegram_user_id`, `chat_id`, `start_time`, `user_confirmed=true`.
- Синтетична заявка створюється тільки якщо не конфліктують ID, токен, вільний слот і є маркери вже наявних mock-fixtures у TEST-гілці. SQL видалення обмежене тим самим фіктивним ID, telegram ID, статусом `processing` і відсутністю Calendar Create.
- Фінальний **очікуваний** (але ще не спостережений) результат: `PASS_T04_CHILD_WORKFLOW_BRIDGE` та підтверджені 0 залишкових запитів/слотів.

**Child:** [SvoyeChat — T04 Engine Boundary TEST (READ ONLY)](https://svoyechat.app.n8n.cloud/workflow/ko3gMXLGy1DHNMq4), ID `ko3gMXLGy1DHNMq4`.

- 3 вузли: `When Executed by Another Workflow`, `Postgres SELECT` у TEST Neon і Code-вузол, який перевіряє синтетичне джерело, `user_confirmed`, час, ID, статус `processing`, один дійсний held slot і відсутність Calendar Create.
- Повертає лише `engine_verified_waiting_calendar_test_only`, `booking_confirmed=false`. **Не** повертає `booked` та **не** викликає реальний Google API.

**Безпека:** обидва workflow `active=false`, `activeVersionId=null`, у персональному проєкті `svoyechat` (корінь). **Усі 8 PostgreSQL-вузлів явно переведено** з автоматично призначеного `Postgres account` на `Postgres — SvoyeChat TEST` (credential ID `Eud66ZqcjWP2ssI4`) і повторно перевірено read-only. Parent → Child зв’язок `Execute Sub-workflow` підтверджено ID та `waitForSubWorkflow=true`; всі 13 + 2 внутрішніх переходи без обривів. У дочірнього вузла лише `SELECT`. Жодного реального Telegram send / Google Calendar Create.

## 3. Перевірки перед запуском

Виконано read-only контроль тестової гілки Neon `test/booking-engine-v1` (`br-delicate-heart-b7h6nwzw`):
- `fixture_conflicts=0`;
- `slot_conflicts=0`;
- `mock_marker=1` і `review_marker=1`;
- `overlap_pairs=0`;
- звірено синтетичний час за Києвом.

SDK-валидація Parent (**14 вузлів**) і Child (**3 вузли**) пройдена; після редагування перевірено workflow графи, credential, виклик дочірнього workflow і відсутність зовнішніх API. На цьому етапі **немає фактичного execution, отже тест не має статусу PASS**.

## 4. Інструкція до одного ручного запуску

1. Відкрити **тільки Parent** за URL вище (Child окремо вручну не запускати).
2. Переконатися, що це `SvoyeChat — T04 Telegram to Engine TEST (ISOLATED)`, а не робочий Assistant чи старий `Booking Engine TEST — DO NOT RUN`.
3. Один раз натиснути **Execute workflow**.
4. **Не натискати повторно у разі помилки.** Якщо Parent зупиниться до очищення, синтетична заявка може залишитися у TEST — перевірити стан і адресно очистити тільки власний fixture до повторної спроби.

Після запуску перевірити фактичні outputs Parent та Child, включно з проходженням `Execute Sub-workflow`, `claimed` / `already_processing`, відсутністю `booked`, нульовими викликами зовнішніх API та 0 залишками в Neon TEST. Результат документувати окремо.

## 5. Межі доказу й майбутній production-крок

Навіть якщо Parent поверне `PASS_T04_CHILD_WORKFLOW_BRIDGE`, це підтвердить **лише** фактичну оркестрацію двох неопублікованих workflow з реальним Neon TEST claim. Не доведе доставку реального Telegram callback, робочий Booking Engine, зайнятість Google Calendar, реальне створення Meet або реальний failure recovery після Google Create. Усе це перед MVP перевіряється **лише для критичних наслідків**. Додаткова згода власника необхідна перед реальним Google Calendar Create та публікацією.

**Наступний крок після успішного TEST handoff:** погодити правки неопублікованих чернеток Assistant/Engine для їх реального з’єднання з `claimed` і консервативними повторними/невизначеними статусами. Перед публікацією — незалежна критична перевірка безпеки й план відкату.

Див. [план запуску](./SVOYE_LAUNCH_PLAN_v1.0.md) і [реєстр задач R11](./SVOYE_RULES_AND_TASKS_v1.0.md).

## 6. Фактичне виконання Parent #131 і Child #132 (14.10.2026)

**Перевірено за даними виконань обох workflow, не тільки за загальним статусом.**

- Parent `Zqq2NzKmho6rAkP4`: execution **#131**, `manual`, `success`, 14/14 вузлів успішно, 2026-10-14T00:56:22.705Z–00:56:26.423Z.
- Child `ko3gMXLGy1DHNMq4`: execution **#132**, `integrated`, `success`, 3/3 вузлів успішно, 2026-10-14T00:56:25.639Z–00:56:25.804Z. Child отримав повний контракт з п’яти полів: `booking_id`, `telegram_user_id`, `chat_id`, `start_time`, `user_confirmed=true`.
- Справжній вузол `Execute Sub-workflow` Parent одержав від Child `engine_verified_waiting_calendar_test_only`; Child SQL перевірив `eligible=true`, `test_marker=true`, повернув `engine_input_verified=true` і **`booking_confirmed=false`**.
- Реальні DB-виклики: перший Neon TEST `svoye_claim_booking` → **`claimed`**, повтор з тим самим synthetic callback → **`already_processing`**. Проміжний аудит: `processing`, **1** slot `held`, **1** valid hold, **0** slot `booked`, `calendar_attempted=false`.
- Маршрут відповіді: клієнтові не стверджується, що зустріч створена; повтор не запускає ще одне бронювання; невизначена операція веде лише до змодельованого `manual_review_no_retry` (не реальна помилка Google).
- Адресне очищення видалило **1** тестовий held slot і **1** synthetic booking request. Фінальний вузол Parent повернув **`PASS_T04_CHILD_WORKFLOW_BRIDGE`**, `cleanup_requests=0`, `cleanup_slots=0`, `overlap_pairs=0`, `telegram_sends=0`, `google_calendar_calls=0`.

**Незалежна повторна read-only перевірка Neon TEST** (project `morning-cake-04594300`, branch `br-delicate-heart-b7h6nwzw`): для fixture `…9701` — 0 заявок і 0 слотів; інші контрольні значення `booked=2`, `needs_review=3`, `held=0`, `overlap_pairs=0`. Не було потреби в додатковому очищенні.

**Підсумок:** критичне з’єднання *двох ізольованих n8n TEST workflow* **PASS**. Це НЕ доказ доставки реального Telegram callback, працездатності неопублікованої/опублікованої production чернетки, реальної зайнятості календаря, створення Meet або recovery після реального Google timeout. Child працює **read-only** й не є production Booking Engine.

**Наступний критичний крок:** підготувати зміну **неопублікованих** Telegram Assistant і Booking Engine для передачі результату `claimed` до Engine замість тестової відповіді, розділити `already_processing` / `already_booked` / `needs_review` / unknown, забезпечити, що `booked` надсилається тільки після фактичної перевірки Neon та Google. Окремо довести, що невизначений Google Create не запускається вдруге. Будь-які production зміни, реальна календарна подія та публікація — лише за окремим погодженням власника.
