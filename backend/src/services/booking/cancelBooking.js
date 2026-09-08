
import { findBooking } from "./findBooking.js";

const CANCEL_ACTORS = new Set(["customer", "restaurant", "admin", "ai"]);

export const cancelBooking = async ({
  bookingId,
  confirmationCode,
  phone,
  reason = "Cancelled by customer",
  cancelledBy = null,
  cancelledByUser = null,
}) => {
  const booking = await findBooking({ bookingId, confirmationCode, phone });

  if (!booking) {
    return { success: false, booking: null, message: "Booking not found." };
  }
  if (booking.status === "cancelled") {
    return { success: false, booking, message: "Booking is already cancelled." };
  }
  if (booking.status === "completed") {
    return { success: false, booking, message: "Completed booking cannot be cancelled." };
  }
  if (booking.status === "no_show") {
    return { success: false, booking, message: "No-show booking cannot be cancelled." };
  }

  if (cancelledBy !== null && !CANCEL_ACTORS.has(cancelledBy)) {
    throw new TypeError("cancelledBy must be one of: customer, restaurant, admin, ai.");
  }

  if (cancelledByUser && !String(cancelledByUser).match(/^[0-9a-fA-F]{24}$/)) {
    throw new TypeError("cancelledByUser must be a valid MongoDB ObjectId.");
  }

  booking.status = "cancelled";
  booking.cancelReason = String(reason || "Cancelled by customer").trim().slice(0, 500);
  booking.cancelledBy = cancelledBy || null;
  booking.cancelledByUser = cancelledByUser || null;
  booking.cancelledAt = new Date();

  await booking.save();

  await booking.populate([
    { path: "customer" },
    { path: "table" },
    { path: "cancelledByUser", select: "fullName email role" },
  ]);

  return {
    success: true,
    booking,
    message: "Booking cancelled successfully.",
  };
};


// import { findBooking } from "./findBooking.js";

// /*
// |--------------------------------------------------------------------------
// | Cancel Booking Service
// |--------------------------------------------------------------------------
// */

// export const cancelBooking = async ({
//     bookingId,
//     confirmationCode,
//     phone,
//     reason = "Cancelled by customer",
//     cancelledBy = null,
// }) => {
//     try {
//         /*
//         |--------------------------------------------------------------------------
//         | Find Booking
//         |--------------------------------------------------------------------------
//         */

//         const booking = await findBooking({
//             bookingId,
//             confirmationCode,
//             phone,
//         });

//         if (!booking) {
//             return {
//                 success: false,
//                 booking: null,
//                 message: "Booking not found.",
//             };
//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Already Cancelled
//         |--------------------------------------------------------------------------
//         */

//         if (booking.status === "cancelled") {
//             return {
//                 success: false,
//                 booking,
//                 message: "Booking is already cancelled.",
//             };
//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Prevent Cancelling Completed Booking
//         |--------------------------------------------------------------------------
//         */

//         if (booking.status === "completed") {
//             return {
//                 success: false,
//                 booking,
//                 message: "Completed booking cannot be cancelled.",
//             };
//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Prevent Cancelling No-Show Booking
//         |--------------------------------------------------------------------------
//         */

//         if (booking.status === "no_show") {
//             return {
//                 success: false,
//                 booking,
//                 message: "No-show booking cannot be cancelled.",
//             };
//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Update Cancellation Information
//         |--------------------------------------------------------------------------
//         */

//         booking.status = "cancelled";

//         booking.cancelReason = reason;

//         booking.cancelledBy = cancelledBy;

//         booking.cancelledAt = new Date();

//         /*
//         |--------------------------------------------------------------------------
//         | Save Booking
//         |--------------------------------------------------------------------------
//         */

//         await booking.save();

//         /*
//         |--------------------------------------------------------------------------
//         | Populate Relations
//         |--------------------------------------------------------------------------
//         */

//         await booking.populate([
//             {
//                 path: "customer",
//             },
//             {
//                 path: "table",
//             },
//         ]);

//         /*
//         |--------------------------------------------------------------------------
//         | Success
//         |--------------------------------------------------------------------------
//         */

//         return {
//             success: true,
//             booking,
//             message: "Booking cancelled successfully.",
//         };

//     } catch (error) {
//         console.error(
//             "Cancel Booking Error:",
//             error
//         );

//         throw error;
//     }
// };

