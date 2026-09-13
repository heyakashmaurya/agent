
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import {
    WorkerOptions,
    cli,
    defineAgent,
    voice,
} from "@livekit/agents";

import connectDB from "../config/db.js";
import { createLivekitRestaurantTools } from "../tools/livekitTools.js";

import { createDeepgramSTT } from "../services/voice/deepgramSTT.js";
import { deepseekLLM } from "../services/voice/livekitDeepseek.js";
import { elevenlabsTTS } from "../services/voice/livekitElevenLabsTTS.js";

import getRestaurantAgentPrompt from "../prompts/restaurantAgentPrompt.js";
import { extractCallerPhone, maskPhone } from "../services/voice/callerIdentity.js";

dotenv.config();

console.log(
    "Deepgram Key Loaded:",
    !!process.env.DEEPGRAM_API_KEY
);

export default defineAgent({
    entry: async (ctx) => {
        await connectDB();

        console.log("✅ MongoDB connected");
        console.log(
            "MongoDB readyState:",
            mongoose.connection.readyState
        );

        await ctx.connect();

        console.log(
            "✅ Connected to room:",
            ctx.room.name
        );

        // LiveKit exposes the telephony caller/destination phone number on
        // SIP participant attributes as sip.phoneNumber. This keeps phone
        // collection outside the LLM and scoped to the active call.
        const participant = await ctx.waitForParticipant();
        const callerPhone = extractCallerPhone(participant);
        const callerPhoneMasked = maskPhone(callerPhone);

        console.log(
            "☎️ Caller phone available:",
            callerPhoneMasked
        );

        const stt = createDeepgramSTT();
        const tts = elevenlabsTTS();
        const tools = createLivekitRestaurantTools({ callerPhone });

        const agent = new voice.Agent({
            instructions: getRestaurantAgentPrompt({ callerPhone }),
            tools,
        });

        console.log("🤖 Restaurant voice agent initialized");

        const session = new voice.AgentSession({
            stt,
            llm: deepseekLLM,
            tts,
        });

        await session.start({
            agent,
            room: ctx.room,
        });

        console.log("✅ Agent Session Started");

        setTimeout(async () => {
            try {
                await session.say(
                    "Welcome to our restaurant. How can I help you today?"
                );
            } catch (err) {
                console.error("Greeting failed:", err);
            }
        }, 1000);

        ctx.room.on(
            "participantDisconnected",
            async (participant) => {
                console.log(
                    `📞 ${participant.identity} disconnected`
                );

                try {
                    await session.close();
                } catch (err) {
                    console.error(err);
                }
            }
        );
    },
});

cli.runApp(
    new WorkerOptions({
        agent: fileURLToPath(import.meta.url),
        agentName: "restaurant-agent",
        wsURL: process.env.LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
    })
);




// import mongoose from "mongoose";
// import { fileURLToPath } from "node:url";
// import dotenv from "dotenv";

// import {
//     WorkerOptions,
//     cli,
//     defineAgent,
//     voice,
// } from "@livekit/agents";

// import connectDB from "../config/db.js";
// import { createLivekitRestaurantTools } from "../tools/livekitTools.js";

// import { createDeepgramSTT } from "../services/voice/deepgramSTT.js";
// import { deepseekLLM } from "../services/voice/livekitDeepseek.js";
// import { elevenlabsTTS } from "../services/voice/livekitElevenLabsTTS.js";

// import getRestaurantAgentPrompt from "../prompts/restaurantAgentPrompt.js";

// dotenv.config();

// console.log(
//     "Deepgram Key Loaded:",
//     !!process.env.DEEPGRAM_API_KEY
// );

// export default defineAgent({
//     entry: async (ctx) => {
//         await connectDB();

//         console.log("✅ MongoDB connected");
//         console.log(
//             "MongoDB readyState:",
//             mongoose.connection.readyState
//         );

//         await ctx.connect();

//         console.log(
//             "✅ Connected to room:",
//             ctx.room.name
//         );

//         const stt = createDeepgramSTT();
//         const tts = elevenlabsTTS(); 

