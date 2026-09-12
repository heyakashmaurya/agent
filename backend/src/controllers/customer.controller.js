import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import CallLog from "../models/CallLog.js";
import Customer from "../models/Customer.js";
import { parseString, sendError, sendSuccess, logControllerError, isObjectId, parsePositiveInt } from "./_controllerUtils.js";

const normalizePhone = (value) => parseString(value).replace(/[^+\d]/g, "");

export const listCustomers = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query?.page, 1, 100000);
    const limit = parsePositiveInt(req.query?.limit, 50, 100);
    const search = parseString(req.query?.search);
    if (page === null || limit === null) return sendError(res, { status: 400, message: "Invalid pagination." });

    const match = { isDeleted: false };
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      match.$or = [
        { fullName: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, customers] = await Promise.all([
      Customer.countDocuments(match),
      Customer.aggregate([
        { $match: match },
        { $lookup: { from: "bookings", localField: "_id", foreignField: "customer", as: "bookingRows" } },
        { $lookup: { from: "calllogs", localField: "_id", foreignField: "customer", as: "callRows" } },
        { $set: {
          totalBookings: { $size: "$bookingRows" },
          totalVisits: { $size: { $filter: { input: "$bookingRows", as: "b", cond: { $in: ["$$b.status", ["seated", "completed"]] } } } },
          lastBookingAt: { $max: "$bookingRows.bookingDate" },
          lastCallAt: { $max: "$callRows.startedAt" },
        } },
        { $set: { lastActivityAt: { $max: ["$lastBookingAt", "$lastCallAt", "$updatedAt", "$createdAt"] } } },
        { $project: { bookingRows: 0, callRows: 0 } },
        { $sort: { lastActivityAt: -1, fullName: 1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
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
    const [customer, bookings, calls] = await Promise.all([
      Customer.findOne({ _id: id, isDeleted: false }).lean(),
      Booking.find({ customer: id, isDeleted: false }).populate("table").sort({ bookingDate: -1, createdAt: -1 }).limit(100).lean(),
      CallLog.find({ customer: id }).populate("booking campaign").sort({ startedAt: -1 }).limit(100).lean(),
    ]);
    if (!customer) return sendError(res, { status: 404, message: "Customer not found." });
    const visits = bookings.filter((booking) => ["seated", "completed"].includes(booking.status)).length;
    return sendSuccess(res, {
      data: {
        customer: { ...customer, totalBookings: bookings.length, totalVisits: visits, lastBookingAt: bookings[0]?.bookingDate || null, lastCallAt: calls[0]?.startedAt || null },
        bookings,
        calls,
      },
      message: "Customer history retrieved successfully.",
    });
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
    const or = [];
    if (id) or.push({ _id: id });
    if (phone) or.push({ phone });
    if (email) or.push({ email });
    const customer = await Customer.findOne({ isDeleted: false, $or: or }).lean();
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
    const allowed = ["fullName", "phone", "email", "notes", "preferredLanguage", "preferences", "isBlocked"];
    const payload = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    if (payload.fullName !== undefined) payload.fullName = parseString(payload.fullName);
    if (payload.phone !== undefined) payload.phone = normalizePhone(payload.phone);
    if (payload.email !== undefined) payload.email = parseString(payload.email).toLowerCase() || null;
    if (payload.preferredLanguage !== undefined && !["en", "hi"].includes(payload.preferredLanguage)) return sendError(res, { status: 400, message: "Preferred language must be en or hi." });
    if (!Object.keys(payload).length) return sendError(res, { status: 400, message: "No valid customer fields were supplied." });
    const customer = await Customer.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: payload }, { new: true, runValidators: true }).lean();
    if (!customer) return sendError(res, { status: 404, message: "Customer not found." });
    return sendSuccess(res, { data: customer, message: "Customer updated successfully." });
  } catch (error) {
    logControllerError("CUSTOMER_UPDATE", error, req);
    return next(error);
  }
};

export default { listCustomers, getCustomerById, findCustomer, updateCustomer };
