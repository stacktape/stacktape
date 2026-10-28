import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { test as base } from '@playwright/test';

/**
 * What the scripted world around the wizard does. The JSON argument of
 * `apps/cli/scripts/init-wizard-fixture/server.ts`, which documents each field.
 */
export type WizardScenario = {
  project: 'saas-starter' | 'epic-stack' | 'go-clean-template' | 'full-stack-fastapi' | 'empty';
  agents?: Array<'claude-code' | 'codex'>;
  scan?: 'instant' | 'held' | 'fail';
  existingConfig?: boolean;
  aws?: 'available' | 'no-credentials' | 'rejected';
  account?: 'signed-in' | 'signed-out' | 'no-page-sign-in';
  price?: boolean;
  target?: 'absent' | 'updateable' | 'blocked';
  verify?: 'passed' | 'failed' | 'unavailable';
  deploy?: 'succeed' | 'fail' | 'held';
  gitHost?: 'github' | 'gitlab' | 'bitbucket';
  agentSetup?: 'succeed' | 'fail';
  projectName?: string;
};

export type ScriptedWizard = {
  /** The URL the CLI would open, with the one-time token in its fragment. */
  url: string;
  origin: string;
  /** The stand-in for the Console's device page, which signing in opens in a new tab. */
  consoleOrigin: string;
  /** Lets a held step continue: `scan` or `deploy`. */
  release: (step: 'scan' | 'deploy') => void;
  /** Stops the CLI side, as Ctrl+C in the terminal would. */
  stop: () => Promise<void>;
};

const cliDirectory = fileURLToPath(new URL('../../cli/', import.meta.url));
const bundle = fileURLToPath(new URL('../dist/', import.meta.url));

const startScriptedWizard = async (
  scenario: WizardScenario
): Promise<{ wizard: ScriptedWizard; child: ChildProcessWithoutNullStreams }> => {
  if (!existsSync(`${bundle}index.html`)) {
    throw new Error('The wizard bundle is not built. Run `pnpm --filter @stacktape/init-ui build` first.');
  }
  const child = spawn(
    'bun',
    [
      '--no-env-file',
      '--preload',
      './scripts/network-guard-preload.ts',
      'scripts/init-wizard-fixture/server.ts',
      JSON.stringify(scenario)
    ],
    { cwd: cliDirectory, env: { ...process.env, STACKTAPE_WIZARD_BUNDLE: bundle }, stdio: 'pipe' }
  );
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  const started = await new Promise<{ url: string; consoleOrigin: string }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`The wizard fixture did not start.\n${stderr}`)), 20_000);
    createInterface({ input: child.stdout }).once('line', (line) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(line) as { url: string; consoleOrigin: string });
      } catch {
        reject(new Error(`Unexpected fixture output: ${line}\n${stderr}`));
      }
    });
    child.once('exit', (code) => reject(new Error(`The wizard fixture exited with ${code}.\n${stderr}`)));
  });
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  return {
    child,
    wizard: {
      url: started.url,
      origin: new URL(started.url).origin,
      consoleOrigin: new URL(started.consoleOrigin).origin,
      release: (step) => child.stdin.write(`${step}\n`),
      stop: async () => {
        if (child.exitCode === null) {
          child.stdin.end();
          await exited;
        }
      }
    }
  };
};

export const test = base.extend<{ startWizard: (scenario: WizardScenario) => Promise<ScriptedWizard> }>({
  startWizard: async ({ context }, use) => {
    const children: ChildProcessWithoutNullStreams[] = [];
    const allowedOrigins = new Set<string>();
    const unexpectedOrigins = new Set<string>();
    // The wizard works offline; anything leaving loopback is a regression, not a flaky dependency.
    await context.route('**/*', async (route) => {
      const origin = new URL(route.request().url()).origin;
      if (allowedOrigins.has(origin)) {
        await route.continue();
      } else {
        unexpectedOrigins.add(origin);
        await route.abort('blockedbyclient');
      }
    });
    await use(async (scenario) => {
      const { wizard, child } = await startScriptedWizard(scenario);
      children.push(child);
      allowedOrigins.add(wizard.origin);
      allowedOrigins.add(wizard.consoleOrigin);
      return wizard;
    });
    await Promise.all(
      children
        .filter((child) => child.exitCode === null)
        .map((child) => {
          const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
          child.stdin.end();
          return exited;
        })
    );
    if (unexpectedOrigins.size > 0) {
      throw new Error(`The wizard attempted external traffic: ${[...unexpectedOrigins].join(', ')}`);
    }
  }
});
