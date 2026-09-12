import * as deepgram from "@livekit/agents-plugin-deepgram";
import dotenv from "dotenv";

dotenv.config();

/**
 * Deepgram STT optimized for interactive phone conversations.
 *
 * VOICE_STT_MODE=flux (recommended for lowest turn latency, English)
 * VOICE_STT_MODE=nova (broader language/model compatibility)
 */
export function createDeepgramSTT() {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
        throw new Error("DEEPGRAM_API_KEY is missing");
    }

    const mode = String(process.env.VOICE_STT_MODE || "flux").toLowerCase();

    if (mode === "flux" && typeof deepgram.STTv2 === "function") {
        const stt = new deepgram.STTv2({
            model: process.env.DEEPGRAM_FLUX_MODEL || "flux-general-en",
            eagerEotThreshold: Number(process.env.DEEPGRAM_EAGER_EOT_THRESHOLD || 0.4),
            eotThreshold: Number(process.env.DEEPGRAM_EOT_THRESHOLD || 0.65),
            eotTimeoutMs: Number(process.env.DEEPGRAM_EOT_TIMEOUT_MS || 900),
            keyterm: [
                "reservation",
                "booking",
                "confirmation code",
                "restaurant",
                "table",
            ],
        });

        console.log("🎙️ Deepgram STT: Flux / eager EOT");
        return stt;
    }

    // Nova-3 fallback. Keep interim results on because disabling them can increase latency.
    const stt = new deepgram.STT({
        apiKey,
        model: process.env.DEEPGRAM_NOVA_MODEL || "nova-3",
        language: process.env.DEEPGRAM_LANGUAGE || "en-IN",
        modelOptions: {
            endpointing: Number(process.env.DEEPGRAM_ENDPOINTING_MS || 25),
            interim_results: true,
            filler_words: true,
            smart_format: false,
            punctuate: false,
            numerals: true,
            keyterm: [
                "reservation",
                "booking",
                "confirmation code",
                "restaurant",
                "table",
            ],
        },
    });

    console.log("🎙️ Deepgram STT: Nova-3");
    return stt;
}
