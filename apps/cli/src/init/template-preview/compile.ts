import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import {
  RESULT_MARKER,
  TEMPLATE_PREVIEW_ARGUMENT,
  type TemplatePreviewRequest,
  type TemplatePreviewResult
} from './protocol';

/** A compile takes about a second; a child still running after this is stuck, and is stopped. */
const TIMEOUT_MS = 60_000;

/** The result line a preview child printed, if it printed one. */
export const parseTemplatePreviewOutput = (stdout: string): TemplatePreviewResult | undefined => {
  const line = stdout.split('\n').findLast((entry) => entry.startsWith(RESULT_MARKER));
  if (line === undefined) return undefined;
  try {
    return JSON.parse(line.slice(RESULT_MARKER.length)) as TemplatePreviewResult;
  } catch {
    return undefined;
  }
};

/**
 * Compiles the CloudFormation template for a configuration in a child process (`child.ts`), without AWS.
 *
 * `command` starts the child: by default this CLI re-run with `TEMPLATE_PREVIEW_ARGUMENT` (`resolveSelfCommand` from
 * `run-deploy.ts`). The wizard's fixture starts the child module under Bun instead.
 */
export const compileTemplatePreview = (
  request: TemplatePreviewRequest,
  command: { command: string; args: string[] }
): Promise<TemplatePreviewResult> =>
  new Promise((resolve) => {
    const child = spawn(command.command, [...command.args, TEMPLATE_PREVIEW_ARGUMENT], {
      // Not the project directory: nothing is read from the working directory, and a Windows process would hold it.
      cwd: tmpdir(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, STP_TIMINGS_FILE: '' }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `The template could not be compiled: ${error.message}` });
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve(
        parseTemplatePreviewOutput(stdout) ?? {
          ok: false,
          error: `The template could not be compiled.${stderr.trim() === '' ? '' : ` ${stderr.trim().split('\n').at(-1)}`}`
        }
      );
    });
    child.stdin.end(JSON.stringify(request));
  });
