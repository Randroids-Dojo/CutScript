# Attribution

CutScript is forked from [DataAnts-AI/CutScript](https://github.com/DataAnts-AI/CutScript), which is actively maintained. The original project is a full-featured local-first text-based video editor — Electron + React, WhisperX transcription, FFmpeg export, Ollama/OpenAI/Claude AI support — and is the source of essentially everything in this codebase.

Check out the original at [github.com/DataAnts-AI/CutScript](https://github.com/DataAnts-AI/CutScript).

## What This Fork Adds

This fork is in its early stages. Changes made on top of the original:

- **File System Access API for browser mode** — replaces manual path input with a native OS file picker (`showOpenFilePicker()`); files are uploaded to a new `POST /upload` endpoint which saves to a temp file and returns a path for the existing transcription flow
- **Bulk copy/paste transcript editing** — copy the transcript, edit it in any external editor, paste back to apply all cuts at once (LCS diff, single undo step)
- **Dev environment** — Python 3.11 venv isolation for the backend (`backend/.venv`), updated `dev:backend` script to use it
- **Documentation** — restructured from a single README into topic-specific docs under `Docs/`

## Upstream Contributions

Improvements that make sense for both projects will be submitted upstream as PRs. It's the original maintainers' call whether to accept them.

## License

MIT — same as the original. See [LICENSE](../LICENSE).
