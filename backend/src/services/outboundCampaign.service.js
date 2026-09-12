import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import OutboundCampaign from "../models/OutboundCampaign.js";
import CallLog from "../models/CallLog.js";
import Customer from "../models/Customer.js";
import { getTelephonyProvider } from "./providers/telephony.js";
import env from "../config/env.js";

const providerNames = ["twilio", "exotel", "vobiz"];
const norm = (value) => String(value ?? "").trim();
const normalizeHeaders = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [norm(key).toLowerCase().replace(/\s+/g, "_"), value]));
const pick = (object, keys) => { for (const key of keys) if (object[key] !== undefined && norm(object[key])) return norm(object[key]); return ""; };
const normalizePhone = (value) => norm(value).replace(/[^+\d]/g, "");
const e164 = (value) => /^\+\d{8,15}$/.test(normalizePhone(value));

export const parseContactsFile = async (file) => {
  const extension = String(file?.originalname || "").toLowerCase().split(".").pop();
  let rows = [];
  if (extension === "csv") {
    rows = parse(file.buffer.toString("utf8"), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
  } else if (["xlsx", "xlsm"].includes(extension)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw Object.assign(new Error("The Excel file has no worksheet."), { statusCode: 400 });
    const rawHeaders = sheet.getRow(1).values;
    const headers = rawHeaders.map((v) => norm(v));
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      const object = {};
      headers.forEach((header, index) => { if (header) object[header] = row.getCell(index).value; });
      rows.push(object);
    });
  } else {
    throw Object.assign(new Error("Only CSV, XLSX and XLSM files are supported."), { statusCode: 400 });
  }

  const contacts = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = normalizeHeaders(rows[index]);
    const phone = normalizePhone(pick(row, ["phone", "phone_number", "mobile", "mobile_number", "number", "contact", "contact_number"]));
    if (!e164(phone)) continue;
    contacts.push({ rowNumber: index + 2, name: pick(row, ["name", "full_name", "customer_name", "contact_name"]), phone, email: pick(row, ["email", "email_address"]), message: pick(row, ["message", "notes", "context"]) });
  }
  return contacts;
};

const renderMessage = (template, item) => String(template || item.message || "").replace(/\{\s*name\s*\}/gi, item.name || "there").replace(/\{\s*phone\s*\}/gi, item.phone);

export const createCampaign = async ({ name, provider, messageTemplate, contacts, concurrency, createdBy }) => {
  if (!providerNames.includes(provider)) throw Object.assign(new Error("Unsupported telephony provider."), { statusCode: 400 });
  const campaign = await OutboundCampaign.create({ name, provider, messageTemplate: messageTemplate || "", concurrency: Math.min(10, Math.max(1, Number(concurrency) || env.outboundConcurrency)), total: contacts.length, queuedCount: contacts.length, items: contacts, createdBy, status: "draft" });
  return campaign;
};

export const listCampaigns = async ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const currentLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const query = { isDeleted: false };
  const [total, campaigns] = await Promise.all([
    OutboundCampaign.countDocuments(query),
    OutboundCampaign.find(query).sort({ createdAt: -1 }).skip((currentPage - 1) * currentLimit).limit(currentLimit).select("name provider status total queuedCount successCount failedCount concurrency createdAt startedAt completedAt lastError").lean(),
  ]);
  return { campaigns, total, page: currentPage, limit: currentLimit, totalPages: Math.ceil(total / currentLimit) };
};

const claimNextItem = async (campaignId) => {
  const token = crypto.randomUUID();
  const now = new Date();
  await OutboundCampaign.updateOne(
    { _id: campaignId, status: "running", "items.status": "pending" },
    { $set: { "items.$.status": "queued", "items.$.claimToken": token, "items.$.lastAttemptAt": now }, $inc: { "items.$.attempts": 1 } },
  );
  const campaign = await OutboundCampaign.findOne({ _id: campaignId, "items.claimToken": token });
  const item = campaign?.items?.find((entry) => entry.claimToken === token);
  return item ? { campaign, item } : null;
};

