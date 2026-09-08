


import { llm } from "@livekit/agents";
import { z } from "zod";

import {
    checkAvailability,
    createBooking,
    getBooking,
    listBookings,
    updateBooking,
    cancelBooking,
} from "./index.js";

/*
|--------------------------------------------------------------------------
| Check Availability
|--------------------------------------------------------------------------
*/

const checkAvailabilityTool = llm.tool({
    name: "check_availability",

    description: "Check table availability.",

    parameters: z.object({
        bookingDate: z.string(),
        startTime: z.string(),
        guestCount: z.number().int().min(1).max(100),
    }),

    execute: async (args) => {
        return await checkAvailability(args);
    },
});

/*
|--------------------------------------------------------------------------
| Create Booking
|--------------------------------------------------------------------------
*/

const createBookingTool = llm.tool({
    name: "create_booking",

    description: "Create a confirmed booking.",

    parameters: z.object({
        name: z.string(),
        phone: z.string().optional().default(""),
        email: z.string().optional().default(""),
        bookingDate: z.string(),
        startTime: z.string(),
        guestCount: z.number().int().min(1).max(100),
        specialRequest: z.string().optional().default(""),
        occasion: z.string().optional().default(""),
        notes: z.string().optional().default(""),
    }),

    execute: async (args) => {
        return await createBooking(args);
    },
});

/*
|--------------------------------------------------------------------------
| Get Booking
|--------------------------------------------------------------------------
*/

const getBookingTool = llm.tool({
    name: "get_booking",

    description: "Find an existing booking.",

    parameters: z.object({
        bookingId: z.string().optional(),
        confirmationCode: z.string().optional(),
        phone: z.string().optional(),
    }),

    execute: async (args) => {
        return await getBooking(args);
    },
});

/*
|--------------------------------------------------------------------------
| List Bookings
|--------------------------------------------------------------------------
*/

const listBookingsTool = llm.tool({
    name: "list_bookings",

    description: "List bookings using optional filters.",

    parameters: z.object({
        bookingDate: z.string().optional(),
        status: z.string().optional(),
        customer: z.string().optional(),
        bookingSource: z.string().optional(),
        paymentStatus: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
    }),

    execute: async (args) => {
        return await listBookings(args);
    },
});

/*
|--------------------------------------------------------------------------
| Update Booking
|--------------------------------------------------------------------------
*/

const updateBookingTool = llm.tool({
    name: "update_booking",

    description: "Update an existing booking.",

    parameters: z.object({
        bookingId: z.string().optional(),
        confirmationCode: z.string().optional(),
        phone: z.string().optional(),

        bookingDate: z.string().optional(),
        startTime: z.string().optional(),
        guestCount: z.number().int().min(1).max(100).optional(),

        specialRequest: z.string().optional(),
        occasion: z.string().optional(),
        notes: z.string().optional(),
        status: z.string().optional(),
    }),

    // execute: async (args) => {
    //     return await updateBooking(args);
    // },

    execute: async (args) => {

    console.log(
        "🔎 UPDATE BOOKING TOOL ARGS:",
        JSON.stringify(args, null, 2)
    );

    return await updateBooking(args);
},
});

/*
|--------------------------------------------------------------------------
| Cancel Booking
|--------------------------------------------------------------------------
*/

const cancelBookingTool = llm.tool({
    name: "cancel_booking",

    description: "Cancel an existing booking.",

    parameters: z.object({
        bookingId: z.string().optional(),
        confirmationCode: z.string().optional(),
        phone: z.string().optional(),
        reason: z.string().optional().default("Cancelled by customer"),
    }),

    execute: async (args) => {
        return await cancelBooking(args);
    },
});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

export const livekitRestaurantTools = [
    checkAvailabilityTool,
    createBookingTool,
    getBookingTool,
    listBookingsTool,
    updateBookingTool,
    cancelBookingTool,
];

export default livekitRestaurantTools;





// import { llm } from "@livekit/agents";
// import { z } from "zod";

// import {
//     checkAvailability,
//     createBooking,
//     getBooking,
//     listBookings,
//     updateBooking,
//     cancelBooking,
// } from "./index.js";

// /*
// |--------------------------------------------------------------------------
// | Check Availability
// |--------------------------------------------------------------------------
// */

// const checkAvailabilityTool = llm.tool({
//     name: "check_availability",

//     description:
//         "Check whether a restaurant table is available for a specific date, time, and number of guests.",

//     parameters: z.object({
//         bookingDate: z
//             .string()
//             .describe("The requested booking date."),

//         startTime: z
//             .string()
//             .describe("The requested booking start time."),

//         guestCount: z
//             .number()
//             .int()
//             .min(1)
//             .max(100)
//             .describe("Number of guests."),
//     }),

//     execute: async (args) => {
//         return await checkAvailability(args);
//     },
// });

// /*
// |--------------------------------------------------------------------------
// | Create Booking
// |--------------------------------------------------------------------------
// */

// const createBookingTool = llm.tool({
//     name: "create_booking",

//     description:
//         "Create a new restaurant table booking after the customer has confirmed the booking details.",

//     parameters: z.object({
//         name: z
//             .string()
//             .describe("Customer full name."),

//         phone: z
//             .string()
//             .describe("Customer phone number."),

//         email: z
//             .string()
//             .optional()
//             .default("")
//             .describe("Customer email address if provided."),

