# Voice latency tuning

The agent now uses LiveKit turn handling with low endpoint delays, preemptive LLM + TTS generation, prewarmed Silero VAD, Deepgram Flux EOT by default, DeepSeek V4 Flash, and ElevenLabs Auto Mode.

## Recommended defaults

- `VOICE_STT_MODE=flux` for English phone calls.
- `VOICE_MIN_ENDPOINT_DELAY_MS=150`
- `VOICE_MAX_ENDPOINT_DELAY_MS=900`
- `VOICE_VAD_MIN_SILENCE_MS=280`
- `DEEPGRAM_EAGER_EOT_THRESHOLD=0.4`
- `DEEPGRAM_EOT_THRESHOLD=0.65`
- `DEEPGRAM_EOT_TIMEOUT_MS=900`
- `DEEPSEEK_MODEL=deepseek-v4-flash`
- `DEEPSEEK_TEMPERATURE=0.2`
- `ELEVENLABS_MODEL=eleven_flash_v2_5`

Flux is currently configured for English (`flux-general-en`). For broader language support, switch `VOICE_STT_MODE=nova` and set `DEEPGRAM_LANGUAGE` appropriately.

The console now logs EOU, LLM TTFT, and TTS TTFB. Total user-perceived latency is driven by these components, so tune the largest one rather than guessing.
