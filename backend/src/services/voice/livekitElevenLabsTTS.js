import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import dotenv from "dotenv";

dotenv.config();

export function elevenlabsTTS() {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
        throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
    const model = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

    return new elevenlabs.TTS({
        apiKey,
        voiceId,
        model,
        language: process.env.ELEVENLABS_LANGUAGE || "en",
        // ElevenLabs documents autoMode as a latency optimization for streaming.
        autoMode: true,
        enableLogging: false,
    });
}
