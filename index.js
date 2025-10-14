const express = require("express");
const { z } = require("zod");
const Database = require("better-sqlite3");

const db = new Database("app.db");
db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  total_seats INTEGER NOT NULL CHECK(total_seats >= 0)
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(event_id) REFERENCES events(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_per_user_event
  ON bookings(event_id, user_id);
`);

const hasAnyEvent = db.prepare("SELECT 1 FROM events LIMIT 1").get();
if (!hasAnyEvent) {
  db.prepare("INSERT INTO events (name, total_seats) VALUES (?, ?)").run("Test Event", 2);
}

const app = express();
app.use(express.json());

const reserveSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  user_id: z.string().min(1)
});

app.get("/api/events", (_req, res) => {
  const events = db
    .prepare(`
      SELECT e.id, e.name, e.total_seats,
             (e.total_seats - IFNULL(b.cnt,0)) AS seats_left
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*) AS cnt
        FROM bookings
        GROUP BY event_id
      ) b ON b.event_id = e.id
      ORDER BY e.id
    `)
    .all();

  res.json({ ok: true, data: events });
});

app.post("/api/bookings/reserve", (req, res) => {
  const parsed = reserveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ ok: false, error: parsed.error.flatten() });
  }
  const { event_id, user_id } = parsed.data;

  const tx = db.transaction(() => {
    const ev = db
      .prepare("SELECT id, name, total_seats FROM events WHERE id = ?")
      .get(event_id);
    if (!ev) throw new Error("Event not found");

    const dup = db
      .prepare("SELECT 1 FROM bookings WHERE event_id = ? AND user_id = ?")
      .get(event_id, user_id);
    if (dup) throw new Error("User already booked this event");

    const count = db
      .prepare("SELECT COUNT(*) AS c FROM bookings WHERE event_id = ?")
      .get(event_id);

    if (count.c >= ev.total_seats) throw new Error("Event is sold out");

    const now = new Date().toISOString();
    const info = db
      .prepare("INSERT INTO bookings (event_id, user_id, created_at) VALUES (?, ?, ?)")
      .run(event_id, user_id, now);

    return { id: info.lastInsertRowid, event_id, user_id, created_at: now };
  });

  try {
    const booking = tx();
    return res.status(201).json({ ok: true, data: booking });
  } catch (e) {
    let status = 400;
    if (e && e.message === "Event not found") status = 404;
    else if (e && (e.message === "User already booked this event" || e.message === "Event is sold out"))
      status = 409;

    return res.status(status).json({ ok: false, error: { message: e?.message || "Error" } });
  }
});

app.use((_req, res) => res.status(404).json({ ok: false, error: "Not found" }));

app.listen(8080, () => console.log("http://localhost:8080"));