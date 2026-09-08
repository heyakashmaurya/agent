# Required service patch

`services/booking/createBooking.js` in the current repository accepts `bookingSource` but hard-codes every booking as `ai_voice`.

Replace the repository file with the provided logic. Copy the file contents into:

`backend/src/services/booking/createBooking.js`

The PATCHES file is documentation/reference, not a file you should import from the project root.
