import {
  isObjectId,
  isValidDateString,
  isValidTime,
  parsePositiveInt,
  parseString,
  sendError,
  sendSuccess,
  logControllerError,
} from "./_controllerUtils.js";
import { createBooking } from "../services/booking/createBooking.js";
import { getBooking } from "../services/booking/getBooking.js";
import { listBookings } from "../services/booking/listBookings.js";
import { updateBooking } from "../services/booking/updateBooking.js";
import { cancelBooking } from "../services/booking/cancelBooking.js";
import { checkAvailability } from "../services/booking/checkAvailability.js";

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
];
const BOOKING_SOURCES = [
  "ai_voice",
  "dashboard",
  "walk_in",
  "website",
  "whatsapp",
];
const PAYMENT_STATUSES = ["pending", "paid", "refunded", "not_required"];
const normalizeStatus = (value) => parseString(value).toLowerCase();

export const createBookingController = async (req, res, next) => {
  try {
    const b = req.body || {};
    const name = parseString(b.name || b.customerName || b.fullName);
    const phone = parseString(b.phone || b.customerPhone);
    const rawEmail = parseString(b.email);
    const email = rawEmail ? rawEmail.toLowerCase() : null;
    const bookingDate = parseString(b.bookingDate || b.date);
    const startTime = parseString(b.startTime || b.time);
    const guestCount = parsePositiveInt(
      b.guestCount ?? b.guests ?? b.partySize,
      null,
      100,
    );
    const bookingSource = parseString(
      b.bookingSource,
      "dashboard",
    ).toLowerCase();
    const tableId = parseString(b.tableId || b.table) || null;

    if (!name)
      return sendError(res, {
        status: 400,
        message: "Customer name is required.",
      });
    if (!phone)
      return sendError(res, {
        status: 400,
        message: "Customer phone number is required.",
      });
    if (!bookingDate || !isValidDateString(bookingDate))
      return sendError(res, {
        status: 400,
        message: "A valid booking date is required.",
      });
    if (!isValidTime(startTime))
      return sendError(res, {
        status: 400,
        message: "Booking time must use HH:mm format.",
      });
    if (!guestCount)
      return sendError(res, {
        status: 400,
        message: "Guest count must be a whole number between 1 and 100.",
      });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return sendError(res, { status: 400, message: "Invalid email address." });
    if (!BOOKING_SOURCES.includes(bookingSource))
      return sendError(res, {
        status: 400,
        message: "Invalid booking source.",
      });
    if (tableId && !isObjectId(tableId))
      return sendError(res, { status: 400, message: "Invalid table ID." });

    const result = await createBooking({
      name,
      phone,
      email,
      bookingDate,
      startTime,
      guestCount,
      specialRequest: parseString(b.specialRequest),
      occasion: parseString(b.occasion),
      notes: parseString(b.notes),
      bookingSource,
      tableId,
    });

    if (!result?.success)
      return sendError(res, {
        status: 409,
        message: result?.message || "Unable to create booking.",
        details: { booking: result?.booking || null },
      });
    return sendSuccess(res, {
      status: 201,
      message: result.message || "Booking created successfully.",
      data: { booking: result.booking },
    });
  } catch (error) {
    logControllerError("BOOKING_CREATE", error, req);
    return next(error);
  }
};

export const listBookingsController = async (req, res, next) => {
  try {
    const status = req.query?.status
      ? normalizeStatus(req.query.status)
      : undefined;
    const bookingSource = req.query?.bookingSource
      ? normalizeStatus(req.query.bookingSource)
      : undefined;
    const paymentStatus = req.query?.paymentStatus
      ? normalizeStatus(req.query.paymentStatus)
      : undefined;
    const customer = req.query?.customer
      ? parseString(req.query.customer)
      : undefined;
    const page =
      req.query?.page === undefined
        ? 1
        : parsePositiveInt(req.query.page, null, 100000);
    const limit =
      req.query?.limit === undefined
        ? 20
        : parsePositiveInt(req.query.limit, null, 100);
    if (customer && !isObjectId(customer))
      return sendError(res, { status: 400, message: "Invalid customer ID." });
    if (page === null)
      return sendError(res, {
        status: 400,
        message: "Page must be a positive integer.",
      });
    if (limit === null)
      return sendError(res, {
        status: 400,
        message: "Limit must be between 1 and 100.",
      });
    if (status && !BOOKING_STATUSES.includes(status))
      return sendError(res, {
        status: 400,
        message: "Invalid booking status.",
      });
    if (bookingSource && !BOOKING_SOURCES.includes(bookingSource))
      return sendError(res, {
        status: 400,
        message: "Invalid booking source.",
      });
    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus))
      return sendError(res, {
        status: 400,
        message: "Invalid payment status.",
      });
    if (req.query?.bookingDate && !isValidDateString(req.query.bookingDate))
      return sendError(res, { status: 400, message: "Invalid booking date." });
    const result = await listBookings({
      bookingDate: parseString(req.query?.bookingDate) || undefined,
      status,
      customer,
      bookingSource,
      paymentStatus,
      page,
      limit,
    });
    return sendSuccess(res, {
      message: result?.message || "Bookings retrieved successfully.",
      data: result?.bookings || [],
      meta: {
        total: result?.total || 0,
        page: result?.page || page,
        limit: result?.limit || limit,
        totalPages: result?.totalPages || 0,
      },
    });
  } catch (error) {
    logControllerError("BOOKING_LIST", error, req);
    return next(error);
  }
};

