import Booking from "../../models/Booking.js";
import { findBooking } from "./findBooking.js";
import { checkAvailability } from "./checkAvailability.js";

export const updateBooking = async ({ bookingId, confirmationCode, phone, bookingDate, startTime, guestCount, specialRequest, occasion, notes, status, tableId }) => {
  const booking = await findBooking({ bookingId, confirmationCode, phone });
  if (!booking) return { success: false, message: "Booking not found." };
  if (booking.status === "cancelled" && status !== "cancelled") return { success: false, message: "Cancelled booking cannot be edited." };

  const nextDate = bookingDate !== undefined ? new Date(bookingDate) : new Date(booking.bookingDate);
  const nextTime = startTime !== undefined ? String(startTime).trim() : booking.startTime;
  const nextGuests = guestCount !== undefined ? Number(guestCount) : Number(booking.guestCount);
  if (Number.isNaN(nextDate.getTime())) return { success: false, message: "Invalid booking date." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(nextTime)) return { success: false, message: "Invalid booking time. Use HH:mm." };
  if (!Number.isInteger(nextGuests) || nextGuests < 1 || nextGuests > 100) return { success: false, message: "Guest count must be between 1 and 100." };

  const dateChanged = nextDate.toISOString().slice(0, 10) !== new Date(booking.bookingDate).toISOString().slice(0, 10);
  const scheduleChanged = dateChanged || nextTime !== booking.startTime || nextGuests !== Number(booking.guestCount) || tableId !== undefined;
  if (scheduleChanged) {
    const availability = await checkAvailability({ bookingDate: nextDate, startTime: nextTime, guestCount: nextGuests, excludeBookingId: booking._id, tableId: tableId || undefined });
    if (!availability?.available) return { success: false, message: availability?.reason || "No suitable table is available." };
    booking.table = availability.table?._id || null;
    booking.endTime = availability.endTime || booking.endTime || "";
  }

  booking.bookingDate = nextDate;
  booking.startTime = nextTime;
  booking.guestCount = nextGuests;
  if (phone !== undefined && String(phone).trim()) {
    await booking.populate("customer");
    if (booking.customer) { booking.customer.phone = String(phone).trim(); await booking.customer.save(); }
  }
  if (specialRequest !== undefined) booking.specialRequest = String(specialRequest);
  if (occasion !== undefined) booking.occasion = String(occasion);
  if (notes !== undefined) booking.notes = String(notes);
  if (status !== undefined) booking.status = status;
  if (status && status !== "cancelled") { booking.cancelledBy = null; booking.cancelledByUser = null; booking.cancelledAt = null; booking.cancelReason = ""; }
  await booking.save();
  await booking.populate([{ path: "customer" }, { path: "table" }, { path: "cancelledByUser", select: "name email role" }]);
  return { success: true, booking, message: "Booking updated successfully." };
};
