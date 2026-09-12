import {
    getBooking as getBookingService,
} from "../../services/booking/getBooking.js";

/*
|--------------------------------------------------------------------------
| Get Booking Tool
|--------------------------------------------------------------------------
|
| AI-facing wrapper around the booking retrieval service.
|
| Supported lookup methods:
|
| 1. Booking ID
| 2. Confirmation Code
| 3. Phone Number
|
| The actual database/business logic remains inside:
|
| services/booking/getBooking.js
|
|--------------------------------------------------------------------------
*/

export const getBooking = async ({
    bookingId,
    confirmationCode,
    phone,
}, context = {}) => {
    try {
        /*
        |--------------------------------------------------------------------------
        | Normalize Inputs
        |--------------------------------------------------------------------------
        */

        const normalizedBookingId =
            typeof bookingId === "string"
                ? bookingId.trim()
                : "";

        const normalizedConfirmationCode =
            typeof confirmationCode === "string"
                ? confirmationCode.trim()
                : "";

        const normalizedPhone =
            typeof phone === "string" && phone.trim()
                ? phone.trim()
                : (typeof context?.callerPhone === "string"
                    ? context.callerPhone.trim()
                    : "");

        /*
        |--------------------------------------------------------------------------
        | Require At Least One Lookup Method
        |--------------------------------------------------------------------------
        */

        if (
            !normalizedBookingId &&
            !normalizedConfirmationCode &&
            !normalizedPhone
        ) {
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

        const result = await getBookingService({
            bookingId:
                normalizedBookingId || undefined,

            confirmationCode:
                normalizedConfirmationCode || undefined,

            phone:
                normalizedPhone || undefined,
        });

        /*
        |--------------------------------------------------------------------------
        | Booking Not Found
        |--------------------------------------------------------------------------
        */

        if (!result || !result.booking) {
            return {
                success: false,
                booking: null,
                message:
                    result?.message ||
                    "Booking not found.",
            };
        }

        const booking = result.booking;

        /*
        |--------------------------------------------------------------------------
        | Return AI-Friendly Booking Data
        |--------------------------------------------------------------------------
        */

        return {
            success: true,

            booking: {
                id:
                    booking._id?.toString(),

                confirmationCode:
                    booking.confirmationCode || "",

                bookingDate:
                    booking.bookingDate,

                startTime:
                    booking.startTime || "",

                endTime:
                    booking.endTime || "",

                guestCount:
                    booking.guestCount,

                status:
                    booking.status,

                bookingSource:
                    booking.bookingSource,

                paymentStatus:
                    booking.paymentStatus,

                seatingPreference:
                    booking.seatingPreference,

                specialRequest:
                    booking.specialRequest || "",

                occasion:
                    booking.occasion || "",

                notes:
                    booking.notes || "",

                customer:
                    booking.customer
                        ? {
                            id:
                                booking.customer._id?.toString(),

                            name:
                                booking.customer.fullName ||
                                booking.customer.name ||
                                "",

                            phone:
                                booking.customer.phone || "",

                            email:
                                booking.customer.email || "",
                        }
                        : null,

                table:
                    booking.table
                        ? {
                            id:
                                booking.table._id?.toString(),

                            tableNumber:
                                booking.table.tableNumber,

                            tableName:
                                booking.table.tableName || "",

                            capacity:
                                booking.table.capacity,

                            location:
                                booking.table.location || "",

                            floor:
                                booking.table.floor,
                        }
                        : null,
            },

            message:
                result.message ||
                "Booking retrieved successfully.",
        };

    } catch (error) {
        console.error(
            "Get Booking Tool Error:",
            error
        );

        return {
            success: false,
            booking: null,
            message:
                "Unable to retrieve the booking right now.",
        };
    }
};