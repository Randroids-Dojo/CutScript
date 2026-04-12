# Attribution

CutScript is forked from [DataAnts-AI/CutScript](https://github.com/DataAnts-AI/CutScript), which is actively maintained. The original project is a full-featured local-first text-based video editor — Electron + React, WhisperX transcription, FFmpeg export, Ollama/OpenAI/Claude AI support — and is the source of essentially everything in this codebase.

Check out the original at [github.com/DataAnts-AI/CutScript](https://github.com/DataAnts-AI/CutScript).

## What This Fork Adds

This fork is in its early stages. Changes made on top of the original:

- **File System Access API for browser mode** — replaces manual path input with a native OS file picker (`showOpenFilePicker()`); files are uploaded to a new `POST /upload` endpoint which saves to a temp file and returns a path for the existing transcription flow
- **Bulk copy/paste transcript editing** — copy the transcript, edit it in any external editor, paste back to apply all cuts at once (LCS diff, single undo step)
- **Backend status and control** — live connection indicator with adaptive polling (1s retry when offline, 5s when online); restart/start button works in both Electron and browser mode; browser mode uses a Vite dev middleware (`POST /api/start-backend`) to spawn the process; status is in the Zustand store so any component can read it; full status section in the Settings panel
- **Dev environment** — migrated backend from pip + manual venv to `uv`; `uv sync` handles Python 3.11, venv creation, and the deepfilternet/numpy conflict via a pyproject.toml override
- **Documentation** — restructured from a single README into topic-specific docs under `Docs/`

## Upstream Contributions

Improvements that make sense for both projects will be submitted upstream as PRs. It's the original maintainers' call whether to accept them.

## License

MIT — same as the original. See [LICENSE](../LICENSE).
