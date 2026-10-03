require("dotenv").config();

const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const ALLOWED_PAYMENT_METHODS = new Set(["bank_transfer", "online"]);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DATABASE_FILE = process.env.DATABASE_FILE || "./data/orders.db";

if (!ADMIN_EMAIL) {
  console.warn("⚠️ ADMIN_EMAIL není nastavený. E-maily nebude možné odesílat.");
}

app.use(express.json({ limit: "100kb" }));
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

function calculateTotal(items) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error("Neplatné množství položky.");
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000) {
      throw new Error("Neplatná cena položky.");
    }
    return sum + quantity * unitPrice;
  }, 0);
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

app.post("/api/orders", async (req, res) => {
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
  const provided = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY || provided !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Neautorizováno." });
  }

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

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Nauč se běží na http://localhost:${PORT}`);
});
