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

**Оновлено після перевірки Host:** підтверджено прив'язку `Postgres account` саме до Neon `main`; деталі та наступна дія — у §8. Релізні замки залишаються закритими.

## 8. Результат звірки Postgres account з Neon (14.10.2026)

**Повідомлення власника після ручної перевірки n8n Credentials:** поле `Host` для `Postgres account` починається з **`ep-twilight-cherry-b7nn1ql3`**. Раніше read-only Neon endpoint metadata незалежно підтвердили, що цей префікс належить Neon **`main`**, default/primary branch `br-quiet-union-b7vsi9wk`; префікс TEST — `ep-late-recipe-b79lskph`.

**Висновок:** старе n8n credential `Postgres account` (ID `g6xVZNIvZ3h3eutD`), яке використовують основні draft Telegram Assistant і Booking Engine, спрямоване до **Neon main**, **не** TEST. Це підтвердження **гілки за host**, а не перевірка правильності імені бази/ролі чи успішного SQL-підключення. Жодних запитів через це credential не виконувалося.

**Правило для MVP:** не міняти production credential на TEST. Не запускати main-draft вручну через `Postgres account` як тест — навіть SELECT-гілки поруч із ними містять SQL-записи. Для синтетичних тестів використовувати тільки `Postgres — SvoyeChat TEST` у окремих ізольованих сценаріях. Основні draft залишити неопублікованими, `={{ false }}` gates не знімати, `Create an event` не активувати, поки не погоджено контрольований реальний календарний запис і критичний план відкату.

**Наступна дія:** готувати один мінімальний критичний наскрізний acceptance-прохід (Neon main ↔ Google event ↔ Telegram) для окремого погодження, без нових некритичних матриць. Не називати продукт готовим до реальної доставки до такого проходу.

## 9. Підготовка одного контрольного бронювання (14.10.2026)

**Тільки read-only, жодної події створено не було.**

- Neon `main` — verified default branch `br-quiet-union-b7vsi9wk`; metadata показали одну базу `neondb` з owner `neondb_owner` та одну роль `neondb_owner`. Це очікувані значення для порівняння з **Database** і **User** у n8n credential `Postgres account`; відповідність цих **двох** полів у n8n досі потребує підтвердження власника. Host `main` уже підтверджено ним у §8.
- Окремо підключений Google Calendar connector із профілем власника бачить обидва календарі, на які посилається Engine: особистий `vasil.rybiy@gmail.com` та `Своє — Консультації` (ID `15ee05b18cfe4dcd6fbde21d191a6696690737330f3fd82936657b000f1cf292@group.calendar.google.com`), обидва з роллю `owner`.
- Read-only Google Free/Busy для **15.10.2026 10:00–19:30, Europe/Kyiv**: **обидва календарі повернули 0 busy windows і 0 errors**. Потенційний конкретний слот — **15.10.2026 11:00–11:30 Europe/Kyiv** (UTC+03:00). Це миттєвий знімок, а не гарантія майбутньої доступності; перед створенням потрібно перевірити його ще раз.
- Власник погодив продовження до контрольного бронювання. **Точний день/час ще треба явно підтвердити**; не створювати довільну подію й не обходити n8n/Neon прямим Google Calendar Create, бо інакше тест не доводить справжній шлях бронювання.
- Залишаються ті самі `={{ false }}` release gates та disabled `Create an event` у неопублікованому Engine draft. Нічого не публікували, виконань main-дraft, SQL main writes чи Google Event Create не було.

**Найкоротша дія:** власник підтверджує `Database=neondb`/`User=neondb_owner` у n8n Credentials та запропонований 30-хвилинний час (або називає інший). Потім підготувати один **контрольований n8n→Neon main→Google→Neon** test, з чітким одноразовим дозволом на подію, без масових чи високоризикових тестових сценаріїв та з окремим рішенням про публікацію.

## 10. Preflight погодженого одноразового Google Meet / Neon main (14.10.2026)

**Окремо підтверджено власником:**
- У n8n `Postgres account`: **Host** відповідає Neon `main`, `Database=neondb`, `User=neondb_owner`.
- Погоджена **рівно одна** реальна тестова Google Meet-подія в календарі «Своє — Консультації» на **15 жовтня 2026 року, 11:00–11:30 Europe/Kyiv**.
- **Заборонено публікувати робочі workflow** без нового погодження. Погодження календарної події не слід трактувати як право на довільні записи в Neon main.

