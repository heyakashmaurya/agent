# Restaurant AI — Frontend v2

A production-oriented React + Vite dashboard aligned to the current `Restuarant-Ai-Table-Booking-System` repository.

## Included screens

- Overview dashboard
- Reservations (filter, create, cancel)
- Tables / floor control (filter, status changes, create)
- Call logs (filter, detail inspection)
- Customers (aggregated from booking history because the current customer route is not implemented)
- AI receptionist / LiveKit integration status
- Outbound calls
- Analytics with date range and backend overview data
- Account profile and password settings
- Responsive authentication shell and protected navigation

## Backend contracts used

The UI targets the repository's existing endpoints:

- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `PUT /api/auth/change-password`
- `GET /api/tables/gettable`
- `POST /api/tables/create`
- `PATCH /api/tables/:id/status`
- `GET /api/bookings`
- `POST /api/bookings/create`
- `PATCH /api/bookings/:bookingId`
- `PATCH /api/bookings/:bookingId/cancel`
- `POST /api/bookings/availability`
- `GET /api/call/logs`
- `GET /api/call/logs/:id`
- `GET /api/analytics/overview`
- `GET /api/livekit/token`
- `POST /api/outbound/call`

These contracts were verified against the public repository at the time this package was generated.

## Run

```bash
npm install
npm run dev
```

Create `.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_DEMO_MODE=false
VITE_RESTAURANT_NAME=The Garden Table
```

## Demo mode

Set `VITE_DEMO_MODE=true` to display safe local demo data when backend resources are unavailable. Demo mode never substitutes fake data when `VITE_DEMO_MODE=false`.

## Security

Do not put provider secrets, database passwords, Twilio auth tokens, LiveKit secrets or LLM API keys in Vite environment variables. Anything prefixed `VITE_` is exposed to the browser bundle.


## Dependency note

`@eslint/js` is pinned to a currently published 10.x release (`^10.0.1`). The previous `^10.1.0` range caused npm `ETARGET` because that package version is not published.
