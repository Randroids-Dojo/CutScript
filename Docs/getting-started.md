# Getting Started

## Prerequisites

| Requirement | Notes |
|------------|-------|
| Node.js 18+ | For Electron and frontend |
| uv | Python package manager — handles Python 3.11 and the venv automatically |
| FFmpeg | Must be in `PATH` — used for all video processing |
| Ollama (optional) | For local AI features without an API key |

Install prerequisites on macOS:
```bash
brew install uv ffmpeg
```

## Install

### 1. Root and frontend dependencies

```bash
# Root (Electron, concurrently)
npm install

# Frontend (React, Tailwind, Zustand)
cd frontend && npm install && cd ..
```

### 2. Backend Python environment

```bash
cd backend && uv sync && cd ..
```

`uv sync` reads `pyproject.toml`, downloads Python 3.11 if needed, creates `.venv`, and installs all dependencies. The `deepfilternet`/`numpy` version conflict is handled automatically via an override in `pyproject.toml`.

## Run in Development

```bash
# Starts backend + frontend + Electron in one command
npm run dev
```

Or run each service separately:

```bash
# Terminal 1 — Backend
cd backend && uv run uvicorn main:app --reload --port 8642

# Terminal 2 — Frontend (Vite)
cd frontend && npm run dev

# Terminal 3 — Electron (after frontend is ready)
npx electron .
```

## Build for Distribution

```bash
cd frontend && npm run build && cd ..
npx electron-builder
```

Outputs a platform-native package (`.dmg` on macOS, `.exe` installer on Windows, `.AppImage` on Linux) in the `dist/` directory.

## Supported File Formats

| Type | Formats |
|------|---------|
| Video | MP4, MOV, AVI, MKV |
| Audio | M4A, MP3, WAV, FLAC |

Audio-only files are processed directly by Whisper (no extraction step), making transcription faster than equivalent video files.

## First Use

1. Launch the app (`npm run dev` or open the built package)
2. Click **Open Video** and select a video or audio file
3. Wait for transcription to complete
4. Click words in the transcript to select them, then press **Delete** to cut
5. Click **Export** to render the edited file
