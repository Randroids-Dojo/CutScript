# Getting Started

## Prerequisites

| Requirement | Notes |
|------------|-------|
| Node.js 18+ | For Electron and frontend |
| Python 3.11 | 3.11 is the recommended version — PyTorch wheels are not yet available for 3.13+ |
| FFmpeg | Must be in `PATH` — used for all video processing |
| Ollama (optional) | For local AI features without an API key |

Install FFmpeg via Homebrew on macOS:
```bash
brew install ffmpeg
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

The backend has heavy ML dependencies (PyTorch, WhisperX, pyannote). Use a Python 3.11 virtual environment to keep them isolated:

```bash
cd backend

# Create venv with Python 3.11
python3.11 -m venv .venv

# Install all dependencies
.venv/bin/pip install -r requirements.txt

cd ..
```

> **Note:** `deepfilternet` pins `numpy<2.0` while `whisperx` requires `numpy>=2.1`. This version conflict is a metadata-only warning — both libraries work correctly at runtime. After installing, upgrade numpy to satisfy whisperx:
> ```bash
> backend/.venv/bin/pip install "numpy>=2.1.0"
> ```

## Run in Development

```bash
# Starts backend + frontend + Electron in one command
npm run dev
```

Or run each service separately:

```bash
# Terminal 1 — Backend
cd backend && .venv/bin/python -m uvicorn main:app --reload --port 8642

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
