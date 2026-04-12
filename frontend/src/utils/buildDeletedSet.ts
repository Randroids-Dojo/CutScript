import type { DeletedRange } from '../types/project';

export function buildDeletedSet(deletedRanges: DeletedRange[]): Set<number> {
  const set = new Set<number>();
  for (const range of deletedRanges) {
    for (const idx of range.wordIndices) set.add(idx);
  }
  return set;
}
