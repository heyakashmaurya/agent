# Restaurant AI — Backend Controller Upgrade

This package replaces the controller layer and adds the missing customer/dashboard routes needed by the updated frontend architecture.

## 1. Copy controllers

Replace the files under:

`backend/src/controllers/`

with the files in:

`backend/src/controllers/`

including `_controllerUtils.js`.

## 2. Add route files

Copy:

- `backend/src/routes/customer.routes.js`
- `backend/src/routes/dashboard.routes.js`
- `backend/src/routes/outboundRoutes.js`

## 3. Update backend/src/app.js

Add these imports:

```js
import customerRoutes from "./routes/customer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
```

Then mount them:

```js
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
```

Keep the existing `/api/outbound` mount, but replace its route file with the supplied `outboundRoutes.js`.

## 4. Apply the required booking service fix

Replace:

`backend/src/services/booking/createBooking.js`

with the version in `PATCHES/services/booking/createBooking.js`.

Reason: the current repository accepts `bookingSource` but stores `ai_voice` for every booking. This makes dashboard bookings look like AI bookings.

## 5. Environment variables

The controllers use the repository's existing env names plus:

```env
BASE_URL=https://your-public-backend.example.com
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
LIVEKIT_SIP_URI=sip:xxxxxxxx@your-livekit-sip-domain
```

Never hard-code provider phone numbers, webhook URLs, SIP URIs, tokens, or API keys in source code.

## 6. Frontend API contracts

The updated controllers support the frontend endpoints:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `PUT /api/auth/change-password`
- `GET /api/dashboard/overview`
- `GET /api/bookings`
- `POST /api/bookings/availability`
- `POST /api/bookings/create`
- `GET /api/bookings/:bookingId`
- `PATCH /api/bookings/:bookingId`
- `PATCH /api/bookings/:bookingId/cancel`
- `GET /api/tables/gettable`
- `POST /api/tables/create`
- `GET /api/tables/:id`
- `PUT /api/tables/:id`
- `PATCH /api/tables/:id/status`
- `DELETE /api/tables/:id`
- `GET /api/customers`
- `GET /api/customers/find`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `GET /api/call/logs`
- `GET /api/call/logs/:id`
- `GET /api/analytics/overview`
- `POST /api/outbound/call`
- `POST /api/outbound/connect-livekit`
- `POST /api/outbound/status`

## 7. Validation / verification

Before starting the server:

```powershell
npm install
node --check src/controllers/_controllerUtils.js
node --check src/controllers/authController.js
node --check src/controllers/booking.controller.js
node --check src/controllers/table.controller.js
node --check src/controllers/customer.controller.js
node --check src/controllers/dashboard.controller.js
node --check src/controllers/analytics.controller.js
node --check src/controllers/callController.js
node --check src/controllers/outboundCallController.js
npm run dev
```

## 8. Important production note

The Twilio webhook routes are provider callbacks and therefore cannot use normal dashboard JWT authentication. They should be protected using Twilio signature validation or an authenticated edge/proxy, plus HTTPS and a stable public webhook URL.

The call controller also keeps in-memory conversation sessions. This works for a single process but should be moved to Redis or another shared store before horizontally scaling the backend.