//         const agent = new voice.Agent({
//             instructions: getRestaurantAgentPrompt,
//             tools: livekitRestaurantTools,
//         });

//         console.log("========== LLM DEBUG ==========");
//         console.log(
//             "DeepSeek key exists:",
//             !!process.env.DEEPSEEK_API_KEY
//         );
//         console.log(
//             "DeepSeek key prefix:",
//             process.env.DEEPSEEK_API_KEY?.slice(0, 8)
//         );
//         console.log(
//             "DeepSeek LLM exists:",
//             !!deepseekLLM
//         );
//         console.log("================================");
//         console.log("================================");

//         const session = new voice.AgentSession({
//             stt,
//             llm: deepseekLLM,
//             tts,
//         });

//         await session.start({
//             agent,
//             room: ctx.room,
//         });

//         console.log("✅ Agent Session Started");

//         setTimeout(async () => {
//             try {
//                 await session.say(
//                     "Welcome to our restaurant. How can I help you today?"
//                 );
//             } catch (err) {
//                 console.error(
//                     "Greeting failed:",
//                     err
//                 );
//             }
//         }, 1000);

//         ctx.room.on(
//             "participantDisconnected",
//             async (participant) => {
//                 console.log(
//                     `📞 ${participant.identity} disconnected`
//                 );

//                 try {
//                     await session.close();
//                 } catch (err) {
//                     console.error(err);
//                 }
//             }
//         );

//         await new Promise(() => { });
//     },
// });

// cli.runApp(
//     new WorkerOptions({
//         agent: fileURLToPath(import.meta.url),
//         agentName: "restaurant-agent",
//         wsURL: process.env.LIVEKIT_URL,
//         apiKey: process.env.LIVEKIT_API_KEY,
//         apiSecret: process.env.LIVEKIT_API_SECRET,
//     })
// );




// import mongoose from "mongoose";
// import connectDB from "../config/db.js";

// import {
//     WorkerOptions,
//     cli,
//     defineAgent,
//     voice,
// } from "@livekit/agents";

// import { llm } from "@livekit/agents";

// import { createLivekitRestaurantTools } from "../tools/livekitTools.js";
// // import restaurantTools from "../tools/index.js";

// import { fileURLToPath } from "node:url";
// import dotenv from "dotenv";

// dotenv.config();

// import { createDeepgramSTT } from "../services/voice/deepgramSTT.js";
// // import { LiveKitSarvamTTS } from "../services/livekitSarvamTTS.js";

// import { deepseekLLM } from "../services/voice/livekitDeepseek.js";
// import { elevenlabsTTS } from "../services/voice/livekitElevenLabsTTS.js";
// // import { inference } from "@livekit/agents";

// // const vad = new inference.VAD({
// //     model: "silero",
// //     minSpeechDuration: 0.05,
// //     minSilenceDuration: 0.3,
// // });

// console.log(
//     "Deepgram Key Loaded:",
//     !!process.env.DEEPGRAM_API_KEY
// );

// export default defineAgent({

//     entry: async (ctx) => {

//         await connectDB();

//     console.log("✅ MongoDB connected for agent");
//     console.log("MongoDB readyState:", mongoose.connection.readyState);
// console.log("MongoDB host:", mongoose.connection.host);

//         console.log("🚀 Agent job started");

//         /*
//             Connect Agent to the room
//         */
//         await ctx.connect();

//         console.log(
//             "✅ Connected to room:",
//             ctx.room.name
//         );

//         /*
//             STT, TTS and LLM Setup
//         */
//         const stt = createDeepgramSTT();
//         // const tts = new LiveKitSarvamTTS();
//         const tts = elevenlabsTTS();

//         console.log("✅ STT & TTS Pipeline initialized");

//         /*
//             Agent Brain Instructions
//         */

//             const agent = new voice.Agent({
//   instructions: `
// Restaurant receptionist. Start with: "Welcome to our restaurant. How can I help you today?"

// Collect name, guests, date, and time. Ask one question at a time. Keep replies short and natural.

