import { LLM } from "@livekit/agents-plugin-openai";
import OpenAI from "openai";

export class FastDeepSeekLLM extends LLM {
    constructor({
        apiKey,
        baseURL = "https://api.deepseek.com",
        model = "deepseek-v4-flash",
        temperature = 0.1,
        maxCompletionTokens = 96,
    }) {
        const client = new OpenAI({
            apiKey,
            baseURL,
        });

        super({
            client,
            model,
            temperature,
            maxCompletionTokens,
            strictToolSchema: true,
            parallelToolCalls: false,
        });
    }

    chat(params) {
        return super.chat({
            ...params,
            extraKwargs: {
                ...(params?.extraKwargs || {}),
                // thinking: {
                //     type: "disabled",
                // },
            },
        });
    }
}