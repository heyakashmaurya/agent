import { cancelBooking as cancelBookingService } from "../../services/booking/cancelBooking.js";

/*
|--------------------------------------------------------------------------
| Cancel Booking Tool
|--------------------------------------------------------------------------
|
| Tool-layer wrapper around the booking service.
|
| The tool should:
| - Accept booking identification details
| - Call the booking service
| - Return a clean result for the AI agent
|
|--------------------------------------------------------------------------
*/

export const cancelBooking = async ({
    bookingId,
    confirmationCode,
    phone,
    reason = "Cancelled by customer",
}, context = {}) => {

    try {

        /*
        |--------------------------------------------------------------------------
        | Validate Booking Identifier
        |--------------------------------------------------------------------------
        */

        const effectivePhone =
            typeof phone === "string" && phone.trim()
                ? phone.trim()
                : (typeof context?.callerPhone === "string"
                    ? context.callerPhone.trim()
                    : "");

        if (!bookingId && !confirmationCode && !effectivePhone) {

            return {
                success: false,
                booking: null,
                message:
                    "Please provide a booking ID, confirmation code, or phone number.",
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Call Booking Service
        |--------------------------------------------------------------------------
        */

        const result = await cancelBookingService({

            bookingId,

            confirmationCode,

            phone: effectivePhone || undefined,

            reason,

        });

        /*
        |--------------------------------------------------------------------------
        | Booking Not Found / Service Failure
        |--------------------------------------------------------------------------
        */

        if (!result || !result.success) {

            return {

                success: false,

                booking: null,

                message:
                    result?.message ||
                    "Unable to cancel the booking.",

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return {

            success: true,

            booking: result.booking,

            message:
                result.message ||
                "Booking cancelled successfully.",

        };

    }
    catch (error) {

        console.error(
            "Cancel Booking Tool Error:",
            error
        );

        return {

            success: false,

            booking: null,

            message:
                "Unable to cancel the booking right now.",

        };

    }

};