const STORAGE_KEY = "xeno-intellisense-dismissed";

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set].slice(-50)));
  } catch {
    /* ignore */
  }
}

export function dismissalKey(field: string, partial: string, suggestion: string): string {
  return `${field}::${partial}::${suggestion}`;
}

export function isDismissed(field: string, partial: string, suggestion: string): boolean {
  return loadDismissed().has(dismissalKey(field, partial, suggestion));
}

export function recordDismissal(field: string, partial: string, suggestion: string) {
  const set = loadDismissed();
  set.add(dismissalKey(field, partial, suggestion));
  saveDismissed(set);
}

export function recordDismissals(
  field: string,
  partial: string,
  suggestions: { suggestion: string }[]
) {
  const set = loadDismissed();
  for (const s of suggestions) {
    set.add(dismissalKey(field, partial, s.suggestion));
  }
  saveDismissed(set);
}

export function clearDismissalsForField(field: string) {
  const set = loadDismissed();
  for (const key of [...set]) {
    if (key.startsWith(`${field}::`)) set.delete(key);
  }
  saveDismissed(set);
}
