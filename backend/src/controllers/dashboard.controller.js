import Booking from "../models/Booking.js";
import Table from "../models/Table.js";
import CallLog from "../models/CallLog.js";
import Customer from "../models/Customer.js";
import { parseString, sendSuccess, logControllerError } from "./_controllerUtils.js";

const dayRange = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getDashboardOverview = async (req, res, next) => {
  try {
    const { start, end } = dayRange(parseString(req.query?.date));
    const bookingBase = { isDeleted: false };
    const dayBookingQuery = { ...bookingBase, bookingDate: { $gte: start, $lte: end } };

    const [
      todayBookings,
      upcomingBookings,
      totalBookings,
      tables,
      activeCustomers,
      todayCalls,
      recentBookings,
      recentCalls,
    ] = await Promise.all([
      Booking.countDocuments(dayBookingQuery),
      Booking.countDocuments({ ...bookingBase, bookingDate: { $gt: end } }),
      Booking.countDocuments(bookingBase),
      Table.find({ isDeleted: false }).sort({ tableNumber: 1 }).lean(),
      Customer.countDocuments({ isDeleted: false, isBlocked: false }),
      CallLog.countDocuments({ startedAt: { $gte: start, $lte: end } }),
      Booking.find(dayBookingQuery).populate("customer table").sort({ startTime: 1 }).limit(10).lean(),
      CallLog.find({}).populate("customer booking").sort({ startedAt: -1 }).limit(10).lean(),
    ]);

    const statusCounts = await Booking.aggregate([
      { $match: dayBookingQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const callOutcomeCounts = await CallLog.aggregate([
      { $match: { startedAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$aiOutcome", count: { $sum: 1 } } },
    ]);

    return sendSuccess(res, {
      data: {
        date: start.toISOString().slice(0, 10),
        metrics: {
          todayBookings,
          upcomingBookings,
          totalBookings,
          totalTables: tables.length,
          occupiedTables: tables.filter((table) => String(table.status).toLowerCase() === "occupied").length,
          availableTables: tables.filter((table) => String(table.status).toLowerCase() === "available").length,
          activeCustomers,
          todayCalls,
        },
        bookingStatus: Object.fromEntries(statusCounts.map((item) => [item._id, item.count])),
        callOutcomes: Object.fromEntries(callOutcomeCounts.map((item) => [item._id, item.count])),
        tables,
        recentBookings,
        recentCalls,
      },
      message: "Dashboard overview retrieved successfully.",
    });
  } catch (error) {
    logControllerError("DASHBOARD_OVERVIEW", error, req);
    return next(error);
  }
};

export default { getDashboardOverview };
