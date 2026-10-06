require("dotenv").config();

const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const ALLOWED_PAYMENT_METHODS = new Set(["bank_transfer", "online"]);

const app = express();
const rateBuckets = new Map();

function rateLimit({ windowMs, max, prefix }) {
  return (req, res, next) => {
    const now = Date.now();
    const forwarded = String(req.headers["x-forwarded-for"] || "");
    const ip = (forwarded.split(",")[0] || req.ip || "unknown").trim();
    const key = `${prefix}:${ip}`;
    let bucket = rateBuckets.get(key);

    if (!bucket || now - bucket.startedAt >= windowMs) {
      bucket = { startedAt: now, count: 0 };
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - bucket.startedAt)) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Příliš mnoho požadavků. Zkus to prosím později." });
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.startedAt > 15 * 60 * 1000) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

const publicApiRateLimit = rateLimit({ windowMs: 60 * 1000, max: 120, prefix: "public" });
const orderRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, prefix: "orders" });
const reservationRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, prefix: "reservations" });
const adminRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, prefix: "admin" });

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const PORT = Number(process.env.PORT || 3000);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DATABASE_FILE = process.env.DATABASE_FILE || "./data/orders.db";

if (!ADMIN_EMAIL) {
  console.warn("⚠️ ADMIN_EMAIL není nastavený. E-maily nebude možné odesílat.");
}

app.use(express.json({ limit: "50kb" }));
app.use(express.static(path.join(__dirname)));

const db = new Database(DATABASE_FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    zip TEXT NOT NULL,
    note TEXT,
    payment TEXT NOT NULL,
    subscription TEXT,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    email_sent INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS lesson_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT NOT NULL,
    course_title TEXT NOT NULL,
    lecturer TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 5,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_number TEXT NOT NULL UNIQUE,
    slot_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    course_id TEXT NOT NULL,
    course_title TEXT NOT NULL,
    lecturer TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    meet_link TEXT,
    meet_password TEXT,
    meet_sent INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(slot_id) REFERENCES lesson_slots(id)
  );
`);

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function makeOrderNumber() {
  const date = new Date().toISOString().slice(0,10).replaceAll("-", "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CT-${date}-${random}`;
}

// ============================================================================
// BEZPEČNÉ CENY – SERVER JE ZDROJ PRAVDY
// ============================================================================
// Pro objednávky se nikdy nespoléháme na cenu poslanou z prohlížeče.
// Zákazník může upravit JavaScript v prohlížeči, proto server podle ID
// sám zjistí správný název a cenu a hodnoty z požadavku ignoruje.
// U produktů je cena uložena včetně 21 % DPH, stejně jako ji zobrazuje web.

const SERVER_CATALOG = {
  courses: {
    c1: { name: "Matematika 1.–5. třída", unitPrice: 199 },
    c2: { name: "Čeština hravě", unitPrice: 199 },
    c3: { name: "Angličtina pro školáky", unitPrice: 249 },
    c4: { name: "Přijímačky – matematika", unitPrice: 399 },
    c5: { name: "Přijímačky – čeština", unitPrice: 399 },
    c6: { name: "Kompletní přijímačkový balíček", unitPrice: 699 }
  },
  products: {
    p1: { name: "Pracovní sešit Matematika 1.–5.", unitPrice: 249 * 1.21 },
    p2: { name: "Kartičky – násobilka", unitPrice: 149 * 1.21 },
    p3: { name: "PDF balíček: 100 úloh", unitPrice: 129 * 1.21 },
    p4: { name: "Přijímačky nanečisto", unitPrice: 299 * 1.21 },
    p5: { name: "Samolepky za pokrok", unitPrice: 99 * 1.21 },
    p6: { name: "Taháček na gramatiku", unitPrice: 89 * 1.21 }
  }
};

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) {
    throw new Error("Objednávka nemá platné položky.");
  }

  return items.map(item => {
    const id = clean(item?.id, 100);
    const type = clean(item?.type, 30);
    const quantity = Number(item?.quantity);
    const catalog = type === "course" ? SERVER_CATALOG.courses : type === "product" ? SERVER_CATALOG.products : null;
    const product = catalog?.[id];

    if (!product) {
      throw new Error("Objednávka obsahuje neplatný produkt nebo kurz.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error("Neplatné množství položky.");
    }

    // Název a cena přicházející z prohlížeče se záměrně nepoužívají.
    return {
      id,
      type,
      name: product.name,
      quantity,
      unitPrice: roundMoney(product.unitPrice)
    };
  });
}

