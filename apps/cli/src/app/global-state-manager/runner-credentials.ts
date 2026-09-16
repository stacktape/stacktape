import { closeSync, readSync } from 'node:fs';
import { CliError } from '@utils/errors';

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
