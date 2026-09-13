

import { tts } from "@livekit/agents";

const { TTS, ChunkedStream } = tts;

import { AudioFrame } from "@livekit/rtc-node";
import fetch from "node-fetch";
import wavefile from "wavefile";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

dotenv.config();

const { WaveFile } = wavefile;

export class LiveKitSarvamTTS extends TTS {
    label = "sarvam";

    constructor() {
        super(
            16000,
            1,
            {
                // Sarvam's /text-to-speech endpoint is a single REST call that
                // returns the full clip — it is NOT a streaming API, so this
                // must be false. Declaring "streaming: true" here while
                // extending ChunkedStream is what caused the broken pipeline.
                streaming: false,
                alignedTranscript: false
            }
        );
    }

    // Non-streaming path: called with the full text up front.
    synthesize(text, connOptions, abortSignal) {
        return new SarvamChunkedStream(text, this, connOptions, abortSignal);
    }

    // Not used since capabilities.streaming = false, but must exist.
    stream() {
        throw new Error("LiveKitSarvamTTS does not support streaming synthesis");
    }
}

class SarvamChunkedStream extends ChunkedStream {
    label = "sarvam-stream";

    async run() {
        const requestId = randomUUID();

        try {
            // ChunkedStream already stores the full text for us —
            // no need (and no way) to accumulate it via streaming callbacks.
            const textToSynthesize = this.inputText.trim();
            if (!textToSynthesize) {
                return;
            }

            const response = await fetch("https://api.sarvam.ai/text-to-speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-subscription-key": process.env.SARVAM_API_KEY
                },
                body: JSON.stringify({
                    text: textToSynthesize,
                    target_language_code: "en-IN",
                    speaker: "ritu",
                    model: "bulbul:v3",
                    speech_sample_rate: 16000
                    // NOTE: no "audio_format" field here — Sarvam's REST
                    // /text-to-speech endpoint returns base64-encoded WAV
                    // files in `audios`, not headerless raw PCM. Treating
                    // that buffer as raw PCM (like before) corrupts every
                    // frame with the WAV header and misreads the sample
                    // data, which is exactly what produced silence/garbled
                    // audio.
                }),
                // Actually cancel the network call if the user interrupts
                // the agent instead of letting it finish in the background.
                signal: this.abortSignal
            });

            if (this.abortSignal.aborted) return;

            if (!response.ok) {
                console.error("❌ Sarvam API error:", response.status, await response.text());
                return;
            }

            const data = await response.json();
            if (!data.audios || !data.audios[0]) {
                console.error("❌ Sarvam returned no audio.");
                return;
            }

            // Decode base64 -> real WAV bytes, then parse the WAV container
            // properly (strip header, read actual sample rate/bit depth)
            // instead of assuming the buffer is raw 16-bit PCM.
            const audioBuffer = Buffer.from(data.audios[0], "base64");
            const wav = new WaveFile(audioBuffer);

            // --- TEMP DEBUG: confirm what Sarvam actually sent us BEFORE
            // we touch it. Remove once sound is confirmed working. ---
            console.log("🔍 Sarvam raw WAV info:", {
                base64Length: data.audios[0].length,
                bufferBytes: audioBuffer.length,
                detectedSampleRate: wav.fmt.sampleRate,
                detectedBitDepth: wav.bitDepth,
                detectedChannels: wav.fmt.numChannels
            });
            // Also dump the untouched WAV straight to disk so you can play
            // it directly (e.g. `start sarvam-debug.wav` / double-click it)
            // to confirm whether Sarvam itself returned real audio.
            fs.writeFileSync("./sarvam-debug.wav", audioBuffer);
            // --- END TEMP DEBUG ---

            wav.toBitDepth("16");
            wav.toSampleRate(16000);
            const samples = wav.getSamples(true, Int16Array); // interleaved Int16

