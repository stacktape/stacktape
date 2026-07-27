import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const treeMode = args.includes('--tree');
const repositoryArgument = args.find((argument) => !argument.startsWith('-'));
const repositoryRoot = path.resolve(repositoryArgument ?? process.cwd());

const detectors = [
  {
    git: '-----BEGIN ([A-Z0-9]+ )?PRIVATE KEY-----',
    js: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/,
    label: 'private key'
  },
  {
    git: '(AKIA|ASIA)[A-Z0-9]{16}',
    js: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    label: 'AWS access key'
  },
  {
    git: 'gh[pousr]_[A-Za-z0-9]{36,255}',
    js: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/,
    label: 'GitHub token'
  },
  {
    git: 'xox[baprs]-[A-Za-z0-9-]{10,255}',
    js: /\bxox[baprs]-[A-Za-z0-9-]{10,255}\b/,
    label: 'Slack token'
  },
  {
    git: '[A-Za-z][A-Za-z0-9+.-]*://[^/[:space:]:@]+:[^/[:space:]@]+@',
    js: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i,
    label: 'credential-bearing URL'
  },
  {
    git: 'eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}',
    js: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    label: 'JWT'
  }
];

// AWS publishes these two identifiers in its own documentation, and they appear verbatim in the CloudFormation
// resource schemas the CLI vendors.
const documentedAwsExampleKeys = new Set(['AKIAIOSFODNN7EXAMPLE', 'ASIAIOSFODNN7EXAMPLE']);

const placeholderCredentials = new Set([
  'changeme',
  'default',
  'example',
  'pass',
  'password',
  'placeholder',
  'secret',
  'user',
  'username'
]);

// A database CLI builds and documents connection strings, so URL shape alone cannot separate a leak from a template.
// A match only counts when the credentials are neither interpolated nor an obvious stand-in.
const isPlaceholderCredentialUrl = (match) => {
  const credentials = /:\/\/([^/:@\s]+):([^/@\s]+)@/.exec(match);
  if (!credentials) {
    return false;
  }
  const [, user, password] = credentials;
  return [user, password].some((part) => /[${}<>%]/.test(part)) || placeholderCredentials.has(password.toLowerCase());
};

const isSyntheticMatch = (label, match) => {
  if (label === 'AWS access key') {
    return documentedAwsExampleKeys.has(match);
  }
  if (label === 'credential-bearing URL') {
    return isPlaceholderCredentialUrl(match);
  }
  return false;
};

const hasRealMatch = (detector, text) => {
  const matcher = new RegExp(detector.js.source, `${detector.js.flags.replace('g', '')}g`);
  for (const [match] of text.matchAll(matcher)) {
    if (!isSyntheticMatch(detector.label, match)) {
      return true;
    }
  }
  return false;
};

const gitDiff = (root, diffArguments) => {
  const result = spawnSync('git', ['diff', '--cached', '--no-ext-diff', '--diff-filter=ACMRTUXB', ...diffArguments], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0 || result.error) {
    throw new Error(`Unable to inspect staged changes.\n${result.stderr ?? result.error?.message ?? ''}`);
  }
  return result.stdout;
};

const scanStagedDiff = (root) => {
  const findings = [];
  for (const detector of detectors) {
    // Narrowing to the files whose staged changes touch the pattern keeps a large commit from being materialised
    // as one diff, then each candidate is inspected on its own to keep the "newly added lines" semantics.
    const candidates = gitDiff(root, ['--name-only', '-G', detector.git, '--', '.']).split(/\r?\n/).filter(Boolean);

    for (const file of candidates) {
      const addedLines = gitDiff(root, ['--unified=0', '--', file])
        .split(/\r?\n/)
        .filter((line) => line.startsWith('+') && !line.startsWith('+++'));

      if (addedLines.some((line) => hasRealMatch(detector, line.slice(1)))) {
        findings.push(`${file}: possible ${detector.label}`);
      }
    }
  }
  return findings;
};

const scanTrackedTree = (root) => {
  const findings = [];
  for (const detector of detectors) {
    // `--only-matching` keeps the output small even for the vendored multi-megabyte schema files and lets the
    // synthetic-value filter run on the match itself. Matched values stay internal; only file names are reported.
    const result = spawnSync('git', ['grep', '--only-matching', '-H', '-I', '-E', '-e', detector.git, '--', '.'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    });
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`Unable to scan tracked files.\n${result.stderr}`);
    }
    if (result.status !== 0) {
      continue;
    }
    const flagged = new Set();
    for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
      const separator = line.indexOf(':');
      const file = line.slice(0, separator);
      const match = line.slice(separator + 1);
      if (!isSyntheticMatch(detector.label, match)) {
        flagged.add(file);
      }
    }
    for (const file of flagged) {
      findings.push(`${file}: possible ${detector.label}`);
    }
  }
  return findings;
};

const findings = treeMode ? scanTrackedTree(repositoryRoot) : scanStagedDiff(repositoryRoot);
const privateRoot = path.join(repositoryRoot, 'apps', 'console');
if (treeMode && existsSync(path.join(privateRoot, 'api', 'package.json'))) {
  findings.push(...scanTrackedTree(privateRoot).map((finding) => `apps/console/${finding}`));
}

if (findings.length > 0) {
  process.stderr.write(
    `Refusing ${treeMode ? 'validation' : 'commit'} because ${
      treeMode ? 'tracked files' : 'newly staged lines'
    } resemble secrets:\n${findings
      .map((finding) => `- ${finding}`)
      .join(
        '\n'
      )}\nMove real values to the approved secret store. If this is synthetic test data, use a clearly non-secret placeholder that does not match a credential format.\n`
  );
  process.exit(1);
}
