import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Word, Segment, DeletedRange, TranscriptionResult, BackendStatus } from '../types/project';
import { diffTranscript, groupContiguousIndices } from '../utils/diffTranscript';
import { buildDeletedSet } from '../utils/buildDeletedSet';

interface EditorState {
  videoPath: string | null;
  videoUrl: string | null;
  words: Word[];
  segments: Segment[];
  deletedRanges: DeletedRange[];
  language: string;

  currentTime: number;
  duration: number;
  isPlaying: boolean;

  selectedWordIndices: number[];
  hoveredWordIndex: number | null;

  isTranscribing: boolean;
  transcriptionProgress: number;
  isExporting: boolean;
  exportProgress: number;

  backendUrl: string;
  backendStatus: BackendStatus;
}

interface EditorActions {
  setBackendUrl: (url: string) => void;
  setBackendStatus: (status: BackendStatus) => void;
  loadVideo: (path: string) => void;
  setTranscription: (result: TranscriptionResult) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedWordIndices: (indices: number[]) => void;
  setHoveredWordIndex: (index: number | null) => void;
  deleteSelectedWords: () => void;
  deleteWordRange: (startIndex: number, endIndex: number) => void;
  restoreRange: (rangeId: string) => void;
  setTranscribing: (active: boolean, progress?: number) => void;
  setExporting: (active: boolean, progress?: number) => void;
  getKeepSegments: () => Array<{ start: number; end: number }>;
  getWordAtTime: (time: number) => number;
  getTranscriptText: () => string;
  applyPastedTranscript: (pastedText: string) => { deletedCount: number; rangeCount: number };
  loadProject: (projectData: any) => void;
  reset: () => void;
}

const initialState: EditorState = {
  videoPath: null,
  videoUrl: null,
  words: [],
  segments: [],
  deletedRanges: [],
  language: '',
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  selectedWordIndices: [],
  hoveredWordIndex: null,
  isTranscribing: false,
  transcriptionProgress: 0,
  isExporting: false,
  exportProgress: 0,
  backendUrl: 'http://localhost:8642',
  backendStatus: 'checking',
};

let nextRangeId = 1;

