export const STACKTAPE_BASH_INVOCATION_RE =
  /(?:^|[;&|]\s*)(?:\s*[A-Z_][A-Z0-9_]*=(?:"[^"]*"|'[^']*'|\S+))*\s*(?:(?:\.{0,2}[\\/]|[A-Za-z]:[\\/]|~[\\/])?(?:[\w.-]+[\\/])*stacktape(?:\.(?:cmd|exe))?|(?:bunx|npx|pnpm|yarn|npm)\s+(?:exec\s+)?stacktape)\s+[A-Za-z0-9:_-]+/i;

export const CREDENTIAL_FILE_ACCESS_RE =
  /(?:^|[;&|]\s*)(?:cat|type|Get-Content|gc|more|less|python3?|node|bun|jq)\b[\s\S]*(?:persisted-state\.json|(?:~|\$HOME|%USERPROFILE%|[A-Za-z]:[\\/]Users[\\/][^\\/]+)[\\/]\.stacktape[\\/]|(?:~|\$HOME|%USERPROFILE%|[A-Za-z]:[\\/]Users[\\/][^\\/]+)[\\/]\.aws[\\/](?:credentials|config)|(?:~|\$HOME|%USERPROFILE%|[A-Za-z]:[\\/]Users[\\/][^\\/]+)[\\/]\.ssh[\\/])/i;

export const SENSITIVE_FILE_PATH_RE =
  /(?:persisted-state\.json|(?:~|\$HOME|%USERPROFILE%|[A-Za-z]:[\\/]Users[\\/][^\\/]+)[\\/]\.stacktape[\\/]|(?:~|\$HOME|%USERPROFILE%|[A-Za-z]:[\\/]Users[\\/][^\\/]+)[\\/]\.aws[\\/](?:credentials|config)|(?:~|\$HOME|%USERPROFILE%|[A-Za-z]:[\\/]Users[\\/][^\\/]+)[\\/]\.ssh[\\/])/i;

export const redactSensitiveText = (text: string): string =>
  text
    .replace(/STACKTAPE_API_KEY=(?:"[^"]+"|'[^']+'|[^\s"';&|]+)/gi, 'STACKTAPE_API_KEY=<REDACTED>')
    .replace(/STP_API_KEY=(?:"[^"]+"|'[^']+'|[^\s"';&|]+)/gi, 'STP_API_KEY=<REDACTED>')
    .replace(/(STACKTAPE_API_KEY=<REDACTED>)["']?[A-Za-z0-9._-]{8,}["']?/gi, '$1')
    .replace(/(STP_API_KEY=<REDACTED>)["']?[A-Za-z0-9._-]{8,}["']?/gi, '$1')
    .replace(
      /(["']?(?:apiKey|api_key|STACKTAPE_API_KEY|STP_API_KEY)["']?\s*[:=]\s*)["'][A-Za-z0-9._-]{16,}["']/gi,
      '$1"<REDACTED>"'
    )
    .replace(/\bstp_(?:live|test)_[A-Za-z0-9]+_[A-Za-z0-9._-]{12,}\b/g, (match) => `${match.slice(0, 16)}<REDACTED>`)
    .replace(/\bsk_(?:live|test)_[A-Za-z0-9._-]{8,}/g, (match) => `${match.slice(0, 8)}<REDACTED>`)
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{16,}/g, (match) => `${match.slice(0, 8)}<REDACTED>`)
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}/g, (match) => `${match.slice(0, 8)}<REDACTED>`)
    .replace(/\bpostgres(?:ql)?:\/\/[^:\s/@]+:[^\s/@]+@/gi, 'postgresql://<REDACTED>@')
    .replace(/\bmysql:\/\/[^:\s/@]+:[^\s/@]+@/gi, 'mysql://<REDACTED>@');
