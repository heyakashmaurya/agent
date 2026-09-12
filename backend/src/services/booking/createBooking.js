import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import Table from "../../models/Table.js";
import { findOrCreateCustomer } from "../customer/findOrCreateCustomer.js";
import { checkAvailability } from "./checkAvailability.js";
import { generateConfirmationCode } from "../../utils/generateConfirmationCode.js";

const ALLOWED_SOURCES = new Set([
    "ai_voice",
    "dashboard",
    "walk_in",
    "website",
    "whatsapp",
]);
const minutes = (time) => {
    const [h, m] = String(time).split(":").map(Number);
    return h * 60 + m;
};
const overlaps = (aStart, aDur, bStart, bDur) =>
    aStart < bStart + bDur && bStart < aStart + aDur;

async function ensureRequestedTable({
    tableId,
    bookingDate,
    startTime,
    guestCount,
}) {
    if (!mongoose.Types.ObjectId.isValid(String(tableId)))
        throw new Error("Invalid table ID.");
    const table = await Table.findOne({
        _id: tableId,
        isDeleted: false,
        isActive: true,
    });
    if (!table) throw new Error("Selected table not found or inactive.");
    if (!["Available", "Reserved"].includes(table.status))
        throw new Error("Selected table is not available.");
    if (Number(table.capacity) < Number(guestCount))
        throw new Error("Selected table does not have enough capacity.");
    const dayStart = new Date(bookingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const conflicts = await Booking.find({
        table: table._id,
        bookingDate: { $gte: dayStart, $lt: dayEnd },
        status: { $in: ["pending", "confirmed", "seated"] },
        isDeleted: false,
    }).select("startTime durationMinutes");
    const start = minutes(startTime);
    if (
        conflicts.some((booking) =>
            overlaps(
                start,
                90,
                minutes(booking.startTime),
                Number(booking.durationMinutes || 90),
            ),
        )
    )
        throw new Error("Selected table is already booked for this time.");
    return table;
}

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
    tableId = null,
}) => {
    if (!name) throw new Error("Customer name is required.");
    if (!phone) throw new Error("Customer phone is required.");
    if (!bookingDate) throw new Error("Booking date is required.");
    if (!startTime) throw new Error("Booking time is required.");
    if (
        !Number.isInteger(Number(guestCount)) ||
        Number(guestCount) < 1 ||
        Number(guestCount) > 100
    )
        throw new Error(
            "Guest count must be a positive integer between 1 and 100.",
        );
    const source = String(bookingSource || "dashboard")
        .trim()
        .toLowerCase();
    if (!ALLOWED_SOURCES.has(source))
        throw new Error("Invalid booking source.");

    const customer = await findOrCreateCustomer({ name, phone, email });
    let table;
    let endTime = "";
    if (tableId) {
        table = await ensureRequestedTable({
            tableId,
            bookingDate,
            startTime,
            guestCount,
        });
    } else {
        const availability = await checkAvailability({
            bookingDate,
            startTime,
            guestCount: Number(guestCount),
        });
        if (!availability.available)
            return {
                success: false,
                message:
                    availability.reason ||
                    "No table is available for the requested time.",
                booking: null,
            };
        table = availability.table;
        endTime = availability.endTime || "";
    }

    const booking = await Booking.create({
        customer: customer._id,
        table: table?._id || null,
        bookingDate,
        startTime,
        endTime,
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

// import Booking from "../../models/Booking.js";

// import { findOrCreateCustomer } from "../customer/findOrCreateCustomer.js";

// import { checkAvailability } from "./checkAvailability.js";

// import { generateConfirmationCode } from "../../utils/generateConfirmationCode.js";

// /*
// |--------------------------------------------------------------------------
// | Create Booking Service
// |--------------------------------------------------------------------------
// */

// export const createBooking = async ({
//     name,
//     phone ,
//     email,

//     bookingDate,
//     startTime,
//     guestCount,

//     specialRequest = "",
//     occasion = "",
//     notes = "",
//     bookingSource,
// }) => {

//     try {

//         /*
//         |--------------------------------------------------------------------------
//         | Basic Validation
//         |--------------------------------------------------------------------------
//         */

//         if (!name) {
//             throw new Error("Customer name is required.");
//         }

//         if (!phone) {
//             throw new Error("Customer phone is required.");
//         }

//         if (!bookingDate) {
//             throw new Error("Booking date is required.");
//         }

//         if (!startTime) {
//             throw new Error("Booking time is required.");
//         }

//         if (!guestCount) {
//             throw new Error("Guest count is required.");
//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Find/Create Customer
//         |--------------------------------------------------------------------------
//         */

//         const customer = await findOrCreateCustomer({

//             name,

//             phone,

//             email,

//         });

//         /*
//         |--------------------------------------------------------------------------
//         | Check Availability
//         |--------------------------------------------------------------------------
//         */

//         const availability = await checkAvailability({

//             bookingDate,

//             startTime,

//             guestCount,

//         });

//         if (!availability.available) {

//             return {

//                 success: false,

//                 message: availability.reason,

//                 booking: null,

//             };

//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Generate Confirmation Code
//         |--------------------------------------------------------------------------
//         */

//         const confirmationCode =
//             generateConfirmationCode();

//         /*
//         |--------------------------------------------------------------------------
//         | Create Booking
//         |--------------------------------------------------------------------------
//         */

//         const booking = await Booking.create({

//             customer: customer._id,

//             table: availability.table._id,

//             bookingDate,

//             startTime,

//             guestCount,

//             confirmationCode,

//             specialRequest,

//             occasion,

//             notes,

//             status: "confirmed",

//             bookingSource: bookingSource || "dashboard",

//         });

//         /*
//         |--------------------------------------------------------------------------
//         | Populate Customer & Table
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

//             message: "Booking created successfully.",

//         };

//     }

//     catch (error) {

//         console.error(

//             "Create Booking Error:",

//             error

//         );

//         throw error;

//     }

// };
