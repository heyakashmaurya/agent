import {
    createBooking as createBookingService,
} from "../../services/booking/createBooking.js";

/*
|--------------------------------------------------------------------------
| Create Booking Tool
|--------------------------------------------------------------------------
|
| AI-facing wrapper around the booking service.
|
| The actual booking business logic remains inside:
|
| services/booking/createBooking.js
|
|--------------------------------------------------------------------------
*/

export const createBooking = async ({
    name,
    phone,
    email = "",

    bookingDate,
    startTime,
    guestCount,

    specialRequest = "",
    occasion = "",
    notes = "",
}, context = {}) => {
    try {
        /*
        |--------------------------------------------------------------------------
        | Validate Customer Name
        |--------------------------------------------------------------------------
        */

        if (!name || typeof name !== "string" || !name.trim()) {
            return {
                success: false,
                booking: null,
                message: "Customer name is required.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Phone
        |--------------------------------------------------------------------------
        */

        const callerPhone =
            typeof context?.callerPhone === "string"
                ? context.callerPhone.trim()
                : "";

        const effectivePhone = callerPhone ||
            (typeof phone === "string" ? phone.trim() : "");

        if (!effectivePhone) {
            return {
                success: false,
                booking: null,
                message:
                    "I cannot access the caller's phone number for this call, so I cannot create the reservation yet.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Booking Date
        |--------------------------------------------------------------------------
        */

        if (!bookingDate) {
            return {
                success: false,
                booking: null,
                message: "Booking date is required.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Booking Time
        |--------------------------------------------------------------------------
        */

        if (!startTime) {
            return {
                success: false,
                booking: null,
                message: "Booking time is required.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Guest Count
        |--------------------------------------------------------------------------
        */

        if (
            guestCount === undefined ||
            guestCount === null
        ) {
            return {
                success: false,
                booking: null,
                message: "Guest count is required.",
            };
        }

        const parsedGuestCount = Number(guestCount);

        if (
            !Number.isInteger(parsedGuestCount) ||
            parsedGuestCount < 1 ||
            parsedGuestCount > 100
        ) {
            return {
                success: false,
                booking: null,
                message:
                    "Guest count must be a whole number between 1 and 100.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Call Booking Service
        |--------------------------------------------------------------------------
        */

        const result = await createBookingService({
            name: name.trim(),
            phone: effectivePhone,
            email:
                typeof email === "string"
                    ? email.trim()
                    : "",

            bookingDate,
            startTime,
            guestCount: parsedGuestCount,

            specialRequest:
                typeof specialRequest === "string"
                    ? specialRequest.trim()
                    : "",

            occasion:
                typeof occasion === "string"
                    ? occasion.trim()
                    : "",

            notes:
                typeof notes === "string"
                    ? notes.trim()
                    : "",

            bookingSource: "ai_voice",
        });

        /*
        |--------------------------------------------------------------------------
        | Booking Failed / Unavailable
        |--------------------------------------------------------------------------
        */

        if (!result.success) {
            return {
                success: false,
                booking: null,
                message:
                    result.message ||
                    "Unable to create the booking.",
            };
        }

        /*
        |--------------------------------------------------------------------------
        | Return AI-Friendly Booking Data
        |--------------------------------------------------------------------------
        */

        const booking = result.booking;

        return {
            success: true,

            booking: booking
                ? {
                    id: booking._id?.toString(),

                    confirmationCode:
                        booking.confirmationCode || "",

                    bookingDate:
                        booking.bookingDate,

                    startTime:
                        booking.startTime,

                    endTime:
                        booking.endTime || "",

                    guestCount:
                        booking.guestCount,

                    status:
                        booking.status,

                    bookingSource:
                        booking.bookingSource,

                    customer:
                        booking.customer
                            ? {
                                id: booking.customer._id?.toString(),
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
                                id: booking.table._id?.toString(),
                                tableNumber:
                                    booking.table.tableNumber,
                                tableName:
                                    booking.table.tableName || "",
                                capacity:
                                    booking.table.capacity,
                                location:
                                    booking.table.location,
                            }
                            : null,

                    specialRequest:
                        booking.specialRequest || "",

                    occasion:
                        booking.occasion || "",

                    notes:
                        booking.notes || "",
                }
                : null,

            message:
                result.message ||
                "Booking created successfully.",
        };

    } catch (error) {
        console.error(
            "Create Booking Tool Error:",
            error
        );

        return {
            success: false,
            booking: null,
            message:
                "Unable to create the booking right now.",
        };
    }
};