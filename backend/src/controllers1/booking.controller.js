
import mongoose from "mongoose";

import {
    createBooking,
} from "../services/booking/createBooking.js";

import {
    getBooking,
} from "../services/booking/getBooking.js";

import {
    listBookings,
} from "../services/booking/listBookings.js";

import {
    updateBooking,
} from "../services/booking/updateBooking.js";

import {
    cancelBooking,
} from "../services/booking/cancelBooking.js";

import {
    checkAvailability,
} from "../services/booking/checkAvailability.js";

/*
|--------------------------------------------------------------------------
| Booking Controller
|--------------------------------------------------------------------------
|
| HTTP/API layer for dashboard booking operations.
|
| IMPORTANT:
|
| Business logic stays inside:
|
| services/booking/*
|
| This controller is responsible for:
|
| - Reading HTTP request data
| - Validating request input
| - Normalizing values
| - Calling booking services
| - Returning consistent API responses
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Convert a value into a trimmed string.
 */
const stringValue = (value, defaultValue = "") => {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    return String(value).trim();
};


/**
 * Convert a value to a positive integer.
 */
const positiveInteger = (value) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        return null;
    }

    return parsed;
};


/**
 * Validate MongoDB ObjectId.
 */
const isValidObjectId = (value) => {
    return mongoose.Types.ObjectId.isValid(value);
};


/**
 * Send successful response.
 */
const successResponse = ({
    res,
    statusCode = 200,
    data = {},
    message = "Request successful.",
}) => {
    return res.status(statusCode).json({
        success: true,
        ...data,
        message,
    });
};


/**
 * Send failed response.
 */
const errorResponse = ({
    res,
    statusCode = 400,
    message = "Request failed.",
    data = {},
}) => {
    return res.status(statusCode).json({
        success: false,
        ...data,
        message,
    });
};


/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
|
| POST /api/bookings
|
| Dashboard/manual booking.
|
|--------------------------------------------------------------------------
*/

