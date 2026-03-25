import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

const queryParamsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const createBookingSchema = z.object({
  bookerName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.enum(["slot1", "slot2", "slot3", "slot4", "slot5"]),
  roomId: z.number().int().min(1).max(3),
});

router.get("/bookings", async (req, res) => {
  const parsed = queryParamsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { year, month } = parsed.data;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const bookings = await db.select().from(bookingsTable);

  const filtered = bookings.filter((b) => {
    return b.date >= startDate && b.date < endDate;
  });

  const result = filtered.map((b) => ({
    id: b.id,
    bookerName: b.bookerName,
    date: b.date,
    timeSlot: b.timeSlot,
    roomId: b.roomId,
    createdAt: b.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/bookings", async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { bookerName, date, timeSlot, roomId } = parsed.data;

  const existing = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.date, date),
        eq(bookingsTable.timeSlot, timeSlot),
        eq(bookingsTable.roomId, roomId)
      )
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "この時間帯・会議室は既に予約済みです" });
    return;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({ bookerName, date, timeSlot, roomId })
    .returning();

  res.status(201).json({
    id: booking.id,
    bookerName: booking.bookerName,
    date: booking.date,
    timeSlot: booking.timeSlot,
    roomId: booking.roomId,
    createdAt: booking.createdAt.toISOString(),
  });
});

router.delete("/bookings/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(bookingsTable)
    .where(eq(bookingsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "予約が見つかりません" });
    return;
  }

  res.status(204).send();
});

export default router;