            // --- TEMP DEBUG: check if the decoded samples are actually
            // non-silent. Remove once sound is confirmed working. ---
            let peak = 0;
            for (let i = 0; i < samples.length; i++) {
                const abs = Math.abs(samples[i]);
                if (abs > peak) peak = abs;
            }
            console.log(`🔍 Decoded ${samples.length} samples, peak amplitude: ${peak}/32767`);
            // --- END TEMP DEBUG ---

            // 20ms frames @ 16kHz mono = 320 samples/frame
            const SAMPLES_PER_FRAME = 320;
            const totalFrames = Math.ceil(samples.length / SAMPLES_PER_FRAME);

            for (let i = 0; i < totalFrames; i++) {
                // Stop pushing frames the moment we're interrupted, instead
                // of dumping stale audio into a queue that's being torn down.
                if (this.abortSignal.aborted) break;

                const start = i * SAMPLES_PER_FRAME;
                let chunk = samples.subarray(start, start + SAMPLES_PER_FRAME);

                // Zero-pad the final partial frame instead of dropping it,
                // so the tail end of the sentence doesn't get cut off.
                if (chunk.length < SAMPLES_PER_FRAME) {
                    const padded = new Int16Array(SAMPLES_PER_FRAME);
                    padded.set(chunk);
                    chunk = padded;
                }

                const frame = new AudioFrame(chunk, 16000, 1, SAMPLES_PER_FRAME);

                // IMPORTANT: push a SynthesizedAudio wrapper, not a bare
                // AudioFrame — this is what monitorMetrics()/output forwarding
                // actually expects.
                this.queue.put({
                    requestId,
                    segmentId: "",
                    frame,
                    final: i === totalFrames - 1
                });
            }

            console.log("✅ Audio successfully streamed to LiveKit");
        } catch (error) {
            if (this.abortSignal.aborted) {
                console.log("ℹ️ Sarvam TTS request aborted (interrupted by user)");
                return;
            }
            console.error("❌ Sarvam TTS Error:", error);
        }
        // No need to manually close the queue — ChunkedStream's constructor
        // already does `this.mainTask().finally(() => this.queue.close())`.
    }
}

// import {
//     TTS,
//     ChunkedStream
// } from "@livekit/agents";

// import { AudioFrame } from "@livekit/rtc-node";
// import fetch from "node-fetch";
// import wavefile from "wavefile";
// import dotenv from "dotenv";
// import { randomUUID } from "node:crypto";

// dotenv.config();

// const { WaveFile } = wavefile;

// export class LiveKitSarvamTTS extends TTS {
//     label = "sarvam";

//     constructor() {
//         super(
//             16000,
//             1,
//             {
//                 // Sarvam's /text-to-speech endpoint is a single REST call that
//                 // returns the full clip — it is NOT a streaming API, so this
//                 // must be false. Declaring "streaming: true" here while
//                 // extending ChunkedStream is what caused the broken pipeline.
//                 streaming: false,
//                 alignedTranscript: false
//             }
//         );
//     }

//     // Non-streaming path: called with the full text up front.
//     synthesize(text, connOptions, abortSignal) {
//         return new SarvamChunkedStream(text, this, connOptions, abortSignal);
//     }

//     // Not used since capabilities.streaming = false, but must exist.
//     stream() {
//         throw new Error("LiveKitSarvamTTS does not support streaming synthesis");
//     }
// }

// class SarvamChunkedStream extends ChunkedStream {
//     label = "sarvam-stream";

//     async run() {
//         const requestId = randomUUID();

//         try {
//             // ChunkedStream already stores the full text for us —
//             // no need (and no way) to accumulate it via streaming callbacks.
//             const textToSynthesize = this.inputText.trim();
//             if (!textToSynthesize) {
//                 return;
//             }

