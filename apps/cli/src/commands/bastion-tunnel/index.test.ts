import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Windows child.kill cannot deliver a catchable SIGINT; this scenario exercises POSIX shutdown.
test.skipIf(process.platform === 'win32')(
  'an interrupted tunnel command waits for server termination before its process exits',
  async () => {
    const directory = mkdtempSync(join(tmpdir(), 'stacktape-tunnel-shutdown-'));
    const marker = join(directory, 'server-session-terminated');
    const entry = join(directory, 'child.ts');
    writeFileSync(
      entry,
      `import { mock } from 'bun:test';
import { writeFileSync } from 'node:fs';
let cleanup;
let closePlugin;
let termination;
const pluginExit = new Promise(resolve => { closePlugin = resolve; });
const tunnel = {
  localPort: 15433,
  waitForExit: () => pluginExit,
  kill: () => termination ??= (async () => {
    writeFileSync(${JSON.stringify(`${marker}-started`)}, 'terminating');
    closePlugin();
    await new Promise(resolve => setTimeout(resolve, 200));
    writeFileSync(${JSON.stringify(marker)}, 'terminated');
  })()
};
mock.module('@application-services/application-manager', () => ({ applicationManager: { registerCleanUpHook: hook => { cleanup = hook; } } }));
mock.module('@application-services/tui-manager', () => ({ tuiManager: { info() {}, prettyResourceName: value => value, colorize: (_, value) => value } }));
mock.module('@domain-services/deployed-stack-overview-manager', () => ({ deployedStackOverviewManager: {
  getStpResource: () => ({ resourceType: 'relational-database' }), resolveBastionTunnelsForTarget: () => [{ label: 'database' }]
} }));
mock.module('@errors', () => ({ stpErrors: {} }));
mock.module('@utils/errors', () => ({ CliError: class extends Error { constructor(options) { super(options.message); } } }));
mock.module('@utils/ssm-session', () => ({ startPortForwardingSessions: async () => [tunnel] }));
mock.module(${JSON.stringify(resolve('src/commands/_utils/initialization.ts'))}, () => ({ initializeStackServicesForWorkingWithDeployedStack: async () => ({ args: { resourceName: 'database' } }) }));
const { commandBastionTunnel } = await import(${JSON.stringify(resolve('src/commands/bastion-tunnel/index.ts'))});
setInterval(() => {}, 1000);
process.on('SIGINT', () => { void cleanup(); });
void commandBastionTunnel().catch(() => {}).finally(() => process.exit(0));
await new Promise(resolve => setTimeout(resolve, 0));
console.log('READY');
`
    );
    const child = spawn(process.execPath, ['--preload', resolve('scripts/test-preload.ts'), entry], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const exited = once(child, 'exit');
    let ready = false;
    let errorOutput = '';
    child.stderr.on('data', (chunk) => {
      errorOutput += String(chunk);
    });
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('READY')) {
        ready = true;
        child.kill('SIGINT');
      }
    });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 5_000);
    try {
      const [code, signal] = await exited;
      expect(errorOutput).toBe('');
      expect(ready).toBe(true);
      expect(signal).toBe(null);
      expect(code).toBe(0);
      expect(existsSync(`${marker}-started`)).toBe(true);
      expect(existsSync(marker)).toBe(true);
    } finally {
      clearTimeout(timeout);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await exited;
      rmSync(directory, { recursive: true, force: true });
    }
  }
);
