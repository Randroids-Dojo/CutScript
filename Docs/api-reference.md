# API Reference

The backend runs on `http://localhost:8642` in development.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/file` | Serve a local file by path (used by Electron renderer to load video) |
| POST | `/transcribe` | Transcribe a video/audio file with WhisperX |
| POST | `/export` | Export edited video with applied cuts |
| POST | `/ai/filler-removal` | Detect filler words via LLM |
| POST | `/ai/create-clip` | Suggest short-form clips via LLM |
| GET | `/ai/ollama-models` | List locally available Ollama models |
| POST | `/captions` | Generate captions (SRT, VTT, or ASS) |
| POST | `/audio/clean` | Noise reduction via DeepFilterNet |
| GET | `/audio/capabilities` | Check whether audio processing is available |

---

## POST /transcribe

Transcribes a video or audio file. Returns word-level timestamps and speaker-labeled segments.

**Request body:**
```json
{
  "file_path": "/absolute/path/to/video.mp4",
  "language": "en",
  "diarize": true
}
```

**Response:**
```json
{
  "words": [
    { "word": "Hello", "start": 0.0, "end": 0.4, "confidence": 0.98 }
  ],
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.2,
      "text": "Hello world",
      "speaker": "SPEAKER_00",
      "words": [ ... ]
    }
  ],
  "language": "en"
}
```

Progress is streamed over a WebSocket at `ws://localhost:8642/ws/transcribe`.

---

## POST /export

Exports the edited video. Cuts are defined by `keep_segments` — time ranges that should be kept.

**Request body:**
```json
{
  "input_path": "/path/to/original.mp4",
  "output_path": "/path/to/output.mp4",
  "keep_segments": [
    { "start": 0.0, "end": 12.4 },
    { "start": 18.1, "end": 45.0 }
  ],
  "mode": "fast",
  "resolution": "1080p",
  "format": "mp4",
  "enhance_audio": false,
  "captions": "none"
}
```

`mode` is `"fast"` (stream-copy) or `"reencode"`.

---

## POST /ai/filler-removal

**Request body:**
```json
{
  "words": [ ... ],
  "provider": "ollama",
  "model": "llama3.2",
  "api_key": null,
  "base_url": "http://localhost:11434"
}
```

**Response:**
```json
{
  "wordIndices": [4, 5, 12, 13],
  "fillerWords": [
    { "index": 4, "word": "um", "reason": "filler" }
  ]
}
```

---

## POST /ai/create-clip

**Request body:**
```json
{
  "words": [ ... ],
  "segments": [ ... ],
  "provider": "claude",
  "model": "claude-opus-4-6",
  "api_key": "sk-ant-..."
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "title": "Key insight on performance",
      "startWordIndex": 120,
      "endWordIndex": 240,
      "startTime": 48.2,
      "endTime": 96.7,
      "reason": "Clear, self-contained explanation suitable for a 60-second clip"
    }
  ]
}
```

---

## POST /audio/clean

Applies DeepFilterNet noise reduction to the audio track of a video.

**Request body:**
```json
{
  "input_path": "/path/to/video.mp4",
  "output_path": "/path/to/cleaned.mp4"
}
```
