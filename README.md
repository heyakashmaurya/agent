# Restaurant AI Backend Controller Upgrade

Drop-in controller upgrade for the public Restaurant AI Table Booking System repository.

Focus:
- consistent `{ success, message, data, meta }` API responses
- strict request validation
- safe ObjectId/date/time validation
- pagination and filters
- customer endpoints required by a real dashboard
- dashboard aggregation endpoint
- analytics response with nested metrics plus flat aliases for simple clients
- dynamic Twilio/LiveKit configuration via environment variables
- no hard-coded phone numbers / ngrok URLs
- removal of auth token logging
- outbound call status callback handling
- booking-source preservation through the required service patch

See `BACKEND-INTEGRATION.md` before copying files.