export const createBookingController = async (req, res, next) => {
    try {
        const {
            name,
            phone,
            email,

            bookingDate,
            startTime,
            guestCount,

            specialRequest,
            occasion,
            notes,

            // Optional dashboard-specific value.
            bookingSource,
        } = req.body || {};


        /*
        |--------------------------------------------------------------------------
        | Required Fields
        |--------------------------------------------------------------------------
        */

        const normalizedName = stringValue(name);
        const normalizedPhone = stringValue(phone);
        const normalizedDate = stringValue(bookingDate);
        const normalizedTime = stringValue(startTime);

        if (!normalizedName) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Customer name is required.",
            });
        }

        if (!normalizedPhone) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Customer phone number is required.",
            });
        }

        if (!normalizedDate) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Booking date is required.",
            });
        }

        if (!normalizedTime) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Booking time is required.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Guest Count
        |--------------------------------------------------------------------------
        */

        const parsedGuestCount = positiveInteger(guestCount);

        if (
            parsedGuestCount === null ||
            parsedGuestCount > 100
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message:
                    "Guest count must be a whole number between 1 and 100.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Optional Booking Source
        |--------------------------------------------------------------------------
        |
        | Dashboard-created bookings should normally be:
        |
        | dashboard
        |
        |--------------------------------------------------------------------------
        */

        const allowedBookingSources = [
            "ai_voice",
            "dashboard",
            "walk_in",
            "website",
            "whatsapp",
        ];

        const normalizedBookingSource =
            stringValue(bookingSource, "dashboard");

        if (
            !allowedBookingSources.includes(
                normalizedBookingSource
            )
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid booking source.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Create Booking
        |--------------------------------------------------------------------------
        */

        const result = await createBooking({
            name: normalizedName,

            phone: normalizedPhone,

            email: stringValue(email),

            bookingDate: normalizedDate,

            startTime: normalizedTime,

            guestCount: parsedGuestCount,

            specialRequest:
                stringValue(specialRequest),

            occasion:
                stringValue(occasion),

            notes:
                stringValue(notes),

            bookingSource:
                normalizedBookingSource,
        });


        /*
        |--------------------------------------------------------------------------
        | Service Failure
        |--------------------------------------------------------------------------
        */

        if (!result?.success) {
            return errorResponse({
                res,
                statusCode: 409,
                message:
                    result?.message ||
                    "Unable to create booking.",
                data: {
                    booking: result?.booking || null,
                },
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return successResponse({
            res,
            statusCode: 201,
            data: {
                booking: result.booking,
            },
            message:
                result.message ||
                "Booking created successfully.",
        });

    } catch (error) {
        console.error(
            "Create Booking Controller Error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| LIST BOOKINGS
|--------------------------------------------------------------------------
|
| GET /api/bookings
|
| Query parameters:
|
| ?bookingDate=2026-08-22
| ?status=confirmed
| ?customer=<id>
| ?bookingSource=dashboard
| ?paymentStatus=paid
| ?page=1
| ?limit=20
|
|--------------------------------------------------------------------------
*/

export const listBookingsController = async (req, res, next) => {
    try {
        const {
            bookingDate,
            status,
            customer,
            bookingSource,
            paymentStatus,
            page,
            limit,
        } = req.query || {};


        /*
        |--------------------------------------------------------------------------
        | Validate Customer ID
        |--------------------------------------------------------------------------
        */

        if (
            customer &&
            !isValidObjectId(customer)
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid customer ID.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Validate Status
        |--------------------------------------------------------------------------
        */

        const allowedStatuses = [
            "pending",
            "confirmed",
            "seated",
            "completed",
            "cancelled",
            "no_show",
        ];

        if (
            status &&
            !allowedStatuses.includes(status)
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid booking status.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Validate Booking Source
        |--------------------------------------------------------------------------
        */

        const allowedBookingSources = [
            "ai_voice",
            "dashboard",
            "walk_in",
            "website",
            "whatsapp",
        ];

        if (
            bookingSource &&
            !allowedBookingSources.includes(
                bookingSource
            )
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid booking source.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Validate Payment Status
        |--------------------------------------------------------------------------
        */

        const allowedPaymentStatuses = [
            "pending",
            "paid",
            "refunded",
            "not_required",
        ];

        if (
            paymentStatus &&
            !allowedPaymentStatuses.includes(
                paymentStatus
            )
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid payment status.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        const requestedPage =
            page !== undefined
                ? Number(page)
                : 1;

        const requestedLimit =
            limit !== undefined
                ? Number(limit)
                : 20;

        if (
            !Number.isInteger(requestedPage) ||
            requestedPage < 1
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Page must be a positive integer.",
            });
        }

        if (
            !Number.isInteger(requestedLimit) ||
            requestedLimit < 1 ||
            requestedLimit > 100
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message:
                    "Limit must be between 1 and 100.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Call Service
        |--------------------------------------------------------------------------
        */

        const result = await listBookings({
            bookingDate:
                stringValue(bookingDate) || undefined,

            status:
                stringValue(status) || undefined,

            customer:
                stringValue(customer) || undefined,

            bookingSource:
                stringValue(bookingSource) || undefined,

            paymentStatus:
                stringValue(paymentStatus) || undefined,

            page: requestedPage,

            limit: requestedLimit,
        });


        /*
        |--------------------------------------------------------------------------
        | Service Failure
        |--------------------------------------------------------------------------
        */

        if (!result?.success) {
            return errorResponse({
                res,
                statusCode: 400,
                message:
                    result?.message ||
                    "Unable to retrieve bookings.",
                data: {
                    bookings: [],
                    total: 0,
                    page: requestedPage,
                    limit: requestedLimit,
                    totalPages: 0,
                },
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return successResponse({
            res,

            statusCode: 200,

            data: {
                bookings:
                    result.bookings || [],

                pagination: {
                    total:
                        result.total || 0,

                    page:
                        result.page || requestedPage,

                    limit:
                        result.limit || requestedLimit,

                    totalPages:
                        result.totalPages || 0,
                },
            },

            message:
                result.message ||
                "Bookings retrieved successfully.",
        });

    } catch (error) {
        console.error(
            "List Bookings Controller Error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
|
| GET /api/bookings/:id
|
|--------------------------------------------------------------------------
*/

export const getBookingController = async (req, res, next) => {
    try {
        const bookingId =
            stringValue(req.params?.bookingId);


        /*
        |--------------------------------------------------------------------------
        | Validate ID
        |--------------------------------------------------------------------------
        */

        if (!bookingId) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Booking ID is required.",
            });
        }

        if (!isValidObjectId(bookingId)) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid booking ID.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Get Booking
        |--------------------------------------------------------------------------
        */

        const result = await getBooking({
            bookingId,
        });


        /*
        |--------------------------------------------------------------------------
        | Not Found
        |--------------------------------------------------------------------------
        */

        if (!result?.success) {
            return errorResponse({
                res,
                statusCode: 404,
                message:
                    result?.message ||
                    "Booking not found.",
                data: {
                    booking: null,
                },
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return successResponse({
            res,

            statusCode: 200,

            data: {
                booking: result.booking,
            },

            message:
                result.message ||
                "Booking retrieved successfully.",
        });

    } catch (error) {
        console.error(
            "Get Booking Controller Error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| CHECK AVAILABILITY
|--------------------------------------------------------------------------
|
| GET /api/bookings/availability
|
| Example:
|
| /api/bookings/availability
|   ?bookingDate=2026-08-22
|   &startTime=19:00
|   &guestCount=4
|
|--------------------------------------------------------------------------
*/

export const checkBookingAvailabilityController = async (
    req,
    res,
    next
) => {
    try {
        const {
            bookingDate,
            startTime,
            guestCount,
            excludeBookingId,
        } = req.body || {};


        /*
        |--------------------------------------------------------------------------
        | Required Values
        |--------------------------------------------------------------------------
        */

        const normalizedDate =
            stringValue(bookingDate);

        const normalizedTime =
            stringValue(startTime);

        if (!normalizedDate) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Booking date is required.",
            });
        }

        if (!normalizedTime) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Booking time is required.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Guest Count
        |--------------------------------------------------------------------------
        */

        const parsedGuestCount =
            positiveInteger(guestCount);

        if (
            parsedGuestCount === null ||
            parsedGuestCount > 100
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message:
                    "Guest count must be a whole number between 1 and 100.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Excluded Booking
        |--------------------------------------------------------------------------
        */

        if (
            excludeBookingId &&
            !isValidObjectId(excludeBookingId)
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message:
                    "Invalid excludeBookingId.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Service
        |--------------------------------------------------------------------------
        */

        const result = await checkAvailability({
            bookingDate:
                normalizedDate,

            startTime:
                normalizedTime,

            guestCount:
                parsedGuestCount,

            excludeBookingId:
                excludeBookingId || null,
        });


        /*
        |--------------------------------------------------------------------------
        | Availability Result
        |--------------------------------------------------------------------------
        |
        | An unavailable table is not a server error.
        |
        |--------------------------------------------------------------------------
        */

        return successResponse({
            res,

            statusCode: 200,

            data: {
                available:
                    Boolean(result?.available),

                table:
                    result?.table || null,

                endTime:
                    result?.endTime || null,

                reason:
                    result?.reason || null,
            },

            message:
                result?.available
                    ? "Table is available."
                    : result?.reason ||
                    "No table is available.",
        });

    } catch (error) {
        console.error(
            "Check Booking Availability Controller Error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE BOOKING
|--------------------------------------------------------------------------
|
| PATCH /api/bookings/:id
|
|--------------------------------------------------------------------------
*/

export const updateBookingController = async (
    req,
    res,
    next
) => {
    try {
        // const bookingId = 
        //     stringValue(req.params);
        const bookingId = stringValue(
            req.params.bookingId
        );

        if (!bookingId) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Booking ID is required.",
            });
        }

        if (!isValidObjectId(bookingId)) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid booking ID.",
            });
        }


        const {
            bookingDate,
            startTime,
            guestCount,
            specialRequest,
            occasion,
            notes,
            status,
        } = req.body || {};


        /*
        |--------------------------------------------------------------------------
        | At Least One Field
        |--------------------------------------------------------------------------
        */

        const hasUpdate =
            bookingDate !== undefined ||
            startTime !== undefined ||
            guestCount !== undefined ||
            specialRequest !== undefined ||
            occasion !== undefined ||
            notes !== undefined ||
            status !== undefined;

        if (!hasUpdate) {
            return errorResponse({
                res,
                statusCode: 400,
                message:
                    "At least one booking field must be provided for update.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Validate Guest Count
        |--------------------------------------------------------------------------
        */

        let parsedGuestCount;

        if (guestCount !== undefined) {
            parsedGuestCount =
                positiveInteger(guestCount);

            if (
                parsedGuestCount === null ||
                parsedGuestCount > 100
            ) {
                return errorResponse({
                    res,
                    statusCode: 400,
                    message:
                        "Guest count must be a whole number between 1 and 100.",
                });
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Validate Status
        |--------------------------------------------------------------------------
        */

        const allowedStatuses = [
            "pending",
            "confirmed",
            "seated",
            "completed",
            "cancelled",
            "no_show",
        ];

        if (
            status !== undefined &&
            !allowedStatuses.includes(status)
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid booking status.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Update Service
        |--------------------------------------------------------------------------
        */

        const result = await updateBooking({
            bookingId,

            bookingDate:
                bookingDate !== undefined
                    ? stringValue(bookingDate)
                    : undefined,

            startTime:
                startTime !== undefined
                    ? stringValue(startTime)
                    : undefined,

            guestCount:
                parsedGuestCount,

            specialRequest:
                specialRequest !== undefined
                    ? stringValue(specialRequest)
                    : undefined,

            occasion:
                occasion !== undefined
                    ? stringValue(occasion)
                    : undefined,

            notes:
                notes !== undefined
                    ? stringValue(notes)
                    : undefined,

            status,
        });


        /*
        |--------------------------------------------------------------------------
        | Service Failure
        |--------------------------------------------------------------------------
        */

        if (!result?.success) {
            return errorResponse({
                res,
                statusCode: 409,
                message:
                    result?.message ||
                    "Unable to update booking.",
                data: {
                    booking:
                        result?.booking || null,
                },
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return successResponse({
            res,

            statusCode: 200,

            data: {
                booking:
                    result.booking,
            },

            message:
                result.message ||
                "Booking updated successfully.",
        });

    } catch (error) {
        console.error(
            "Update Booking Controller Error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| CANCEL BOOKING
|--------------------------------------------------------------------------
|
| PATCH /api/bookings/:id/cancel
|
|--------------------------------------------------------------------------
*/

export const cancelBookingController = async (
    req,
    res,
    next
) => {
    try {
        const bookingId =
            stringValue(req.params?.bookingId);

        if (!bookingId) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Booking ID is required.",
            });
        }

        if (!isValidObjectId(bookingId)) {
            return errorResponse({
                res,
                statusCode: 400,
                message: "Invalid booking ID.",
            });
        }


        const {
            reason,
            cancelledBy,
        } = req.body || {};


        /*
        |--------------------------------------------------------------------------
        | Validate Cancelled By
        |--------------------------------------------------------------------------
        */

        const allowedCancelledBy = [
            "customer",
            "restaurant",
            "admin",
            "ai",
        ];

        const normalizedCancelledBy =
            cancelledBy !== undefined &&
                cancelledBy !== null &&
                cancelledBy !== ""
                ? stringValue(cancelledBy)
                : "admin";

        if (
            !allowedCancelledBy.includes(
                normalizedCancelledBy
            )
        ) {
            return errorResponse({
                res,
                statusCode: 400,
                message:
                    "Invalid cancelledBy value.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Cancel Booking
        |--------------------------------------------------------------------------
        */

        const result = await cancelBooking({
            bookingId,

            reason:
                stringValue(
                    reason,
                    "Cancelled by dashboard"
                ),

            cancelledBy:
                normalizedCancelledBy,
        });


        /*
        |--------------------------------------------------------------------------
        | Service Failure
        |--------------------------------------------------------------------------
        */

        if (!result?.success) {
            return errorResponse({
                res,
                statusCode: 409,
                message:
                    result?.message ||
                    "Unable to cancel booking.",
                data: {
                    booking:
                        result?.booking || null,
                },
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return successResponse({
            res,

            statusCode: 200,

            data: {
                booking:
                    result.booking,
            },

            message:
                result.message ||
                "Booking cancelled successfully.",
        });

    } catch (error) {
        console.error(
            "Cancel Booking Controller Error:",
            error
        );

        return next(error);
    }
};


/*
|--------------------------------------------------------------------------
| EXPORT DEFAULT
|--------------------------------------------------------------------------
*/

export default {
    createBookingController,
    listBookingsController,
    getBookingController,
    checkBookingAvailabilityController,
    updateBookingController,
    cancelBookingController,
};
