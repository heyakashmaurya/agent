import twilio from "twilio";
import mongoose from "mongoose";
import env from "../config/env.js";
import { processConversation } from "../services/voice/deepseekService.js";
import { createBooking } from "../services/booking/createBooking.js";
import {
  listCallLogs,
  getCallById,
  getCallBySid,
  createCallLog,
  updateCallLog,
  completeCall,
} from "../services/call/call.service.js";
import {
  isObjectId,
  parseBoolean,
  parsePositiveInt,
  parseString,
  sendError,
  sendSuccess,
  logControllerError,
} from "./_controllerUtils.js";

const VoiceResponse = twilio.twiml.VoiceResponse;
const sessions = new Map();

const CALL_STATUSES = ["Ringing", "Answered", "Completed", "Missed", "Busy", "Failed", "Cancelled"];
const DIRECTIONS = ["Incoming", "Outgoing"];
const AI_OUTCOMES = ["Booking Created", "Booking Updated", "Booking Cancelled", "Availability Checked", "Information Requested", "Transferred to Human", "No Action"];
const SENTIMENTS = ["Positive", "Neutral", "Negative"];

const publicBaseUrl = () => {
  const value = parseString(env.baseUrl || process.env.PUBLIC_BASE_URL);
  if (!value) throw new Error("PUBLIC_BASE_URL/baseUrl is required for Twilio voice callbacks.");
  return value.replace(/\/$/, "");
};

const voiceActionUrl = () => `${publicBaseUrl()}/api/call/process`;

const getSession = (caller, callSid = "") => {
  const key = callSid || caller || "unknown";
  if (!sessions.has(key)) {
    sessions.set(key, {
      callSid,
      caller,
      intent: null,
      guests: null,
      date: null,
      time: null,
      name: null,
      phone: caller || "",
      confirmed: false,
      awaitingConfirmation: false,
      callLogId: null,
      createdAt: Date.now(),
    });
  }
  return sessions.get(key);
};

const clearSession = (key) => sessions.delete(key);

const updateSession = (session, result) => {
  for (const [key, value] of Object.entries(result || {})) {
    if (value !== undefined && value !== null && value !== "") session[key] = value;
  }
};

const ensureCallLog = async ({ callSid, phoneNumber, direction = "Incoming", callStatus = "Ringing" }) => {
  if (!phoneNumber) return null;
  if (callSid) {
    const existing = await getCallBySid(callSid);
    if (existing) return existing;
  }
  return createCallLog({ callSid, phoneNumber, direction, callStatus, aiHandled: true });
};

const sayAndGather = (twiml, message) => {
  twiml.say({ voice: "Polly.Joanna", language: "en-US" }, String(message));
  twiml.gather({ input: ["speech"], action: voiceActionUrl(), method: "POST", speechTimeout: "auto", timeout: 8 });
};

const finishCall = async ({ twiml, sessionKey, callLog, message, aiOutcome = "No Action" }) => {
  if (callLog) {
    await completeCall(callLog._id, { aiOutcome, endedAt: new Date() });
  }
  twiml.say({ voice: "Polly.Joanna", language: "en-US" }, message);
  twiml.hangup();
  clearSession(sessionKey);
  return twiml;
};

export const incomingCall = async (req, res, next) => {
  const twiml = new VoiceResponse();
  try {
    const callSid = parseString(req.body?.CallSid || req.query?.CallSid);
    const caller = parseString(req.body?.From || req.query?.From);
    const callLog = await ensureCallLog({ callSid, phoneNumber: caller, direction: "Incoming", callStatus: "Ringing" });
    const session = getSession(caller, callSid);
    session.callLogId = callLog?._id?.toString() || null;

    sayAndGather(twiml, "Hello, thanks for calling. How can I help you today?");
    return res.type("text/xml").send(twiml.toString());
  } catch (error) {
    logControllerError("CALL_INCOMING", error, req);
    return next(error);
  }
};

