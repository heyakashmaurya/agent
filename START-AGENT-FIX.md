# LiveKit agent startup fix

Fixed `backend/src/services/voice/livekitSarvamTTS.js` so it no longer imports LiveKit internals through a path such as `../../node_modules/...`.

The custom Sarvam TTS adapter now imports the public LiveKit TTS namespace:

```js
import { tts } from "@livekit/agents";
const { TTS, ChunkedStream } = tts;
```

This is required because the previous relative path resolved to `backend/src/node_modules/@livekit/...`, which normally does not exist.

## Start

```powershell
cd "<project>\\backend"
npm install
npm run agent
```

The CLI config permission warning is not the cause of the crash. If desired on a POSIX system, set `~/.livekit/cli-config.yaml` to mode 600. On Windows, it can generally be ignored if the CLI continues to run.
