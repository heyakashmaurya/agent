# Restaurant AI Booking — Integrated Upgrade

This package is an integrated upgrade of the `heyakashmaurya/agent` project. It keeps the existing React/Vite frontend, Express/MongoDB backend and LiveKit agent architecture, while adding the requested customer, booking, provider-routing, outbound campaign and call-log capabilities.

## Included

- Customer directory with booking/call history
- Latest-first reservations with visible confirmation codes
- Reservation create/edit/cancel flow
- Table CRUD/status controls
- Switchable LLM routing: OpenAI, DeepSeek, Google Gemini
- Switchable outbound telephony: Twilio, Exotel, Vobiz
- CSV/XLSX/XLSM outbound campaigns with concurrent workers
- Rich call logs with provider, campaign, booking, transcript, recording and metadata
- Settings page for provider selection without exposing secrets to the browser

## Install

### Backend

```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_URL` in the frontend `.env` to the backend API base, for example `http://localhost:5000/api`.

## Provider configuration

API keys and telephony credentials belong only in `backend/.env`. The dashboard only selects the active provider and model.

LLM defaults in this upgrade are:
- OpenAI: `gpt-4.1-mini`
- DeepSeek: `deepseek-v4-flash`
- Google Gemini: `gemini-3.8-flash`

DeepSeek uses the OpenAI-compatible endpoint `https://api.deepseek.com`, and Gemini uses Google’s OpenAI-compatible endpoint `https://generativelanguage.googleapis.com/v1beta/openai/`.

Telephony is selected by the dashboard or `TELEPHONY_PROVIDER`. Twilio, Exotel and Vobiz require their own provider-specific credentials and public callback/answer endpoints; switching the dropdown does not magically provision those external accounts.

## Outbound campaigns

Upload a CSV, XLSX or XLSM containing a phone column. Accepted aliases include `phone`, `phone_number`, `mobile`, `mobile_number`, `number`, `contact`, and `contact_number`. Numbers are validated as E.164. Campaigns run with configurable concurrency and create a CallLog per contact.

## Security

Never commit `.env`, API keys, provider tokens, JWT secrets or database credentials. Only `.env.example` files should be committed.

## Important architecture note

Outbound provider routing is implemented for Twilio, Exotel and Vobiz. Existing inbound phone handling in the project remains Twilio/LiveKit-specific unless the selected provider is configured with the corresponding public stream/answer/webhook integration.
