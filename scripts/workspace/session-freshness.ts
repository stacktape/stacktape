// Tells an agent session how its checkout relates to the remote before it starts work.
// Agents otherwise trust whatever the local checkout contains, which can be weeks behind origin/main.
// Runs as a Claude Code SessionStart hook (`--hook`) and as `pnpm freshness` for other agents.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type FreshnessFacts = {
  branch: string;
  isMainCheckout: boolean;
  dirtyFiles: number;
  fetchFailed: boolean;
  aheadOfMain: number;
  behindMain: number;
  behindUpstream: number;
  console?: {
    fetchFailed: boolean;
    matchesPointer: boolean;
    behindMain: number;
  };
};

export const describeFreshness = (facts: FreshnessFacts): { summary: string; warnings: string[] } => {
  const warnings: string[] = [];
  const where = facts.isMainCheckout ? 'the shared main checkout' : 'a worktree';
  const summary = `Checkout: ${where}, branch ${facts.branch || '(detached)'}, ${facts.behindMain} behind and ${facts.aheadOfMain} ahead of origin/main, ${facts.dirtyFiles} uncommitted files.`;

  if (facts.fetchFailed) {
    warnings.push(
      'Fetching origin failed, so origin/main may itself be stale. Run `git fetch origin` before relying on it.'
    );
  }
  if (facts.behindMain > 0) {
    warnings.push(
      facts.isMainCheckout && facts.branch === 'main'
        ? `This checkout is ${facts.behindMain} commits behind origin/main. Do not read it as current code: fast-forward it (\`git pull --ff-only\`) when it is clean, and start new work in a worktree based on origin/main.`
        : `This branch is ${facts.behindMain} commits behind origin/main. Check whether the work already landed, and rebase or merge origin/main before testing, reviewing or opening a PR.`
    );
  }
  if (facts.behindUpstream > 0) {
    warnings.push(
      `The remote copy of ${facts.branch} has ${facts.behindUpstream} commits this checkout lacks. Pull them first.`
    );
  }
  if (facts.isMainCheckout && facts.dirtyFiles > 0) {
    warnings.push(
      'The shared main checkout has uncommitted files, possibly from another session. Do not commit or discard them unless the user asks; do code changes in a worktree.'
    );
  }
  if (facts.console && facts.console.fetchFailed) {
    warnings.push('Fetching the private Console repository failed; its origin/main may be stale.');
  }
  if (facts.console && !facts.console.matchesPointer && facts.console.behindMain > 0) {
    warnings.push(
      `apps/console is checked out away from its recorded pointer and is ${facts.console.behindMain} commits behind the Console origin/main. Base Console work on the Console origin/main.`
    );
  }
  return { summary, warnings };
};

const git = (cwd: string, args: readonly string[]): { ok: boolean; out: string } => {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 20_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  });
  return { ok: result.status === 0, out: (result.stdout ?? '').trim() };
};

const aheadBehind = (cwd: string, left: string, right: string): [number, number] => {
  const counts = git(cwd, ['rev-list', '--left-right', '--count', `${left}...${right}`]);
  if (!counts.ok) return [0, 0];
  const [ahead = 0, behind = 0] = counts.out.split(/\s+/).map(Number);
  return [ahead, behind];
};

const collectFacts = (root: string): FreshnessFacts => {
  const branch = git(root, ['branch', '--show-current']).out;
  const upstream = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  const upstreamBranch = upstream.ok && upstream.out.startsWith('origin/') ? upstream.out.slice('origin/'.length) : '';
  // Fetch only what the report compares against; fetching every remote branch takes several seconds.
  const fetchFailed = !git(root, ['fetch', '--quiet', 'origin', 'main', ...(upstreamBranch ? [upstreamBranch] : [])])
    .ok;
  const gitDir = path.resolve(root, git(root, ['rev-parse', '--git-dir']).out);
  const commonDir = path.resolve(root, git(root, ['rev-parse', '--git-common-dir']).out);
  const dirtyFiles = git(root, ['status', '--porcelain']).out.split('\n').filter(Boolean).length;
  const [aheadOfMain, behindMain] = aheadBehind(root, 'HEAD', 'origin/main');
  const behindUpstream = upstream.ok ? aheadBehind(root, 'HEAD', upstream.out)[1] : 0;

  const facts: FreshnessFacts = {
    branch,
    isMainCheckout: gitDir === commonDir,
    dirtyFiles,
    fetchFailed,
    aheadOfMain,
    behindMain,
    behindUpstream
  };

  const consoleRoot = path.join(root, 'apps', 'console');
  if (existsSync(path.join(consoleRoot, '.git'))) {
    const consoleFetchFailed = !git(consoleRoot, ['fetch', '--quiet', 'origin', 'main']).ok;
    const consoleHead = git(consoleRoot, ['rev-parse', 'HEAD']).out;
    const pointer = git(root, ['rev-parse', 'HEAD:apps/console']).out;
    facts.console = {
      fetchFailed: consoleFetchFailed,
      matchesPointer: consoleHead === pointer,
      behindMain: aheadBehind(consoleRoot, 'HEAD', 'origin/main')[1]
    };
  }
  return facts;
};

const main = () => {
  const hookMode = process.argv.includes('--hook');
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).out || process.cwd();
  const { summary, warnings } = describeFreshness(collectFacts(root));
  const text = [summary, ...warnings.map((warning) => `WARNING: ${warning}`)].join('\n');

  if (hookMode) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
        ...(warnings.length > 0 ? { systemMessage: warnings.join(' ') } : {})
      })
    );
    return;
  }
  process.stdout.write(`${text}\n`);
};

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    // A freshness report must never block a session from starting.
    console.error(`Freshness check skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}