function calculateTotal(items) {
  return roundMoney(items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0));
}

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0
  }).format(value);
}


function makeReservationNumber() {
  const date = new Date().toISOString().slice(0,10).replaceAll("-", "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `REZ-${date}-${random}`;
}

const VALID_LECTURERS = new Set(["Maru", "Verča", "Jana", "Amy", "Anička"]);

function buildReservationEmail(r) {
  return `NOVÁ REZERVACE DOUČOVÁNÍ – Nauč se

Číslo rezervace: ${r.reservation_number}
Datum vytvoření: ${new Date(r.created_at).toLocaleString("cs-CZ")}

ŽÁK / RODIČ
Jméno: ${r.customer_name}
E-mail: ${r.customer_email}
Telefon: ${r.customer_phone || "—"}

REZERVACE
Předmět: ${r.course_title}
Lektor: ${r.lecturer}
Termín: ${new Date(r.starts_at).toLocaleString("cs-CZ")}
`;
}

function buildMeetEmail(r) {
  return `Dobrý den,

vaše rezervace doučování v Nauč se je potvrzena.

Předmět: ${r.course_title}
Lektor: ${r.lecturer}
Termín: ${new Date(r.starts_at).toLocaleString("cs-CZ")}

Google Meet:
${r.meet_link}

Heslo / kód:
${r.meet_password || "Není nastaveno."}

Těšíme se na vás.

Nauč se
`;
}

function buildEmail(order) {
  const items = JSON.parse(order.items_json);
  const rows = items.map(item =>
    `- ${item.name} × ${item.quantity} = ${formatMoney(item.unitPrice * item.quantity)}`
  ).join("\n");

  return `NOVÁ OBJEDNÁVKA – CHYTRÁ TŘÍDA

Číslo objednávky: ${order.order_number}
Datum: ${new Date(order.created_at).toLocaleString("cs-CZ")}

ZÁKAZNÍK
Jméno: ${order.customer_name}
E-mail: ${order.customer_email}
Telefon: ${order.customer_phone}

DORUČOVACÍ ADRESA
${order.street}
${order.zip} ${order.city}

PLATBA
${order.payment}

PŘEDPLATNÉ
${order.subscription || "Neuvedeno"}

POLOŽKY
${rows}

CELKEM
${formatMoney(order.total)}

POZNÁMKA
${order.note || "—"}
`;
}


// ---------------- RESERVACE TERMÍNŮ ----------------

app.get("/api/slots", publicApiRateLimit, (req, res) => {
  const courseId = clean(req.query.courseId, 100);
  const now = new Date().toISOString();
  const rows = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM reservations r WHERE r.slot_id = s.id) AS reserved
    FROM lesson_slots s
    WHERE s.active = 1
      AND s.starts_at > ?
      AND (? = '' OR s.course_id = ?)
    ORDER BY datetime(s.starts_at) ASC
  `).all(now, courseId, courseId);

  res.json(rows.map(s => ({
    id: s.id,
    courseId: s.course_id,
    courseTitle: s.course_title,
    lecturer: s.lecturer,
    startsAt: s.starts_at,
    capacity: s.capacity,
    reserved: s.reserved,
    available: Math.max(0, s.capacity - s.reserved)
  })).filter(s => s.available > 0));
});

app.post("/api/reservations", reservationRateLimit, async (req, res) => {
  try {
    const b = req.body || {};
    const name = clean(b.name, 120);
    const email = clean(b.email, 200);
    const phone = clean(b.phone, 50);
    const slotId = Number(b.slotId);

    if (!name || !isEmail(email) || !Number.isInteger(slotId)) {
      return res.status(400).json({ error: "Vyplňte prosím jméno, platný e-mail a termín." });
    }

    const reservationNumber = db.transaction(() => {
      const slot = db.prepare(`
        SELECT s.*,
          (SELECT COUNT(*) FROM reservations r WHERE r.slot_id = s.id) AS reserved
        FROM lesson_slots s
        WHERE s.id = ?
      `).get(slotId);

      if (!slot || !slot.active) throw new Error("Tento termín už není dostupný.");
      if (new Date(slot.starts_at).getTime() <= Date.now()) throw new Error("Tento termín už proběhl.");
      if (slot.reserved >= slot.capacity) throw new Error("Tento termín je již plně obsazený.");

      const number = makeReservationNumber();
      db.prepare(`
        INSERT INTO reservations (
          reservation_number, slot_id, created_at, customer_name, customer_email,
          customer_phone, course_id, course_title, lecturer, starts_at
        ) VALUES (
          @number, @slotId, @createdAt, @name, @email,
          @phone, @courseId, @courseTitle, @lecturer, @startsAt
        )
      `).run({
        number,
        slotId,
        createdAt: new Date().toISOString(),
        name,
        email,
        phone,
        courseId: slot.course_id,
        courseTitle: slot.course_title,
        lecturer: slot.lecturer,
        startsAt: slot.starts_at
      });
      return number;
    })();

    const reservation = db.prepare("SELECT * FROM reservations WHERE reservation_number = ?").get(reservationNumber);
    let emailSent = false;

    if (transporter && ADMIN_EMAIL) {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: ADMIN_EMAIL,
        replyTo: reservation.customer_email,
        subject: `Nová rezervace ${reservation.reservation_number} – Nauč se`,
        text: buildReservationEmail(reservation)
      });
      emailSent = true;
    }

    res.status(201).json({ ok: true, reservationNumber, emailSent });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "Rezervaci se nepodařilo vytvořit." });
  }
});

function requireAdmin(req, res) {
  const provided = String(req.headers["x-admin-key"] || "");
  const expected = String(process.env.ADMIN_KEY || "");

  if (!expected || expected.length < 16) {
    res.status(503).json({ error: "Administrace není správně nakonfigurovaná." });
    return false;
  }

  const crypto = require("node:crypto");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const same = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!same) {
    res.status(401).json({ error: "Neplatný administrátorský klíč." });
    return false;
  }
  return true;
}

app.get("/api/admin/slots", adminRateLimit, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM reservations r WHERE r.slot_id = s.id) AS reserved
    FROM lesson_slots s
    ORDER BY datetime(s.starts_at) ASC, s.id ASC
  `).all();
  res.json(rows);
});

