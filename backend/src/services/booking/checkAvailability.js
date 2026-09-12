import Booking from "../../models/Booking.js";
import Table from "../../models/Table.js";
import { calculateEndTime } from "../../utils/calculateEndTime.js";
import { isTimeOverlapping } from "../../utils/timeOverlap.js";

const activeStatuses = ["pending", "confirmed", "seated"];

export const checkAvailability = async ({ bookingDate, startTime, guestCount, excludeBookingId, tableId } = {}) => {
  const date = new Date(bookingDate);
  const guests = Number(guestCount);
  if (Number.isNaN(date.getTime())) return { available: false, reason: "Invalid booking date." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(startTime || ""))) return { available: false, reason: "Invalid booking time." };
  if (!Number.isInteger(guests) || guests < 1) return { available: false, reason: "Guest count must be at least 1." };

  const endTime = calculateEndTime(String(startTime), 90);
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  const bookingQuery = { bookingDate: { $gte: dayStart, $lte: dayEnd }, status: { $in: activeStatuses }, isDeleted: false };
  if (excludeBookingId) bookingQuery._id = { $ne: excludeBookingId };

  const [bookings, tables] = await Promise.all([
    Booking.find(bookingQuery).select("table startTime endTime").lean(),
    Table.find({
      ...(tableId ? { _id: tableId } : {}),
      isDeleted: false,
      isActive: true,
      capacity: { $gte: guests },
      status: { $ne: "Maintenance" },
    }).sort({ capacity: 1, tableNumber: 1 }).lean(),
  ]);

  const available = tables.find((table) => !bookings.some((booking) => {
    if (!booking.table || String(booking.table) !== String(table._id)) return false;
    const bookedEnd = booking.endTime || calculateEndTime(booking.startTime, 90);
    return isTimeOverlapping({ existingStart: booking.startTime, existingEnd: bookedEnd, requestedStart: startTime, requestedEnd: endTime });
  }));

  if (!available) return { available: false, table: null, endTime, reason: tableId ? "Selected table is not available for that time." : "No suitable table is available for that time." };
  return { available: true, table: available, endTime, reason: null };
};
