# Architecture

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop shell | Electron 33 | Native window, file dialogs, IPC, spawns Python backend |
| Frontend | React 19 + Vite + TypeScript | UI |
| Styling | Tailwind CSS | Dark editor theme |
| State | Zustand + Zundo | Editor state with 100-step undo/redo |
| Transcript render | react-virtuoso | Virtualized list for large transcripts |
| Backend | FastAPI + uvicorn | REST API, WebSocket progress |
| Transcription | WhisperX + faster-whisper | Word-level timestamps + forced alignment |
| Speaker ID | pyannote.audio | Speaker diarization |
| Video processing | FFmpeg (via ffmpeg-python) | Stream-copy and re-encode export |
| Audio cleanup | DeepFilterNet | AI noise reduction |
| AI features | Ollama / OpenAI / Claude API | Filler removal, clip suggestions |

## Project Structure

```
cutscript/
├── electron/
│   ├── main.js           # App entry point — creates window, spawns Python backend
│   ├── preload.js        # Context-isolated IPC bridge (no nodeIntegration)
│   └── python-bridge.js  # Manages backend process lifecycle
│
├── frontend/src/
│   ├── components/
│   │   ├── TranscriptEditor.tsx   # Word selection, delete, copy/paste editing
│   │   ├── VideoPlayer.tsx        # HTML5 video + playback sync
│   │   ├── WaveformTimeline.tsx   # WaveSurfer.js waveform
│   │   ├── ExportDialog.tsx       # Export options UI
│   │   ├── AIPanel.tsx            # Filler removal + clip suggestion UI
│   │   ├── SettingsPanel.tsx      # AI provider + API key config
│   │   └── PasteTranscriptDialog.tsx  # Bulk edit via paste workflow
│   ├── store/
│   │   ├── editorStore.ts         # Main editor state (words, segments, deletedRanges)
│   │   └── aiStore.ts             # AI provider config
│   ├── utils/
│   │   └── diffTranscript.ts      # LCS diff for paste-based editing
│   ├── hooks/                     # useVideoSync, useKeyboardShortcuts
│   └── types/project.ts           # Shared TypeScript interfaces
│
├── backend/
│   ├── main.py                    # FastAPI app setup
│   ├── routers/
│   │   ├── transcribe.py          # POST /transcribe
│   │   ├── export.py              # POST /export
│   │   ├── ai.py                  # POST /ai/*
│   │   ├── captions.py            # POST /captions
│   │   └── audio.py               # POST /audio/clean
│   ├── services/
│   │   ├── transcription.py       # WhisperX pipeline
│   │   ├── export.py              # FFmpeg editing logic
│   │   ├── ai.py                  # LLM integrations
│   │   └── audio.py               # DeepFilterNet pipeline
│   └── utils/                     # GPU detection, model cache, helpers
│
└── shared/                        # .cutscript project file schema
```

## Data Flow

```
Video file
   │
   ▼ POST /transcribe
WhisperX → word timestamps + alignment
   │
   ▼ stored in editorStore
words[]        — flat array of every word with start/end times
segments[]     — sentence groupings with speaker labels
deletedRanges[] — ranges of deleted word indices
   │
   ▼ user edits transcript
TranscriptEditor — word selection + delete
                 — copy/paste bulk editing (LCS diff)
                 — AI-assisted filler removal
   │
   ▼ POST /export
FFmpeg reads keep segments from deletedRanges
Stream-copy (fast) or re-encode (4K, captions, audio cleanup)
   │
   ▼
Output video file
```

## State and Undo

The editor uses **Zustand** with the **Zundo** temporal middleware. Every `set()` call that modifies `words`, `segments`, or `deletedRanges` is recorded as an undo step (limit: 100).

The paste-based editing action (`applyPastedTranscript`) makes a single `set()` call so the entire bulk edit is one undo step — pressing Ctrl+Z after a paste reverts all cuts at once.

## IPC Security

The Electron preload script runs with `contextIsolation: true` and `nodeIntegration: false`. The renderer communicates with the main process only through the typed IPC bridge exposed via `contextBridge`. The backend API is called directly from the renderer over HTTP (`localhost:8642`).
