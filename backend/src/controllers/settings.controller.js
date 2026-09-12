import AISetting from "../models/AISetting.js";
import env from "../config/env.js";
import { getAISetting, getResolvedLLMConfig, providerAvailability } from "../services/providers/llm.js";
import { providerConfigStatus } from "../services/providers/telephony.js";
import { parseBoolean, parseString, sendError, sendSuccess, logControllerError } from "./_controllerUtils.js";

const allowedLLMs = ["openai", "deepseek", "gemini"];
const allowedTelephony = ["twilio", "exotel", "vobiz"];
const allowedVoices = ["ElevenLabs", "Sarvam"];
const defaults = { openai: "gpt-4.1-mini", deepseek: "deepseek-chat", gemini: "gemini-3.8-flash" };
const safe = (doc) => { if (!doc) return null; const value = { ...doc }; delete value.__v; return value; };

export const getAISettings = async (req, res, next) => {
  try {
    let setting = await getAISetting();
    if (!setting) setting = await AISetting.create({ restaurantName: env.restaurantName });
    const active = await getResolvedLLMConfig().catch(() => ({ provider: setting.llmProvider, model: setting.llmModel }));
    return sendSuccess(res, { data: { settings: safe(setting), activeLLM: { provider: active.provider, model: active.model }, providerStatus: { llm: providerAvailability(), telephony: providerConfigStatus() } }, message: "AI settings retrieved successfully." });
  } catch (error) { logControllerError("SETTINGS_GET", error, req); return next(error); }
};

export const updateAISettings = async (req, res, next) => {
  try {
    let setting = await AISetting.findOne({ isDeleted: false }).sort({ updatedAt: -1 });
    if (!setting) setting = new AISetting({ restaurantName: env.restaurantName });
    const body = req.body || {};
    if (body.restaurantName !== undefined) { const value = parseString(body.restaurantName); if (!value) return sendError(res, { status: 400, message: "Restaurant name is required." }); setting.restaurantName = value; }
    ["restaurantPhone","restaurantEmail","timezone","assistantName","voiceId","systemPrompt","welcomeMessage","goodbyeMessage"].forEach((field) => { if (body[field] !== undefined) setting[field] = parseString(body[field]); });
    if (body.voiceProvider !== undefined) { const value = parseString(body.voiceProvider); if (!allowedVoices.includes(value)) return sendError(res, { status: 400, message: "Invalid voice provider." }); setting.voiceProvider = value; }
    if (body.telephonyProvider !== undefined) { const value = parseString(body.telephonyProvider).toLowerCase(); if (!allowedTelephony.includes(value)) return sendError(res, { status: 400, message: "Invalid telephony provider." }); setting.telephonyProvider = value; }
    if (body.llmProvider !== undefined) { const value = parseString(body.llmProvider).toLowerCase(); if (!allowedLLMs.includes(value)) return sendError(res, { status: 400, message: "Invalid LLM provider." }); setting.llmProvider = value; if (body.llmModel === undefined) setting.llmModel = defaults[value]; }
    if (body.llmModel !== undefined) { const value = parseString(body.llmModel); if (!value) return sendError(res, { status: 400, message: "LLM model is required." }); setting.llmModel = value; }
    if (body.llmTemperature !== undefined) { const value = Number(body.llmTemperature); if (!Number.isFinite(value) || value < 0 || value > 2) return sendError(res, { status: 400, message: "LLM temperature must be between 0 and 2." }); setting.llmTemperature = value; }
    ["aiEnabled","autoAssignTable","requireConfirmation","askOccasion","askSpecialRequests","allowCancellation","allowModification","recordCalls"].forEach((field) => { if (body[field] !== undefined) setting[field] = parseBoolean(body[field], setting[field]); });
    await setting.save();
    return sendSuccess(res, { data: { settings: safe(setting.toObject()), activeLLM: { provider: setting.llmProvider, model: setting.llmModel }, providerStatus: { llm: providerAvailability(), telephony: providerConfigStatus() } }, message: "AI routing settings saved." });
  } catch (error) { logControllerError("SETTINGS_UPDATE", error, req); return next(error); }
};

export default { getAISettings, updateAISettings };
