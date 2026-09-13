
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import dotenv from "dotenv";

dotenv.config();

export function elevenlabsTTS() {
    console.log("\n========== ELEVENLABS DEBUG ==========");

    // Check whether API key exists
    const apiKey = process.env.ELEVENLABS_API_KEY;

    console.log("API key loaded:", !!apiKey);

    if (!apiKey) {
        console.error(
            "❌ ELEVEN_API_KEY is missing. Check your .env file."
        );
        throw new Error("ELEVEN_API_KEY is not configured");
    }

    // NEVER print the complete API key
    console.log(
        "API key preview:",
        `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
    );

    const voiceId = "EXAVITQu4vr4xnSDxMaL";
    const model = "eleven_flash_v2_5";

    console.log("Voice ID:", voiceId);
    console.log("Model:", model);
    console.log("Language: en");

    try {
        const tts = new elevenlabs.TTS({
            apiKey,
            voice: {
                id: voiceId,
            },
            model,
            language: "en",
        });

        console.log("✅ ElevenLabs TTS initialized successfully");
        console.log("====================================\n");

        return tts;
    } catch (error) {
        console.error("❌ Failed to initialize ElevenLabs TTS");

        console.error("Error:", error?.message || error);
        console.error("Stack:", error?.stack || "No stack available");

        throw error;
    }
}

// import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
// import dotenv from "dotenv";

// dotenv.config();

// export function elevenlabsTTS() {
//     return new elevenlabs.TTS({
//         apiKey: process.env.ELEVENLABS_API_KEY,

//         voice: {
//             // id: "EXAVITQu4vr4xnSDxMaL",
//             id: "JBFqnCBsd6RMkjVDRZzb",
//         },

//         // model: "eleven_flash_v2_5", 
//         modelId: 'eleven_multilingual_v2',


//         language: "en",
//     });
// }