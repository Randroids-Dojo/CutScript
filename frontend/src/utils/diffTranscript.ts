import type { Word } from '../types/project';

function normalizeWord(w: string): string {
  return w.trim().toLowerCase().replace(/[^\w']/g, '');
}

/**
 * Groups a sorted array of integers into contiguous runs.
 * e.g. [1,2,3,7,8,10] → [[1,2,3],[7,8],[10]]
 * Input must be sorted ascending; unsorted input produces incorrect groups.
 */
export function groupContiguousIndices(indices: number[]): number[][] {
  if (indices.length === 0) return [];
  const groups: number[][] = [];
  let groupStart = 0;
  for (let i = 1; i <= indices.length; i++) {
    if (i === indices.length || indices[i] !== indices[i - 1] + 1) {
      groups.push(indices.slice(groupStart, i));
      groupStart = i;
    }
  }
  return groups;
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
  const activeWords: Array<{ globalIndex: number; normalized: string }> = [];
  for (let i = 0; i < originalWords.length; i++) {
    if (!alreadyDeletedIndices.has(i)) {
      const norm = normalizeWord(originalWords[i].word);
      if (norm.length > 0) {
        activeWords.push({ globalIndex: i, normalized: norm });
      }
    }
  }

  const pastedTokens = pastedText
    .split(/\s+/)
    .map(normalizeWord)
    .filter((w) => w.length > 0);

  if (pastedTokens.length === 0) {
    return activeWords.map((w) => w.globalIndex);
  }

  const n = activeWords.length;
  const m = pastedTokens.length;

  // Uint32Array supports transcripts up to ~4B words; Uint16 would overflow at 65k.
  const dp = new Uint32Array((n + 1) * (m + 1));

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

  const inLCS = new Set<number>();
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

  const deletedIndices: number[] = [];
  for (let k = 0; k < activeWords.length; k++) {
    if (!inLCS.has(k)) {
      deletedIndices.push(activeWords[k].globalIndex);
    }
  }

  return deletedIndices;
}