export const getBookingController = async (req, res, next) => {
  try {
    const bookingId = parseString(req.params?.bookingId || req.params?.id);
    if (!isObjectId(bookingId))
      return sendError(res, { status: 400, message: "Invalid booking ID." });
    const result = await getBooking({ bookingId });
    if (!result?.success)
      return sendError(res, {
        status: 404,
        message: result?.message || "Booking not found.",
      });
    return sendSuccess(res, { data: { booking: result.booking } });
  } catch (error) {
    logControllerError("BOOKING_GET", error, req);
    return next(error);
  }
};

export const checkBookingAvailabilityController = async (req, res, next) => {
  try {
    const b = req.body || {};
    const bookingDate = parseString(b.bookingDate || b.date);
    const startTime = parseString(b.startTime || b.time);
    const guestCount = parsePositiveInt(
      b.guestCount ?? b.guests ?? b.partySize,
      null,
      100,
    );
    const excludeBookingId = b.excludeBookingId
      ? parseString(b.excludeBookingId)
      : null;
    if (!bookingDate || !isValidDateString(bookingDate))
      return sendError(res, {
        status: 400,
        message: "A valid booking date is required.",
      });
    if (!isValidTime(startTime))
      return sendError(res, {
        status: 400,
        message: "Booking time must use HH:mm format.",
      });
    if (!guestCount)
      return sendError(res, {
        status: 400,
        message: "Guest count must be between 1 and 100.",
      });
    if (excludeBookingId && !isObjectId(excludeBookingId))
      return sendError(res, {
        status: 400,
        message: "Invalid excludeBookingId.",
      });
    const result = await checkAvailability({
      bookingDate,
      startTime,
      guestCount,
      excludeBookingId,
    });
    return sendSuccess(res, {
      data: {
        available: Boolean(result?.available),
        table: result?.table || null,
        endTime: result?.endTime || null,
        reason: result?.reason || null,
      },
      message: result?.available
        ? "Table is available."
        : result?.reason || "No table is available.",
    });
  } catch (error) {
    logControllerError("BOOKING_AVAILABILITY", error, req);
    return next(error);
  }
};

export const updateBookingController = async (req, res, next) => {
  try {
    const bookingId = parseString(req.params?.bookingId || req.params?.id);
    if (!isObjectId(bookingId))
      return sendError(res, { status: 400, message: "Invalid booking ID." });
    const b = req.body || {};

    // Customer name is deliberately NOT accepted here. Confirmed reservation names are immutable.
    const payload = {
      bookingId,
      confirmationCode: parseString(b.confirmationCode) || undefined,
      phone:
        b.phone !== undefined
          ? parseString(b.phone)
          : b.customerPhone !== undefined
            ? parseString(b.customerPhone)
            : undefined,
      tableId: b.tableId !== undefined ? parseString(b.tableId) : undefined,
      bookingDate:
        b.bookingDate !== undefined ? parseString(b.bookingDate) : undefined,
      startTime:
        b.startTime !== undefined ? parseString(b.startTime) : undefined,
      guestCount:
        b.guestCount !== undefined
          ? parsePositiveInt(b.guestCount, null, 100)
          : undefined,
      specialRequest:
        b.specialRequest !== undefined
          ? parseString(b.specialRequest)
          : undefined,
      occasion: b.occasion !== undefined ? parseString(b.occasion) : undefined,
      notes: b.notes !== undefined ? parseString(b.notes) : undefined,
      status: b.status !== undefined ? normalizeStatus(b.status) : undefined,
    };
    if (
      payload.tableId !== undefined &&
      payload.tableId &&
      !isObjectId(payload.tableId)
    )
      return sendError(res, { status: 400, message: "Invalid table ID." });
    if (
      payload.bookingDate !== undefined &&
      !isValidDateString(payload.bookingDate)
    )
      return sendError(res, { status: 400, message: "Invalid booking date." });
    if (payload.startTime !== undefined && !isValidTime(payload.startTime))
      return sendError(res, {
        status: 400,
        message: "Invalid booking time. Use HH:mm.",
      });
    if (payload.guestCount === null)
      return sendError(res, {
        status: 400,
        message: "Guest count must be between 1 and 100.",
      });
    if (
      payload.status !== undefined &&
      !BOOKING_STATUSES.includes(payload.status)
    )
      return sendError(res, {
        status: 400,
        message: "Invalid booking status.",
      });

    const result = await updateBooking(payload);
    if (!result?.success)
      return sendError(res, {
        status: 409,
        message: result?.message || "Unable to update booking.",
      });
    return sendSuccess(res, {
      data: { booking: result.booking },
      message: result.message || "Booking updated successfully.",
    });
  } catch (error) {
    logControllerError("BOOKING_UPDATE", error, req);
    return next(error);
  }
};

