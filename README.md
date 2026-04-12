# CutScript

> **Fork of [DataAnts-AI/CutScript](https://github.com/DataAnts-AI/CutScript).** The original project is the source of essentially everything here — the Electron shell, React frontend, WhisperX transcription, FFmpeg export pipeline, and AI integrations are all DataAnts-AI's work. This fork adds features on top and contributes improvements back upstream where the maintainers want them. See [Docs/attribution.md](Docs/attribution.md) for details.

An open-source, local-first text-based audio and video editor powered by AI. Edit your video by editing the transcript — delete a word and it's cut from the video.

<img width="1034" height="661" alt="CutScript editor" src="https://github.com/user-attachments/assets/b1ed9505-792e-42ca-bb73-85458d0f02a5" />

## Features

- **Text-based editing** — select and delete transcript words to cut video
- **Bulk copy/paste editing** — copy the transcript, edit in any text editor, paste back to apply all cuts at once
- **Word-level transcription** — WhisperX with speaker diarization
- **AI assistance** — filler word removal and clip suggestions via Ollama, OpenAI, or Claude
- **Studio Sound** — background noise removal with DeepFilterNet
- **Export** — stream-copy (fast) or re-encode up to 4K, with caption burn-in
- **Full undo/redo**, keyboard shortcuts, waveform timeline, project save/load

## Quick Start

```bash
npm install
cd frontend && npm install && cd ..
cd backend && python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ..
npm run dev
```

See **[Docs/getting-started.md](Docs/getting-started.md)** for detailed setup, prerequisites, and troubleshooting.

## Documentation

| Topic | Description |
|-------|-------------|
| [Getting Started](Docs/getting-started.md) | Install, dev setup, prerequisites |
| [Architecture](Docs/architecture.md) | Tech stack and project structure |
| [Features](Docs/features.md) | Full feature reference |
| [Keyboard Shortcuts](Docs/keyboard-shortcuts.md) | All keyboard shortcuts |
| [API Reference](Docs/api-reference.md) | Backend REST endpoints |
| [Attribution](Docs/attribution.md) | Fork history and what changed |

## License

MIT — see [LICENSE](LICENSE) for details.
