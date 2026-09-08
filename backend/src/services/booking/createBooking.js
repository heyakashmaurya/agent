import Booking from "../../models/Booking.js";

import { findOrCreateCustomer } from "../customer/findOrCreateCustomer.js";

import { checkAvailability } from "./checkAvailability.js";

import { generateConfirmationCode } from "../../utils/generateConfirmationCode.js";

/*
|--------------------------------------------------------------------------
| Create Booking Service             
|--------------------------------------------------------------------------
*/

export const createBooking = async ({
    name,
    phone ,
    email,

    bookingDate,
    startTime,
    guestCount,

    specialRequest = "",
    occasion = "",
    notes = "",
    bookingSource,
}) => {

    try {

        /*
        |--------------------------------------------------------------------------
        | Basic Validation
        |--------------------------------------------------------------------------
        */

        if (!name) {
            throw new Error("Customer name is required.");
        }

        if (!phone) {
            throw new Error("Customer phone is required.");
        }

        if (!bookingDate) {
            throw new Error("Booking date is required.");
        }

        if (!startTime) {
            throw new Error("Booking time is required.");
        }

        if (!guestCount) {
            throw new Error("Guest count is required.");
        }

        /*
        |--------------------------------------------------------------------------
        | Find/Create Customer
        |--------------------------------------------------------------------------
        */

        const customer = await findOrCreateCustomer({

            name,

            phone,

            email,

        });

        /*
        |--------------------------------------------------------------------------
        | Check Availability
        |--------------------------------------------------------------------------
        */

        const availability = await checkAvailability({

            bookingDate,

            startTime,

            guestCount,

        });

        if (!availability.available) {

            return {

                success: false,

                message: availability.reason,

                booking: null,

            };

        }

        /*
        |--------------------------------------------------------------------------
        | Generate Confirmation Code
        |--------------------------------------------------------------------------
        */

        const confirmationCode =
            generateConfirmationCode();

        /*
        |--------------------------------------------------------------------------
        | Create Booking
        |--------------------------------------------------------------------------
        */

        const booking = await Booking.create({

            customer: customer._id,

            table: availability.table._id,

            bookingDate,

            startTime,

            guestCount,

            confirmationCode,

            specialRequest,

            occasion,

            notes,

            status: "confirmed",

            bookingSource: "ai_voice",

        });

        /*
        |--------------------------------------------------------------------------
        | Populate Customer & Table
        |--------------------------------------------------------------------------
        */

        await booking.populate([
            {
                path: "customer",
            },
            {
                path: "table",
            },
        ]);

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return {

            success: true,

            booking,

            message: "Booking created successfully.",

        };

    } 

    catch (error) {

        console.error(

            "Create Booking Error:",

            error

        );

        throw error;

    }

};