//         bookingDate: z
//             .string()
//             .describe("Requested booking date."),

//         startTime: z
//             .string()
//             .describe("Requested booking start time."),

//         guestCount: z
//             .number()
//             .int()
//             .min(1)
//             .max(100)
//             .describe("Number of guests."),

//         specialRequest: z
//             .string()
//             .optional()
//             .default("")
//             .describe("Any special customer request."),

//         occasion: z
//             .string()
//             .optional()
//             .default("")
//             .describe("Occasion such as birthday or anniversary."),

//         notes: z
//             .string()
//             .optional()
//             .default("")
//             .describe("Additional booking notes."),
//     }),

//     execute: async (args) => {
//         return await createBooking(args);
//     },
// });

// /*
// |--------------------------------------------------------------------------
// | Get Booking
// |--------------------------------------------------------------------------
// */

// const getBookingTool = llm.tool({
//     name: "get_booking",

//     description:
//         "Retrieve an existing restaurant booking using booking ID, confirmation code, or customer phone number.",

//     parameters: z.object({
//         bookingId: z
//             .string()
//             .optional()
//             .describe("Booking ID if available."),

//         confirmationCode: z
//             .string()
//             .optional()
//             .describe("Booking confirmation code if available."),

//         phone: z
//             .string()
//             .optional()
//             .describe("Customer phone number if available."),
//     }),

//     execute: async (args) => {
//         return await getBooking(args);
//     },
// });

// /*
// |--------------------------------------------------------------------------
// | List Bookings
// |--------------------------------------------------------------------------
// */

// const listBookingsTool = llm.tool({
//     name: "list_bookings",

//     description:
//         "Retrieve multiple restaurant bookings using optional filters such as date, status, customer, booking source, or payment status.",

//     parameters: z.object({
//         bookingDate: z
//             .string()
//             .optional()
//             .describe("Filter bookings by date."),

//         status: z
//             .string()
//             .optional()
//             .describe("Filter by booking status."),

//         customer: z
//             .string()
//             .optional()
//             .describe("Filter by customer ID."),

//         bookingSource: z
//             .string()
//             .optional()
//             .describe("Filter by booking source."),

//         paymentStatus: z
//             .string()
//             .optional()
//             .describe("Filter by payment status."),

//         page: z
//             .number()
//             .int()
//             .min(1)
//             .optional()
//             .default(1)
//             .describe("Page number."),

//         limit: z
//             .number()
//             .int()
//             .min(1)
//             .max(100)
//             .optional()
//             .default(20)
//             .describe("Maximum number of bookings to return."),
//     }),

//     execute: async (args) => {
//         return await listBookings(args);
//     },
// });

// /*
// |--------------------------------------------------------------------------
// | Update Booking
// |--------------------------------------------------------------------------
// */

// const updateBookingTool = llm.tool({
//     name: "update_booking",

//     description:
//         "Update an existing restaurant booking. The booking can be identified using booking ID, confirmation code, or phone number.",

//     parameters: z.object({
//         bookingId: z
//             .string()
//             .optional()
//             .describe("Booking ID."),

//         confirmationCode: z
//             .string()
//             .optional()
//             .describe("Booking confirmation code."),

//         phone: z
//             .string()
//             .optional()
//             .describe("Customer phone number."),

//         bookingDate: z
//             .string()
//             .optional()
//             .describe("New booking date."),

//         startTime: z
//             .string()
//             .optional()
//             .describe("New booking start time."),

//         guestCount: z
//             .number()
//             .int()
//             .min(1)
//             .max(100)
//             .optional()
//             .describe("New number of guests."),

//         specialRequest: z
//             .string()
//             .optional()
//             .describe("Updated special request."),

//         occasion: z
//             .string()
//             .optional()
//             .describe("Updated occasion."),

//         notes: z
//             .string()
//             .optional()
//             .describe("Updated booking notes."),

//         status: z
//             .string()
//             .optional()
//             .describe("Updated booking status."),
//     }),

//     execute: async (args) => {
//         return await updateBooking(args);
//     },
// });

// /*
// |--------------------------------------------------------------------------
// | Cancel Booking
// |--------------------------------------------------------------------------
// */

// const cancelBookingTool = llm.tool({
//     name: "cancel_booking",

//     description:
//         "Cancel an existing restaurant booking using booking ID, confirmation code, or customer phone number.",

//     parameters: z.object({
//         bookingId: z
//             .string()
//             .optional()
//             .describe("Booking ID."),

//         confirmationCode: z
//             .string()
//             .optional()
//             .describe("Booking confirmation code."),

//         phone: z
//             .string()
//             .optional()
//             .describe("Customer phone number."),

//         reason: z
//             .string()
//             .optional()
//             .default("Cancelled by customer")
//             .describe("Reason for cancellation."),
//     }),

//     execute: async (args) => {
//         return await cancelBooking(args);
//     },
// });

// /*
// |--------------------------------------------------------------------------
// | Export LiveKit Restaurant Tools
// |--------------------------------------------------------------------------
// */

// export const livekitRestaurantTools = [
//     checkAvailabilityTool,
//     createBookingTool,
//     getBookingTool,
//     listBookingsTool,
//     updateBookingTool,
//     cancelBookingTool,
// ];

// export default livekitRestaurantTools;