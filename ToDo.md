# ToDo

## Bugs

- [ ] **66 cuts on Paste edits** — cuts final words and includes the same word from later in the segment (e.g. "here")
- [ ] **Crash: filler words + Settings** — crash when finding filler words, switching to Settings, then back to AI panel
- [ ] **Random `tmp.mp4` filename** — uploaded/temp files get a random tmp name; should derive from the original filename

## Features

- [ ] **Non-sequential word selection** — allow selecting words that aren't contiguous
- [ ] **Export selected parts** — export only the currently selected/highlighted portion
- [ ] **Clip preview: highlight words + auto-stop** — when previewing an AI clip, highlight the included words in the transcript and stop playback at the clip end
- [ ] **Custom dictionary** — user-defined word corrections (e.g. "Cloud Code" → "Claude Code") applied during or after transcription
- [ ] **Video muting**
- [ ] **Jump to video position on word click** — clicking a word should seek the video to that word's timestamp
- [ ] **Visually show timestamps** — display timestamps in the transcript or timeline

## UX / Polish

- [ ] **Default export mode to Re-encode** — and show a stronger warning if the user switches back to Fast when there are word-level cuts
- [ ] **Show transcription model clearly** — make it obvious which Whisper model was used and that it is not an AI/LLM model
- [ ] **Change AI model/provider inline** — allow switching model and provider directly on the Filler Words and Create Clips tabs (not just in Settings)
- [ ] **Fix zoom levels** — waveform/timeline zoom behavior needs work

## Done

- [x] **Disable undo at start** — undo history now clears after transcription/project load so Undo is disabled until the first edit
- [x] **Backend status shows red until Settings visited** — browser mode now auto-triggers `startBackend()` on first offline detection
