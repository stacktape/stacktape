/* eslint-disable import/first */
import { config as loadDotenv } from 'dotenv';

loadDotenv();

import { exec as execAsync } from 'node:child_process';
import { promisify } from 'node:util';
import { octokit } from '@shared/utils/github-api';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { getVersion } from './release/args';

const exec = promisify(execAsync);

const getCurrentBranch = async (): Promise<string> => {
  const { stdout } = await exec('git branch --show-current');
  return stdout.trim();
};

const main = async () => {
  // Calculate version locally
  const version = await getVersion();
  const isPrerelease = /-(?:alpha|beta|rc)\.\d+$/.test(version);

  const currentBranch = await getCurrentBranch();

  logInfo(`Current branch: ${currentBranch}`);
  logInfo(`Triggering release workflow for version: ${version}`);

  if (isPrerelease) {
    logInfo('This will be a prerelease');
  }

  try {
    const response = await octokit.actions.createWorkflowDispatch({
      owner: 'stacktape',
      repo: 'stacktape',
      workflow_id: 'release.yml',
      ref: currentBranch,
      inputs: {
        version,
        prerelease: String(isPrerelease)
      }
    });

    if (response.status >= 200 && response.status < 300) {
      logSuccess(
        `Release workflow triggered successfully!\n\nView workflow runs at: https://github.com/stacktape/stacktape/actions`
      );
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Failed to trigger release workflow:', error.message);
    process.exit(1);
  }
};

if (import.meta.main) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
