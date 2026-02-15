export function normalizeSystemPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return '';
  }

  let normalized = trimmed.replace(/\\/g, '/');

  if (/^[a-zA-Z]:$/.test(normalized)) {
    return `${normalized}/`;
  }

  if (normalized.startsWith('//')) {
    const body = normalized.slice(2).replace(/\/{2,}/g, '/');
    normalized = `//${body}`;
  } else {
    normalized = normalized.replace(/\/{2,}/g, '/');
  }

  if (!/^[a-zA-Z]:\/$/.test(normalized)) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized;
}
