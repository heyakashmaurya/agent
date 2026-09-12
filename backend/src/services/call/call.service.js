import mongoose from "mongoose";
import CallLog from "../../models/CallLog.js";

export const CALL_STATUSES = ["Ringing", "Answered", "Completed", "Missed", "Busy", "Failed", "Cancelled"];
export const CALL_DIRECTIONS = ["Incoming", "Outgoing"];
export const AI_OUTCOMES = ["Booking Created", "Booking Updated", "Booking Cancelled", "Availability Checked", "Information Requested", "Transferred to Human", "No Action"];
export const SENTIMENTS = ["Positive", "Neutral", "Negative"];
const objectId = (value, label) => { if (value == null || value === "") return null; if (!mongoose.Types.ObjectId.isValid(value)) throw new Error(`Invalid ${label}.`); return value; };
const populate = (query) => query.populate({ path: "customer", select: "fullName phone email preferredLanguage isBlocked" }).populate({ path: "booking", populate: { path: "table", select: "tableNumber capacity location floor status" } }).populate({ path: "campaign", select: "name provider status" });

export const createCallLog = async ({ customer = null, booking = null, campaign = null, provider = "unknown", providerCallId = "", callSid = "", roomName = "", direction = "Incoming", phoneNumber, contactName = "", startedAt = new Date(), endedAt = null, duration = 0, callStatus = "Answered", providerStatus = "", aiOutcome = "No Action", transcript = "", summary = "", recordingUrl = "", recordingStatus = "", sentiment = "Neutral", aiHandled = true, transferredToHuman = false, notes = "", metadata = {} } = {}) => {
  const phone = String(phoneNumber || "").trim();
  if (!phone) throw new Error("Phone number is required.");
  if (!CALL_DIRECTIONS.includes(direction)) throw new Error("Invalid call direction.");
  if (!CALL_STATUSES.includes(callStatus)) throw new Error("Invalid call status.");
  if (!AI_OUTCOMES.includes(aiOutcome)) throw new Error("Invalid AI outcome.");
  if (!SENTIMENTS.includes(sentiment)) throw new Error("Invalid sentiment.");
  const log = await CallLog.create({ customer: objectId(customer, "customer ID"), booking: objectId(booking, "booking ID"), campaign: objectId(campaign, "campaign ID"), provider, providerCallId: String(providerCallId || "").trim(), callSid: String(callSid || providerCallId || "").trim(), roomName: String(roomName || "").trim(), direction, phoneNumber: phone, contactName: String(contactName || "").trim(), startedAt, endedAt, duration: Number(duration) || 0, callStatus, providerStatus: String(providerStatus || ""), aiOutcome, transcript: String(transcript || ""), summary: String(summary || ""), recordingUrl: String(recordingUrl || ""), recordingStatus: String(recordingStatus || ""), sentiment, aiHandled: Boolean(aiHandled), transferredToHuman: Boolean(transferredToHuman), notes: String(notes || ""), metadata });
  return populate(CallLog.findById(log._id));
};

export const getCallById = async (callId) => { if (!mongoose.Types.ObjectId.isValid(callId)) throw new Error("Invalid call ID."); const call = await populate(CallLog.findById(callId)); if (!call) throw new Error("Call log not found."); return call; };
export const getCallBySid = async (callSid) => { if (!callSid) return null; return populate(CallLog.findOne({ $or: [{ callSid: String(callSid).trim() }, { providerCallId: String(callSid).trim() }] })); };
export const getCallByRoomName = async (roomName) => roomName ? populate(CallLog.findOne({ roomName: String(roomName).trim() }).sort({ startedAt: -1 })) : null;

