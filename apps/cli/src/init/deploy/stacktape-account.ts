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
import { childCliCredentialEnvironment } from '@application-services/global-state-manager/runner-credentials';
import { resolveSelfCommand } from './run-deploy';

export type StacktapeAccount =
  | {
      signedIn: true;
      detail: string;
      /** Who `info:whoami` said this machine is, so the wizard can name the account it will deploy as. */
      email?: string;
      organization?: string;
    }
  | { signedIn: false; detail: string };

const readString = (container: unknown, key: string): string | undefined => {
  if (typeof container !== 'object' || container === null) return undefined;
  const value = (container as Record<string, unknown>)[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/**
 * The identity inside a successful `info:whoami` result, read defensively: it crossed a process.
 *
 * A command's return value arrives under `result` in the event's data, not at its top level.
 */
export const identityFrom = (data: unknown): { email?: string; organization?: string } => {
  if (typeof data !== 'object' || data === null) return {};
  const { result } = data as { result?: unknown };
  if (typeof result !== 'object' || result === null) return {};
  const { user, organization } = result as { user?: unknown; organization?: unknown };
  const email = readString(user, 'email');
  const organizationName = readString(organization, 'name');
  return {
    ...(email === undefined ? {} : { email }),
    ...(organizationName === undefined ? {} : { organization: organizationName })
  };
};

/** The one terminal result a child CLI command reported, or why there was none. */
type ChildResult = { ok: true; message: string; data: unknown } | { ok: false; message: string };

/**
 * Runs this CLI's own command as a child in agent mode and resolves with its single `result` event.
 *
 * The child is never killed, deliberately. On a Windows console, killing it can raise CTRL_C for the whole console
 * process group — the wizard included — and the session then shuts itself down cleanly, silently, mid-use. The child
 * prints its result and exits on its own a moment later; `unref` keeps it from holding the parent open.
 */
export const runCliForResult = ({
  args,
  timeoutMs,
  timeoutMessage
}: {
  args: string[];
  timeoutMs: number;
  timeoutMessage: string;
}): Promise<ChildResult> => {
  const self = resolveSelfCommand();

  return new Promise((resolvePromise) => {
    const child = spawn(self.command, [...self.args, ...args, '--agent'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...childCliCredentialEnvironment(), FORCE_COLOR: '0' },
      ...(process.platform === 'win32' && !self.command.includes('\\') ? { shell: true } : {})
    });
    // A background check must never be the thing keeping the CLI alive.
    child.unref();

    let settled = false;
    const settle = (result: ChildResult) => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
    };

    const timer = setTimeout(() => settle({ ok: false, message: timeoutMessage }), timeoutMs);
    timer.unref?.();

    let buffered = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      for (const line of buffered.split(/\r?\n/).slice(0, -1)) {
        if (line.trim() === '') continue;
        try {
          const event = JSON.parse(line) as JsonlEvent;
          if (event.type !== 'result') continue;
          settle(
            event.ok ? { ok: true, message: event.message, data: event.data } : { ok: false, message: event.message }
          );
        } catch {
          // Not part of the protocol; ignore.
        }
      }
      buffered = buffered.slice(buffered.lastIndexOf('\n') + 1);
    });

    child.on('error', (error) => settle({ ok: false, message: error.message }));
    child.on('close', () => settle({ ok: false, message: 'The command ended without an answer.' }));
  });
};

export const resolveStacktapeAccount = async ({
  timeoutMs = 25_000
}: { timeoutMs?: number } = {}): Promise<StacktapeAccount> => {
  const result = await runCliForResult({
    args: ['info:whoami'],
    timeoutMs,
    timeoutMessage: 'Could not check the Stacktape account in time.'
  });
  return result.ok
    ? { signedIn: true, detail: result.message, ...identityFrom(result.data) }
    : { signedIn: false, detail: result.message };
};

/**
 * Connects the AWS account of this machine's credentials to the signed-in organization, the way `stacktape connect`
 * does in a terminal, so stacks deployed without an account appear in the Console. Nothing deployed changes.
 *
 * It creates the connection's CloudFormation stack and waits for the Console to activate it, which takes a minute or
 * two, hence the long timeout.
 */
export const connectConsole = async ({ timeoutMs = 10 * 60_000 }: { timeoutMs?: number } = {}): Promise<{
  ok: boolean;
  detail: string;
}> => {
  const result = await runCliForResult({
    args: ['connect'],
    timeoutMs,
    timeoutMessage: 'Connecting took too long. Run stacktape connect in a terminal to finish.'
  });
  return { ok: result.ok, detail: result.message };
};
