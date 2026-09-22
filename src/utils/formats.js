// Helpers shared by the Important formats screen and its preview.

export const CHANNEL_TONE = {
  whatsapp: 'ok',
  email: 'info',
  sms: 'warn',
  call: 'neutral',
  other: 'neutral',
};

/**
 * Swap {{token}} for a value. Used by the preview with the sample values the
 * API supplies, and by "copy filled" with a real lead's details. A token with
 * no value is left in place, so it is obvious what still needs typing.
 */
export function fillTokens(text = '', values = {}) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (match, key) => (values[key] ? values[key] : match));
}

// Which tokens a format actually uses, in the order they first appear.
export function tokensUsed(...parts) {
  const seen = [];
  parts.filter(Boolean).join('\n').replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    if (!seen.includes(key)) seen.push(key);
    return _m;
  });
  return seen;
}

export const sampleValues = (placeholders = []) =>
  Object.fromEntries(placeholders.map((p) => [p.token.replace(/[{}]/g, ''), p.sample]));

// Best-effort clipboard write; returns false when the browser blocks it.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const bytes = (n = 0) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