**Фактичні незалежні read-only перевірки:**
- Google Free/Busy: **0 busy і 0 errors** у календарі «Своє — Консультації» та особистому календарі на точний обраний 30-хвилинний час (моментальний зріз).
- Neon `main`: поточні `current_database()=neondb`, `current_user=neondb_owner`; **0 protected-slot conflicts**, **0 pending/processing/booked/needs_review request conflicts** на обраний час; **0 held**.
- П'ять функцій `svoye_claim_booking`, `svoye_begin_calendar_create`, `svoye_finalize_booking`, `svoye_mark_booking_review`, `svoye_release_unavailable_booking`: read-only MD5 коду **попарно однакові** в Neon TEST і Neon main. EXCLUDE `slot_no_overlaps` та унікальність `booking_request_id` підтверджено в обох гілках.
- Неопубліковані Drafts unchanged: Assistant (37 вузлів, `versionId=6d28c5c4-16b5-4045-bcb8-f78a7ed5d17d`, published 5) та Engine (41 вузол, `versionId=a6dbe0b9-9e08-4b39-8ff8-e203c6f5acb6`, published 13). Усі три запобіжники (Assistant release false, Engine Calendar false і Google Create false), а Google Create disabled — залишені. **Жодного тесту в main-draft не запускали**.

**Механіка тесту без publish:** потребувався один ручний окремий n8n одноразовий workflow із жорстким **HARD STOP перед будь-яким main SQL**, адресно захищеним INSERT синтетичної заявки `…9801` на узгоджений час, `svoye_claim_booking`, викликом **наявного Booking Engine draft** за п'ятипольним контрактом і read-only звіркою `booked` у main. Це критично потрібна тимчасова перевірка, а не додаткова матриця тестів. Формальна SDK і node-schema валідація **9/9** пройшла, але **створення n8n workflow заблоковане зовнішнім захистом**. Після цього пошук n8n підтвердив **0 workflow із цією назвою**, а незалежний Neon main SELECT підтвердив **0 заявок і 0 слотів** для тестового ID `…9801`. **Не пробували обходити блокування.**

**Стан:** ❗ ЖОДНОЇ реальної календарної події не створено. ЖОДНОЇ синтетичної заявки в Neon main не створено. Не було publish, Google API write, SQL main write або Telegram send.

**Подальше окреме уточнення дозволу:** чи санкціонує власник **рівно одну синтетичну заявку/held slot в Neon main** як невіддільну частину погодженого контрольного бронювання, а також тимчасове ввімкнення лише неопублікованого тестового маршруту для **одного ручного запуску**, без публікації. Лише після такого дозволу можна уточнювати можливий безпечний шлях виконання без обходу обмежень. Якщо це неможливо, прямо фіксувати блокер; не створювати окрему подію через Google Calendar connector, адже це не доводить n8n → Neon → Meet.

**Доказова межа:** усі результати цього розділу — preflight/структура, не end-to-end виконання. Дійсність слота треба повторно перевірити безпосередньо перед реальним створенням.

## 11. Окремий дозвіл на Neon MAIN і підтверджений блокер T06 (14.10.2026)

**Окреме однозначне погодження власника:** дозволено створити **рівно одну** синтетичну заявку та пов'язаний held slot у Neon `main` для 15.10.2026 11:00–11:30 (Europe/Kyiv), а також тимчасово розблокувати **неопублікований TEST-маршрут** на **один ручний запуск**. Публікація робочих workflow **не дозволена**. Попереднє погодження однієї реальної Google Meet-події залишається чинним.

**Технічний результат:** після отримання цього дозволу здійснено **одну повторну спробу** створити саме окремий неопублікований T06 manual-only workflow з першою захисною `Code`-зупинкою, одним адресним INSERT у main, `svoye_claim_booking`, справжнім `Execute Sub-workflow` Booking Engine і read-only фінальним аудитом Neon. Валідація n8n Workflow SDK — **valid, 9 вузлів**. Але інструмент створення **повторно заблокував операцію системним захистом**; workflow не створено. Це обмеження НЕ обходили шляхом зміни існуючих T04/T02 чи реальних чернеток.

**Після блокування незалежно перевірено:**
- У n8n пошук `T06 ONE REAL Booking MAIN` повернув **0** workflow.
- Neon `main`: для synthetic ID `00000000-0000-4000-8000-000000009801` та fake user `9900009801` — **0 requests**, **0 slots**.
- Google «Своє — Консультації»: на узгоджену дату/час — **0 подій**.
- Assistant draft version `6d28c5c4-16b5-4045-bcb8-f78a7ed5d17d`; Engine draft version `a6dbe0b9-9e08-4b39-8ff8-e203c6f5acb6`; published activeVersionId обох **не змінені**.
- `T04 — Engine Release Gate`, `T04 — Calendar Release Gate`, `T04 — Google Create Gate` — досі **`={{ false }}`**; Google `Create an event` disabled.

