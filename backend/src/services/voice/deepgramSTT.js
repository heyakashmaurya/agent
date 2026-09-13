

import * as deepgram from "@livekit/agents-plugin-deepgram";
import dotenv from "dotenv";

dotenv.config();

export function createDeepgramSTT() {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    console.log("\n========== DEEPGRAM DEBUG ==========");
    console.log("API key loaded:", !!apiKey);
    console.log("API key length:", apiKey?.length || 0);
    console.log("Model: nova-3");
    console.log("Language: en");
    console.log("Smart format: true");

    if (!apiKey) {
        throw new Error("DEEPGRAM_API_KEY is missing");
    }

    const stt = new deepgram.STT({
        apiKey: apiKey,
        model: "nova-3",
        language: "en",
        smartFormat: true,
    });

    console.log("✅ Deepgram STT initialized");
    console.log("====================================\n");

    return stt;
}




// import * as deepgram from "@livekit/agents-plugin-deepgram";
// import dotenv from "dotenv";

// dotenv.config();
// export function createDeepgramSTT() {


//     return new deepgram.STT({
//         apiKey: process.env.DEEPGRAM_API_KEY,
//         model: "nova-3",
//         // language: "en",
//         language:"multi",
//         smartFormat: true,
//     });


// }