export const cancelBookingController = async (req, res, next) => {
  try {
    const bookingId = parseString(req.params?.bookingId || req.params?.id);
    if (!isObjectId(bookingId))
      return sendError(res, { status: 400, message: "Invalid booking ID." });
    const reason = parseString(
      req.body?.reason,
      "Cancelled by dashboard",
    ).slice(0, 500);
    const actorByRole = {
      Owner: "admin",
      Manager: "restaurant",
      Staff: "restaurant",
    };
    const cancelledBy = actorByRole[req.user?.role];
    if (!cancelledBy)
      return sendError(res, {
        status: 403,
        message: "Your account role cannot cancel bookings.",
      });
    const result = await cancelBooking({
      bookingId,
      reason,
      cancelledBy,
      cancelledByUser: req.user?._id || req.user?.id || null,
    });
    if (!result?.success)
      return sendError(res, {
        status: /not found/i.test(result?.message || "") ? 404 : 409,
        message: result?.message || "Unable to cancel booking.",
        details: { booking: result?.booking || null },
      });
    return sendSuccess(res, {
      data: { booking: result.booking },
      message: result.message || "Booking cancelled successfully.",
    });
  } catch (error) {
    logControllerError("BOOKING_CANCEL", error, req);
    return next(error);
  }
};

export default {
  createBookingController,
  listBookingsController,
  getBookingController,
  checkBookingAvailabilityController,
  updateBookingController,
  cancelBookingController,
};

// import { createBooking } from "../services/booking/createBooking.js";
// import { getBooking } from "../services/booking/getBooking.js";
// import { listBookings } from "../services/booking/listBookings.js";
// import { updateBooking } from "../services/booking/updateBooking.js";
// import { cancelBooking } from "../services/booking/cancelBooking.js";
// import { checkAvailability } from "../services/booking/checkAvailability.js";
// import {
//   isObjectId,
//   isValidDateString,
//   isValidTime,
//   parsePositiveInt,
//   parseString,
//   sendError,
//   sendSuccess,
//   logControllerError,
// } from "./_controllerUtils.js";

// const BOOKING_STATUSES = ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"];
// const BOOKING_SOURCES = ["ai_voice", "dashboard", "walk_in", "website", "whatsapp"];
// const PAYMENT_STATUSES = ["pending", "paid", "refunded", "not_required"];

// const normalizeStatus = (value) => parseString(value).toLowerCase();

// export const createBookingController = async (req, res, next) => {
//   try {
//     const b = req.body || {};
//     const name = parseString(b.name || b.customerName || b.fullName);
//     const phone = parseString(b.phone);
//     const rawEmail = parseString(b.email);
// const email = rawEmail ? rawEmail.toLowerCase() : null;
//     const bookingDate = parseString(b.bookingDate || b.date);
//     const startTime = parseString(b.startTime || b.time);
//     const guestCount = parsePositiveInt(b.guestCount ?? b.guests ?? b.partySize, null, 50);
//     const bookingSource = parseString(b.bookingSource, "dashboard").toLowerCase();

//     if (!name) return sendError(res, { status: 400, message: "Customer name is required." });
//     if (!phone) return sendError(res, { status: 400, message: "Customer phone number is required." });
//     if (!bookingDate || !isValidDateString(bookingDate)) return sendError(res, { status: 400, message: "A valid booking date is required." });
//     if (!isValidTime(startTime)) return sendError(res, { status: 400, message: "Booking time must use HH:mm format." });
//     if (!guestCount) return sendError(res, { status: 400, message: "Guest count must be a whole number between 1 and 50." });
//     if (!BOOKING_SOURCES.includes(bookingSource)) return sendError(res, { status: 400, message: "Invalid booking source." });

