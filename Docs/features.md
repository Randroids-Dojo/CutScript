# Features

## Feature Status

| Feature | Status |
|---------|--------|
| Word-level transcription (WhisperX) | Done |
| Text-based video editing | Done |
| Bulk copy/paste transcript editing | Done |
| Undo/redo (100 steps) | Done |
| Waveform timeline | Done |
| FFmpeg stream-copy export | Done |
| FFmpeg re-encode (up to 4K) | Done |
| AI filler word removal | Done |
| AI clip creation (Shorts) | Done |
| Ollama + OpenAI + Claude | Done |
| Word-level captions (SRT/VTT/ASS) | Done |
| Caption burn-in on export | Done |
| Studio Sound (DeepFilterNet) | Done |
| Keyboard shortcuts (J/K/L) | Done |
| Speaker diarization | Done |
| Virtualized transcript (react-virtuoso) | Done |
| Encrypted API key storage | Done |
| Project save/load (.cutscript) | Done |
| AI background removal | Planned |

---

## Transcript Editing

### Word-by-Word Editing

Click a word to select it. Shift-click or click-drag to select a range. Press **Delete** to cut the selected words. Deleted words are shown with strikethrough; hover over a deleted word to see a **Restore** button that brings back the entire cut range.

### Bulk Copy/Paste Editing

For larger edits, use the copy/paste workflow in the transcript toolbar:

1. Click **Copy** — copies all non-deleted words to the clipboard, formatted with speaker labels and paragraph breaks
2. Open any text editor (VS Code, Notes, etc.) and paste
3. Delete sentences, lines, or paragraphs as desired
4. Copy your edited version
5. Back in CutScript, click **Paste edits**
6. A preview shows how many words will be cut and how many cuts will be created
7. Click **Apply Cuts** — all deletions are applied as a single undo step

The diff uses a Longest Common Subsequence (LCS) algorithm. Only deletions are detected — if you changed a word ("store" → "shop"), that word is treated as unchanged and stays in the video. When the same word appears multiple times in the transcript (e.g. "here", "um"), the diff prefers to keep its earliest occurrence, so deleting a trailing phrase produces a single clean cut instead of fragmented cuts that snip the wrong instance.

---

## AI Features

All AI features require an AI provider configured in **Settings**. Ollama runs locally; OpenAI and Claude require API keys (stored encrypted via Electron's `safeStorage`).

### Filler Word Removal

Sends the transcript to an LLM with a prompt to identify filler words and phrases ("um", "uh", "you know", "like", etc.). Returns a list of word indices; CutScript creates cut ranges for each one. Review the highlighted words before applying.

### Clip Suggestions

Ask the AI to find the best moments for short-form content (YouTube Shorts, TikTok, Reels). The AI returns timestamp ranges with a title and reason for each suggestion. Click a suggestion to preview the clip in the timeline, then export just that range.

---

## Export

| Option | Values |
|--------|--------|
| Mode | Stream-copy (fast, lossless) · Re-encode |
| Resolution | 720p · 1080p · 4K |
| Format | MP4 · MOV · WebM |
| Captions | None · Burn-in · Sidecar (SRT/VTT/ASS) |
| Studio Sound | On · Off (noise reduction via DeepFilterNet) |

**Stream-copy** splices the original video at cut points without re-encoding — exports in seconds regardless of file size. Use re-encode when you need a different resolution, format, or caption burn-in.

---

## Speaker Diarization

When transcribing, CutScript uses pyannote.audio to identify different speakers. Speaker labels appear above each segment in the transcript editor. The copy/paste workflow includes speaker labels so you can see who said what while editing externally.

---

## Project Files

Projects are saved as `.cutscript` files (JSON). They store:
- Path to the original video
- Full word and segment data from the transcription
- All deleted ranges
- Language metadata

Opening a project restores the full edit state instantly (no re-transcription needed).
