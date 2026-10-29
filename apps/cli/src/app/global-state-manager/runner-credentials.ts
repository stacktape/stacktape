import { closeSync, readSync } from 'node:fs';
import { CliError } from '@utils/errors';

let environmentApiKey: string | undefined;

/**
 * Remembers the key this invocation took from its environment (`STACKTAPE_API_KEY`, a runner descriptor or a GitHub
 * Actions exchange), so the CLI processes it starts itself can authenticate the same way. A stored login is not
 * remembered: those children read it themselves.
 */
export const rememberEnvironmentApiKey = (apiKey: string | undefined) => {
  environmentApiKey = apiKey || undefined;
};

/**
 * The environment a child CLI process (the dev agent daemon, an MCP or init run) needs to authenticate as this one.
 * `consumeRunnerCredentials` removed the key from `process.env` so project code never inherits it; the child consumes
 * it again the same way. The key travels only in the child's environment, never in its arguments or a file.
 */
export const childCliCredentialEnvironment = (): Record<string, string> =>
  environmentApiKey === undefined ? {} : { STACKTAPE_API_KEY: environmentApiKey };

/** Consume credentials before project code runs. No key or descriptor is inherited by CLI children. */
export const consumeRunnerCredentials = () => {
  const descriptor = process.env.STACKTAPE_API_KEY_FD;
  const environmentKey = process.env.STACKTAPE_API_KEY;
  const githubActionsToken = process.env.STACKTAPE_GITHUB_ACTIONS_TOKEN;
  for (const name of Object.keys(process.env)) {
    if (name.startsWith('STACKTAPE_API_KEY') || name === 'STACKTAPE_GITHUB_ACTIONS_TOKEN') delete process.env[name];
  }
  if (descriptor === undefined) return { apiKey: environmentKey, githubActionsToken };
  if (!/^(?:[3-9]|[1-9][0-9]{1,2})$/.test(descriptor)) {
    throw new CliError({
      category: 'API_KEY',
      code: 'INVALID_RUNNER_CREDENTIAL',
      message: 'Invalid runner credential descriptor.'
    });
  }
  const fd = Number(descriptor);
  const buffer = Buffer.alloc(1025);
  let length = 0;
  try {
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    const apiKey = buffer.subarray(0, length).toString('utf8').trim();
    if (!apiKey || length === buffer.length || /\s/.test(apiKey)) throw new Error('Invalid credential format');
    return { apiKey, githubActionsToken: undefined };
  } catch {
    throw new CliError({
      category: 'API_KEY',
      code: 'INVALID_RUNNER_CREDENTIAL',
      message: 'Could not read the runner credential.'
    });
  } finally {
    buffer.fill(0);
    try {
      closeSync(fd);
    } catch {
      /* A missing descriptor has already produced an actionable error. */
    }
  }
};
