/**
 * Masks known shapes of sensitive text in error events: once in the customer's account before an event leaves it, and
 * again when the Console receives it. Deliberately narrow, like Sentry's default scrubbing: secrets and tokens, values
 * under sensitive key names, email addresses, IP addresses, card numbers and user home paths. Names, street addresses
 * and phone numbers are not guessed at, because those patterns also match ids, ports and timestamps in log lines and
 * would destroy the detail a developer needs. Every mask says what it replaced, so a reader knows text was removed.
 */

const SENSITIVE_KEY = String.raw`[A-Za-z0-9_.-]*?(?:password|passwd|pwd|secret|token|api[_-]?key|authorization|credentials?|cookie|session[_-]?id|sessionid|private[_-]?key|csrf|xsrf|access[_-]?key[_-]?id)[A-Za-z0-9_.-]*`;

/**
 * `key=value`, `key: value`, `"key": "value"`; the value ends at whitespace or a JSON, query or list separator. A
 * value that is an authorization scheme word or an earlier mask is left for the rules that handle those.
 */
const KEY_VALUE = new RegExp(
  String.raw`((?:"|')?${SENSITIVE_KEY}(?:"|')?\s*[:=]\s*)(?!\[redacted|(?:Bearer|Basic|Token)\b)("(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|[^\s,;&}\]]+)`,
  'gi'
);

const PRIVATE_KEY_BLOCK = /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----[\s\S]*?(?:-----END (?:[A-Z]+ )*PRIVATE KEY-----|$)/g;

/** Credential formats that are recognizable on their own, without a key name in front of them. */
const TOKENS: RegExp[] = [
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bstp_live_[A-Za-z0-9]+_[A-Za-z0-9]+\b/g,
  /\bstp_job\.[A-Za-z0-9_.-]+/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
];

const AUTHORIZATION_SCHEME = /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{8,}/gi;

/** A URL whose authority carries a user and a password before the host, including database connection strings. */
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi;

const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g;

const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6 = /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi;

/** 13 to 19 digits, optionally grouped by spaces or dashes; only kept when the Luhn checksum holds. */
const CARD_NUMBER = /\b(?:\d[ -]?){12,18}\d\b/g;

const HOME_DIRECTORY = /(\/(?:Users|home)\/)[^/\s'"]+(\/|$)|([A-Za-z]:\\Users\\)[^\\\s'"]+(\\|$)/g;

const luhnValid = (digits: string) => {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
};

const isIpv4 = (candidate: string) => candidate.split('.').every((octet) => Number(octet) <= 255);

export const scrubSensitiveText = (text: string): string => {
  if (!text) return text;
  let result = text.replace(PRIVATE_KEY_BLOCK, '[redacted:private-key]');
  for (const token of TOKENS) result = result.replace(token, '[redacted:secret]');
  result = result.replace(AUTHORIZATION_SCHEME, '$1 [redacted:secret]');
  result = result.replace(URL_CREDENTIALS, '$1[redacted:credentials]@');
  result = result.replace(KEY_VALUE, '$1[redacted]');
  result = result.replace(EMAIL, (match) => `[redacted:email]@${match.slice(match.indexOf('@') + 1)}`);
  result = result.replace(IPV4, (match) => (isIpv4(match) ? '[redacted:ip]' : match));
  result = result.replace(IPV6, '[redacted:ip]');
  result = result.replace(CARD_NUMBER, (match) => (luhnValid(match.replaceAll(/\D/g, '')) ? '[redacted:card]' : match));
  result = result.replace(HOME_DIRECTORY, (_match, unixPrefix, unixSuffix, windowsPrefix, windowsSuffix) =>
    unixPrefix ? `${unixPrefix}[user]${unixSuffix}` : `${windowsPrefix}[user]${windowsSuffix}`
  );
  return result;
};

/** True when scrubbing would change the text; lets a caller record that it masked something. */
export const containsSensitiveText = (text: string): boolean => scrubSensitiveText(text) !== text;
