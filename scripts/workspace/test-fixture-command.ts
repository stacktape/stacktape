import { spawnSync } from 'node:child_process';

export const runFixtureCommand = (repository: string, command: string, args: string[]) =>
  spawnSync(command, args, {
    cwd: repository,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'user.email',
      GIT_CONFIG_KEY_1: 'user.name',
      GIT_CONFIG_VALUE_0: 'test@example.invalid',
      GIT_CONFIG_VALUE_1: 'Stacktape Test'
    }
  });
