import { LLM } from "@livekit/agents-plugin-openai";
import OpenAI from "openai/index.js";
import env from "../../config/env.js";
import AISetting from "../../models/AISetting.js";

const PROVIDERS = {
  openai: { model: "gpt-4.1-mini", baseURL: env.openaiBaseUrl, key: env.openaiApiKey },
  deepseek: { model: "deepseek-v4-flash", baseURL: env.deepseekBaseUrl, key: env.deepseekApiKey },
  gemini: { model: "gemini-3.8-flash", baseURL: env.geminiBaseUrl, key: env.geminiApiKey },
};

export const getAISetting = async () =>
  AISetting.findOne({ isDeleted: false }).sort({ updatedAt: -1 }).lean();

const providerOrDefault = (name) => {
  const provider = String(name || "deepseek").trim().toLowerCase();
  if (!PROVIDERS[provider]) throw Object.assign(new Error(`Unsupported LLM provider: ${provider}`), { statusCode: 400 });
  return provider;
};

export const providerAvailability = () => ({
  openai: Boolean(env.openaiApiKey),
  deepseek: Boolean(env.deepseekApiKey),
  gemini: Boolean(env.geminiApiKey),
});

export const getResolvedLLMConfig = async () => {
  const setting = await getAISetting();
  const provider = providerOrDefault(setting?.llmProvider || process.env.LLM_PROVIDER);
  const defaults = PROVIDERS[provider];
  const model = String(setting?.llmModel || process.env.LLM_MODEL || defaults.model).trim() || defaults.model;
  const temperature = Number(setting?.llmTemperature ?? 0);
  return {
    provider,
    model,
    baseURL: defaults.baseURL,
    apiKey: defaults.key,
    temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : 0,
  };
};

export const createConfiguredLiveKitLLM = async () => {
  const config = await getResolvedLLMConfig();
  if (!config.apiKey) throw Object.assign(new Error(`${config.provider.toUpperCase()} API key is not configured on the backend.`), { statusCode: 503 });
  return new LLM({ model: config.model, apiKey: config.apiKey, baseURL: config.baseURL, temperature: config.temperature });
};

export const createConfiguredTextClient = async () => {
  const config = await getResolvedLLMConfig();
  if (!config.apiKey) throw Object.assign(new Error(`${config.provider.toUpperCase()} API key is not configured on the backend.`), { statusCode: 503 });
  return { config, client: new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }) };
};
