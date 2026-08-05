const SENSITIVE_ASSIGNMENT =
  /\b(password|passwd|secret|token|authorization|api[_-]?key|access[_-]?key|private[_-]?key)\b(\s*[=:]\s*|\s+)((?:Bearer\s+)?[^\s,;]+)/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const AWS_ACCESS_KEY_ID = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;
const URL_CREDENTIALS = /(https?:\/\/)[^/@\s:]+:[^/@\s]+@/gi;
const PRIVATE_KEY = /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g;
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const AWS_ACCOUNT_ID = /\b\d{12}\b/g;
const SENSITIVE_PROPERTY_KEY =
  /(?:password|passwd|secret|token|authorization|api[_-]?key|access[_-]?key|private[_-]?key|cookie)/i;

export const redactTelemetryText = (value: string) =>
  value
    .replace(PRIVATE_KEY, '[REDACTED_PRIVATE_KEY]')
    .replace(URL_CREDENTIALS, '$1[REDACTED]@')
    .replace(SENSITIVE_ASSIGNMENT, '$1$2[REDACTED]')
    .replace(BEARER_TOKEN, 'Bearer [REDACTED]')
    .replace(AWS_ACCESS_KEY_ID, '[REDACTED_AWS_ACCESS_KEY_ID]');

export const redactErrorTelemetryText = (value: string) =>
  redactTelemetryText(value)
    .replace(EMAIL_ADDRESS, '[REDACTED_EMAIL]')
    .replace(AWS_ACCOUNT_ID, '[REDACTED_AWS_ACCOUNT_ID]');

const sanitizeValue = (value: unknown, redactText: (value: string) => string, seen: WeakSet<object>): unknown => {
  if (typeof value === 'string') return redactText(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, redactText, seen));

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_PROPERTY_KEY.test(key) ? '[REDACTED]' : sanitizeValue(item, redactText, seen)
    ])
  );
};

export const sanitizeTelemetryValue = (value: unknown): unknown =>
  sanitizeValue(value, redactTelemetryText, new WeakSet<object>());

export const sanitizeExceptionTelemetryValue = (value: unknown): unknown =>
  sanitizeValue(value, redactErrorTelemetryText, new WeakSet<object>());

export const sanitizeErrorForTelemetry = (error: unknown): Error => {
  const original = error instanceof Error ? error : new Error(String(error));
  const sanitized = new Error(redactErrorTelemetryText(original.message));
  sanitized.name = original.name;
  if (original.stack) sanitized.stack = redactErrorTelemetryText(original.stack);
  return sanitized;
};
