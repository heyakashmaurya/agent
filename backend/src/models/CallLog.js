import mongoose from "mongoose";
import { baseSchemaOptions } from "./BaseModel.js";

const callLogSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: "OutboundCampaign", default: null, index: true },
  callSid: { type: String, default: "", unique: true, sparse: true, index: true },
  providerCallId: { type: String, default: "", index: true },
  provider: { type: String, enum: ["twilio", "exotel", "vobiz", "unknown"], default: "unknown", index: true },
  roomName: { type: String, default: "", trim: true },
  direction: { type: String, enum: ["Incoming", "Outgoing"], default: "Incoming", index: true },
  phoneNumber: { type: String, required: true, trim: true, index: true },
  contactName: { type: String, default: "", trim: true, maxlength: 120 },
  startedAt: { type: Date, default: Date.now, index: true },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0, min: 0 },
  callStatus: { type: String, enum: ["Ringing","Answered","Completed","Missed","Busy","Failed","Cancelled"], default: "Answered", index: true },
  providerStatus: { type: String, default: "" },
  aiOutcome: { type: String, enum: ["Booking Created","Booking Updated","Booking Cancelled","Availability Checked","Information Requested","Transferred to Human","No Action"], default: "No Action" },
  transcript: { type: String, default: "" },
  summary: { type: String, default: "", maxlength: 10000 },
  recordingUrl: { type: String, default: "" },
  recordingStatus: { type: String, default: "" },
  sentiment: { type: String, enum: ["Positive","Neutral","Negative"], default: "Neutral" },
  aiHandled: { type: Boolean, default: true },
  transferredToHuman: { type: Boolean, default: false },
  notes: { type: String, default: "", maxlength: 3000 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, baseSchemaOptions);

callLogSchema.index({ phoneNumber: 1, startedAt: -1 });
callLogSchema.index({ customer: 1, startedAt: -1 });
callLogSchema.index({ campaign: 1, startedAt: -1 });
callLogSchema.index({ booking: 1 });

export default mongoose.model("CallLog", callLogSchema);