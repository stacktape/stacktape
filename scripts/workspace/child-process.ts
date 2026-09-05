import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export type CapturedProcess = {
  code: number;
  stderr: string;
  stdout: string;
};

export const runCapturedProcess = ({
  args,
  command,
  cwd,
  env = process.env,
  rejectOnSpawnError = false
}: {
  args: string[];
  command: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  rejectOnSpawnError?: boolean;
}): Promise<CapturedProcess> =>
  new Promise<CapturedProcess>((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', (error) => {
      if (rejectOnSpawnError) rejectRun(error);
      else resolveRun({ code: 1, stderr: error.message, stdout });
    });
    // exit can precede the final pipe reads. Callers parse complete JSONL output.
    child.once('close', (code) => resolveRun({ code: code ?? 1, stderr, stdout }));
  });

export const runInheritedProcess = (command: string, args: string[], cwd: string): Promise<number> => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  });
  return new Promise<number>((resolveExit, rejectExit) => {
    child.once('error', rejectExit);
    child.once('exit', (code, signal) => {
      if (signal) rejectExit(new Error(`Command exited after receiving ${signal}.`));
      else resolveExit(code ?? 1);
    });
  });
};

export const buildCliDevArtifacts = (workspaceRoot: string): Promise<number> =>
  runInheritedProcess(
    process.env.npm_node_execpath || 'node',
    [require.resolve('turbo/bin/turbo'), 'run', 'build:dev-artifacts', '--filter=@stacktape/cli'],
    workspaceRoot
  );
