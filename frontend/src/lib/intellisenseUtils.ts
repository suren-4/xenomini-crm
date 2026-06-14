/** Accept the first word (or whitespace-delimited chunk) from a ghost suggestion */
export function takeFirstWord(suggestion: string): { word: string; remaining: string } {
  if (!suggestion) return { word: "", remaining: "" };
  const match = suggestion.match(/^(\s*\S+\s?)/);
  if (!match) return { word: suggestion, remaining: "" };
  return {
    word: match[1],
    remaining: suggestion.slice(match[0].length),
  };
}

export function insertAtCursor(value: string, cursor: number, insert: string): string {
  const before = value.slice(0, cursor);
  const after = value.slice(cursor);
  return before + insert + after;
}
