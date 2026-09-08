import mongoose from "mongoose";
import { baseSchemaOptions } from "./BaseModel.js";

const customerSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        phone: {
            type: String,
            // required: true,
            unique: true,
            trim: true,
            index: true,
            default: "9191911911",
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
        },

        notes: {
            type: String,
            default: "",
            maxlength: 1000,
        },

        preferredLanguage: {
            type: String,
            default: "en",
            enum: ["en", "hi"],
        },

        preferences: {
            seating: {
                type: String,
                enum: ["Indoor", "Outdoor", "Window", "Private", ""],
                default: "",
            },

            occasion: {
                type: String,
                default: "",
            },

            foodPreference: {
                type: String,
                default: "",
            },
        },

        totalVisits: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalBookings: {
            type: Number,
            default: 0,
            min: 0,
        },

        lastVisit: {
            type: Date,
            default: null,
        },

        lastCallAt: {
            type: Date,
            default: null,
        },

        isBlocked: {
            type: Boolean,
            default: false,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    baseSchemaOptions
);

export default mongoose.model("Customer", customerSchema);