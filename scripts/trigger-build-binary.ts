/* eslint-disable import/first */
import { config as loadDotenv } from 'dotenv';

loadDotenv();

import { exec as execAsync } from 'node:child_process';
import { promisify } from 'node:util';
import { octokit } from '@shared/utils/github-api';
import { logInfo, logSuccess } from '@shared/utils/logging';
import yargsParser from 'yargs-parser';

const exec = promisify(execAsync);

const VALID_PLATFORMS = ['linux', 'alpine', 'macos', 'macos-arm', 'win'] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

const getCurrentBranch = async (): Promise<string> => {
  const { stdout } = await exec('git branch --show-current');
  return stdout.trim();
};

const main = async () => {
  const argv = yargsParser(process.argv.slice(2));
  const platform = argv.platform as Platform;

  if (!platform) {
    console.error('Usage: bun build:bin --platform <platform>');
    console.error(`Valid platforms: ${VALID_PLATFORMS.join(', ')}`);
    process.exit(1);
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    console.error(`Invalid platform: ${platform}`);
    console.error(`Valid platforms: ${VALID_PLATFORMS.join(', ')}`);
    process.exit(1);
  }

  const currentBranch = await getCurrentBranch();

  logInfo(`Current branch: ${currentBranch}`);
  logInfo(`Triggering build workflow for platform: ${platform}`);

  try {
    const response = await octokit.actions.createWorkflowDispatch({
      owner: 'stacktape',
      repo: 'stacktape',
      workflow_id: 'build-binary.yml',
      ref: currentBranch,
      inputs: {
        platform
      }
    });

    if (response.status === 204) {
      logSuccess(
        `Build workflow triggered successfully!\n\nView workflow runs at: https://github.com/stacktape/stacktape/actions`
      );
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Failed to trigger build workflow:', error.message);
    process.exit(1);
  }
};

if (import.meta.main) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
