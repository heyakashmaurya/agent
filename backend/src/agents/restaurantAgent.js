import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import {
    WorkerOptions,
    cli,
    defineAgent,
    voice,
} from "@livekit/agents";
import * as silero from "@livekit/agents-plugin-silero";

import connectDB from "../config/db.js";
import { createLivekitRestaurantTools } from "../tools/livekitTools.js";
import { createDeepgramSTT } from "../services/voice/deepgramSTT.js";
import { deepseekLLM } from "../services/voice/livekitDeepseek.js";
import { elevenlabsTTS } from "../services/voice/livekitElevenLabsTTS.js";
import getRestaurantAgentPrompt from "../prompts/restaurantAgentPrompt.js";
import { extractCallerPhone, maskPhone } from "../services/voice/callerIdentity.js";

dotenv.config();

const endpointingMinDelay = Number(process.env.VOICE_MIN_ENDPOINT_DELAY_MS || 150);
const endpointingMaxDelay = Number(process.env.VOICE_MAX_ENDPOINT_DELAY_MS || 750);
const interruptionMinDuration = Number(process.env.VOICE_INTERRUPTION_MIN_MS || 350);
const maxSpeechDuration = Number(process.env.VOICE_PREEMPTIVE_MAX_SPEECH_MS || 10000);

function installLatencyLogging(session, stt, llm, tts) {
    // Per-plugin metrics are the most useful signal when tuning a voice agent.
    // They do not block the call flow.
    stt?.on?.("metrics_collected", (m) => {
        if (m?.type === "stt_metrics") {
            console.log(`⚡ STT ttfb=${Math.round(m.durationMs ?? 0)}ms label=${m.label}`);
        }
    });

    llm?.on?.("metrics_collected", (m) => {
        if (m?.type === "llm_metrics") {
            console.log(
                `⚡ LLM ttft=${Math.round(m.ttftMs ?? 0)}ms duration=${Math.round(m.durationMs ?? 0)}ms tokens=${m.completionTokens ?? 0}`
            );
        }
    });

    tts?.on?.("metrics_collected", (m) => {
        if (m?.type === "tts_metrics") {
            console.log(
                `⚡ TTS ttfb=${Math.round(m.ttfbMs ?? 0)}ms duration=${Math.round(m.durationMs ?? 0)}ms chars=${m.charactersCount ?? 0}`
            );
        }
    });

    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
        const m = ev?.metrics;
        if (!m?.speechId) return;

        if (m.type === "eou_metrics") {
            console.log(
                `⚡ EOU delay=${Math.round(m.endOfUtteranceDelayMs ?? 0)}ms transcript=${Math.round(m.transcriptionDelayMs ?? 0)}ms`
            );
        }
    });
}

export default defineAgent({
    prewarm: async (proc) => {
        // Prewarm local VAD once per worker process so the first phone call
        // doesn't pay the model-load cost.
        proc.userData.vad = await silero.VAD.load({
            minSilenceDuration: Number(process.env.VOICE_VAD_MIN_SILENCE_MS || 280),
            minSpeechDuration: Number(process.env.VOICE_VAD_MIN_SPEECH_MS || 40),
            activationThreshold: Number(process.env.VOICE_VAD_ACTIVATION_THRESHOLD || 0.45),
            prefixPaddingDuration: Number(process.env.VOICE_VAD_PREFIX_PADDING_MS || 180),
        });

        console.log("✅ Silero VAD prewarmed");
    },

    entry: async (ctx) => {
        await connectDB();

        await ctx.connect();

        console.log("✅ Connected to room:", ctx.room.name);
        console.log("MongoDB readyState:", mongoose.connection.readyState);

        const participant = await ctx.waitForParticipant();
        const callerPhone = extractCallerPhone(participant);

        console.log("☎️ Caller phone available:", maskPhone(callerPhone));

        const stt = createDeepgramSTT();
        const tts = elevenlabsTTS();
        const tools = createLivekitRestaurantTools({ callerPhone });

        const agent = new voice.Agent({
            instructions: getRestaurantAgentPrompt({ callerPhone }),
            tools,
            minConsecutiveSpeechDelay: 0,
        });

        const useFlux = String(process.env.VOICE_STT_MODE || "flux").toLowerCase() === "flux";

        const session = new voice.AgentSession({
            stt,
            llm: deepseekLLM,
            tts,
            vad: procVad(ctx),
            turnHandling: {
                // Flux has its own semantic EOT detector. Nova uses LiveKit's
                // default audio turn detector.
                turnDetection: useFlux ? "stt" : undefined,
                endpointing: {
                    mode: "fixed",
                    minDelay: endpointingMinDelay,
                    maxDelay: endpointingMaxDelay,
                },
                interruption: {
                    mode: "adaptive",
                    minDuration: interruptionMinDuration,
                    minWords: 1,
                    falseInterruptionTimeout: 1200,
                    resumeFalseInterruption: true,
                },
                preemptiveGeneration: {
                    enabled: true,
                    preemptiveTts: true,
                    maxSpeechDuration,
                    maxRetries: 2,
                },
            },
        });

        installLatencyLogging(session, stt, deepseekLLM, tts);

        await session.start({
            agent,
            room: ctx.room,
        });

        // Do not add an artificial 1-second greeting delay.
        try {
            await session.say(
                "Welcome to our restaurant. How can I help you today?"
            );
        } catch (err) {
            console.error("Greeting failed:", err);
        }

        console.log("✅ Low-latency Agent Session Started", {
            stt: useFlux ? "deepgram-flux" : "deepgram-nova-3",
            endpointingMinDelay,
            endpointingMaxDelay,
            preemptiveTts: true,
        });

        ctx.room.on("participantDisconnected", async (disconnectedParticipant) => {
            console.log(`📞 ${disconnectedParticipant.identity} disconnected`);
            try {
                await session.close();
            } catch (err) {
                console.error("Session close failed:", err);
            }
        });
    },
});

function procVad(ctx) {
    return ctx.proc.userData.vad;
}

cli.runApp(
    new WorkerOptions({
        agent: fileURLToPath(import.meta.url),
        agentName: "restaurant-agent",
        wsURL: process.env.LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
    })
);
