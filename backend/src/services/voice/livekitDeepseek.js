
import { LLM } from "@livekit/agents-plugin-openai";
import dotenv from "dotenv";

dotenv.config();

export const deepseekLLM = LLM.withDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com", // optional, this is likely already the default
  model: "deepseek-chat",
});



// import { LLM } from "@livekit/agents-plugin-openai";
// import dotenv from "dotenv";

// dotenv.config();

// export const deepseekLLM = new LLM({
//   apiKey: process.env.DEEPSEEK_API_KEY,
//   baseURL: "https://api.deepseek.com",
//   model: "deepseek-chat",
// });



// import * as openai from "@livekit/agents-plugin-openai";
// import dotenv from "dotenv";

// dotenv.config();

// export const deepseekLLM = new openai.LLM({
//   apiKey: process.env.DEEPSEEK_API_KEY,
//   baseURL: "https://api.deepseek.com",
//   model: "deepseek-chat",
// });


