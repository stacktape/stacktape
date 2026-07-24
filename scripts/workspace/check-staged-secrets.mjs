import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repositoryRoot = path.resolve(process.argv[2] ?? process.cwd());
const result = spawnSync('git', ['diff', '--cached', '--no-ext-diff', '--unified=0', '--diff-filter=ACM', '--', '.'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const detectors = [
  ['private key', /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,255}\b/],
  ['credential-bearing URL', /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/]
];

const findings = [];
let currentFile = 'unknown';

for (const line of result.stdout.split(/\r?\n/)) {
  if (line.startsWith('+++ b/')) {
    currentFile = line.slice('+++ b/'.length);
    continue;
  }

  if (!line.startsWith('+') || line.startsWith('+++')) {
    continue;
  }

  for (const [label, pattern] of detectors) {
    if (pattern.test(line.slice(1))) {
      findings.push(`${currentFile}: possible ${label}`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    `Refusing commit because newly staged lines resemble secrets:\n${findings
      .map((finding) => `- ${finding}`)
      .join(
        '\n'
      )}\nMove real values to the approved secret store. If this is synthetic test data, use a clearly non-secret placeholder that does not match a credential format.\n`
  );
  process.exit(1);
}
