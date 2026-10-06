# Nauč se – objednávkový systém

Tato verze přidává skutečný server pro objednávky.

## Co se stane po objednávce
1. Zákazník vyplní jméno, e-mail, telefon a doručovací adresu.
2. Web pošle objednávku na `POST /api/orders`.
3. Server ji uloží do SQLite databáze `data/orders.db`.
4. Server odešle kompletní objednávku na `ADMIN_EMAIL`.
5. Zákazníkovi se zobrazí číslo objednávky.

## Instalace
Potřebuješ Node.js (doporučená LTS verze).

V adresáři projektu spusť:

```bash
npm install
```

Potom:
1. zkopíruj `.env.example` na `.env`
2. nastav `ADMIN_EMAIL`
3. nastav SMTP údaje svého e-mailového poskytovatele
4. nastav silný `ADMIN_KEY`
5. spusť:

```bash
npm start
```

Web bude na:
`http://localhost:3000`

## E-mail
Do `.env` se dávají SMTP údaje. Nikdy je nedávej přímo do `app.js`,
HTML ani veřejného GitHub repozitáře.

Například poskytovatel e-mailu může vyžadovat:
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- MAIL_FROM

Pokud používáš Gmail/Google Workspace, obvykle je potřeba App Password
ne běžné heslo účtu.

## Přehled objednávek
Po spuštění serveru otevři:

`http://localhost:3000/admin.html`

Zadej `ADMIN_KEY` z `.env`. Tato stránka načte objednávky z databáze.

## Důležitá poznámka k cenám
Frontend je stále demo aplikace. Server v této základní verzi přijímá
ceny z prohlížeče. Před skutečným veřejným e-shopem je potřeba přesunout
katalog produktů a cen na server, aby zákazník nemohl cenu změnit ruční
úpravou požadavku.

## Bezpečnost a soukromí
Objednávky obsahují osobní údaje (jméno, e-mail, telefon a adresu).
Před veřejným spuštěním je potřeba HTTPS, zabezpečení administrace,
ochrana proti spamu/rate limiting, pravidla uchování osobních údajů
a další povinnosti podle způsobu provozu webu.

## Co je zachováno
- původní HTML/CSS/JS
- kurzy a produkty
- košík
- registrace/přihlášení demo verze
- materiály a předplatné
- profily lektorů a hodnocení
- komentovaný `index.html`


## Rezervační systém doučování

- 4 lektoři: **Maru, Veru, Jana, Amy**
- Termíny vytváříš, upravuješ a vypínáš v `admin.html`
- Každý termín má vlastní kapacitu, výchozí **5 míst**
- Zákazník vidí pouze aktivní termíny s volným místem
- Backend znovu kontroluje obsazenost při rezervaci
- Nová rezervace se uloží do SQLite a odešle se na `ADMIN_EMAIL`
- V administraci doplníš Google Meet odkaz a heslo/kód
- Po uložení Meet údajů se zákazníkovi automaticky odešle e-mail

Administrace: `http://localhost:3000/admin.html`


## Bezpečná kontrola cen

Objednávkový server nyní používá vlastní `SERVER_CATALOG` v `server.js`.
Cena a název položky poslané z prohlížeče se při vytvoření objednávky
nepovažují za důvěryhodné. Server podle ID položky a jejího typu sám dohledá
správnou cenu, přepíše název i cenu v objednávce a teprve potom spočítá celkovou
částku. U produktů je v serverovém ceníku použita cena včetně 21 % DPH.

To znamená, že úprava ceny v nástrojích prohlížeče sama o sobě nezmění částku
uloženou v objednávce ani částku použitou v e-mailu administrátorovi.


## Přidané zabezpečení

- rate limiting pro veřejné API, objednávky, rezervace a administrátorská API,
- limit velikosti JSON požadavku 50 KB,
- bezpečnostní HTTP hlavičky a HSTS při HTTPS,
- bezpečnější porovnání `ADMIN_KEY`,
- administrace odmítne požadavky, pokud `ADMIN_KEY` není nastavený nebo má méně než 16 znaků.

Rate limiting je uložen v paměti jedné instance. Při více instancích by byl vhodný sdílený store.


## Serverové recenze
Recenze kurzů jsou uložené v SQLite databázi. Návštěvníci vidí recenze ostatních lidí u stejného kurzu a mohou přidat vlastní hodnocení 1–5 hvězdiček. Vstupy jsou validované a text se při zobrazení bezpečně escapuje.
