import Booking from "../../models/Booking.js";
import Table from "../../models/Table.js";
import { findBooking } from "./findBooking.js";
import { checkAvailability } from "./checkAvailability.js";

const minutes = (time) => {
    const [h, m] = String(time).split(":").map(Number);
    return h * 60 + m;
};
const overlaps = (aStart, aDur, bStart, bDur) =>
    aStart < bStart + bDur && bStart < aStart + aDur;

async function chooseTableForUpdate({
    booking,
    tableId,
    bookingDate,
    startTime,
    guestCount,
}) {
    if (!tableId) {
        const availability = await checkAvailability({
            bookingDate,
            startTime,
            guestCount,
            excludeBookingId: booking._id,
        });
        if (!availability.available)
            return {
                table: null,
                endTime: availability.endTime || "",
                error:
                    availability.reason ||
                    "No table is available for the new reservation time.",
            };
        return {
            table: availability.table,
            endTime: availability.endTime || "",
            error: null,
        };
    }

    const table = await Table.findOne({
        _id: tableId,
        isDeleted: false,
        isActive: true,
    });
    if (!table)
        return {
            table: null,
            endTime: "",
            error: "Selected table not found or inactive.",
        };
    if (Number(table.capacity) < Number(guestCount))
        return {
            table: null,
            endTime: "",
            error: "Selected table does not have enough capacity.",
        };
    const sameTable =
        String(table._id) === String(booking.table?._id || booking.table || "");
    if (!sameTable && !["Available", "Reserved"].includes(table.status))
        return {
            table: null,
            endTime: "",
            error: "Selected table is not available.",
        };

    const dayStart = new Date(bookingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const conflicts = await Booking.find({
        _id: { $ne: booking._id },
        table: table._id,
        bookingDate: { $gte: dayStart, $lt: dayEnd },
        status: { $in: ["pending", "confirmed", "seated"] },
        isDeleted: false,
    }).select("startTime durationMinutes");
    const start = minutes(startTime);
    if (
        conflicts.some((item) =>
            overlaps(
                start,
                Number(booking.durationMinutes || 90),
                minutes(item.startTime),
                Number(item.durationMinutes || 90),
            ),
        )
    )
        return {
            table: null,
            endTime: "",
            error: "Selected table is already booked for this time.",
        };
    return { table, endTime: booking.endTime || "", error: null };
}

export const updateBooking = async ({
    bookingId,
    confirmationCode,
    phone,
    bookingDate,
    startTime,
    guestCount,
    specialRequest,
    occasion,
    notes,
    status,
    tableId,
}) => {
    const booking = await findBooking({ bookingId, confirmationCode, phone });
    if (!booking) return { success: false, message: "Booking not found." };
    if (booking.status === "cancelled" && status !== "cancelled")
        return {
            success: false,
            message: "Cancelled booking cannot be edited.",
        };

    const nextDate =
        bookingDate !== undefined
            ? new Date(bookingDate)
            : new Date(booking.bookingDate);
    const nextTime = startTime !== undefined ? startTime : booking.startTime;
    const nextGuests =
        guestCount !== undefined ? Number(guestCount) : booking.guestCount;
    const currentDateKey = new Date(booking.bookingDate)
        .toISOString()
        .slice(0, 10);
    const nextDateKey = nextDate.toISOString().slice(0, 10);
    const schedulingChanged =
        currentDateKey !== nextDateKey ||
        nextTime !== booking.startTime ||
        nextGuests !== Number(booking.guestCount) ||
        tableId !== undefined;

    if (schedulingChanged) {
        const chosen = await chooseTableForUpdate({
            booking,
            tableId,
            bookingDate: nextDate,
            startTime: nextTime,
            guestCount: nextGuests,
        });
        if (chosen.error) return { success: false, message: chosen.error };
        booking.table = chosen.table?._id || null;
        if (chosen.endTime) booking.endTime = chosen.endTime;
    }

    booking.bookingDate = nextDate;
    booking.startTime = nextTime;
    booking.guestCount = nextGuests;
    if (phone !== undefined && String(phone).trim()) {
        const customer = await booking.populate("customer");
        const target = customer.customer;
        if (target) target.phone = String(phone).trim();
        if (target) await target.save();
    }
    if (specialRequest !== undefined) booking.specialRequest = specialRequest;
    if (occasion !== undefined) booking.occasion = occasion;
    if (notes !== undefined) booking.notes = notes;
    if (status !== undefined) booking.status = status;
    if (status && status !== "cancelled") {
        booking.cancelledBy = null;
        booking.cancelledByUser = null;
        booking.cancelledAt = null;
        booking.cancelReason = "";
    }

    await booking.save();
    await booking.populate([
        { path: "customer" },
        { path: "table" },
        { path: "cancelledByUser", select: "name email role" },
    ]);
    return { success: true, booking, message: "Booking updated successfully." };
};

// import Booking from "../../models/Booking.js";

// import { findBooking } from "./findBooking.js";
// import { checkAvailability } from "./checkAvailability.js";

// /*
// |--------------------------------------------------------------------------
// | Update Booking
// |--------------------------------------------------------------------------
// */

// export const updateBooking = async ({

//     bookingId,

//     confirmationCode,

//     phone,

//     bookingDate,

//     startTime,

//     guestCount,

//     specialRequest,

//     occasion,

//     notes,

//     status,

// }) => {

//     try {

//         /*
//         |--------------------------------------------------------------------------
//         | Find Existing Booking
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

//                 message: "Booking not found.",

//             };

//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Determine Updated Values
//         |--------------------------------------------------------------------------
//         */

//         const newDate =
//             bookingDate || booking.bookingDate;

//         const newTime =
//             startTime || booking.startTime;

//         const newGuests =
//             guestCount || booking.guestCount;

//         /*
//         |--------------------------------------------------------------------------
//         | Check Availability
//         |--------------------------------------------------------------------------
//         */

//         const changed =

//             newDate.toString() !== booking.bookingDate.toString()

//             ||

//             newTime !== booking.startTime

//             ||

//             newGuests !== booking.guestCount;

//         if (changed) {

//             const availability = await checkAvailability({

//                 bookingDate: newDate,

//                 startTime: newTime,

//                 guestCount: newGuests,

//             });

//             if (!availability.available) {

//                 return {

//                     success: false,

//                     message: availability.reason,

//                 };

//             }

//             booking.table = availability.table._id;

//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Update Fields
//         |--------------------------------------------------------------------------
//         */

//         booking.bookingDate = newDate;

//         booking.startTime = newTime;

//         booking.guestCount = newGuests;

//         if (specialRequest !== undefined) {

//             booking.specialRequest = specialRequest;

//         }

//         if (occasion !== undefined) {

//             booking.occasion = occasion;

//         }

//         if (notes !== undefined) {

//             booking.notes = notes;

//         }

//         if (status !== undefined) {

//             booking.status = status;

//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Save
//         |--------------------------------------------------------------------------
//         */

//         await booking.save();

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

//             message: "Booking updated successfully.",

//         };

//     }

//     catch (error) {

//         console.error(

//             "Update Booking Error:",

//             error

//         );

//         throw error;

//     }

// };
