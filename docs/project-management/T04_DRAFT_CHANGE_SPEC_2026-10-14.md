# T04 — погоджувана специфікація змін чернеток Telegram Assistant і Booking Engine

**Підготовлено:** 14.10.2026  
**Статус станом на 14.10.2026:** після погодження власника **мінімальні зміни у неопублікованих draft виконано, але НЕ активовано, НЕ протестовано реальним запуском і НЕ опубліковано**. Історичні розділи нижче описують стан до цього погодження.  
**Мета:** зібрати критичний шлях підтвердження без подвійного Google Calendar Create та неправдивих клієнтських повідомлень. За R11 до MVP перевіряємо лише **критичні** наслідки; високі й нижчі тести — vNext.

## 1. Перевірені передумови

| Система / сценарій | Стан, підтверджений read-only аудитом |
| --- | --- |
| Telegram Assistant `EIMvqNhFPhr6CdVW` | active/published — 5 вузлів, неопублікований draft — 30; draft version `fe713d3f-17b2-4150-8514-7937dc41c942`. Після `Claim Booking — Neon` позитивна гілка `Booking Claimed?` іде на `Booking Reserved — Test.` → `Answer Booking Claim — Test`, **не на Engine**. |
| Assistant: інші відповіді | Гілка `Booking Not Claimed` → `Answer Booking Not Claimed` використовує універсальне «Зустріч не заброньована», що не підходить для `already_booked`. `Claim Booking — Neon` використовує credential `Postgres account`; його належність до TEST не підтверджена. |
| Booking Engine `NFz6ZNJuQKZkxzKU` | active/published — 13 вузлів, draft — 37; draft version `2e5df840-eb6d-4158-bab5-bd600cd0fc82`. `Create an event` вимкнений, вихід true вузла `Calendar Create Granted?` не під’єднаний; `Find Existing Booking Event — Google` має невикористаний вхідний маршрут; `Existing Event Not Found?` містить порожню умову. |
| Booking Request `Eq18xvcRLJ901HoM` | Неопублікований workflow, потрібний для повного шляху вибір часу → телефон → callback. Без окремих правок/публікації у межах поточного дозволу. |
| T04 ізольовані тести | Parent `Zqq2NzKmho6rAkP4` execution **#131**: 14/14 success; Child `ko3gMXLGy1DHNMq4` execution **#132**: 3/3 success; справжній `Execute Sub-workflow`, `claimed` / `already_processing`, один TEST held-slot, незалежно підтверджено 0 залишків. Вони **не** замінюють тестів робочих чернеток. |

## 2. Точний пропонований обсяг правок Telegram Assistant (лише draft)

1. **Зберегти поточну структуру** `Telegram Trigger → Switch → Allowed Confirmation Test User? → Parse Neon Confirmation → Claim Booking — Neon`; не міняти правила передачі телефону, роботу агента або опублікований Telegram Trigger.
2. Після `Booking Claimed?` при `result='claimed'` **не** йти до `Booking Reserved — Test.`. Додати читання підтвердженої заявки із Neon через `booking_id`, `telegram_user_id` і `chat_id`: статус `processing`, дійсний held-slot, перевірка часу/часового поясу. Коли DB-стан не підтверджений — завершити без повідомлення `booked`, передати на ручний розбір.
3. Підготувати вузол **`Execute Sub-workflow`** із **п’ятьма полями** контракту: `booking_id`, `telegram_user_id`, `chat_id`, `start_time` (ISO8601 з явним часовим поясом), `user_confirmed=true`. Час отримувати з перевіреної Neon заявки, **не** із довільного callback чи AI. Для ізольованих запусків ціллю є тестова копія Engine; production-ID підставляти лише на окремому етапі із перевіркою активної версії child workflow. **Не запускати draft так, щоб він викликав опублікований production Engine**.
4. Відповіді обробляти за **перевіреним результатом Engine**, а не тільки `claimed` у SQL: `booking_confirmed` дозволений лише після підтвердження події Google, ідентичності event ID та фінального статусу Neon `booked` і дійсного Meet URL. Для `processing`, `needs_review`, `unknown` — відповідь без обіцянки заброньованої зустрічі.
5. Для `already_processing` — прочитати стан, **не** викликати Engine вдруге. Для `already_booked` — перевірити факт `booked` і `event_id`/`meet_link` в Neon та, перед остаточним підтвердженням, Google. Якщо Google не перевірено — нейтральний статус «запис є в системі, деталі уточнюємо», **не** «зустріч не заброньована». `needs_review`/невідома помилка → ручний розбір; `slot_unavailable`/expired → інший час.
6. Розділити короткий Telegram `answerCallbackQuery` і змістовне повідомлення з фактичним Meet URL (`sendMessage`) **тільки після перевіреного `booking_confirmed`**. Жодних даних іншого Telegram користувача або confirmation token в повідомленнях/логах.
7. На етапі підготовки **не змінювати credential на неперевірене з’єднання**. Для ізольованої перевірки виключно `Postgres — SvoyeChat TEST`, на production credential переходити лише після перевірки і окремого погодження.

