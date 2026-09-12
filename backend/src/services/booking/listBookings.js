import Booking from "../../models/Booking.js";

export const listBookings = async ({ bookingDate, status, customer, bookingSource, paymentStatus, page = 1, limit = 20 } = {}) => {
  const query = { isDeleted: false };
  if (bookingDate) {
    const date = new Date(bookingDate);
    if (Number.isNaN(date.getTime())) return { success: false, bookings: [], total: 0, page: 1, limit, totalPages: 0, message: "Invalid booking date." };
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);
    query.bookingDate = { $gte: start, $lte: end };
  }
  if (status) query.status = status;
  if (customer) query.customer = customer;
  if (bookingSource) query.bookingSource = bookingSource;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  const currentPage = Math.max(1, Number(page) || 1);
  const currentLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (currentPage - 1) * currentLimit;
  const [total, bookings] = await Promise.all([
    Booking.countDocuments(query),
    Booking.find(query)
      .populate("customer")
      .populate("table")
      .populate("cancelledByUser", "name email role")
      .sort({ createdAt: -1, bookingDate: -1, startTime: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean(),
  ]);
  return { success: true, bookings, total, page: currentPage, limit: currentLimit, totalPages: Math.ceil(total / currentLimit), message: "Bookings retrieved successfully." };
};
