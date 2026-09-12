import axios from "axios";
import twilio from "twilio";
import env from "../../config/env.js";
import AISetting from "../../models/AISetting.js";

const normalizePhone = (value) => String(value ?? "").trim().replace(/[^+\d]/g, "");
const requireE164 = (value, label = "Phone") => {
  const phone = normalizePhone(value);
  if (!/^\+\d{8,15}$/.test(phone)) throw Object.assign(new Error(`${label} must be in E.164 format, for example +919876543210.`), { statusCode: 400 });
  return phone;
};

export const providerNames = ["twilio", "exotel", "vobiz"];

const resolveProvider = async (requested) => {
  const explicit = String(requested || "").trim().toLowerCase();
  if (explicit) return explicit;
  const setting = await AISetting.findOne({ isDeleted: false }).sort({ updatedAt: -1 }).lean();
  return String(setting?.telephonyProvider || process.env.TELEPHONY_PROVIDER || "twilio").toLowerCase();
};

const twilioCall = async ({ to }) => {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioPhoneNumber) throw Object.assign(new Error("Twilio is not fully configured."), { statusCode: 503 });
  if (!env.baseUrl) throw Object.assign(new Error("BASE_URL is required for Twilio status callbacks."), { statusCode: 503 });
  const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  const call = await client.calls.create({
    to: requireE164(to),
    from: requireE164(env.twilioPhoneNumber, "Twilio caller ID"),
    url: `${env.baseUrl}/api/outbound/twilio/connect`,
    method: "POST",
    statusCallback: `${env.baseUrl}/api/outbound/twilio/status`,
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });
  return { provider: "twilio", providerCallId: call.sid, status: call.status || "queued", raw: call };
};

const exotelCall = async ({ to }) => {
  if (!env.exotelAccountSid || !env.exotelApiKey || !env.exotelApiToken || !env.exotelCallerId) throw Object.assign(new Error("Exotel is not fully configured."), { statusCode: 503 });
  const url = `${env.exotelBaseUrl.replace(/\/$/, "")}/v1/Accounts/${encodeURIComponent(env.exotelAccountSid)}/Calls/connect`;
  const params = new URLSearchParams();
  params.set("From", requireE164(to));
  params.set("CallerId", requireE164(env.exotelCallerId, "Exotel caller ID"));
  if (env.exotelStreamUrl) {
    params.set("StreamUrl", env.exotelStreamUrl);
    params.set("StreamType", "bidirectional");
  } else if (env.exotelAppUrl) {
    params.set("Url", env.exotelAppUrl);
  } else {
    throw Object.assign(new Error("Configure EXOTEL_STREAM_URL or EXOTEL_APP_URL."), { statusCode: 503 });
  }
  if (env.baseUrl) {
    params.set("StatusCallback", `${env.baseUrl}/api/outbound/exotel/status`);
    params.append("StatusCallbackEvents[]", "answered");
    params.append("StatusCallbackEvents[]", "terminal");
  }
  const response = await axios.post(url, params.toString(), {
    auth: { username: env.exotelApiKey, password: env.exotelApiToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });
  const call = response.data?.Call || response.data?.call || response.data?.call_details || response.data;
  return { provider: "exotel", providerCallId: call?.Sid || call?.sid || call?.CallSid || call?.call_sid || "", status: call?.Status || call?.status || "queued", raw: response.data };
};

const vobizCall = async ({ to }) => {
  if (!env.vobizAuthId || !env.vobizAuthToken || !env.vobizFrom) throw Object.assign(new Error("Vobiz is not fully configured."), { statusCode: 503 });
  if (!env.vobizAnswerUrl) throw Object.assign(new Error("VOBIZ_ANSWER_URL is required for Vobiz AI calls."), { statusCode: 503 });
  const endpoint = env.vobizCallUrl || `${env.vobizBaseUrl.replace(/\/$/, "")}/api/v1/Account/${encodeURIComponent(env.vobizAuthId)}/Call/`;
  const payload = {
    from: requireE164(env.vobizFrom, "Vobiz caller ID"),
    to: requireE164(to),
    answer_url: env.vobizAnswerUrl,
    answer_method: "POST",
    ...(env.vobizHangupUrl ? { hangup_url: env.vobizHangupUrl, hangup_method: "POST" } : {}),
  };
  const response = await axios.post(endpoint, payload, {
    headers: { "Content-Type": "application/json", "X-Auth-ID": env.vobizAuthId, "X-Auth-Token": env.vobizAuthToken },
    timeout: 20000,
  });
  const data = response.data || {};
  return { provider: "vobiz", providerCallId: data.request_uuid || data.call_uuid || data.call?.uuid || data.call?.sid || "", status: data.status || data.call?.status || "queued", raw: data };
};

export const getTelephonyProvider = async (name) => {
  const provider = await resolveProvider(name);
  if (provider === "twilio") return twilioCall;
  if (provider === "exotel") return exotelCall;
  if (provider === "vobiz") return vobizCall;
  throw Object.assign(new Error(`Unsupported telephony provider: ${provider}`), { statusCode: 400 });
};

export const providerConfigStatus = () => ({
  twilio: Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioPhoneNumber && env.baseUrl),
  exotel: Boolean(env.exotelAccountSid && env.exotelApiKey && env.exotelApiToken && env.exotelCallerId && (env.exotelStreamUrl || env.exotelAppUrl)),
  vobiz: Boolean(env.vobizAuthId && env.vobizAuthToken && env.vobizFrom && env.vobizAnswerUrl),
});