## 3. Точний пропонований обсяг правок Booking Engine (лише draft)

1. Зберегти приймання 5 полів і повторну перевірку `Verify Claimed Booking — Neon` (`processing`, правильні власник, слот, hold).
2. **Не вмикати `Create an event`, не додавати йому вхід і не робити виклики Google у межах підготовки.** True-гілку `Calendar Create Granted?` до окремого погодження залишити ізольованою/з безпечним тестовим `STOP`; не видавати `booking_confirmed`.
3. Підготувати чітку розвилку для `Find Existing Booking Event — Google` та `Existing Event Not Found?`: *достовірно знайдено конкретну подію* / *достовірно немає події* / *результат невизначений (timeout/403/5xx/невалідні дані)*. **Тільки достовірна відсутність** може перейти до одноразового `svoye_begin_calendar_create`. Невизначеність → `needs_review`, без повторного Create і без звільнення слота.
4. Перед реальним Google Create — гарантувати `svoye_begin_calendar_create = granted` лише раз. Після створення перевіряти детермінований event ID, Meet URL, `svoye_finalize_booking`, а потім повторним читанням — фактичний Neon `booked` та відповідність event ID. Інакше — ручний розбір, не підтвердження.
5. Виходи Engine стандартизувати: `booking_confirmed` **лише** після доведення Google + Neon; `processing`, `manual_review_required`, `slot_unavailable`, `rejected`, `confirmation_unverified` — без обіцянки зустрічі. Деталі типу `event_id`/`meet_link` передавати лише після відповідної перевірки.
6. Під час редагування чернетки **без реального Google Calendar read/write**, без публікації, без змін робочої Neon. `Booking Engine TEST — DO NOT RUN` `aWmfSLXpWhoK66MW` не змінювати й не виконувати.

## 4. Межі дозволу, передумови та послідовність

**Зараз дозволено:** read-only аудит, підготовка цієї специфікації, GitHub-документація. Ці дії **не** означають дозволу на редагування чернеток Assistant/Engine.

**Наступне окреме погодження:** редагувати **тільки неопубліковані draft** workflow `EIMvqNhFPhr6CdVW` і `NFz6ZNJuQKZkxzKU`, знімком `versionId` перед редагуванням; без publish, без запуску Google/Telegram, без зміни production Neon. Перед будь-яким редагуванням повторно перевірити, що drafts не змінилися від наведених version ID; при невідповідності зробити re-audit.

**Після draft-правок:** перевірити граф і поля контракту, безпеку credential та гілки статусів; для тестів використати ізольовані TEST workflow й лише критичні сценарії. Жодного автоматичного production-запуску.

**Окремо до MVP:** письмова згода на **одну** реальну контрольну подію Google Calendar/Meet та окреме рішення про опублікування робочих workflow. Без цього можна підготувати лише draft, а не оголосити повний запис готовим.

## 5. Умови приймання T04

- Один успішний критичний шлях після погодженого тесту: справжнє підтвердження конкретної заявки → перевірений claim → Engine → Neon `booked` + Google event + дійсний Meet URL → одне правдиве повідомлення.
- Повторний callback не створює другу подію чи друге «успішне бронювання».
- Невизначений Google Create, помилка SQL або розбіжність між Google/Neon не запускають сліпий повтор, не відкривають зайнятий слот і не підтверджують неіснуючої зустрічі.
- Жодного розкриття чужих заявок; ручний розбір та зупинка можливі.
- Розширені high/medium/low тести за R11 відкладені до vNext.

