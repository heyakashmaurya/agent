import Booking from "../../../backend/src/models/Booking.js";
import { findOrCreateCustomer } from "../../../backend/src/services/customer/findOrCreateCustomer.js";
import { checkAvailability } from "../../../backend/src/services/booking/checkAvailability.js";
import { generateConfirmationCode } from "../../../backend/src/utils/generateConfirmationCode.js";

const ALLOWED_SOURCES = new Set(["ai_voice", "dashboard", "walk_in", "website", "whatsapp"]);

export const createBooking = async ({
  name,
  phone,
  email,
  bookingDate,
  startTime,
  guestCount,
  specialRequest = "",
  occasion = "",
  notes = "",
  bookingSource = "dashboard",
}) => {
  if (!name) throw new Error("Customer name is required.");
  if (!phone) throw new Error("Customer phone is required.");
  if (!bookingDate) throw new Error("Booking date is required.");
  if (!startTime) throw new Error("Booking time is required.");
  if (!Number.isInteger(Number(guestCount)) || Number(guestCount) < 1) {
    throw new Error("Guest count must be a positive integer.");
  }

  const source = String(bookingSource || "dashboard").trim().toLowerCase();
  if (!ALLOWED_SOURCES.has(source)) throw new Error("Invalid booking source.");

  const customer = await findOrCreateCustomer({ name, phone, email });
  const availability = await checkAvailability({ bookingDate, startTime, guestCount: Number(guestCount) });

  if (!availability.available) {
    return { success: false, message: availability.reason, booking: null };
  }

  const booking = await Booking.create({
    customer: customer._id,
    table: availability.table._id,
    bookingDate,
    startTime,
    guestCount: Number(guestCount),
    confirmationCode: generateConfirmationCode(),
    specialRequest,
    occasion,
    notes,
    status: "confirmed",
    bookingSource: source,
  });

  await booking.populate([{ path: "customer" }, { path: "table" }]);
  return { success: true, booking, message: "Booking created successfully." };
};
