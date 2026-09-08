
import mongoose from "mongoose";
import { baseSchemaOptions } from "./BaseModel.js";

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table", default: null, index: true },
    bookingDate: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, default: "", trim: true },
    guestCount: { type: Number, required: true, min: 1, max: 100 },
    durationMinutes: { type: Number, default: 90, min: 15 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"],
      default: "pending",
      index: true,
    },
    bookingSource: {
      type: String,
      enum: ["ai_voice", "dashboard", "walk_in", "website", "whatsapp"],
      default: "ai_voice",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "not_required"],
      default: "not_required",
    },
    seatingPreference: {
      type: String,
      enum: ["any", "indoor", "outdoor", "window", "vip"],
      default: "any",
    },
    specialRequest: { type: String, default: "", maxlength: 500 },
    occasion: { type: String, default: "", trim: true },
    notes: { type: String, default: "", maxlength: 1000 },
    bookingNumber: { type: String, unique: true, sparse: true, index: true },
    confirmationCode: { type: String, unique: true, sparse: true, index: true },
    cancelReason: { type: String, default: "", trim: true, maxlength: 500 },
    cancelledBy: {
      type: String,
      enum: ["customer", "restaurant", "admin", "ai"],
      default: null,
    },
    cancelledByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    checkedInAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    conversationId: { type: String, default: "", index: true },
    callLog: { type: mongoose.Schema.Types.ObjectId, ref: "CallLog", default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  baseSchemaOptions
);

bookingSchema.index({ bookingDate: 1, startTime: 1, table: 1 });
bookingSchema.index({ customer: 1, bookingDate: -1 });
bookingSchema.index({ status: 1, bookingDate: 1 });
bookingSchema.index({ cancelledByUser: 1, cancelledAt: -1 });

export default mongoose.model("Booking", bookingSchema);


// import mongoose from "mongoose";
// import { baseSchemaOptions } from "./BaseModel.js";

// const bookingSchema = new mongoose.Schema(
//     {
//         /*
//         |--------------------------------------------------------------------------
//         | Customer
//         |--------------------------------------------------------------------------
//         */
//         customer: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Customer",
//             required: true,
//             index: true,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Table
//         |--------------------------------------------------------------------------
//         */
//         table: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Table",
//             default: null,
//             index: true,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Booking Details
//         |--------------------------------------------------------------------------
//         */
//         bookingDate: {
//             type: Date,
//             required: true,
//             index: true,
//         },

//         startTime: {
//             type: String,
//             required: true,
//             trim: true,
//         },

//         endTime: {
//             type: String,
//             default: "",
//             trim: true,
//         },

//         guestCount: {
//             type: Number,
//             required: true,
//             min: 1,
//             max: 100,
//         },

//         durationMinutes: {
//             type: Number,
//             default: 90,
//             min: 15,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Booking Status
//         |--------------------------------------------------------------------------
//         */
//         status: {
//             type: String,
//             enum: [
//                 "pending",
//                 "confirmed",
//                 "seated",
//                 "completed",
//                 "cancelled",
//                 "no_show",
//             ],
//             default: "pending",
//             index: true,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Booking Source
//         |--------------------------------------------------------------------------
//         */
//         bookingSource: {
//             type: String,
//             enum: [
//                 "ai_voice",
//                 "dashboard",
//                 "walk_in",
//                 "website",
//                 "whatsapp",
//             ],
//             default: "ai_voice",
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Payment
//         |--------------------------------------------------------------------------
//         */
//         paymentStatus: {
//             type: String,
//             enum: [
//                 "pending",
//                 "paid",
//                 "refunded",
//                 "not_required",
//             ],
//             default: "not_required",
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Customer Preferences
//         |--------------------------------------------------------------------------
//         */
//         seatingPreference: {
//             type: String,
//             enum: [
//                 "any",
//                 "indoor",
//                 "outdoor",
//                 "window",
//                 "vip",
//             ],
//             default: "any",
//         },

//         specialRequest: {
//             type: String,
//             default: "",
//             maxlength: 500,
//         },

//         occasion: {
//             type: String,
//             default: "",
//             trim: true,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Booking Notes
//         |--------------------------------------------------------------------------
//         */
//         notes: {
//             type: String,
//             default: "",
//             maxlength: 1000,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Confirmation
//         |--------------------------------------------------------------------------
//         */
//         bookingNumber: {
//             type: String,
//             unique: true,
//             sparse: true,
//             index: true,
//         },

//         confirmationCode: {
//             type: String,
//             unique: true,
//             sparse: true,
//             index: true,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Cancellation
//         |--------------------------------------------------------------------------
//         */
//         cancelReason: {
//             type: String,
//             default: "",
//         },

//         cancelledBy: {
//             type: String,
//             enum: [
//                 "customer",
//                 "restaurant",
//                 "admin",
//                 "Owner",
//                 "ai",
//             ],
//             default: null,
//         },

//         cancelledByUser: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "User",
//             default: null,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Timeline
//         |--------------------------------------------------------------------------
//         */
//         checkedInAt: {
//             type: Date,
//             default: null,
//         },

//         completedAt: {
//             type: Date,
//             default: null,
//         },

//         cancelledAt: {
//             type: Date,
//             default: null,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | AI / Voice
//         |--------------------------------------------------------------------------
//         */
//         conversationId: {
//             type: String,
//             default: "",
//             index: true,
//         },

//         callLog: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "CallLog",
//             default: null,
//         },

//         /*
//         |--------------------------------------------------------------------------
//         | Soft Delete
//         |--------------------------------------------------------------------------
//         */
//         isDeleted: {
//             type: Boolean,
//             default: false,
//             index: true,
//         },
//     },
//     baseSchemaOptions
// );

// /*
// |--------------------------------------------------------------------------
// | Compound Indexes
// |--------------------------------------------------------------------------
// */

// bookingSchema.index({
//     bookingDate: 1,
//     startTime: 1,
//     table: 1,
// });

// bookingSchema.index({
//     customer: 1,
//     bookingDate: -1,
// });

// bookingSchema.index({
//     status: 1,
//     bookingDate: 1,
// });

// // bookingSchema.index({
// //     bookingNumber: 1,
// // });

// export default mongoose.model("Booking", bookingSchema);

