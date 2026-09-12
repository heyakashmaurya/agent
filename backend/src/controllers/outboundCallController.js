import twilio from "twilio";
import env from "../config/env.js";
import AISetting from "../models/AISetting.js";
import { parseString, sendError, sendSuccess, logControllerError } from "./_controllerUtils.js";
import { createCallLog, getCallBySid, updateCallLog } from "../services/call/call.service.js";
import { getTelephonyProvider, providerConfigStatus } from "../services/providers/telephony.js";
import { syncCampaignItem } from "../services/outboundCampaign.service.js";

const mapStatus = (raw) => ({ queued: "Ringing", initiated: "Ringing", ringing: "Ringing", in_progress: "Answered", answered: "Answered", completed: "Completed", busy: "Busy", failed: "Failed", no_answer: "Missed", canceled: "Cancelled", cancelled: "Cancelled" }[String(raw || "").toLowerCase()] || null);
const e164 = (value) => String(value || "").trim().replace(/[^+\d]/g, "");

const getActiveTelephony = async () => {
  const setting = await AISetting.findOne({ isDeleted: false }).sort({ updatedAt: -1 }).lean();
  return String(setting?.telephonyProvider || process.env.TELEPHONY_PROVIDER || "twilio").toLowerCase();
};

export const getOutboundConfig = async (req, res, next) => {
  try {
    const activeProvider = await getActiveTelephony();
    return sendSuccess(res, { data: { activeProvider, providers: providerConfigStatus() }, message: "Outbound provider configuration retrieved." });
  } catch (error) { return next(error); }
};

export const makeOutboundCall = async (req, res, next) => {
  try {
    const to = e164(req.body?.to || req.body?.phoneNumber);
    if (!/^\+\d{8,15}$/.test(to)) return sendError(res, { status: 400, message: "Destination phone number must be in E.164 format, for example +919876543210." });
    const provider = String(req.body?.provider || await getActiveTelephony()).toLowerCase();
    const message = parseString(req.body?.message);
    const call = await (await getTelephonyProvider(provider))({ to, message });
    const status = mapStatus(call.status) || "Ringing";
    const log = await createCallLog({ provider, providerCallId: call.providerCallId || "", callSid: call.providerCallId || "", phoneNumber: to, direction: "Outgoing", callStatus: status, aiHandled: true, notes: message, metadata: { providerResponse: call.raw || null } });
    return sendSuccess(res, { status: 201, data: { callSid: call.providerCallId || null, callLogId: log?._id || null, provider, providerStatus: call.status || "queued", status }, message: `${provider} outbound call initiated.` });
  } catch (error) { logControllerError("OUTBOUND_CALL", error, req); return next(error); }
};

const updateProviderCall = async ({ id, rawStatus, recordingUrl }) => {
  if (!id) return;
  const call = await getCallBySid(id);
  const status = mapStatus(rawStatus);
  if (call && status) {
    const terminal = ["Completed", "Missed", "Busy", "Failed", "Cancelled"].includes(status);
    await updateCallLog(call._id, { callStatus: status, providerStatus: rawStatus || "", endedAt: terminal ? new Date() : undefined, recordingUrl: recordingUrl || undefined, metadata: { callbackReceivedAt: new Date().toISOString() } });
  }
  if (status) await syncCampaignItem({ providerCallId: id, providerStatus: rawStatus, status, recordingUrl });
};

export const connectLivekit = (req, res, next) => {
  try {
    const sipUri = parseString(env.livekitSipUri);
    if (!sipUri) return sendError(res, { status: 503, message: "LIVEKIT_SIP_URI is not configured." });
    const twiml = new twilio.twiml.VoiceResponse();
    const dial = twiml.dial({ answerOnBridge: true });
    dial.sip(sipUri);
    return res.type("text/xml").send(twiml.toString());
  } catch (error) { return next(error); }
};

export const twilioStatus = async (req, res, next) => {
  try { await updateProviderCall({ id: parseString(req.body?.CallSid), rawStatus: req.body?.CallStatus, recordingUrl: parseString(req.body?.RecordingUrl) }); return res.status(204).send(); }
  catch (error) { logControllerError("TWILIO_STATUS", error, req); return next(error); }
};
export const exotelStatus = async (req, res, next) => {
  try { const body = req.body || {}; await updateProviderCall({ id: parseString(body.CallSid || body.CallUUID || body.call_sid), rawStatus: body.CallStatus || body.Status || body.status, recordingUrl: parseString(body.RecordingUrl || body.recordingurl) }); return res.status(200).send("OK"); }
  catch (error) { logControllerError("EXOTEL_STATUS", error, req); return next(error); }
};
export const vobizStatus = async (req, res, next) => {
  try { const body = req.body || {}; await updateProviderCall({ id: parseString(body.call_uuid || body.request_uuid || body.sid || body.call_id), rawStatus: body.status || body.call_status, recordingUrl: parseString(body.recording_url) }); return res.status(200).json({ success: true }); }
  catch (error) { logControllerError("VOBIZ_STATUS", error, req); return next(error); }
};

export default { getOutboundConfig, makeOutboundCall, connectLivekit, twilioStatus, exotelStatus, vobizStatus };