//     const result = await createBooking({
//       name,
//       phone,
//       email,
//       bookingDate,
//       startTime,
//       guestCount,
//       specialRequest: parseString(b.specialRequest),
//       occasion: parseString(b.occasion),
//       notes: parseString(b.notes),
//       bookingSource,
//     });

//     if (!result?.success) {
//       return sendError(res, {
//         status: 409,
//         message: result?.message || "Unable to create booking.",
//         details: { booking: result?.booking || null },
//       });
//     }

//     return sendSuccess(res, {
//       status: 201,
//       message: result.message || "Booking created successfully.",
//       data: { booking: result.booking },
//     });
//   } catch (error) {
//     logControllerError("BOOKING_CREATE", error, req);
//     return next(error);
//   }
// };

// export const listBookingsController = async (req, res, next) => {
//   try {
//     const status = req.query?.status ? normalizeStatus(req.query.status) : undefined;
//     const bookingSource = req.query?.bookingSource ? normalizeStatus(req.query.bookingSource) : undefined;
//     const paymentStatus = req.query?.paymentStatus ? normalizeStatus(req.query.paymentStatus) : undefined;
//     const customer = req.query?.customer ? parseString(req.query.customer) : undefined;
//     const page = req.query?.page === undefined ? 1 : parsePositiveInt(req.query.page, null, 100000);
//     const limit = req.query?.limit === undefined ? 20 : parsePositiveInt(req.query.limit, null, 100);

//     if (customer && !isObjectId(customer)) return sendError(res, { status: 400, message: "Invalid customer ID." });
//     if (page === null) return sendError(res, { status: 400, message: "Page must be a positive integer." });
//     if (limit === null) return sendError(res, { status: 400, message: "Limit must be between 1 and 100." });
//     if (status && !BOOKING_STATUSES.includes(status)) return sendError(res, { status: 400, message: "Invalid booking status." });
//     if (bookingSource && !BOOKING_SOURCES.includes(bookingSource)) return sendError(res, { status: 400, message: "Invalid booking source." });
//     if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) return sendError(res, { status: 400, message: "Invalid payment status." });
//     if (req.query?.bookingDate && !isValidDateString(req.query.bookingDate)) return sendError(res, { status: 400, message: "Invalid booking date." });

//     const result = await listBookings({
//       bookingDate: parseString(req.query?.bookingDate) || undefined,
//       status,
//       customer,
//       bookingSource,
//       paymentStatus,
//       page,
//       limit,
//     });

//     return sendSuccess(res, {
//       message: result?.message || "Bookings retrieved successfully.",
//       data: result?.bookings || [],
//       meta: {
//         total: result?.total || 0,
//         page: result?.page || page,
//         limit: result?.limit || limit,
//         totalPages: result?.totalPages || 0,
//       },
//     });
//   } catch (error) {
//     logControllerError("BOOKING_LIST", error, req);
//     return next(error);
//   }
// };

// export const getBookingController = async (req, res, next) => {
//   try {
//     const bookingId = parseString(req.params?.bookingId || req.params?.id);
//     if (!isObjectId(bookingId)) return sendError(res, { status: 400, message: "Invalid booking ID." });

//     const result = await getBooking({ bookingId });
//     if (!result?.success) return sendError(res, { status: 404, message: result?.message || "Booking not found." });

//     return sendSuccess(res, { data: { booking: result.booking } });
//   } catch (error) {
//     logControllerError("BOOKING_GET", error, req);
//     return next(error);
//   }
// };

// export const checkBookingAvailabilityController = async (req, res, next) => {
//   try {
//     const b = req.body || {};
//     const bookingDate = parseString(b.bookingDate || b.date);
//     const startTime = parseString(b.startTime || b.time);
//     const guestCount = parsePositiveInt(b.guestCount ?? b.guests ?? b.partySize, null, 50);
//     const excludeBookingId = b.excludeBookingId ? parseString(b.excludeBookingId) : null;

//     if (!bookingDate || !isValidDateString(bookingDate)) return sendError(res, { status: 400, message: "A valid booking date is required." });
//     if (!isValidTime(startTime)) return sendError(res, { status: 400, message: "Booking time must use HH:mm format." });
//     if (!guestCount) return sendError(res, { status: 400, message: "Guest count must be between 1 and 50." });
//     if (excludeBookingId && !isObjectId(excludeBookingId)) return sendError(res, { status: 400, message: "Invalid excludeBookingId." });

