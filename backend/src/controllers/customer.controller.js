import Customer from "../models/Customer.js";
import Booking from "../models/Booking.js";
import {
  isObjectId,
  parsePositiveInt,
  parseString,
  sendError,
  sendSuccess,
  logControllerError,
} from "./_controllerUtils.js";

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