export const listCallLogs = async ({ callStatus, direction, phoneNumber, customer, booking, campaign, provider, aiOutcome, sentiment, aiHandled, transferredToHuman, from, to, search, page = 1, limit = 50 } = {}) => {
  const query = {};
  if (callStatus) query.callStatus = callStatus;
  if (direction) query.direction = direction;
  if (provider) query.provider = provider;
  if (phoneNumber) query.phoneNumber = { $regex: String(phoneNumber).trim(), $options: "i" };
  if (search) query.$or = [{ phoneNumber: { $regex: String(search).trim(), $options: "i" } }, { contactName: { $regex: String(search).trim(), $options: "i" } }, { summary: { $regex: String(search).trim(), $options: "i" } }];
  if (customer) query.customer = objectId(customer, "customer ID");
  if (booking) query.booking = objectId(booking, "booking ID");
  if (campaign) query.campaign = objectId(campaign, "campaign ID");
  if (aiOutcome) query.aiOutcome = aiOutcome;
  if (sentiment) query.sentiment = sentiment;
  if (aiHandled !== undefined && aiHandled !== null) query.aiHandled = Boolean(aiHandled);
  if (transferredToHuman !== undefined && transferredToHuman !== null) query.transferredToHuman = Boolean(transferredToHuman);
  if (from || to) { query.startedAt = {}; if (from) { const date = new Date(from); if (Number.isNaN(date.getTime())) throw new Error("Invalid start date."); date.setHours(0,0,0,0); query.startedAt.$gte = date; } if (to) { const date = new Date(to); if (Number.isNaN(date.getTime())) throw new Error("Invalid end date."); date.setHours(23,59,59,999); query.startedAt.$lte = date; } }
  const currentPage = Math.max(1, Number(page) || 1), currentLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const [total, calls] = await Promise.all([CallLog.countDocuments(query), populate(CallLog.find(query).sort({ startedAt: -1, createdAt: -1 }).skip((currentPage - 1) * currentLimit).limit(currentLimit))]);
  return { calls, total, page: currentPage, limit: currentLimit, totalPages: Math.ceil(total / currentLimit) };
};

export const updateCallLog = async (callId, updateData = {}) => {
  if (!mongoose.Types.ObjectId.isValid(callId)) throw new Error("Invalid call ID.");
  const allowed = ["customer","booking","campaign","provider","providerCallId","contactName","providerStatus","recordingStatus","metadata","roomName","direction","phoneNumber","startedAt","endedAt","duration","callStatus","aiOutcome","transcript","summary","recordingUrl","sentiment","aiHandled","transferredToHuman","notes"];
  const payload = Object.fromEntries(Object.entries(updateData).filter(([key, value]) => allowed.includes(key) && value !== undefined));
  if (payload.customer !== undefined) payload.customer = objectId(payload.customer, "customer ID");
  if (payload.booking !== undefined) payload.booking = objectId(payload.booking, "booking ID");
  if (payload.campaign !== undefined) payload.campaign = objectId(payload.campaign, "campaign ID");
  if (payload.callStatus && !CALL_STATUSES.includes(payload.callStatus)) throw new Error("Invalid call status.");
  if (payload.direction && !CALL_DIRECTIONS.includes(payload.direction)) throw new Error("Invalid call direction.");
  if (payload.aiOutcome && !AI_OUTCOMES.includes(payload.aiOutcome)) throw new Error("Invalid AI outcome.");
  if (payload.sentiment && !SENTIMENTS.includes(payload.sentiment)) throw new Error("Invalid sentiment.");
  const call = await CallLog.findByIdAndUpdate(callId, { $set: payload }, { new: true, runValidators: true });
  if (!call) throw new Error("Call log not found.");
  return populate(CallLog.findById(call._id));
};

export const completeCall = async (callId, fields = {}) => {
  const endedAt = fields.endedAt || new Date();
  const current = await getCallById(callId);
  const duration = fields.duration != null ? Number(fields.duration) : Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(current.startedAt).getTime()) / 1000));
  return updateCallLog(callId, { ...fields, endedAt, duration, callStatus: "Completed" });
};
