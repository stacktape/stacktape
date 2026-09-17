/**
 * Masks known shapes of sensitive text in error events: once in the customer's account before an event leaves it, and
 * again when the Console receives it. Deliberately narrow, like Sentry's default scrubbing: secrets and tokens, values
 * under sensitive key names, email addresses, IP addresses, card numbers and user home paths. Names, street addresses
 * and phone numbers are not guessed at, because those patterns also match ids, ports and timestamps in log lines and
 * would destroy the detail a developer needs. Every mask says what it replaced, so a reader knows text was removed.
 *
 * Error text is full of the words this file looks for (`TokenExpiredError`, `secretsmanager:GetSecretValue`,
 * `Bearer token is missing`), so each rule also checks that what follows looks like a value rather than prose or code.
 *
 * Every rule that begins with a character class is anchored with a lookbehind, so a long run of letters is scanned
 * once instead of from every position; the scrub stays linear in the length of the text.
 */

/**
 * A key that names something secret, with a bounded prefix and suffix (`DB_PASSWORD`, `x-api-key`, `refresh_token`),
 * starting at a boundary. A key that ends like an error class (`TokenExpiredError`, `CredentialsProviderError`) is
 * not a key.
 */
const SENSITIVE_KEY = String.raw`(?<![A-Za-z0-9_.-])[A-Za-z0-9_.-]{0,40}?(?:password|passwd|pwd|secret|token|api[_-]?key|authorization|credentials?|cookie|session[_-]?id|sessionid|private[_-]?key|csrf|xsrf|access[_-]?key[_-]?id)[A-Za-z0-9_.-]{0,40}(?<!error|exception|fault|failure)`;

/**
 * `=` with optional spaces, or `:` followed by a space or by a quoted or bracketed value. A colon glued to the next
 * character is code, not a key/value pair: `token.ts:42:7`, `secretsmanager:GetSecretValue`, `arn:aws:...:secret:name`.
 */
const SEPARATOR = String.raw`(?:[ \t]*=[ \t]*|[ \t]*:[ \t]+|[ \t]*:(?=\\?["']|\[))`;

/**
 * `key=value`, `key: value`, `"key": "value"` and the same inside a JSON string (`\"key\":\"value\"`). The value is a
 * quoted string, a bracketed list, or bare text up to whitespace or a JSON, query or list separator. A value that is
 * an authorization scheme followed by a credential is left to the scheme rule; an earlier mask is left alone.
 */
const KEY_VALUE = new RegExp(
  String.raw`((?:\\?["'])?${SENSITIVE_KEY}(?:\\?["'])?${SEPARATOR})(?!\[redacted|(?:Bearer|Basic|Token)[ \t]+\S)(\\"(?:\\.|[^"\\\r\n])*?\\"|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|\[[^\]\r\n]*\]|[^\s,;&}\]]+)`,
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

/**
 * `Bearer <token>`, `Basic <base64>`, `Token <token>`. Four characters already encode a user and a password, but the
 * text after the scheme word has to look like a credential (a digit, a symbol or a capital letter inside it), or
 * `Bearer token is missing` and `basic configuration` would lose a word.
 */
const AUTHORIZATION_SCHEME = /\b(Bearer|Basic|Token)[ \t]+([A-Za-z0-9._~+/=-]{4,})/gi;

const looksLikeCredential = (candidate: string) =>
  /[0-9_~+/=-]/.test(candidate) || /\.[A-Za-z0-9]/.test(candidate) || /[a-z][A-Z]/.test(candidate);

/** A URL whose authority carries a user and a password before the host, including database connection strings. */
const URL_CREDENTIALS = /(?<![a-z0-9+.-])([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi;

const EMAIL = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g;

const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6 = /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi;

/**
 * 13 to 19 digits, optionally grouped by spaces or dashes, that start like a card of a major network and pass the Luhn
 * checksum. The checksum alone would mask one in ten timestamps and order ids.
 */
const CARD_NUMBER = /\b(?:\d[ -]?){12,18}\d\b/g;
const CARD_PREFIX =
  /^(?:4|5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720|3[47]|6011|65|64[4-9]|62|35(?:2[89]|[3-8]\d)|30[0-5]|3[689])/;

/** `/Users/<name>`, `/home/<name>` and `C:\Users\<name>`, whether a separator, a quote, whitespace or the end follows. */
const HOME_DIRECTORY = /(\/(?:Users|home)\/)[^/\s'"]+(?=[/\s'"]|$)|([A-Za-z]:\\Users\\)[^\\\s'"]+(?=[\\\s'"]|$)/g;

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

const isCardNumber = (candidate: string) => {
  const digits = candidate.replaceAll(/\D/g, '');
  return CARD_PREFIX.test(digits) && luhnValid(digits);
};

const isIpv4 = (candidate: string) => candidate.split('.').every((octet) => Number(octet) <= 255);

export const scrubSensitiveText = (text: string): string => {
  if (!text) return text;
  let result = text.replace(PRIVATE_KEY_BLOCK, '[redacted:private-key]');
  for (const token of TOKENS) result = result.replace(token, '[redacted:secret]');
  result = result.replace(AUTHORIZATION_SCHEME, (match, scheme: string, credential: string) =>
    looksLikeCredential(credential) ? `${scheme} [redacted:secret]` : match
  );
  result = result.replace(URL_CREDENTIALS, '$1[redacted:credentials]@');
  result = result.replace(KEY_VALUE, '$1[redacted]');
  result = result.replace(EMAIL, (match) => `[redacted:email]@${match.slice(match.indexOf('@') + 1)}`);
  result = result.replace(IPV4, (match) => (isIpv4(match) ? '[redacted:ip]' : match));
  result = result.replace(IPV6, '[redacted:ip]');
  result = result.replace(CARD_NUMBER, (match) => (isCardNumber(match) ? '[redacted:card]' : match));
  result = result.replace(
    HOME_DIRECTORY,
    (_match, unixPrefix, windowsPrefix) => `${unixPrefix ?? windowsPrefix}[user]`
  );
  return result;
};

/** True when scrubbing would change the text; lets a caller record that it masked something. */
export const containsSensitiveText = (text: string): boolean => scrubSensitiveText(text) !== text;
