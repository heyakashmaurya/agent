import Booking from "../models/Booking.js";
import CallLog from "../models/CallLog.js";
import Table from "../models/Table.js";
import {
  isValidDateString,
  parseString,
  sendError,
  sendSuccess,
  logControllerError,
} from "./_controllerUtils.js";

const toDateRange = (from, to) => {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getAnalyticsOverviewController = async (req, res, next) => {
  try {
    const from = parseString(req.query?.from);
    const to = parseString(req.query?.to);
    if (from && !isValidDateString(from)) return sendError(res, { status: 400, message: "Invalid from date." });
    if (to && !isValidDateString(to)) return sendError(res, { status: 400, message: "Invalid to date." });

    const { start, end } = toDateRange(from, to);
    if (start > end) return sendError(res, { status: 400, message: "from must be before to." });

    const bookingMatch = { isDeleted: false, bookingDate: { $gte: start, $lte: end } };
    const callMatch = { startedAt: { $gte: start, $lte: end } };

    const [bookingSummary, bookingsByDay, bookingsBySource, callsByDay, callsByOutcome, callsBySentiment, tables] = await Promise.all([
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } },
          guests: { $sum: "$guestCount" },
        } },
      ]),
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate" } }, bookings: { $sum: 1 }, guests: { $sum: "$guestCount" } } },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: { _id: "$bookingSource", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      CallLog.aggregate([
        { $match: callMatch },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } }, calls: { $sum: 1 }, aiHandled: { $sum: { $cond: ["$aiHandled", 1, 0] } }, transferred: { $sum: { $cond: ["$transferredToHuman", 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]),
      CallLog.aggregate([{ $match: callMatch }, { $group: { _id: "$aiOutcome", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      CallLog.aggregate([{ $match: callMatch }, { $group: { _id: "$sentiment", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Table.find({ isDeleted: false }).select("tableNumber capacity location floor status isActive").lean(),
    ]);

    const summary = bookingSummary[0] || { total: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0, guests: 0 };
    const totalCalls = callsByDay.reduce((sum, item) => sum + item.calls, 0);
    const aiHandledCalls = callsByDay.reduce((sum, item) => sum + item.aiHandled, 0);
    const transferredCalls = callsByDay.reduce((sum, item) => sum + item.transferred, 0);

    return sendSuccess(res, {
      data: {
        range: { from: start.toISOString(), to: end.toISOString() },
        bookings: { ...summary, cancellationRate: summary.total ? Number(((summary.cancelled / summary.total) * 100).toFixed(1)) : 0, noShowRate: summary.total ? Number(((summary.noShow / summary.total) * 100).toFixed(1)) : 0 },
        calls: { total: totalCalls, aiHandled: aiHandledCalls, transferred: transferredCalls, aiHandledRate: totalCalls ? Number(((aiHandledCalls / totalCalls) * 100).toFixed(1)) : 0 },
        // Flat aliases keep the API compatible with lightweight dashboard clients.
        totalBookings: summary.total,
        confirmedBookings: summary.confirmed,
        cancelledBookings: summary.cancelled,
        completedBookings: summary.completed,
        noShowBookings: summary.noShow,
        totalGuests: summary.guests,
        totalCalls,
        aiHandledCalls,
        humanTransfers: transferredCalls,
        aiContainmentRate: totalCalls ? Number(((aiHandledCalls / totalCalls) * 100).toFixed(1)) : 0,
        revenue: 0,
        bookingsByDay: bookingsByDay.map((item) => ({ date: item._id, bookings: item.bookings, guests: item.guests })),
        bookingsBySource: Object.fromEntries(bookingsBySource.map((item) => [item._id || "unknown", item.count])),
        callsByDay: callsByDay.map((item) => ({ date: item._id, calls: item.calls, aiHandled: item.aiHandled, transferred: item.transferred })),
        callOutcomes: Object.fromEntries(callsByOutcome.map((item) => [item._id || "unknown", item.count])),
        sentiment: Object.fromEntries(callsBySentiment.map((item) => [item._id || "unknown", item.count])),
        tableUtilization: {
          total: tables.length,
          occupied: tables.filter((table) => String(table.status).toLowerCase() === "occupied").length,
          reserved: tables.filter((table) => String(table.status).toLowerCase() === "reserved").length,
          available: tables.filter((table) => String(table.status).toLowerCase() === "available").length,
          maintenance: tables.filter((table) => String(table.status).toLowerCase() === "maintenance").length,
        },
      },
      message: "Analytics retrieved successfully.",
    });
  } catch (error) {
    logControllerError("ANALYTICS_OVERVIEW", error, req);
    return next(error);
  }
};

export default { getAnalyticsOverviewController };