//             const response = await fetch("https://api.sarvam.ai/text-to-speech", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "api-subscription-key": process.env.SARVAM_API_KEY
//                 },
//                 body: JSON.stringify({
//                     text: textToSynthesize,
//                     target_language_code: "en-IN",
//                     speaker: "ritu",
//                     model: "bulbul:v3",
//                     speech_sample_rate: 16000
//                     // NOTE: no "audio_format" field here — Sarvam's REST
//                     // /text-to-speech endpoint returns base64-encoded WAV
//                     // files in `audios`, not headerless raw PCM. Treating
//                     // that buffer as raw PCM (like before) corrupts every
//                     // frame with the WAV header and misreads the sample
//                     // data, which is exactly what produced silence/garbled
//                     // audio.
//                 }),
//                 // Actually cancel the network call if the user interrupts
//                 // the agent instead of letting it finish in the background.
//                 signal: this.abortSignal
//             });

//             if (this.abortSignal.aborted) return;

//             if (!response.ok) {
//                 console.error("❌ Sarvam API error:", response.status, await response.text());
//                 return;
//             }

//             const data = await response.json();
//             if (!data.audios || !data.audios[0]) {
//                 console.error("❌ Sarvam returned no audio.");
//                 return;
//             }

//             // Decode base64 -> real WAV bytes, then parse the WAV container
//             // properly (strip header, read actual sample rate/bit depth)
//             // instead of assuming the buffer is raw 16-bit PCM.
//             const audioBuffer = Buffer.from(data.audios[0], "base64");
//             const wav = new WaveFile(audioBuffer);
//             wav.toBitDepth("16");
//             wav.toSampleRate(16000);
//             const samples = wav.getSamples(true, Int16Array); // interleaved Int16

//             // 20ms frames @ 16kHz mono = 320 samples/frame
//             const SAMPLES_PER_FRAME = 320;
//             const totalFrames = Math.ceil(samples.length / SAMPLES_PER_FRAME);

//             for (let i = 0; i < totalFrames; i++) {
//                 // Stop pushing frames the moment we're interrupted, instead
//                 // of dumping stale audio into a queue that's being torn down.
//                 if (this.abortSignal.aborted) break;

//                 const start = i * SAMPLES_PER_FRAME;
//                 let chunk = samples.subarray(start, start + SAMPLES_PER_FRAME);

//                 // Zero-pad the final partial frame instead of dropping it,
//                 // so the tail end of the sentence doesn't get cut off.
//                 if (chunk.length < SAMPLES_PER_FRAME) {
//                     const padded = new Int16Array(SAMPLES_PER_FRAME);
//                     padded.set(chunk);
//                     chunk = padded;
//                 }

//                 const frame = new AudioFrame(chunk, 16000, 1, SAMPLES_PER_FRAME);

//                 // IMPORTANT: push a SynthesizedAudio wrapper, not a bare
//                 // AudioFrame — this is what monitorMetrics()/output forwarding
//                 // actually expects.
//                 this.queue.put({
//                     requestId,
//                     segmentId: "",
//                     frame,
//                     final: i === totalFrames - 1
//                 });
//             }

//             console.log("✅ Audio successfully streamed to LiveKit");
//         } catch (error) {
//             if (this.abortSignal.aborted) {
//                 console.log("ℹ️ Sarvam TTS request aborted (interrupted by user)");
//                 return;
//             }
//             console.error("❌ Sarvam TTS Error:", error);
//         }
//         // No need to manually close the queue — ChunkedStream's constructor
//         // already does `this.mainTask().finally(() => this.queue.close())`.
//     }
// }



// import {
//     TTS,
//     ChunkedStream
// } from "@livekit/agents";

// import { AudioFrame } from "@livekit/rtc-node";
// import fetch from "node-fetch";
// import dotenv from "dotenv";
// import { randomUUID } from "node:crypto";

// dotenv.config();

// export class LiveKitSarvamTTS extends TTS {
//     label = "sarvam";

