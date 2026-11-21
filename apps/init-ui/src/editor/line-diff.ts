/**
 * Which lines of `after` are new or changed compared with `before`: the ones outside their longest common subsequence.
 *
 * Used to flash what a setting rewrote in the file. Two separate changes flash as two places, not as everything between
 * them. The files are a few hundred lines at most, so the quadratic table is small; above the cap it falls back to the
 * span between the common start and end.
 */
const CAP = 1_000_000;

export const changedLines = (before: string, after: string): number[] => {
  if (before === after) return [];
  const old = before.split('\n');
  const next = after.split('\n');
  let start = 0;
  while (start < old.length && start < next.length && old[start] === next[start]) start += 1;
  let end = 0;
  while (
    end < old.length - start &&
    end < next.length - start &&
    old[old.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end += 1;
  }
  const a = old.slice(start, old.length - end);
  const b = next.slice(start, next.length - end);
  if (b.length === 0) return [];
  if (a.length * b.length > CAP) return b.map((_, index) => start + index + 1);

  // lengths[i][j]: the longest common subsequence of a[i..] and b[j..].
  const lengths = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i]![j] = a[i] === b[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }
  const changed: number[] = [];
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) {
      i += 1;
      j += 1;
    } else if (i < a.length && lengths[i + 1]![j]! >= lengths[i]![j + 1]!) {
      i += 1;
    } else {
      changed.push(start + j + 1);
      j += 1;
    }
  }
  return changed;
};