**Рішення безпеки:** не записувати синтетичні дані в робочу Neon, поки немає перевіреного маршруту їхнього оброблення до Google/Meet. Не створювати подію напряму через Google Calendar connector — такий запис обходить систему і не доводить E2E. Не намагатися обійти системне блокування шляхом переобладнання іншого workflow. Нічого не запускати повторно, доки цей технічний спосіб не стане доступним або не буде погоджено інший явно підтримуваний механізм виконання.

**Поточний статус:** T06 **заблокований інструментом створення ручного workflow**, незважаючи на згоду власника. Тест не виконано; жодних продукційних записів або подій не створено. Найшвидший наступний крок — розв'язати саме блокер запуску, а не додавати нові нефункціональні тести. Існуючі робочі сценарії не публікувати без нового дозволу.

## 12. Публікація робочого Telegram-маршруту за прямим дозволом власника (14.10.2026)

**Цей розділ є найновішим і замінює попередній оперативний статус §1–§11.** За окремою прямою згодою власника опубліковано **три існуючі робочі workflow**, без створення T06 manual test runner. Відсутність/блокування manual runner більше **не блокує перший реальний тест через Telegram**.

**Перед публікацією в неопублікованих чернетках виконані лише мінімальні критичні правки:**
- **Booking Engine**: обидві release-gate умови `T04 — Calendar Release Gate (DRAFT LOCKED)` та `T04 — Google Create Gate (DRAFT LOCKED)` встановлено на `={{ true }}`; `Create an event` **enabled**. Його маршрут залишився за перевіреним owned held-slot, трьома перевірками календаря, lookup детермінованого Google event ID, явним 404, одноразовим `svoye_begin_calendar_create`, наступним Meet event ID/часом та Neon finalize. Помилки → needs_review без blind retry.
- **Telegram Assistant**: `T04 — Engine Release Gate (DRAFT LOCKED)` встановлено на `={{ true }}` **тільки після claim**. Після перевіреного Engine `booking_confirmed + status=booked + event_id + meet URL` Telegram спочатку надсилає **окреме постійне повідомлення** з Meet URL у той самий чат; потім відповідає на callback. Неоднозначний результат → лише обережна відповідь без «заброньовано». Помилка доставки посилання не призводить до повторного Google Create. Прибрано invalid `builtInTools` поле OpenAI Chat Model, попереднє попередження зникло.
- **Booking Request**: публікується існуючий 12-вузловий draft без зміни логіки.
- Обмеження на **Telegram ID `381617062`** збереглося у `Allowed Test User?` для Booking Request та `Allowed Confirmation Test User?` в Assistant. **Не відкривати доступ іншим, поки не пройде перше бронювання.**

**Факти публікації в n8n (кожен success=true, активну версію незалежно перечитано):**
| Workflow | ID | Опублікований activeVersionId | Кількість вузлів |
| --- | --- | --- | ---: |
| Booking Request | `Eq18xvcRLJ901HoM` | `3eae2d88-d885-49fe-b9c0-93f682a1c7c9` | 12 |
| Booking Engine | `NFz6ZNJuQKZkxzKU` | `e718cc95-6789-4874-b3dd-1623d94bc514` | 41 |
| AI Telegram Assistant | `EIMvqNhFPhr6CdVW` | `57c0dfd4-5771-4e2b-885c-d7d1859f5323` | 41 |

**Незалежна післяпублікаційна read-only перевірка:** усі 3 `active=true`, `activeVersionId=versionId`; у published Engine Google Create enabled, дві release gates true; у published Assistant Engine gate true, verified Meet Send присутній, request і callback test-user ID збігаються.

**Критичний стан на момент публікації:** реальний Telegram → Neon → Google Meet → Neon → Telegram E2E **ЩЕ НЕ ВИКОНАНО**. Не стверджувати про завершене бронювання чи готовність відкритого MVP. Першим реальним тестом має бути **один** 30-хвилинний запис із дозволеного Telegram ID на узгоджене **15.10.2026 11:00–11:30 Europe/Kyiv**. Користувач сам ініціює текст/вибір часу, натискає кнопку власного контакту і callback підтвердження. Після цього перевірити execution IDs та незалежно Google і Neon; у разі невизначеності — жодного повторного підтвердження до розбору.

**Не зроблено і не є блокером першого Telegram-тесту:** сайт → Telegram deep link (T08), відкриття для інших користувачів, додаткові vNext тести. Додатковий ручний n8n workflow T06 як раніше не створений, але **за погодженням власника обрано штатний маршрут живого Telegram**, а не повторення заблокованого тестового конструктора.