export const useEditorStore = create<EditorState & EditorActions>()(
  temporal(
    (set, get) => ({
      ...initialState,

      setBackendUrl: (url) => set({ backendUrl: url }),
      setBackendStatus: (status) => set({ backendStatus: status }),

      loadVideo: (path) => {
        const backend = get().backendUrl;
        const url = `${backend}/file?path=${encodeURIComponent(path)}`;
        set({
          ...initialState,
          backendUrl: backend,
          videoPath: path,
          videoUrl: url,
        });
      },

      setTranscription: (result) => {
        let globalIdx = 0;
        const annotatedSegments = result.segments.map((seg) => {
          const annotated = { ...seg, globalStartIndex: globalIdx };
          globalIdx += seg.words.length;
          return annotated;
        });
        set({
          words: result.words,
          segments: annotatedSegments,
          language: result.language,
          deletedRanges: [],
          selectedWordIndices: [],
        });
      },

      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setSelectedWordIndices: (indices) => set({ selectedWordIndices: indices }),
      setHoveredWordIndex: (index) => set({ hoveredWordIndex: index }),

      deleteSelectedWords: () => {
        const { selectedWordIndices, words, deletedRanges } = get();
        if (selectedWordIndices.length === 0) return;

        const sorted = [...selectedWordIndices].sort((a, b) => a - b);
        const startWord = words[sorted[0]];
        const endWord = words[sorted[sorted.length - 1]];

        const newRange: DeletedRange = {
          id: `dr_${nextRangeId++}`,
          start: startWord.start,
          end: endWord.end,
          wordIndices: sorted,
        };

        set({
          deletedRanges: [...deletedRanges, newRange],
          selectedWordIndices: [],
        });
      },

      deleteWordRange: (startIndex, endIndex) => {
        const { words, deletedRanges } = get();
        const indices = [];
        for (let i = startIndex; i <= endIndex; i++) indices.push(i);

        const newRange: DeletedRange = {
          id: `dr_${nextRangeId++}`,
          start: words[startIndex].start,
          end: words[endIndex].end,
          wordIndices: indices,
        };

        set({ deletedRanges: [...deletedRanges, newRange] });
      },

      restoreRange: (rangeId) => {
        const { deletedRanges } = get();
        set({ deletedRanges: deletedRanges.filter((r) => r.id !== rangeId) });
      },

      setTranscribing: (active, progress) =>
        set({
          isTranscribing: active,
          transcriptionProgress: progress ?? (active ? 0 : 100),
        }),

      setExporting: (active, progress) =>
        set({
          isExporting: active,
          exportProgress: progress ?? (active ? 0 : 100),
        }),

      getKeepSegments: () => {
        const { words, deletedRanges, duration } = get();
        if (words.length === 0) return [{ start: 0, end: duration }];

        const deletedSet = buildDeletedSet(deletedRanges);

        const segments: Array<{ start: number; end: number }> = [];
        let segStart: number | null = null;

        for (let i = 0; i < words.length; i++) {
          if (!deletedSet.has(i)) {
            if (segStart === null) segStart = words[i].start;
          } else {
            if (segStart !== null) {
              segments.push({ start: segStart, end: words[i - 1].end });
              segStart = null;
            }
          }
        }

        if (segStart !== null) {
          segments.push({ start: segStart, end: words[words.length - 1].end });
        }

        return segments;
      },

      getWordAtTime: (time) => {
        const { words } = get();
        let lo = 0;
        let hi = words.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >>> 1;
          if (words[mid].end < time) lo = mid + 1;
          else if (words[mid].start > time) hi = mid - 1;
          else return mid;
        }
        return lo < words.length ? lo : words.length - 1;
      },

      getTranscriptText: () => {
        const { segments, deletedRanges } = get();
        const deletedSet = buildDeletedSet(deletedRanges);

        const lines: string[] = [];
        for (const segment of segments) {
          const wordParts: string[] = [];
          segment.words.forEach((word, localIdx) => {
            const globalIdx = (segment.globalStartIndex ?? 0) + localIdx;
            if (!deletedSet.has(globalIdx)) {
              wordParts.push(word.word.trim());
            }
          });
          if (wordParts.length === 0) continue;
          const line = segment.speaker
            ? `${segment.speaker}: ${wordParts.join(' ')}`
            : wordParts.join(' ');
          lines.push(line);
        }
        return lines.join('\n');
      },

      applyPastedTranscript: (pastedText) => {
        const { words, deletedRanges } = get();

        const deletedIndices = diffTranscript(words, pastedText, buildDeletedSet(deletedRanges));

        if (deletedIndices.length === 0) {
          return { deletedCount: 0, rangeCount: 0 };
        }

        const groups = groupContiguousIndices(deletedIndices);
        const newRanges: DeletedRange[] = groups.map((group) => ({
          id: `dr_${nextRangeId++}`,
          start: words[group[0]].start,
          end: words[group[group.length - 1]].end,
          wordIndices: group,
        }));

        set({ deletedRanges: [...deletedRanges, ...newRanges] });

        return { deletedCount: deletedIndices.length, rangeCount: newRanges.length };
      },

      loadProject: (data) => {
        const backend = get().backendUrl;
        const url = `${backend}/file?path=${encodeURIComponent(data.videoPath)}`;

        let globalIdx = 0;
        const annotatedSegments = (data.segments || []).map((seg: Segment) => {
          const annotated = { ...seg, globalStartIndex: globalIdx };
          globalIdx += seg.words.length;
          return annotated;
        });

        set({
          ...initialState,
          backendUrl: backend,
          videoPath: data.videoPath,
          videoUrl: url,
          words: data.words || [],
          segments: annotatedSegments,
          deletedRanges: data.deletedRanges || [],
          language: data.language || '',
        });
      },

      reset: () => set(initialState),
    }),
    {
      limit: 100,
      partialize: (state) => ({
        words: state.words,
        deletedRanges: state.deletedRanges,
        segments: state.segments,
        language: state.language,
      }),
    },
  ),
);
