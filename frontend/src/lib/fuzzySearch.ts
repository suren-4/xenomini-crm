/**
 * Subsequence fuzzy match — returns a score (higher = better) or null if no match.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();

  if (!q) return 1;

  let score = 0;
  let tIndex = 0;
  let consecutive = 0;
  let lastMatchIndex = -1;

  for (let i = 0; i < q.length; i++) {
    const char = q[i];
    const found = t.indexOf(char, tIndex);
    if (found === -1) return null;

    if (found === lastMatchIndex + 1) {
      consecutive++;
      score += consecutive * 3;
    } else {
      consecutive = 0;
      score += 1;
    }

    if (found === 0 || t[found - 1] === " " || t[found - 1] === "-") {
      score += 4;
    }

    lastMatchIndex = found;
    tIndex = found + 1;
  }

  score -= t.length * 0.05;
  if (t.startsWith(q)) score += 10;

  return score;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getSearchable: (item: T) => string
): T[] {
  if (!query.trim()) return items;

  const scored = items
    .map((item) => {
      const text = getSearchable(item);
      const score = fuzzyScore(query, text);
      return score !== null ? { item, score } : null;
    })
    .filter((x): x is { item: T; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.item);
}
