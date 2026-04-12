import type { Word } from '../types/project';

function normalizeWord(w: string): string {
  return w.trim().toLowerCase().replace(/[^\w']/g, '');
}

/**
 * Diffs an original word list against pasted text using LCS to find deleted words.
 * Only detects deletions — modified words are treated as delete+insert and are ignored.
 *
 * @param originalWords - Full word array from the transcript
 * @param pastedText - User-edited text pasted back in
 * @param alreadyDeletedIndices - Global indices already deleted (excluded from diff)
 * @returns Sorted array of global word indices that should be newly deleted
 */
export function diffTranscript(
  originalWords: Word[],
  pastedText: string,
  alreadyDeletedIndices: Set<number>,
): number[] {
  // Build list of active (non-deleted) words with their global indices
  const activeWords: Array<{ globalIndex: number; normalized: string }> = [];
  for (let i = 0; i < originalWords.length; i++) {
    if (!alreadyDeletedIndices.has(i)) {
      const norm = normalizeWord(originalWords[i].word);
      if (norm.length > 0) {
        activeWords.push({ globalIndex: i, normalized: norm });
      }
    }
  }

  // Tokenize the pasted text
  const pastedTokens = pastedText
    .split(/\s+/)
    .map(normalizeWord)
    .filter((w) => w.length > 0);

  // If paste is empty, mark all active words as deleted
  if (pastedTokens.length === 0) {
    return activeWords.map((w) => w.globalIndex);
  }

  const n = activeWords.length;
  const m = pastedTokens.length;

  // LCS dynamic programming table
  // Using a flat Uint16Array for performance on large transcripts
  const dp = new Uint16Array((n + 1) * (m + 1));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (activeWords[i - 1].normalized === pastedTokens[j - 1]) {
        dp[i * (m + 1) + j] = dp[(i - 1) * (m + 1) + (j - 1)] + 1;
      } else {
        const up = dp[(i - 1) * (m + 1) + j];
        const left = dp[i * (m + 1) + (j - 1)];
        dp[i * (m + 1) + j] = up >= left ? up : left;
      }
    }
  }

  // Backtrack to find which active word indices are in the LCS
  const inLCS = new Set<number>(); // indices into activeWords array
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (activeWords[i - 1].normalized === pastedTokens[j - 1]) {
      inLCS.add(i - 1);
      i--;
      j--;
    } else if (dp[(i - 1) * (m + 1) + j] >= dp[i * (m + 1) + (j - 1)]) {
      i--;
    } else {
      j--;
    }
  }

  // Any active word not in the LCS is deleted
  const deletedIndices: number[] = [];
  for (let k = 0; k < activeWords.length; k++) {
    if (!inLCS.has(k)) {
      deletedIndices.push(activeWords[k].globalIndex);
    }
  }

  return deletedIndices;
}
