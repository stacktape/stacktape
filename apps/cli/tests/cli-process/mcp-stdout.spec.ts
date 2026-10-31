import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOperationsCli } from '../../scripts/operations/cli-process';
import { runRawMcpSession } from '../../scripts/mcp-stdout-session';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
let home: string;
beforeAll(async () => {
  cli = await buildOperationsCli();
  home = await mkdtemp(join(tmpdir(), 'stacktape-mcp-stdout-'));
  // `stacktape mcp` never invokes helper Lambdas. An empty artifact directory satisfies the startup inventory.
  await mkdir(join(home, '__stacktape-dist/dev/helper-lambdas'), { recursive: true });
}, 60_000);
afterAll(async () => {
  await cli?.close();
  if (home) await rm(home, { recursive: true, force: true });
});

test('stacktape mcp writes only JSON-RPC frames to stdout, through startup, a session and the client disconnecting', async () => {
  const session = await runRawMcpSession({
    command: [process.execPath, cli.path, 'mcp'],
    cwd: home,
    env: {
      PATH: process.env.PATH,
      HOME: home,
      USERPROFILE: home,
      SKIP_LOADING_ENV: '1',
      STP_DISABLE_TELEMETRY: '1',
      AWS_EC2_METADATA_DISABLED: 'true',
      STP_DEV_MODE: 'true'
    }
  });

  expect(session.disconnected, session.stdout + session.stderr).toBe(true);
  expect(session.exitCode, session.stderr).toBe(0);
  expect(session.nonProtocolLines, session.stderr).toEqual([]);
  expect(session.frames.map(({ id }) => id)).toEqual([1, 2]);
  expect((session.frames[1].result as { tools: unknown[] }).tools.length).toBe(5);
}, 90_000);
