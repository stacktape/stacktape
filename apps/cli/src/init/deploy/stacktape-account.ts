/**
 * Whether this machine is signed in to Stacktape, asked before the Deploy button.
 *
 * Generating a configuration needs no account — that promise holds. *Deploying* one goes through
 * Stacktape's control plane, which authenticates. The first real end-to-end run found the gap the
 * hard way: everything up to the button worked, and the deploy died on "Invalid API key" with no
 * earlier warning that an account was involved at all.
 *
 * Asked the same way the deploy itself asks: by running this CLI's own `info:whoami` as a child
 * and reading its machine-readable result. Reimplementing the credential resolution here — env
 * var, persisted state, interactive flows — would be a second copy of the exact logic whose
 * disagreement caused the surprise.
 */

import { spawn } from 'node:child_process';
import type { JsonlEvent } from '@application-services/tui-manager/output/jsonl-types';
import { resolveSelfCommand } from './run-deploy';

export type StacktapeAccount = { signedIn: true; detail: string } | { signedIn: false; detail: string };

export const resolveStacktapeAccount = async ({
  timeoutMs = 25_000
}: { timeoutMs?: number } = {}): Promise<StacktapeAccount> => {
  const self = resolveSelfCommand();

  return new Promise((resolvePromise) => {
    const child = spawn(self.command, [...self.args, 'info:whoami', '--agent'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
      ...(process.platform === 'win32' && !self.command.includes('\\') ? { shell: true } : {})
    });
    // A background check must never be the thing keeping the CLI alive.
    child.unref();

    let settled = false;
    const settle = (result: StacktapeAccount) => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
      // The child is NOT killed, deliberately. On a Windows console, killing it can raise CTRL_C
      // for the whole console process group — the wizard included — and the session then shuts
      // itself down cleanly, silently, mid-use. The child prints its result and exits on its own a
      // moment later; `unref` below already keeps it from holding the parent open.
    };

    const timer = setTimeout(() => {
      settle({ signedIn: false, detail: 'Could not check the Stacktape account in time.' });
    }, timeoutMs);
    timer.unref?.();

    let buffered = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      for (const line of buffered.split(/\r?\n/).slice(0, -1)) {
        if (line.trim() === '') continue;
        try {
          const event = JSON.parse(line) as JsonlEvent;
          if (event.type !== 'result') continue;
          settle(event.ok ? { signedIn: true, detail: event.message } : { signedIn: false, detail: event.message });
        } catch {
          // Not part of the protocol; ignore.
        }
      }
      buffered = buffered.slice(buffered.lastIndexOf('\n') + 1);
    });

    child.on('error', (error) => settle({ signedIn: false, detail: error.message }));
    child.on('close', () => settle({ signedIn: false, detail: 'The account check ended without an answer.' }));
  });
};