// Use the provided booking tools for availability, create, retrieve, list, update, and cancel operations. Never claim success unless the tool succeeds. Report tool errors honestly.
// `,
//   tools: livekitRestaurantTools,
// });

// //             const agent = new voice.Agent({
// //     instructions: `
// // You are an AI restaurant receptionist.

// // Your job is to help customers with restaurant bookings.

// // Rules:

// // 1. Start every conversation with:
// //    "Welcome to our restaurant. How can I help you today?"

// // 2. Collect:
// //    - Customer name
// //    - Number of guests
// //    - Date
// //    - Time

// // 3. Ask only one question at a time.

// // 4. Keep replies short and natural.

// // 5. Confirm booking details before final confirmation.

// // 6. Use the available booking tools whenever you need to:
// //    - check table availability
// //    - create a booking
// //    - retrieve a booking
// //    - list bookings
// //    - update a booking
// //    - cancel a booking

// // 7. Never claim that a booking was created, updated, retrieved, or cancelled unless the corresponding tool succeeds.

// // 8. When a tool returns an error, explain the problem naturally to the customer and do not pretend the operation succeeded.

// // Example:

// // Customer:
// // I want a table tomorrow at 7 PM.

// // Assistant:
// // Sure. How many guests will be joining you?
// //     `,

// //     tools: livekitRestaurantTools,
// // });
// //         const agent = new voice.Agent({
// //             instructions: `
// // You are an AI restaurant receptionist.
// // Your job is to book restaurant tables.

// // Rules:
// // 1. Start every conversation with: "Welcome to our restaurant. How can I help you today?"
// // 2. Collect:
// // - Customer name
// // - Number of guests
// // - Date
// // - Time
// // 3. Ask only one question at a time.
// // 4. Keep replies short and natural.
// // 5. Confirm booking details before final confirmation.

// // Example:
// // Customer: I want a table tomorrow at 7 PM.
// // Assistant: Sure. How many guests will be joining you?
// //             `
// //         });

//         /*
//             Voice Pipeline Session Configuration
//         */
//         const session = new voice.AgentSession({
//             stt,
//             llm: deepseekLLM,
//             tts,
//             // vad
//         });

//         console.log("Starting Agent Session...");

//         // Wait for any human participant to match up against or get the first connected user
//         const participant = ctx.room.remoteParticipants.values().next().value;

//         await session.start({
//             agent,
//             room: ctx.room,
//             // participant: participant // Tells the session who to listen to and speak with!
//         });

//         ctx.room.on("participantDisconnected", async (participant) => {
//     console.log(`📞 ${participant.identity} disconnected`);

//     try {
//         await session.close();
//     } catch (err) {
//         console.error(err);
//     }
// });

//         console.log("✅ Agent Session Started");

//         /*
//             🔥 TRIGGER GREETING MANDATORY FIX:
//             Since the agent is connected, force it to speak the welcome message immediately!
//         */
//         setTimeout(async () => {
//             try {
//                 console.log("🗣️ Triggering initial agent welcome greeting...");
//                 await session.say("Welcome to our restaurant. How can I help you today?");
//             } catch (err) {
//                 console.error("❌ Failed to say greeting phrase:", err);
//             }
//         }, 1500);

//         /*
//             Debug local tracks to ensure publishing is active
//         */
//         setTimeout(() => {
//             console.log("Published tracks count:", ctx.room.localParticipant.trackPublications.size);
//             for (const [sid, publication] of ctx.room.localParticipant.trackPublications) {
//                 console.log({
//                     sid,
//                     kind: publication.kind,
//                     name: publication.name,
//                     subscribed: publication.isSubscribed
//                 });
//             }
//         }, 3000);

//         /*
//             Keep worker alive
//         */
//         await new Promise(() => {});
//     },

// });

// cli.runApp(
//     new WorkerOptions({
//         agent: fileURLToPath(import.meta.url),
//         agentName: "restaurant-agent",
//         wsURL: process.env.LIVEKIT_URL,
//         apiKey: process.env.LIVEKIT_API_KEY,
//         apiSecret: process.env.LIVEKIT_API_SECRET,
//     })
// );