**Доказ:** [T04 Parent/Child TEST #131/#132](./T04_TEST_BRIDGE_2026-10-14.md). **Стан:** специфікація для погодження, без правок реальних чернеток.


## 6. Реалізовано у неопублікованих draft після погодження власника (14.10.2026)

**Головне правило R00:** пришвидшити MVP, не проводити додаткових некритичних тестів. Виконано саме редагування чернеток у n8n, без runtime-запуску. Підтвердження виконання — повторна read-only звірка актуальних графів.

**Assistant** `EIMvqNhFPhr6CdVW`: draft з 30 до **37 вузлів**; versionId `6d28c5c4-16b5-4045-bcb8-f78a7ed5d17d`. Після `Booking Claimed?` позитивну гілку замість `Booking Reserved — Test.` під’єднано до нового **read-only SQL SELECT** за `booking_id`, власником, чатом, статусом `processing`, єдиним активним `held` і відсутністю `calendar_create_attempted_at`. Далі `T04 — Exact Held Booking?` → `T04 — Prepare Engine Contract` із п'ятьма полями → **`T04 — Engine Release Gate (DRAFT LOCKED)`** → майбутній `Execute Sub-workflow` ID `NFz6ZNJuQKZkxzKU`, після якого контроль достовірності відповіді. Неверифікований запит повертає лише обережний статус. Помилка SQL веде до наявної error-гілки. Для `already_processing`, `already_booked`, `needs_review`, expired/unavailable й невідомого стану callback-повідомлення тепер відокремлені та не стверджують хибного «не заброньовано».

**Ключове обмеження:** `T04 — Engine Release Gate` має **буквальне `={{ false }}`**, тому реальний виклик Engine **недосяжний у поточній чернетці**, навіть якщо хтось її вручну запустить. Новий SQL-вузол має **те саме** старе credential `Postgres account` (ID `g6xVZNIvZ3h3eutD`), що й інші Postgres-вузли Assistant. Його підключення до production/TEST **не доведене окремим тестом**; тому **ніяких виконань Assistant draft до перевірки credential і окремого погодження**. Жодних даних із production бази не читали й не змінювали.

**Booking Engine** `NFz6ZNJuQKZkxzKU`: draft з 37 до **39 вузлів**; versionId `9d451a33-5f09-49ca-ad0d-94dcd5fc1fe8`. Перенаправлено позитивний вихід `Claimed Booking Found?` на новий **`T04 — Calendar Release Gate (DRAFT LOCKED)`**. Його `={{ false }}` блокує **будь-який виклик Google availability/Create у draft**. Негативний вихід веде до `T04 — Safe Stop Before Google (NO API)` зі статусом `manual_intervention_required`. Вихід `granted` вузла `Calendar Create Granted?` також веде на Safe Stop, **не** на Google Create. Вузол `Create an event` як раніше **disabled**. Незавершена гілка `Find Existing Booking Event` та порожня умова `Existing Event Not Found?` **ще не виправлені й залишаються блокерами перед справжнім Calendar Create**.

**Read-only перевірка після запису:** Assistant `activeVersionId=c869e7c6-03df-4b22-90af-8f522ecb6883` (**5 вузлів**), Engine `activeVersionId=98db6687-b98f-409c-9290-442424f60275` (**13 вузлів**) — **незмінні**. Обидва `active=true` лише тому, що раніше опубліковані старі версії; нові draft **не опубліковані**. Критичні з'єднання й буквальні false-gate підтверджено повторним читанням. Ніяких нових execution немає. Валідація нових вузлів успішна; збереглися попередні попередження щодо disconnected calendar nodes (їх не трактувати як виправлені).

**Наступний мінімальний крок до MVP:** перевірити фактичний DB credential, доробити fail-closed розрізнення «Google event точно відсутній / стан невідомий» і єдиний безпечний Google Create→Neon finalize шлях у draft; **до окремого погодження не відкривати release-gates**, не проводити реальних Google/Telegram операцій, не публікувати. Після цього одна контрольна подія й критичний end-to-end тест за окремою згодою. Це незавершений T04, а не launch-ready.


## 7. T04 — Google/Neon fail-closed, другий етап правок (14.10.2026)

**Факт:** редагували тільки неопублікований **draft** `SvoyeChat — Booking Engine` (`NFz6ZNJuQKZkxzKU`), без `Execute workflow`, публікації, Google Calendar API чи SQL-записів. Draft: **39→41 вузол**, поточний `versionId=a6dbe0b9-9e08-4b39-8ff8-e203c6f5acb6`; опублікований `activeVersionId=98db6687-b98f-409c-9290-442424f60275` (**13 вузлів**) не змінено. Telegram Assistant draft залишається **37 вузлів**, `versionId=6d28c5c4-16b5-4045-bcb8-f78a7ed5d17d`, published ID без змін.

**Змінений критичний ланцюг:**
1. Після перевірок доступності `If1:true` тепер веде до раніше непідключеного `Find Existing Booking Event — Google` за детермінованим `calendar_operation_id`. Позитивний результат пошуку перевіряється через `Google Meet Ready?` → `Google Event ID Matches?` → `Finalize Booking — Neon`.
2. Вихід помилки пошуку веде до нового `T04 — Classify Google Event GET error`. **Тільки явний HTTP 404** (наявний числовий код у відомих полях, усі доступні коди =404) стає `not_found_verified=true` → оновлений `Existing Event Not Found?` → `svoye_begin_calendar_create`. Будь-яка інша помилка, відсутній код, 403/429/5xx/timeout — `svoye_mark_booking_review` без Create. Фактичну структуру error output від Google в живому виконанні **ще не перевірено** — правило свідомо fail-closed.
3. `svoye_begin_calendar_create` залишається єдиним Neon-guard перед створенням; read-only перегляд його коду в Neon TEST показав, що `calendar_create_attempted_at` ставиться не більше одного разу та повтор повертає `already_attempted`. Тепер **false result** від `Calendar Create Granted?` і **SQL error output** від `Begin Calendar Create — Neon` ведуть на `Mark Booking Needs Review — Neon`, а не на повідомлення, яке лишало статус `processing` без ручного захисту.
4. Новий `T04 — Google Create Gate (DRAFT LOCKED)` стоїть після `Calendar Create Granted?:true`. Його false-гілка також веде до `Mark Booking Needs Review — Neon`; true-гілка з'єднана з існуючим, але **disabled** `Create an event`. Внутрішній замок `={{ false }}` і зовнішній `T04 — Calendar Release Gate (DRAFT LOCKED)` з `={{ false }}` залишаються **обидва закриті**. Навіть якщо зовнішній замок помилково відкриють окремо, внутрішній не дасть виконати Google Create та поставить `needs_review`.
5. `Google Meet Ready?` тепер вимагатиме `status=confirmed`, дійсний URL `meet.google.com` і **точну відповідність start/end** заявці Neon. `Google Event ID Matches?` і далі порівнює фактичний event ID з детермінованим. `Load Confirmed Booking — Neon` отримав суворий **SELECT**: `status='booked'`, збіг `booking_id`, `telegram_user_id`, `chat_id`, детермінованого `event_id`, start/end і Meet URL. Синтаксис URL-перевірки перевірений read-only SQL у Neon TEST (правильний URL true, неправильний false), але **реального фінального бронювання не було**.

**Фінальний незалежний аудит графа:** `active=true` стосується **старої опублікованої версії**, а не нового draft. Обидва draft-замки мають `={{ false }}`, `Create an event.disabled=true`. Аналіз досяжності від Engine trigger з врахуванням цих двох умов дав **0 досяжних Google Calendar-вузлів**. Звірені розгалуження: event-get-success → Meet-check, HTTP404 → Neon single-attempt, unknown/error/DB denial → `needs_review`. Старі непідключені декоративні Set-вузли не усували: це не критичний блокер MVP.

**Що НЕ перевірено:** самі Google API, відповідь 404 у конкретному n8n вузлі, реальна робота `Finalize Booking`, відправлення Telegram, відновлення після зовнішнього timeout. Усе це — майбутнє **лише критичне** end-to-end приймання після відповідного дозволу. Наявність маршруту **не** означає безпечної автоматичної активації: перед нею слід звірити credential, у тому числі Postgres.

**Невизначеність credential:** доступний n8n-конектор показує лише назву/ID `Postgres account` (`g6xVZNIvZ3h3eutD`), але **не host/branch, database чи роль**. Отже не можна довести, що він вказує на Neon `main` або `test`; і не можна безпечно запускати draft до перевірки. Гілки Neon `main` (default) і `test/booking-engine-v1` підтверджено read-only. Перевірити `Postgres account` у **n8n Credentials** за host/DB/role без передавання пароля чи connection string у чат і порівняти з потрібним endpoint Neon. Після перевірки зафіксувати тільки назву гілки, без секретів.

**Еталон для звірки host (read-only Neon endpoint metadata):** гілка **TEST** `test/booking-engine-v1` має host із префіксом `ep-late-recipe-b79lskph` (можливе доповнення `-pooler` або compute suffix), **основна** гілка `main` — `ep-twilight-cherry-b7nn1ql3` (аналогічно можливий суфікс). Ці значення — **адреси серверів, не паролі**. Не робити висновок, до якої гілки підключений `Postgres account`, доки його Host не звірено в n8n Credentials.

**Найближча дія за R00:** перевірка credential, потім окреме погодження одноразової реальної контрольної події Google/Meet і лише мінімальні критичні приймальні перевірки. Релізні замки без цього не відкривати.
