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

const scanStagedDiff = (root) => {
  const result = spawnSync(
    'git',
    ['diff', '--cached', '--no-ext-diff', '--unified=0', '--diff-filter=ACMRTUXB', '--', '.'],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(`Unable to inspect staged changes.\n${result.stderr}`);
  }

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
    for (const detector of detectors) {
      if (detector.js.test(line.slice(1))) {
        findings.push(`${currentFile}: possible ${detector.label}`);
      }
    }
  }
  return findings;
};

const scanTrackedTree = (root) => {
  const findings = [];
  for (const detector of detectors) {
    const result = spawnSync('git', ['grep', '--files-with-matches', '-I', '-E', '-e', detector.git, '--', '.'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    });
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`Unable to scan tracked files.\n${result.stderr}`);
    }
    if (result.status === 0) {
      for (const file of result.stdout.trim().split(/\r?\n/).filter(Boolean)) {
        findings.push(`${file}: possible ${detector.label}`);
      }
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
