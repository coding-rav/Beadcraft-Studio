/** Levenshtein edit distance (iterative, O(n*m) with two rows). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[b.length]!;
}

function allowedDistance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

/**
 * Typo-friendly matching: compares the query with each word of every candidate
 * and returns candidates within a length-scaled edit distance, best first.
 */
export function fuzzyMatch<T>(query: string, items: T[], getText: (item: T) => string, limit = 8): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const max = allowedDistance(q.length);
  const scored: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const text = getText(item).toLowerCase();
    let best = Infinity;
    for (const word of text.split(/[^a-z0-9]+/).filter(Boolean)) {
      const target = word.length > q.length ? word.slice(0, Math.max(q.length, word.length - 1)) : word;
      best = Math.min(best, levenshtein(q, word), levenshtein(q, target));
    }
    if (best <= max) scored.push({ item, score: best });
  }
  return scored.sort((x, y) => x.score - y.score).slice(0, limit).map((s) => s.item);
}
