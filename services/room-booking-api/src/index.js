import "dotenv/config";
import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.get("/api/healthz", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error" });
  }
});

app.get("/api/bookings", async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month) {
      return res.status(400).json({ error: "year and month are required" });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const result = await pool.query(
      `
      select id, booker_name as "bookerName", date, time_slot as "timeSlot", room_id as "roomId"
      from bookings
      where date >= $1::date
        and date < $2::date
      order by date asc, room_id asc, time_slot asc
      `,
      [startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "failed to fetch bookings" });
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const { bookerName, date, timeSlot, roomId } = req.body ?? {};

    if (!bookerName || !date || !timeSlot || !roomId) {
      return res.status(400).json({ error: "missing required fields" });
    }

    const conflict = await pool.query(
      `
      select id
      from bookings
      where date = $1
        and time_slot = $2
        and room_id = $3
      limit 1
      `,
      [date, timeSlot, roomId]
    );

    if (conflict.rowCount > 0) {
      return res.status(409).json({ error: "already booked" });
    }

    const result = await pool.query(
      `
      insert into bookings (booker_name, date, time_slot, room_id)
      values ($1, $2, $3, $4)
      returning id, booker_name as "bookerName", date, time_slot as "timeSlot", room_id as "roomId"
      `,
      [bookerName, date, timeSlot, roomId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "failed to create booking" });
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "invalid id" });
    }

    const result = await pool.query(
      `
      delete from bookings
      where id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "booking not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "failed to delete booking" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on port ${port}`);
});

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