//     const result = await checkAvailability({ bookingDate, startTime, guestCount, excludeBookingId });
//     return sendSuccess(res, {
//       data: {
//         available: Boolean(result?.available),
//         table: result?.table || null,
//         endTime: result?.endTime || null,
//         reason: result?.reason || null,
//       },
//       message: result?.available ? "Table is available." : (result?.reason || "No table is available."),
//     });
//   } catch (error) {
//     logControllerError("BOOKING_AVAILABILITY", error, req);
//     return next(error);
//   }
// };

// export const updateBookingController = async (req, res, next) => {
//   try {
//     const bookingId = parseString(req.params?.bookingId || req.params?.id);
//     if (!isObjectId(bookingId)) return sendError(res, { status: 400, message: "Invalid booking ID." });

//     const b = req.body || {};
//     const payload = {
//       bookingId,
//       confirmationCode: parseString(b.confirmationCode) || undefined,
//       phone: parseString(b.phone) || undefined,
//       bookingDate: b.bookingDate !== undefined ? parseString(b.bookingDate) : undefined,
//       startTime: b.startTime !== undefined ? parseString(b.startTime) : undefined,
//       guestCount: b.guestCount !== undefined ? parsePositiveInt(b.guestCount, null, 50) : undefined,
//       specialRequest: b.specialRequest !== undefined ? parseString(b.specialRequest) : undefined,
//       occasion: b.occasion !== undefined ? parseString(b.occasion) : undefined,
//       notes: b.notes !== undefined ? parseString(b.notes) : undefined,
//       status: b.status !== undefined ? normalizeStatus(b.status) : undefined,
//     };

//     if (payload.bookingDate !== undefined && !isValidDateString(payload.bookingDate)) return sendError(res, { status: 400, message: "Invalid booking date." });
//     if (payload.startTime !== undefined && !isValidTime(payload.startTime)) return sendError(res, { status: 400, message: "Booking time must use HH:mm format." });
//     if (payload.guestCount === null) return sendError(res, { status: 400, message: "Guest count must be between 1 and 50." });
//     if (payload.status !== undefined && !BOOKING_STATUSES.includes(payload.status)) return sendError(res, { status: 400, message: "Invalid booking status." });

//     const result = await updateBooking(payload);
//     if (!result?.success) return sendError(res, { status: 409, message: result?.message || "Unable to update booking." });

//     return sendSuccess(res, { data: { booking: result.booking }, message: result.message || "Booking updated successfully." });
//   } catch (error) {
//     logControllerError("BOOKING_UPDATE", error, req);
//     return next(error);
//   }
// };

// export const cancelBookingController = async (req, res, next) => {
//   try {
//     const bookingId = parseString(req.params?.bookingId || req.params?.id);
//     if (!isObjectId(bookingId)) {
//       return sendError(res, { status: 400, message: "Invalid booking ID." });
//     }

//     const reason = parseString(req.body?.reason, "Cancelled by dashboard").slice(0, 500);

//     // Security/audit rule: never trust cancelledBy from the frontend.
//     // Derive the actor category from the authenticated user and store the
//     // concrete user id in the separate cancelledByUser field.
//     const actorByRole = {
//       Owner: "admin",
//       Manager: "restaurant",
//       Staff: "restaurant",
//     };
//     const cancelledBy = actorByRole[req.user?.role];

//     if (!cancelledBy) {
//       return sendError(res, { status: 403, message: "Your account role cannot cancel bookings." });
//     }

//     const cancelledByUser = req.user?._id || req.user?.id || null;

//     const result = await cancelBooking({
//       bookingId,
//       reason,
//       cancelledBy,
//       cancelledByUser,
//     });

//     if (!result?.success) {
//       const status = /not found/i.test(result?.message || "") ? 404 : 409;
//       return sendError(res, {
//         status,
//         message: result?.message || "Unable to cancel booking.",
//         data: { booking: result?.booking || null },
//       });
//     }

//     return sendSuccess(res, {
//       status: 200,
//       data: { booking: result.booking },
//       message: result.message || "Booking cancelled successfully.",
//     });
//   } catch (error) {
//     logControllerError("BOOKING_CANCEL", error, req);
//     return next(error);
//   }
// };

// export default {
//   createBookingController,
//   listBookingsController,
//   getBookingController,
//   checkBookingAvailabilityController,
//   updateBookingController,
//   cancelBookingController,
// };
