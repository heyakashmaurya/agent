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

/**
 * Create a per-call tool set. Caller phone is deliberately NOT exposed to
 * the model as a tool parameter. It is injected by the trusted LiveKit
 * entrypoint from the SIP participant attributes.
 */
export const createLivekitRestaurantTools = ({ callerPhone = "" } = {}) => {
    const context = { callerPhone: String(callerPhone || "").trim() };

    const checkAvailabilityTool = llm.tool({
        name: "check_availability",
        description: "Check table availability for a requested date, time, and guest count.",
        parameters: z.object({
            bookingDate: z.string(),
            startTime: z.string(),
            guestCount: z.number().int().min(1).max(100),
        }),
        execute: async (args) => checkAvailability(args),
    });

    const createBookingTool = llm.tool({
        name: "create_booking",
        description:
            "Create a confirmed restaurant booking. The caller phone number is supplied by the server from the active phone call; never ask the caller for their phone number and never request a phone tool argument.",
        parameters: z.object({
            name: z.string().min(1),
            email: z.string().optional().default(""),
            bookingDate: z.string(),
            startTime: z.string(),
            guestCount: z.number().int().min(1).max(100),
            specialRequest: z.string().optional().default(""),
            occasion: z.string().optional().default(""),
            notes: z.string().optional().default(""),
        }),
        execute: async (args) => createBooking(args, context),
    });

    const getBookingTool = llm.tool({
        name: "get_booking",
        description:
            "Find an existing booking. Use booking ID or confirmation code when the caller provides one; otherwise use the caller phone automatically from the active call.",
        parameters: z.object({
            bookingId: z.string().optional(),
            confirmationCode: z.string().optional(),
        }),
        execute: async (args) => getBooking(args, context),
    });

    const listBookingsTool = llm.tool({
        name: "list_bookings",
        description: "List restaurant bookings using optional filters.",
        parameters: z.object({
            bookingDate: z.string().optional(),
            status: z.string().optional(),
            customer: z.string().optional(),
            bookingSource: z.string().optional(),
            paymentStatus: z.string().optional(),
            page: z.number().int().min(1).optional().default(1),
            limit: z.number().int().min(1).max(100).optional().default(20),
        }),
        execute: async (args) => listBookings(args),
    });

    const updateBookingTool = llm.tool({
        name: "update_booking",
        description:
            "Update an existing booking. Do not ask for the caller phone number; the server supplies it automatically from the active call when needed.",
        parameters: z.object({
            bookingId: z.string().optional(),
            confirmationCode: z.string().optional(),
            bookingDate: z.string().optional(),
            startTime: z.string().optional(),
            guestCount: z.number().int().min(1).max(100).optional(),
            specialRequest: z.string().optional(),
            occasion: z.string().optional(),
            notes: z.string().optional(),
            status: z.string().optional(),
        }),
        execute: async (args) => updateBooking(args, context),
    });

    const cancelBookingTool = llm.tool({
        name: "cancel_booking",
        description:
            "Cancel an existing booking. Prefer booking ID or confirmation code; otherwise use the caller phone automatically. Never ask the caller for their phone number.",
        parameters: z.object({
            bookingId: z.string().optional(),
            confirmationCode: z.string().optional(),
            reason: z.string().optional().default("Cancelled by customer"),
        }),
        execute: async (args) => cancelBooking(args, context),
    });

    return [
        checkAvailabilityTool,
        createBookingTool,
        getBookingTool,
        listBookingsTool,
        updateBookingTool,
        cancelBookingTool,
    ];
};

// Safe default for non-telephony consumers. It cannot create a booking
// unless an actual caller phone is injected into the call-specific factory.
export const livekitRestaurantTools = createLivekitRestaurantTools();

export default livekitRestaurantTools;
