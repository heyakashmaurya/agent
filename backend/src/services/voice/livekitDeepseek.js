import dotenv from "dotenv";
import { FastDeepSeekLLM } from "./fastDeepseekLLM.js";

dotenv.config();

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
    console.warn("⚠️ DEEPSEEK_API_KEY is not configured.");
}

const model =
    process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

const baseURL =
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const temperature = Number(
    process.env.DEEPSEEK_TEMPERATURE || 0.1
);

const maxCompletionTokens = Number(
    process.env.DEEPSEEK_MAX_COMPLETION_TOKENS || 96
);

export const deepseekLLM = new FastDeepSeekLLM({
    apiKey,
    baseURL,
    model,
    temperature,
    maxCompletionTokens,
});

/*
 * Pre-establish DNS/TLS so the first real inference doesn't
 * pay the initial connection cost.
 */
// deepseekLLM.prewarm();

console.log("🧠 Fast DeepSeek voice LLM ready", {
    model,
    temperature,
    maxCompletionTokens,
    thinking: "disabled",
});

// import { LLM } from "@livekit/agents-plugin-openai";
// import dotenv from "dotenv";

// dotenv.config();

// const apiKey = process.env.DEEPSEEK_API_KEY;

// if (!apiKey) {
//     console.warn("⚠️ DEEPSEEK_API_KEY is not configured.");
// }

// /**
//  * Voice-oriented DeepSeek configuration.
//  * V4-Flash is the current fast model; keep temperature low for deterministic
//  * tool calls and short spoken responses.
//  */
// export const deepseekLLM = LLM.withDeepSeek({
//     apiKey,
//     baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
//     model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
//     temperature: Number(process.env.DEEPSEEK_TEMPERATURE || 0.2),
// });


