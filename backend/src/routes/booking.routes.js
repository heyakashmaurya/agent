
import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import {
  createBookingController,
  listBookingsController,
  getBookingController,
  checkBookingAvailabilityController,
  updateBookingController,
  cancelBookingController,
} from "../controllers/booking.controller.js";

const router = express.Router();
router.use(auth);

router.get("/", authorize("Owner", "Manager", "Staff"), listBookingsController);
router.post("/availability", authorize("Owner", "Manager", "Staff"), checkBookingAvailabilityController);
router.post("/create", authorize("Owner", "Manager", "Staff"), createBookingController);
router.get("/:bookingId", authorize("Owner", "Manager", "Staff"), getBookingController);
router.patch("/:bookingId", authorize("Owner", "Manager", "Staff"), updateBookingController);

// Client body: { "reason": "Customer requested cancellation" }
// Never accept cancelledBy from the client; derive it from req.user.role.
router.patch(
  "/:bookingId/cancel",
  authorize("Owner", "Manager", "Staff"),
  cancelBookingController
);

export default router;


// import express from "express";

// import {
//     createBookingController,
//     listBookingsController,
//     getBookingController,
//     checkBookingAvailabilityController,
//     updateBookingController,
//     cancelBookingController,
// } from "../controllers/booking.controller.js";

// import protect  from "../middleware/auth.js";
// // import { authorize } from "../middleware/authorize.js";
// import authorize from "../middleware/authorize.js";

// const router = express.Router();

// /*
// |--------------------------------------------------------------------------
// | Booking Routes
// |--------------------------------------------------------------------------
// |
// | Dashboard / Admin booking API.
// |
// | Architecture:
// |
// | Frontend
// |    ↓
// | Route
// |    ↓
// | Controller
// |    ↓
// | Booking Service
// |    ↓
// | MongoDB
// |
// |--------------------------------------------------------------------------
// */


// /*
// |--------------------------------------------------------------------------
// | All Booking Routes Require Authentication
// |--------------------------------------------------------------------------
// */

// router.use(protect);


// /*
// |--------------------------------------------------------------------------
// | GET /api/bookings
// |--------------------------------------------------------------------------
// |
// | List bookings with filters and pagination.
// |
// | Supported query parameters:
// |
// | ?bookingDate=2026-08-22
// | ?status=confirmed
// | ?bookingSource=dashboard
// | ?paymentStatus=paid
// | ?customer=<customerId>
// | ?page=1
// | ?limit=20
// |
// */

// router.get(
//     "/",
//     authorize("Owner", "Manager", "Staff"),
//     listBookingsController
// );


// /*
// |--------------------------------------------------------------------------
// | POST /api/bookings/availability
// |--------------------------------------------------------------------------
// |
// | Check whether a table is available before creating/updating
// | a booking.
// |
// | Body:
// |
// | {
// |     "bookingDate": "2026-08-22",
// |     "startTime": "19:00",
// |     "guestCount": 4
// | }
// |
// */

// router.post(
//     "/availability",
//     authorize("Owner", "Manager", "Staff"),
//     checkBookingAvailabilityController
// );


// /*
// |--------------------------------------------------------------------------
// | POST /api/bookings
// |--------------------------------------------------------------------------
// |
// | Create a new manual/dashboard booking.
// |
// */

// router.post(
//     "/create",
//     authorize("Owner", "Manager", "Staff"),
//     createBookingController
// );


// /*
// |--------------------------------------------------------------------------
// | GET /api/bookings/:bookingId
// |--------------------------------------------------------------------------
// |
// | Get a single booking.
// |
// */

// router.get(
//     "/:bookingId",
//     authorize("Owner", "Manager", "Staff"),
//     getBookingController
// );


// /*
// |--------------------------------------------------------------------------
// | PATCH /api/bookings/:bookingId
// |--------------------------------------------------------------------------
// |
// | Update booking details.
// |
// | Example:
// |
// | {
// |     "bookingDate": "2026-08-23",
// |     "startTime": "20:00",
// |     "guestCount": 5,
// |     "specialRequest": "Window seat"
// | }
// |
// */

// router.patch(
//     "/:bookingId",
//     authorize("Owner", "Manager", "Staff"),
//     updateBookingController
// );


// /*
// |--------------------------------------------------------------------------
// | PATCH /api/bookings/:bookingId/cancel
// |--------------------------------------------------------------------------
// |
// | Cancel a booking.
// |
// | Body:
// |
// | {
// |     "reason": "Customer requested cancellation"
// | }
// |
// */

// router.patch(
//     "/:bookingId/cancel",
//     authorize("Owner", "Manager", "Staff"),
//     cancelBookingController
// );


// /*
// |--------------------------------------------------------------------------
// | Export
// |--------------------------------------------------------------------------
// */

// export default router;

