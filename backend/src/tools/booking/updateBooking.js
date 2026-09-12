import { updateBooking as updateBookingService } from "../../services/booking/updateBooking.js";

/*
|--------------------------------------------------------------------------
| Update Booking Tool
|--------------------------------------------------------------------------
|
| AI/tool layer for updating an existing restaurant booking.
|
| The actual booking update logic lives in:
|
| services/booking/updateBooking.js
|
| This file only:
| - receives tool arguments
| - calls the booking service
| - returns a tool-friendly response
|
|--------------------------------------------------------------------------
*/

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
}, context = {}) => {

    try {

        /*
        |--------------------------------------------------------------------------
        | Call Booking Service
        |--------------------------------------------------------------------------
        */

        const result = await updateBookingService({

            bookingId,

            confirmationCode,

            phone:
                typeof phone === "string" && phone.trim()
                    ? phone.trim()
                    : (typeof context?.callerPhone === "string"
                        ? context.callerPhone.trim()
                        : undefined),

            bookingDate,

            startTime,

            guestCount,

            specialRequest,

            occasion,

            notes,

            status,

        });

        /*
        |--------------------------------------------------------------------------
        | Booking Not Found / Update Failed
        |--------------------------------------------------------------------------
        */

        if (!result || !result.success) {

            return {

                success: false,

                booking: null,

                message:
                    result?.message ||
                    "Unable to update the booking.",

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
                "Booking updated successfully.",

        };

    }

    catch (error) {

        console.error(
            "Update Booking Tool Error:",
            error
        );

        return {

            success: false,

            booking: null,

            message:
                "Unable to update the booking right now.",

        };

    }

};