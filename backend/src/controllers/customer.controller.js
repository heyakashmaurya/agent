import Booking from "../models/Booking.js";
import Table from "../models/Table.js";
import CallLog from "../models/CallLog.js";
import Customer from "../models/Customer.js";
import {
  parseString,
  sendSuccess,
  logControllerError,
    isObjectId,
  parsePositiveInt,
  sendError,
} from "./_controllerUtils.js";


function localDayRange(dateString) {
  const now = new Date();
  if (!dateString) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateString);
  if (!match) throw new Error("Dashboard date must use YYYY-MM-DD format.");
  const [, year, month, day] = match;
  const start = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

export const getDashboardOverview = async (req, res, next) => {
  try {
    const { start, end } = localDayRange(parseString(req.query?.date));
    const bookingBase = { isDeleted: false };
    const dayBookingQuery = {
      ...bookingBase,
      bookingDate: { $gte: start, $lte: end },
    };
    const activeTodayQuery = {
      ...dayBookingQuery,
      status: { $nin: ["cancelled", "no_show"] },
    };
    const [
      todayBookings,
      upcomingBookings,
      totalBookings,
      tables,
      activeCustomers,
      todayCalls,
      recentBookings,
      recentCalls,
      statusCounts,
      bookingVolume,
    ] = await Promise.all([
      Booking.countDocuments(activeTodayQuery),
      Booking.countDocuments({
        ...bookingBase,
        bookingDate: { $gt: end },
        status: { $nin: ["cancelled", "no_show"] },
      }),
      Booking.countDocuments(bookingBase),
      Table.find({ isDeleted: false, isActive: true })
        .sort({ tableNumber: 1 })
        .lean(),
      Customer.countDocuments({ isDeleted: false, isBlocked: false }),
      CallLog.countDocuments({ startedAt: { $gte: start, $lte: end } }),
      Booking.find(activeTodayQuery)
        .populate("customer table")
        .sort({ startTime: 1, createdAt: -1 })
        .limit(20)
        .lean(),
      CallLog.find({ startedAt: { $gte: start, $lte: end } })
        .populate("customer booking")
        .sort({ startedAt: -1 })
        .limit(20)
        .lean(),
      Booking.aggregate([
        { $match: activeTodayQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        {
          $match: {
            ...bookingBase,
            bookingDate: {
              $gte: new Date(
                start.getFullYear(),
                start.getMonth(),
                start.getDate() - 6,
              ),
              $lte: end,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$bookingDate",
                timezone: process.env.APP_TIMEZONE || "Asia/Kolkata",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const volumeMap = new Map(
      bookingVolume.map((item) => [item._id, item.count]),
    );

    return sendSuccess(res, {
      data: {
        date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
        metrics: {
          todayBookings,
          upcomingBookings,
          totalBookings,
          totalTables: tables.length,
          occupiedTables: tables.filter(
            (table) => String(table.status).toLowerCase() === "occupied",
          ).length,
          availableTables: tables.filter(
            (table) => String(table.status).toLowerCase() === "available",
          ).length,
          activeCustomers,
          todayCalls,
        },
        bookingStatus: Object.fromEntries(
          statusCounts.map((item) => [item._id, item.count]),
        ),
        bookingVolume: Array.from(volumeMap, ([date, count]) => ({
          date,
          count,
        })),
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

// export default { getDashboardOverview };






const normalizePhone = (value) => parseString(value).replace(/\s+/g, "");

export const listCustomers = async (req, res, next) => {
  try {
    const page = req.query?.page === undefined ? 1 : parsePositiveInt(req.query.page, null, 100000);
    const limit = req.query?.limit === undefined ? 25 : parsePositiveInt(req.query.limit, null, 100);
    if (page === null) return sendError(res, { status: 400, message: "Page must be a positive integer." });
    if (limit === null) return sendError(res, { status: 400, message: "Limit must be between 1 and 100." });

    const search = parseString(req.query?.search);
    const query = { isDeleted: false };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [total, customers] = await Promise.all([
      Customer.countDocuments(query),
      Customer.find(query).sort({ lastVisit: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    return sendSuccess(res, {
      data: customers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      message: "Customers retrieved successfully.",
    });
  } catch (error) {
    logControllerError("CUSTOMER_LIST", error, req);
    return next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const id = parseString(req.params?.id);
    if (!isObjectId(id)) return sendError(res, { status: 400, message: "Invalid customer ID." });

    const customer = await Customer.findOne({ _id: id, isDeleted: false }).lean();
    if (!customer) return sendError(res, { status: 404, message: "Customer not found." });

    const bookings = await Booking.find({ customer: id, isDeleted: false })
      .populate("table")
      .sort({ bookingDate: -1, startTime: -1 })
      .limit(50)
      .lean();

    return sendSuccess(res, { data: { customer, bookings } });
  } catch (error) {
    logControllerError("CUSTOMER_GET", error, req);
    return next(error);
  }
};

export const findCustomer = async (req, res, next) => {
  try {
    const id = parseString(req.query?.id);
    const phone = normalizePhone(req.query?.phone);
    const email = parseString(req.query?.email).toLowerCase();
    if (!id && !phone && !email) return sendError(res, { status: 400, message: "Provide customer id, phone, or email." });
    if (id && !isObjectId(id)) return sendError(res, { status: 400, message: "Invalid customer ID." });

    const query = { isDeleted: false, $or: [] };
    if (id) query.$or.push({ _id: id });
    if (phone) query.$or.push({ phone });
    if (email) query.$or.push({ email });

    const customer = await Customer.findOne(query).lean();
    if (!customer) return sendError(res, { status: 404, message: "Customer not found." });
    return sendSuccess(res, { data: customer });
  } catch (error) {
    logControllerError("CUSTOMER_FIND", error, req);
    return next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const id = parseString(req.params?.id);
    if (!isObjectId(id)) return sendError(res, { status: 400, message: "Invalid customer ID." });

    const b = req.body || {};
    const allowed = ["fullName", "phone", "email", "notes", "preferredLanguage", "preferences", "isBlocked"];
    const payload = Object.fromEntries(Object.entries(b).filter(([key]) => allowed.includes(key)));
    if (payload.fullName !== undefined && !parseString(payload.fullName)) return sendError(res, { status: 400, message: "Customer name cannot be empty." });
    if (payload.email !== undefined) payload.email = parseString(payload.email).toLowerCase() || null;
    if (payload.phone !== undefined) payload.phone = normalizePhone(payload.phone);
    if (payload.preferredLanguage !== undefined && !["en", "hi"].includes(payload.preferredLanguage)) return sendError(res, { status: 400, message: "Preferred language must be 'en' or 'hi'." });
    if (!Object.keys(payload).length) return sendError(res, { status: 400, message: "No valid customer fields were supplied." });

    const customer = await Customer.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
    if (!customer) return sendError(res, { status: 404, message: "Customer not found." });

    return sendSuccess(res, { data: customer, message: "Customer updated successfully." });
  } catch (error) {
    logControllerError("CUSTOMER_UPDATE", error, req);
    return next(error);
  }
};

export default { listCustomers, getCustomerById, findCustomer, updateCustomer };