//     constructor() {
//         super(
//             16000,
//             1,
//             {
//                 // Sarvam's /text-to-speech endpoint is a single REST call that
//                 // returns the full clip — it is NOT a streaming API, so this
//                 // must be false. Declaring "streaming: true" here while
//                 // extending ChunkedStream is what caused the broken pipeline.
//                 streaming: false,
//                 alignedTranscript: false
//             }
//         );
//     }

//     // Non-streaming path: called with the full text up front.
//     synthesize(text, connOptions, abortSignal) {
//         return new SarvamChunkedStream(text, this, connOptions, abortSignal);
//     }

//     // Not used since capabilities.streaming = false, but must exist.
//     stream() {
//         throw new Error("LiveKitSarvamTTS does not support streaming synthesis");
//     }
// }

// class SarvamChunkedStream extends ChunkedStream {
//     label = "sarvam-stream";

//     async run() {
//         const requestId = randomUUID();

//         try {
//             // ChunkedStream already stores the full text for us —
//             // no need (and no way) to accumulate it via streaming callbacks.
//             const textToSynthesize = this.inputText.trim();
//             if (!textToSynthesize) {
//                 return;
//             }

//             const response = await fetch("https://api.sarvam.ai/text-to-speech", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "api-subscription-key": process.env.SARVAM_API_KEY
//                 },
//                 body: JSON.stringify({
//                     text: textToSynthesize,
//                     target_language_code: "en-IN",
//                     speaker: "ritu",
//                     model: "bulbul:v3",
//                     speech_sample_rate: 16000,
//                     audio_format: "pcm"
//                 }),
//                 // Actually cancel the network call if the user interrupts
//                 // the agent instead of letting it finish in the background.
//                 signal: this.abortSignal
//             });

//             if (this.abortSignal.aborted) return;

//             if (!response.ok) {
//                 console.error("❌ Sarvam API error:", response.status, await response.text());
//                 return;
//             }

//             const data = await response.json();
//             if (!data.audios || !data.audios[0]) {
//                 console.error("❌ Sarvam returned no audio.");
//                 return;
//             }

//             // Decode base64 -> PCM16
//             const binaryString = atob(data.audios[0]);
//             const bytes = new Uint8Array(binaryString.length);
//             for (let i = 0; i < binaryString.length; i++) {
//                 bytes[i] = binaryString.charCodeAt(i);
//             }
//             const pcmData = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);

//             // 20ms frames @ 16kHz mono = 320 samples/frame
//             const SAMPLES_PER_FRAME = 320;
//             const totalFrames = Math.floor(pcmData.length / SAMPLES_PER_FRAME);

//             for (let i = 0; i < totalFrames; i++) {
//                 // Stop pushing frames the moment we're interrupted, instead
//                 // of dumping stale audio into a queue that's being torn down.
//                 if (this.abortSignal.aborted) break;

//                 const start = i * SAMPLES_PER_FRAME;
//                 const chunk = pcmData.subarray(start, start + SAMPLES_PER_FRAME);
//                 const frame = new AudioFrame(chunk, 16000, 1, SAMPLES_PER_FRAME);

//                 // IMPORTANT: push a SynthesizedAudio wrapper, not a bare
//                 // AudioFrame — this is what monitorMetrics()/output forwarding
//                 // actually expects.
//                 this.queue.put({
//                     requestId,
//                     segmentId: "",
//                     frame,
//                     final: i === totalFrames - 1
//                 });
//             }

//             console.log("✅ Audio successfully streamed to LiveKit");
//         } catch (error) {
//             if (this.abortSignal.aborted) {
//                 console.log("ℹ️ Sarvam TTS request aborted (interrupted by user)");
//                 return;
//             }
//             console.error("❌ Sarvam TTS Error:", error);
//         }
//         // No need to manually close the queue — ChunkedStream's constructor
//         // already does `this.mainTask().finally(() => this.queue.close())`.
//     }
// }

