import { useCallback, useMemo, useState } from 'react';
import { useAutoReset } from '../hooks/useAutoReset';
import { useEditorStore } from '../store/editorStore';
import { useAIStore } from '../store/aiStore';
import { Sparkles, Scissors, Film, Loader2, Check, X, Play, Download } from 'lucide-react';
import type { ClipSuggestion } from '../types/project';
import { exportToFile } from '../utils/exportToFile';

export default function AIPanel() {
  const { words, videoPath, backendUrl, deleteWordRange, setCurrentTime, getKeepSegments, deletedRanges } = useEditorStore();
  const {
    defaultProvider,
    providers,
    customFillerWords,
    fillerResult,
    clipSuggestions,
    isProcessing,
    processingMessage,
    setCustomFillerWords,
    setFillerResult,
    setClipSuggestions,
    setProcessing,
  } = useAIStore();

  const [activeTab, setActiveTab] = useState<'filler' | 'clips'>('filler');

  const detectFillers = useCallback(async () => {
    if (words.length === 0) return;
    setProcessing(true, 'Detecting filler words...');
    try {
      const config = providers[defaultProvider];
      const transcript = words.map((w) => w.word).join(' ');
      const res = await fetch(`${backendUrl}/ai/filler-removal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          words: words.map((w, i) => ({ index: i, word: w.word })),
          provider: defaultProvider,
          model: config.model,
          api_key: config.apiKey || undefined,
          base_url: config.baseUrl || undefined,
          custom_filler_words: customFillerWords || undefined,
        }),
      });
      if (!res.ok) throw new Error('Filler detection failed');
      const data = await res.json();
      setFillerResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, [words, backendUrl, defaultProvider, providers, customFillerWords, setProcessing, setFillerResult]);

  const createClips = useCallback(async () => {
    if (words.length === 0) return;
    setProcessing(true, 'Finding best clip segments...');
    try {
      const config = providers[defaultProvider];
      const transcript = words.map((w) => w.word).join(' ');
      const res = await fetch(`${backendUrl}/ai/create-clip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          words: words.map((w, i) => ({
            index: i,
            word: w.word,
            start: w.start,
            end: w.end,
          })),
          provider: defaultProvider,
          model: config.model,
          api_key: config.apiKey || undefined,
          base_url: config.baseUrl || undefined,
          target_duration: 60,
        }),
      });
      if (!res.ok) throw new Error('Clip creation failed');
      const data = await res.json();
      setClipSuggestions(data.clips || []);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, [words, backendUrl, defaultProvider, providers, setProcessing, setClipSuggestions]);

  const applyFillerDeletions = useCallback(() => {
    if (!fillerResult) return;
    const sorted = [...fillerResult.fillerWords].sort((a, b) => b.index - a.index);
    for (const fw of sorted) {
      deleteWordRange(fw.index, fw.index);
    }
    setFillerResult(null);
  }, [fillerResult, deleteWordRange, setFillerResult]);

  const handlePreviewClip = useCallback(
    (clip: ClipSuggestion) => {
      setCurrentTime(clip.startTime);
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = clip.startTime;
        video.play();
      }
    },
    [setCurrentTime],
  );

  // Compute keep-segments for each clip; recomputes when cuts or clip list change.
  const clipSegmentMap = useMemo(() => {
    const allSegments = getKeepSegments();
    return clipSuggestions.map((clip) => {
      const clipped = allSegments
        .filter((s) => s.end > clip.startTime && s.start < clip.endTime)
        .map((s) => ({ start: Math.max(s.start, clip.startTime), end: Math.min(s.end, clip.endTime) }));
      return clipped.length > 0 ? clipped : [{ start: clip.startTime, end: clip.endTime }];
    });
  }, [clipSuggestions, deletedRanges, getKeepSegments]);

  const [exportingClipIndex, setExportingClipIndex] = useState<number | null>(null);
  const [exportedClipIndex, setExportedClipIndex] = useAutoReset<number | null>(null, 3000);
  const [exportClipError, setExportClipError] = useAutoReset<string | null>(null, 3000);

  const handleExportClip = useCallback(
    async (clip: ClipSuggestion, index: number, keepSegments: Array<{ start: number; end: number }>) => {
      if (!videoPath) return;
      setExportingClipIndex(index);
      setExportedClipIndex(null);
      setExportClipError(null);

      const safeName = clip.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
      const mode = keepSegments.length > 1 ? 'reencode' : 'fast';

      try {
        const saved = await exportToFile({
          backendUrl,
          body: { input_path: videoPath, keep_segments: keepSegments, mode, format: 'mp4' },
          suggestedName: `${safeName}_clip.mp4`,
          format: 'mp4',
          electronDefaultPath: videoPath.replace(/[^/\\]*$/, `${safeName}_clip.mp4`),
        });
        if (saved) {
          setExportedClipIndex(index);
        }
      } catch (err) {
        console.error(err);
        setExportClipError('Export failed');
      } finally {
        setExportingClipIndex(null);
      }
    },
    [videoPath, backendUrl],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-editor-border shrink-0">
        <TabButton
          active={activeTab === 'filler'}
          onClick={() => setActiveTab('filler')}
          icon={<Scissors className="w-3.5 h-3.5" />}
          label="Filler Words"
        />
        <TabButton
          active={activeTab === 'clips'}
          onClick={() => setActiveTab('clips')}
          icon={<Film className="w-3.5 h-3.5" />}
          label="Create Clips"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'filler' && (
          <div className="space-y-4">
            <p className="text-xs text-editor-text-muted">
              Use AI to detect and remove filler words like "um", "uh", "like", "you know" from
              your transcript.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] text-editor-text-muted font-medium">
                Custom filler words (comma-separated)
              </label>
              <input
                type="text"
                value={customFillerWords}
                onChange={(e) => setCustomFillerWords(e.target.value)}
                placeholder="e.g. okay, alright, anyway"
                className="w-full px-2.5 py-1.5 text-xs bg-editor-surface border border-editor-border rounded focus:border-editor-accent focus:outline-none"
              />
            </div>
            <button
              onClick={detectFillers}
              disabled={isProcessing || words.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-editor-accent hover:bg-editor-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {processingMessage}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Detect Filler Words
                </>
              )}
            </button>

            {fillerResult && fillerResult.fillerWords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    Found {fillerResult.fillerWords.length} filler words
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={applyFillerDeletions}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-success/20 text-editor-success rounded hover:bg-editor-success/30"
                    >
                      <Check className="w-3 h-3" /> Apply All
                    </button>
                    <button
                      onClick={() => setFillerResult(null)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-border text-editor-text-muted rounded hover:bg-editor-surface"
                    >
                      <X className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {fillerResult.fillerWords.map((fw) => (
                    <div
                      key={fw.index}
                      className="flex items-center justify-between px-2 py-1.5 bg-editor-word-filler rounded text-xs"
                    >
                      <span>
                        <strong>"{fw.word}"</strong>
                        <span className="text-editor-text-muted ml-1">— {fw.reason}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fillerResult && fillerResult.fillerWords.length === 0 && (
              <p className="text-xs text-editor-success">No filler words detected.</p>
            )}
          </div>
        )}

        {activeTab === 'clips' && (
          <div className="space-y-4">
            <p className="text-xs text-editor-text-muted">
              AI analyzes your transcript and suggests the most engaging segments for a
              YouTube Short or social media clip.
            </p>
            <button
              onClick={createClips}
              disabled={isProcessing || words.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-editor-accent hover:bg-editor-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {processingMessage}
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  Find Best Clips
                </>
              )}
            </button>

            {clipSuggestions.length > 0 && (
              <div className="space-y-3">
                {clipSuggestions.map((clip, i) => {
                  const keepSegments = clipSegmentMap[i];
                  const hasCuts = keepSegments.length > 1;
                  return (
                  <div key={i} className="p-3 bg-editor-surface rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{clip.title}</span>
                      <span className="text-[10px] text-editor-text-muted">
                        {Math.round(clip.endTime - clip.startTime)}s
                      </span>
                    </div>
                    <p className="text-[11px] text-editor-text-muted">{clip.reason}</p>
                    {hasCuts && (
                      <p className="text-[10px] text-editor-accent">
                        Contains word-level cuts — will re-encode on export.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewClip(clip)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
                      >
                        <Play className="w-3 h-3" /> Preview
                      </button>
                      <button
                        onClick={() => handleExportClip(clip, i, keepSegments)}
                        disabled={exportingClipIndex === i}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-editor-success/20 text-editor-success rounded hover:bg-editor-success/30 disabled:opacity-50 transition-colors"
                      >
                        {exportingClipIndex === i ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : exportedClipIndex === i ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {exportedClipIndex === i ? 'Saved!' : 'Export'}
                      </button>
                    </div>
                  </div>
                  );
                })}
                {exportClipError && (
                  <p className="text-[10px] text-editor-danger text-center">{exportClipError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
        active
          ? 'border-editor-accent text-editor-accent'
          : 'border-transparent text-editor-text-muted hover:text-editor-text'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