export const processCall = async (req, res, next) => {
  const twiml = new VoiceResponse();
  const callSid = parseString(req.body?.CallSid);
  const caller = parseString(req.body?.From, "unknown");
  const speechText = parseString(req.body?.SpeechResult);
  const sessionKey = callSid || caller;

  try {
    const session = getSession(caller, callSid);
    let callLog = session.callLogId && isObjectId(session.callLogId) ? await getCallById(session.callLogId).catch(() => null) : null;
    if (!callLog) {
      callLog = await ensureCallLog({ callSid, phoneNumber: caller, direction: "Incoming", callStatus: "Answered" });
      session.callLogId = callLog?._id?.toString() || null;
    } else if (callLog.callStatus === "Ringing") {
      callLog = await updateCallLog(callLog._id, { callStatus: "Answered" });
    }

    if (!speechText) {
      sayAndGather(twiml, "Sorry, I didn't hear that. Please tell me how I can help.");
      return res.type("text/xml").send(twiml.toString());
    }

    if (callLog) {
      const transcript = callLog.transcript ? `${callLog.transcript}\nUser: ${speechText}` : `User: ${speechText}`;
      callLog = await updateCallLog(callLog._id, { transcript });
    }

    if (session.awaitingConfirmation) {
      const answer = speechText.toLowerCase();
      if (/\b(yes|yeah|yep|correct|confirm|that's right|that is right)\b/i.test(answer)) {
        session.confirmed = true;
        session.awaitingConfirmation = false;
      } else if (/\b(no|nope|wrong|incorrect|change)\b/i.test(answer)) {
        session.awaitingConfirmation = false;
        sayAndGather(twiml, "No problem. What would you like to change?");
        return res.type("text/xml").send(twiml.toString());
      } else {
        sayAndGather(twiml, "Please say yes to confirm, or no if you would like to change something.");
        return res.type("text/xml").send(twiml.toString());
      }
    }

    if (!session.confirmed) {
      const result = await processConversation(speechText, session);
      updateSession(session, result);
      const intent = String(session.intent || result?.intent || "").toLowerCase();
      const bookingReady = ["booking", "booking_ready"].includes(intent);

      if (bookingReady && session.guests && session.date && session.time && session.name) {
        session.awaitingConfirmation = true;
        sayAndGather(twiml, `Just to confirm, a table for ${session.guests} people on ${session.date} at ${session.time} under the name ${session.name}. Is that correct?`);
      } else {
        const message = result?.reply || "How can I help you with your reservation?";
        if (callLog) {
          callLog = await updateCallLog(callLog._id, {
            transcript: `${callLog.transcript || ""}\nAI: ${message}`.trim(),
            aiOutcome: getAiOutcome(session.intent),
          });
        }
        sayAndGather(twiml, message);
      }
      return res.type("text/xml").send(twiml.toString());
    }

    const intent = String(session.intent || "").toLowerCase();
    if (["booking", "booking_ready"].includes(intent)) {
      if (!session.guests || !session.date || !session.time || !session.name) {
        session.confirmed = false;
        session.awaitingConfirmation = false;
        sayAndGather(twiml, "I still need the reservation details. Please tell me the number of guests, date, time, and name.");
        return res.type("text/xml").send(twiml.toString());
      }

      const bookingResult = await createBooking({
        name: session.name,
        phone: session.phone || caller,
        email: session.email || "",
        bookingDate: session.date,
        startTime: session.time,
        guestCount: Number(session.guests),
        specialRequest: session.specialRequest || "",
        occasion: session.occasion || "",
        notes: "Created by AI voice receptionist",
        bookingSource: "ai_voice",
      });

      if (!bookingResult?.success) {
        session.confirmed = false;
        session.awaitingConfirmation = false;
        const message = bookingResult?.message || "I'm sorry, I couldn't complete that reservation because the requested table is no longer available.";
        if (callLog) await updateCallLog(callLog._id, { aiOutcome: "No Action", notes: message });
        sayAndGather(twiml, message);
        return res.type("text/xml").send(twiml.toString());
      }

      if (callLog) {
        callLog = await updateCallLog(callLog._id, {
          booking: bookingResult.booking?._id || null,
          aiOutcome: "Booking Created",
          notes: "Reservation created and confirmed by caller.",
          transcript: `${callLog.transcript || ""}\nAI: Booking confirmed.`.trim(),
        });
      }
      const confirmationCode = bookingResult.booking?.confirmationCode ? ` Your confirmation code is ${bookingResult.booking.confirmationCode}.` : "";
      const message = `Perfect. Your table for ${session.guests} people on ${session.date} at ${session.time} is confirmed.${confirmationCode} We look forward to serving you.`;
      await finishCall({ twiml, sessionKey, callLog, message, aiOutcome: "Booking Created" });
      return res.type("text/xml").send(twiml.toString());
    }

    const message = "Thanks for calling. A member of our team can help with that request.";
    if (callLog) await updateCallLog(callLog._id, { aiOutcome: "Transferred to Human", transferredToHuman: true, transcript: `${callLog.transcript || ""}\nAI: ${message}`.trim() });
    await finishCall({ twiml, sessionKey, callLog, message, aiOutcome: "Transferred to Human" });
    return res.type("text/xml").send(twiml.toString());
  } catch (error) {
    logControllerError("CALL_PROCESS", error, req);
    try {
      const failedCall = callSid ? await getCallBySid(callSid) : null;
      if (failedCall) await updateCallLog(failedCall._id, { callStatus: "Failed", notes: error.message || "Call processing failed." });
    } catch (lifecycleError) {
      console.error("[CALL_PROCESS_LIFECYCLE]", lifecycleError?.message || lifecycleError);
    }
    twiml.say({ voice: "Polly.Joanna", language: "en-US" }, "Sorry, something went wrong. Please try again later.");
    twiml.hangup();
    return res.type("text/xml").status(200).send(twiml.toString());
  }
};

export const listCallLogsController = async (req, res, next) => {
  try {
    const page = req.query?.page === undefined ? 1 : parsePositiveInt(req.query.page, null, 100000);
    const limit = req.query?.limit === undefined ? 20 : parsePositiveInt(req.query.limit, null, 100);
    if (page === null) return sendError(res, { status: 400, message: "Page must be a positive integer." });
    if (limit === null) return sendError(res, { status: 400, message: "Limit must be between 1 and 100." });

    const customer = parseString(req.query?.customer) || undefined;
    const booking = parseString(req.query?.booking) || undefined;
    if (customer && !isObjectId(customer)) return sendError(res, { status: 400, message: "Invalid customer ID." });
    if (booking && !isObjectId(booking)) return sendError(res, { status: 400, message: "Invalid booking ID." });

    const result = await listCallLogs({
      callStatus: parseString(req.query?.callStatus) || undefined,
      direction: parseString(req.query?.direction) || undefined,
      phoneNumber: parseString(req.query?.phoneNumber) || undefined,
      customer,
      booking,
      aiOutcome: parseString(req.query?.aiOutcome) || undefined,
      sentiment: parseString(req.query?.sentiment) || undefined,
      aiHandled: parseBoolean(req.query?.aiHandled),
      transferredToHuman: parseBoolean(req.query?.transferredToHuman),
      from: parseString(req.query?.from) || undefined,
      to: parseString(req.query?.to) || undefined,
      page,
      limit,
    });

    return sendSuccess(res, {
      data: result?.calls || [],
      meta: { total: result?.total || 0, page: result?.page || page, limit: result?.limit || limit, totalPages: result?.totalPages || 0 },
      message: "Call logs retrieved successfully.",
    });
  } catch (error) {
    logControllerError("CALL_LIST", error, req);
    return next(error);
  }
};

export const getCallLogController = async (req, res, next) => {
  try {
    const id = parseString(req.params?.id);
    if (!isObjectId(id)) return sendError(res, { status: 400, message: "Invalid call ID." });
    const call = await getCallById(id);
    return sendSuccess(res, { data: { call }, message: "Call log retrieved successfully." });
  } catch (error) {
    logControllerError("CALL_GET", error, req);
    return next(error);
  }
};

const getAiOutcome = (intent) => {
  switch (String(intent || "").toLowerCase()) {
    case "booking":
    case "booking_ready": return "Booking Created";
    case "cancel": return "Booking Cancelled";
    case "inquiry": return "Information Requested";
    default: return "No Action";
  }
};

export default { incomingCall, processCall, listCallLogsController, getCallLogController };