app.post("/api/admin/slots", adminRateLimit, (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const b = req.body || {};
    const courseId = clean(b.courseId, 100);
    const courseTitle = clean(b.courseTitle, 200);
    const lecturer = clean(b.lecturer, 50);
    const startsAt = clean(b.startsAt, 40);
    const capacity = Number(b.capacity ?? 5);
    const active = b.active === false ? 0 : 1;

    if (!courseId || !courseTitle || !VALID_LECTURERS.has(lecturer) || !startsAt ||
        !Number.isInteger(capacity) || capacity < 1 || capacity > 20 ||
        !Number.isFinite(new Date(startsAt).getTime())) {
      return res.status(400).json({ error: "Neplatné údaje termínu." });
    }

    const result = db.prepare(`
      INSERT INTO lesson_slots
      (course_id, course_title, lecturer, starts_at, capacity, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(courseId, courseTitle, lecturer, startsAt, capacity, active, new Date().toISOString());

    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Termín se nepodařilo vytvořit." });
  }
});

app.patch("/api/admin/slots/:id", adminRateLimit, (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = Number(req.params.id);
    const old = db.prepare("SELECT * FROM lesson_slots WHERE id = ?").get(id);
    if (!old) return res.status(404).json({ error: "Termín nenalezen." });

    const b = req.body || {};
    const courseId = clean(b.courseId ?? old.course_id, 100);
    const courseTitle = clean(b.courseTitle ?? old.course_title, 200);
    const lecturer = clean(b.lecturer ?? old.lecturer, 50);
    const startsAt = clean(b.startsAt ?? old.starts_at, 40);
    const capacity = Number(b.capacity ?? old.capacity);
    const active = b.active === undefined ? old.active : (b.active ? 1 : 0);
    const reserved = db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE slot_id = ?").get(id).c;

    if (capacity < reserved) {
      return res.status(400).json({ error: `Kapacita nemůže být menší než počet rezervací (${reserved}).` });
    }
    if (!VALID_LECTURERS.has(lecturer) || !courseId || !courseTitle ||
        !Number.isInteger(capacity) || capacity < 1 || capacity > 20 ||
        !Number.isFinite(new Date(startsAt).getTime())) {
      return res.status(400).json({ error: "Neplatné údaje termínu." });
    }

    db.prepare(`
      UPDATE lesson_slots
      SET course_id=?, course_title=?, lecturer=?, starts_at=?, capacity=?, active=?
      WHERE id=?
    `).run(courseId, courseTitle, lecturer, startsAt, capacity, active, id);

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Termín se nepodařilo upravit." });
  }
});

app.delete("/api/admin/slots/:id", adminRateLimit, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const count = db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE slot_id = ?").get(id).c;
  if (count > 0) {
    return res.status(400).json({ error: "Termín má rezervace. Místo smazání ho vypněte." });
  }
  db.prepare("DELETE FROM lesson_slots WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.get("/api/admin/reservations", adminRateLimit, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = db.prepare(`
    SELECT r.*, s.active AS slot_active
    FROM reservations r
    LEFT JOIN lesson_slots s ON s.id = r.slot_id
    ORDER BY datetime(r.starts_at) DESC, r.id DESC
  `).all();
  res.json(rows);
});

app.patch("/api/admin/reservations/:id/meet", adminRateLimit, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = Number(req.params.id);
    const r = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id);
    if (!r) return res.status(404).json({ error: "Rezervace nenalezena." });

    const meetLink = clean(req.body?.meetLink, 1000);
    const meetPassword = clean(req.body?.meetPassword, 200);
    if (!meetLink) return res.status(400).json({ error: "Zadejte Google Meet odkaz." });

    db.prepare(`
      UPDATE reservations SET meet_link=?, meet_password=?, meet_sent=0 WHERE id=?
    `).run(meetLink, meetPassword, id);

    const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id);

    if (!transporter) {
      return res.json({ ok: true, emailSent: false, warning: "Meet údaje byly uloženy, ale SMTP není nastavené." });
    }

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: updated.customer_email,
      replyTo: ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `Google Meet – ${updated.course_title} – Nauč se`,
      text: buildMeetEmail(updated)
    });

    db.prepare("UPDATE reservations SET meet_sent = 1 WHERE id = ?").run(id);
    res.json({ ok: true, emailSent: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Meet údaje se nepodařilo odeslat." });
  }
});

app.post("/api/orders", orderRateLimit, async (req, res) => {
  try {
    const body = req.body || {};
    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];

    const order = {
      customerName: clean(customer.name, 120),
      customerEmail: clean(customer.email, 200),
      customerPhone: clean(customer.phone, 50),
      street: clean(customer.street, 200),
      city: clean(customer.city, 100),
      zip: clean(customer.zip, 30),
      note: clean(body.note, 1000),
      payment: clean(body.payment, 100),
      subscription: clean(body.subscription, 50),
      items: items.map(item => ({
        id: clean(item.id, 100),
        type: clean(item.type, 30),
        name: clean(item.name, 200),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice)
      }))
    };

    if (!order.customerName || !isEmail(order.customerEmail) ||
        !order.customerPhone || !order.street || !order.city || !order.zip ||
        !order.payment || !order.items.length) {
      return res.status(400).json({ error: "Vyplňte prosím všechny povinné údaje." });
    }

    // Server znovu sestaví položky z vlastního ceníku.
    // I kdyby někdo změnil cenu v prohlížeči, do objednávky se uloží pouze
    // cena, kterou má server v SERVER_CATALOG.
    order.items = normalizeOrderItems(order.items);

    const allowedPayments = new Set(["bank_transfer", "online"]);
    if (!allowedPayments.has(order.payment)) {
      return res.status(400).json({ error: "Neplatný způsob platby." });
    }

    const total = calculateTotal(order.items);
    const orderNumber = makeOrderNumber();
    const createdAt = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO orders (
        order_number, created_at, customer_name, customer_email,
        customer_phone, street, city, zip, note, payment,
        subscription, items_json, total, email_sent
      ) VALUES (
        @orderNumber, @createdAt, @customerName, @customerEmail,
        @customerPhone, @street, @city, @zip, @note, @payment,
        @subscription, @itemsJson, @total, 0
      )
    `);

    insert.run({
      orderNumber,
      createdAt,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      street: order.street,
      city: order.city,
      zip: order.zip,
      note: order.note,
      payment: order.payment,
      subscription: order.subscription,
      itemsJson: JSON.stringify(order.items),
      total
    });

    const savedOrder = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber);

    if (!transporter || !ADMIN_EMAIL) {
      console.warn("Objednávka uložena, ale SMTP není nakonfigurované:", orderNumber);
      return res.status(201).json({
        ok: true,
        orderNumber,
        emailSent: false,
        warning: "Objednávka byla uložena, ale e-mail zatím není nakonfigurovaný."
      });
    }

    const emailText = buildEmail(savedOrder);

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: ADMIN_EMAIL,
      replyTo: order.customerEmail,
      subject: `Nová objednávka ${orderNumber} – Nauč se`,
      text: emailText
    });

    db.prepare("UPDATE orders SET email_sent = 1 WHERE order_number = ?").run(orderNumber);

    res.status(201).json({ ok: true, orderNumber, emailSent: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Objednávka byla přijata do systému, ale při zpracování nastala chyba."
    });
  }
});