const terminalStatuses = ["completed", "busy", "no_answer", "failed", "cancelled"];
export const syncCampaignItem = async ({ providerCallId, providerStatus, status, recordingUrl }) => {
  if (!providerCallId) return null;
  const normalized = String(status || providerStatus || "").toLowerCase();
  const mapped = ({ queued: "ringing", initiated: "ringing", ringing: "ringing", in_progress: "answered", answered: "answered", completed: "completed", busy: "busy", failed: "failed", no_answer: "no_answer", canceled: "cancelled", cancelled: "cancelled" })[normalized];
  if (!mapped) return null;
  const campaign = await OutboundCampaign.findOne({ isDeleted: false, "items.providerCallId": providerCallId });
  if (!campaign) return null;
  const item = campaign.items.find((entry) => entry.providerCallId === providerCallId);
  if (!item || item.status === mapped) return campaign;
  const wasTerminal = terminalStatuses.includes(item.status);
  item.status = mapped;
  if (terminalStatuses.includes(mapped)) item.completedAt = new Date();
  if (mapped === "completed" && !wasTerminal) campaign.successCount += 1;
  if (["failed", "busy", "no_answer", "cancelled"].includes(mapped) && !wasTerminal) campaign.failedCount += 1;
  await campaign.save();
  if (recordingUrl) await CallLog.updateOne({ _id: item.callLog }, { $set: { recordingUrl } });
  return campaign;
};

let running = new Set();
export const startCampaign = async (id) => {
  const campaign = await OutboundCampaign.findOne({ _id: id, isDeleted: false });
  if (!campaign) throw Object.assign(new Error("Campaign not found."), { statusCode: 404 });
  if (["completed", "cancelled"].includes(campaign.status)) return campaign;
  if (running.has(String(id))) return campaign;
  campaign.status = "running";
  campaign.startedAt = campaign.startedAt || new Date();
  await campaign.save();
  running.add(String(id));
  runCampaign(String(id)).finally(() => running.delete(String(id)));
  return campaign;
};

export const cancelCampaign = async (id) => OutboundCampaign.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { status: "cancelled", lastError: "Cancelled by operator." } }, { new: true });

async function runCampaign(campaignId) {
  const worker = async () => {
    while (true) {
      const claimed = await claimNextItem(campaignId);
      if (!claimed) break;
      const { campaign, item } = claimed;
      try {
        const call = await (await getTelephonyProvider(campaign.provider))({ to: item.phone, message: renderMessage(campaign.messageTemplate, item) });
        const providerCallId = call.providerCallId || "";
        const log = await CallLog.create({
          campaign: campaign._id,
          provider: campaign.provider,
          providerCallId,
          callSid: providerCallId,
          direction: "Outgoing",
          phoneNumber: item.phone,
          contactName: item.name,
          callStatus: "Ringing",
          aiHandled: true,
          notes: renderMessage(campaign.messageTemplate, item),
          metadata: { campaignItemId: item._id, sourceRowNumber: item.rowNumber, providerResponse: call.raw || null },
        });
        item.status = "ringing";
        item.providerCallId = providerCallId;
        item.callLog = log._id;
        item.claimToken = "";
        campaign.queuedCount = Math.max(0, campaign.queuedCount - 1);
        await campaign.save();
      } catch (error) {
        item.status = "failed";
        item.lastError = error.message || "Call failed.";
        item.claimToken = "";
        campaign.queuedCount = Math.max(0, campaign.queuedCount - 1);
        campaign.failedCount += 1;
        await campaign.save();
      }
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, env.outboundDelayMs)));
    }
  };

  await Promise.all(Array.from({ length: Math.min(10, Math.max(1, Number((await OutboundCampaign.findById(campaignId).select("concurrency").lean())?.concurrency || env.outboundConcurrency))) }, () => worker()));
  const end = await OutboundCampaign.findById(campaignId);
  if (end && end.status !== "cancelled") {
    const pending = end.items.some((item) => ["pending", "queued"].includes(item.status));
    const active = end.items.some((item) => ["ringing", "answered"].includes(item.status));
    if (!pending && !active) { end.status = end.failedCount === end.total && end.total > 0 ? "failed" : "completed"; end.completedAt = new Date(); }
    else end.status = "running";
    await end.save();
  }
}

export const resumePendingCampaigns = async () => {
  const campaigns = await OutboundCampaign.find({ isDeleted: false, status: { $in: ["queued", "running"] } }).select("_id").lean();
  for (const campaign of campaigns) await startCampaign(campaign._id).catch((error) => console.error("[CAMPAIGN_RESUME]", error.message));
};
