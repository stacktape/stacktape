import { spawn, type ChildProcess } from 'node:child_process';
import { childCliCredentialEnvironment } from '@application-services/global-state-manager/runner-credentials';
import { terminateChild } from '../terminate-child';
import { resolveSelfCommand } from './run-deploy';

/**
 * Stores one secret from the init wizard the way `stacktape secret set` does, by running that command.
 *
 * The value travels on the child's stdin, which the command reads when it is not a terminal. It is never an argument
 * (visible to every process on the machine), never logged, and never sent to Stacktape: the command writes it to AWS
 * Secrets Manager in the user's own account. `--forceUpdate` makes a second save from the page replace the first.
 */
export const setSecretWithCli = async ({
  name,
  value,
  region,
  profile,
  awsAccount,
  spawnChild = spawn,
  timeoutMs = 60_000,
  terminate = terminateChild
}: {
  name: string;
  value: string;
  region: string;
  profile?: string;
  awsAccount?: string;
  spawnChild?: typeof spawn;
  timeoutMs?: number;
  terminate?: (child: ChildProcess) => void;
}): Promise<{ ok: boolean; detail: string }> => {
  const self = resolveSelfCommand();
  const child = spawnChild(
    self.command,
    [
      ...self.args,
      'secret:set',
      '--secretName',
      name,
      '--region',
      region,
      ...(profile === undefined ? [] : ['--profile', profile]),
      ...(awsAccount === undefined ? [] : ['--awsAccount', awsAccount]),
      '--forceUpdate',
      '--agent'
    ],
    {
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, ...childCliCredentialEnvironment(), STACKTAPE_INIT_MCP: '', FORCE_COLOR: '0' },
      ...(process.platform === 'win32' && !self.command.includes('\\') ? { shell: true } : {})
    }
  );
  child.stdin?.end(value);

  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    output = `${output}${chunk.toString('utf8')}`.slice(-64_000);
  });

  const exitCode = await new Promise<number>((resolveFinished) => {
    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveFinished(code);
    };
    const timeout = setTimeout(() => {
      terminate(child);
      finish(1);
    }, timeoutMs);
    child.on('error', () => finish(1));
    child.on('close', (code) => finish(code ?? 1));
  });

  // The command's own result line says what went wrong. It names the secret at most, never its value.
  let message: string | undefined;
  for (const line of output.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line) as { type?: unknown; ok?: unknown; message?: unknown };
      if (event.type === 'result' && typeof event.message === 'string') message = event.message;
    } catch {
      // Not JSONL.
    }
  }
  return exitCode === 0
    ? { ok: true, detail: `Saved in AWS Secrets Manager in ${region}.` }
    : { ok: false, detail: message?.slice(0, 400) ?? 'The secret could not be saved. Check the AWS credentials.' };
};