app.get("/api/orders", (req, res) => {
  if (!requireAdmin(req, res)) return;

  const orders = db.prepare(`
    SELECT id, order_number, created_at, customer_name, customer_email,
           customer_phone, street, city, zip, note, payment,
           subscription, items_json, total, email_sent
    FROM orders
    ORDER BY id DESC
  `).all();

  res.json(orders.map(order => ({
    ...order,
    items: JSON.parse(order.items_json)
  })));
});

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);


const REVIEW_COURSE_IDS = new Set(["c1","c2","c3","c4","c5","c6"]);

function reviewValue(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

app.get("/api/reviews", (req, res) => {
  const courseId = reviewValue(req.query.courseId, 20);
  if (!REVIEW_COURSE_IDS.has(courseId)) {
    return res.status(400).json({ error: "Neplatný kurz." });
  }
  const reviews = db.prepare(`
    SELECT id, course_id AS courseId, author_name AS authorName,
           rating, text, created_at AS createdAt
    FROM reviews WHERE course_id = ? ORDER BY id DESC LIMIT 100
  `).all(courseId);
  res.json({ reviews });
});

app.post("/api/reviews", (req, res) => {
  const courseId = reviewValue(req.body?.courseId, 20);
  const authorName = reviewValue(req.body?.authorName, 80);
  const text = reviewValue(req.body?.text, 1000);
  const rating = Number(req.body?.rating);

  if (!REVIEW_COURSE_IDS.has(courseId))
    return res.status(400).json({ error: "Neplatný kurz." });
  if (authorName.length < 2)
    return res.status(400).json({ error: "Vyplň prosím jméno." });
  if (text.length < 3)
    return res.status(400).json({ error: "Napiš prosím krátkou recenzi." });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return res.status(400).json({ error: "Hodnocení musí být 1 až 5." });

  const createdAt = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO reviews (course_id, author_name, rating, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(courseId, authorName, rating, text, createdAt);

  res.status(201).json({
    review: { id: result.lastInsertRowid, courseId, authorName, rating, text, createdAt }
  });
});

app.listen(PORT, () => {
  console.log(`Nauč se běží na http://localhost:${PORT}`);
});
