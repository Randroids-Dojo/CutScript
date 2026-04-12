import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { diffTranscript, groupContiguousIndices } from '../utils/diffTranscript';
import { buildDeletedSet } from '../utils/buildDeletedSet';

interface Props {
  onClose: () => void;
}

interface Preview {
  deletedCount: number;
  rangeCount: number;
  totalActive: number;
}

export default function PasteTranscriptDialog({ onClose }: Props) {
  const words = useEditorStore((s) => s.words);
  const deletedRanges = useEditorStore((s) => s.deletedRanges);
  const applyPastedTranscript = useEditorStore((s) => s.applyPastedTranscript);

  const [pastedText, setPastedText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (pastedText.trim() === '') {
      setPreview(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const alreadyDeletedSet = buildDeletedSet(deletedRanges);
      const totalActive = words.length - alreadyDeletedSet.size;
      const deletedIndices = diffTranscript(words, pastedText, alreadyDeletedSet);
      const rangeCount = groupContiguousIndices(deletedIndices).length;
      setPreview({ deletedCount: deletedIndices.length, rangeCount, totalActive });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pastedText, words, deletedRanges]);

  const handleApply = () => {
    applyPastedTranscript(pastedText);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const allDeleted = preview !== null && preview.deletedCount === preview.totalActive;
  const noChanges = preview !== null && preview.deletedCount === 0;
  const percent = preview !== null && preview.totalActive > 0
    ? Math.round((preview.deletedCount / preview.totalActive) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-editor-surface border border-editor-border rounded-lg w-full max-w-lg shadow-xl flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-editor-text">Paste Edited Transcript</h2>
          <button
            onClick={onClose}
            className="text-editor-text-muted hover:text-editor-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-editor-text-muted">
          Paste your edited transcript below. Deleted words will be cut automatically.
          Modified words are ignored — only deletions are detected.
        </p>

        <textarea
          className="w-full h-48 bg-editor-bg border border-editor-border rounded p-3 text-sm text-editor-text placeholder:text-editor-text-muted resize-none focus:outline-none focus:border-editor-accent font-mono"
          placeholder="Paste your edited transcript here..."
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          autoFocus
        />

        {preview && (
          <div
            className={`text-xs rounded p-3 border ${
              allDeleted
                ? 'bg-editor-danger/10 border-editor-danger/30 text-editor-danger'
                : 'bg-editor-bg border-editor-border text-editor-text-muted'
            }`}
          >
            {allDeleted ? (
              <span>Warning: this would delete all remaining words in the transcript.</span>
            ) : noChanges ? (
              <span>No changes detected — the pasted text matches the current transcript.</span>
            ) : (
              <span>
                <span className="text-editor-text font-medium">{preview.deletedCount}</span> words
                will be cut ({percent}% of transcript) &middot;{' '}
                <span className="text-editor-text font-medium">{preview.rangeCount}</span> cut
                {preview.rangeCount !== 1 ? 's' : ''} will be created
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-editor-text-muted hover:text-editor-text border border-editor-border rounded hover:bg-editor-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!preview || noChanges || allDeleted}
            className="px-3 py-1.5 text-xs bg-editor-accent text-white rounded hover:bg-editor-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply Cuts
          </button>
        </div>
      </div>
    </div>
  );
}
