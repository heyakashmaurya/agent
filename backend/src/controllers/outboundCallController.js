import twilio from "twilio";
import env from "../config/env.js";
import { parseString, sendError, sendSuccess, logControllerError } from "./_controllerUtils.js";
import { createCallLog } from "../services/call/call.service.js";

const getClient = () => {
  const sid = parseString(env.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID);
  const token = parseString(env.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN);
  if (!sid || !token) throw Object.assign(new Error("Twilio credentials are not configured."), { statusCode: 503 });
  return twilio(sid, token);
};

const normalizedPhone = (value) => parseString(value).replace(/[^+\d]/g, "");

export const makeOutboundCall = async (req, res, next) => {
  try {
    const to = normalizedPhone(req.body?.to || req.body?.phoneNumber);
    const from = normalizedPhone(req.body?.from || env.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER);
    const baseUrl = parseString(env.baseUrl || process.env.PUBLIC_BASE_URL).replace(/\/$/, "");

    if (!to) return sendError(res, { status: 400, message: "Destination phone number is required." });
    if (!/^\+\d{8,15}$/.test(to)) return sendError(res, { status: 400, message: "Destination phone number must be in E.164 format." });
    if (!from || !/^\+\d{8,15}$/.test(from)) return sendError(res, { status: 503, message: "A valid Twilio caller ID is not configured." });
    if (!baseUrl) return sendError(res, { status: 503, message: "Public backend URL is not configured." });

    const client = getClient();
    const call = await client.calls.create({
      to,
      from,
      url: `${baseUrl}/api/outbound/connect-livekit`,
      method: "POST",
      statusCallback: `${baseUrl}/api/outbound/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    const callLog = await createCallLog({
      callSid: call.sid,
      phoneNumber: to,
      direction: "Outgoing",
      callStatus: "Ringing",
      aiHandled: true,
      notes: `Outbound call initiated by ${req.user?.id || "dashboard"}.`,
    });

    return sendSuccess(res, { status: 201, message: "Outbound call initiated successfully.", data: { callSid: call.sid, callLogId: callLog?._id || null, status: call.status || "queued" } });
  } catch (error) {
    logControllerError("OUTBOUND_CALL", error, req);
    return next(error);
  }
};

export const connectLivekit = (req, res, next) => {
  try {
    const sipUri = parseString(env.livekitSipUri || process.env.LIVEKIT_SIP_URI);
    if (!sipUri) return sendError(res, { status: 503, message: "LIVEKIT_SIP_URI is not configured." });
    const twiml = new twilio.twiml.VoiceResponse();
    const dial = twiml.dial({ answerOnBridge: true });
    dial.sip(sipUri);
    return res.type("text/xml").send(twiml.toString());
  } catch (error) {
    logControllerError("OUTBOUND_CONNECT_LIVEKIT", error, req);
    return next(error);
  }
};

export const outboundStatus = async (req, res, next) => {
  try {
    const callSid = parseString(req.body?.CallSid);
    const status = parseString(req.body?.CallStatus).toLowerCase();
    const mapping = { queued: "Ringing", initiated: "Ringing", ringing: "Ringing", in_progress: "Answered", answered: "Answered", completed: "Completed", busy: "Busy", failed: "Failed", no_answer: "Missed", canceled: "Cancelled", cancelled: "Cancelled" };
    const callStatus = mapping[status];
    if (callSid && callStatus) {
      const { getCallBySid, updateCallLog } = await import("../services/call/call.service.js");
      const callLog = await getCallBySid(callSid);
      if (callLog) await updateCallLog(callLog._id, { callStatus });
    }
    return res.status(204).send();
  } catch (error) {
    logControllerError("OUTBOUND_STATUS", error, req);
    return next(error);
  }
};

export default { makeOutboundCall, connectLivekit, outboundStatus };
