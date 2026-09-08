import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { baseSchemaOptions } from "./BaseModel.js";
import validator from "validator";

const userSchema = new mongoose.Schema(
    {
        /*
        |--------------------------------------------------------------------------
        | Basic Information
        |--------------------------------------------------------------------------
        */

        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            validate: {
                validator: validator.isEmail,
                message: "Please provide a valid email address.",
            },
        },

        phone: {
            type: String,
            default: "",
            trim: true,
        },

        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */

        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false,
        },

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        role: {
            type: String,
            enum: [
                "Owner",
                "Manager",
                "Staff",
                "customer",
                "restaurant",
                "admin",
                "Owner",
                "ai",
            ],
            default: "Owner",
        },

        /*
        |--------------------------------------------------------------------------
        | Future Multi Restaurant Support
        |--------------------------------------------------------------------------
        */

        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            default: null,
        },

        /*
        |--------------------------------------------------------------------------
        | Profile
        |--------------------------------------------------------------------------
        */

        profileImage: {
            type: String,
            default: "",
        },

        preferredLanguage: {
            type: String,
            enum: ["en", "hi"],
            default: "en",
        },

        /*
        |--------------------------------------------------------------------------
        | Security
        |--------------------------------------------------------------------------
        */

        isActive: {
            type: Boolean,
            default: true,
        },

        lastLogin: {
            type: Date,
            default: null,
        },

        passwordChangedAt: {
            type: Date,
            default: null,
        },

        /*
        |--------------------------------------------------------------------------
        | Soft Delete
        |--------------------------------------------------------------------------
        */

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    baseSchemaOptions
);

/*
|--------------------------------------------------------------------------
| Hash Password Before Save
|--------------------------------------------------------------------------
*/

userSchema.pre("save", async function (next) {

    if (!this.isModified("password")) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 12);

    next();

});

/*
|--------------------------------------------------------------------------
| Compare Password
|--------------------------------------------------------------------------
*/

userSchema.methods.comparePassword = async function (candidatePassword) {

    return await bcrypt.compare(
        candidatePassword,
        this.password
    );

};

/*
|--------------------------------------------------------------------------
| Password Changed
|--------------------------------------------------------------------------
*/

userSchema.methods.passwordChangedAfter = function (JWTTimestamp) {

    if (!this.passwordChangedAt) {
        return false;
    }

    const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
    );

    return JWTTimestamp < changedTimestamp;

};

export default mongoose.model(
    "User",
    userSchema
);