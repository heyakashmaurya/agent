import mongoose from "mongoose";
import { baseSchemaOptions } from "./BaseModel.js";

const itemSchema = new mongoose.Schema({
  rowNumber: { type: Number, required: true },
  name: { type: String, default: "", trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, index: true },
  email: { type: String, default: "", trim: true, lowercase: true },
  message: { type: String, default: "", maxlength: 2000 },
  status: { type: String, enum: ["pending", "queued", "ringing", "answered", "completed", "busy", "no_answer", "failed", "cancelled"], default: "pending", index: true },
  attempts: { type: Number, default: 0, min: 0 },
  providerCallId: { type: String, default: "", index: true },
  callLog: { type: mongoose.Schema.Types.ObjectId, ref: "CallLog", default: null },
  claimToken: { type: String, default: "", index: true },
  lastError: { type: String, default: "", maxlength: 1000 },
  lastAttemptAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { _id: true });

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  provider: { type: String, enum: ["twilio", "exotel", "vobiz"], required: true },
  messageTemplate: { type: String, default: "", maxlength: 2000 },
  concurrency: { type: Number, default: 2, min: 1, max: 10 },
  status: { type: String, enum: ["draft", "queued", "running", "paused", "completed", "failed", "cancelled"], default: "draft", index: true },
  total: { type: Number, default: 0 },
  queuedCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  items: { type: [itemSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  lastError: { type: String, default: "" },
  isDeleted: { type: Boolean, default: false, index: true },
}, baseSchemaOptions);

campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ "items.providerCallId": 1 });
export default mongoose.model("OutboundCampaign", campaignSchema);
