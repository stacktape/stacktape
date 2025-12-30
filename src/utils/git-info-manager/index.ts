import { memoizeGetters } from '@utils/decorators';
import { getGitVariable } from '@utils/git';
import { tuiManager } from '@utils/tui';

@memoizeGetters
export class GitInfoManager {
  get gitInfo() {
    return this.#getGitInfo();
  }

  #getGitInfo = async (): Promise<GitInformation> => {
    let hasUncommitedChanges = false;
    let username: string;
    let branch: string;
    let commit: string;
    let gitUrl: string;
    const start = Date.now();
    tuiManager.debug('Getting git info');
    try {
      const changes = await getGitVariable('changes');
      hasUncommitedChanges = changes.length > 0;
    } catch {
      // do nothing
    }
    try {
      username = await getGitVariable('user');
    } catch {
      username =
        process.env.STP_GIT_USER_NAME ||
        process.env.GITHUB_TRIGGERING_ACTOR ||
        process.env.GITLAB_USER_NAME ||
        process.env.BITBUCKET_STEP_TRIGGERER_UUID ||
        null;
    }
    try {
      branch = await getGitVariable('branch');
    } catch {
      branch =
        process.env.STP_GIT_BRANCH_NAME ||
        process.env.GITHUB_REF_NAME ||
        process.env.CI_COMMIT_REF_NAME ||
        process.env.BITBUCKET_BRANCH ||
        null;
    }
    try {
      commit = await getGitVariable('commit');
    } catch {
      commit =
        process.env.STP_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        process.env.CI_COMMIT_SHA ||
        process.env.BITBUCKET_COMMIT ||
        null;
    }
    try {
      gitUrl = await getGitVariable('repositoryUrl');
    } catch {
      gitUrl =
        process.env.STP_GIT_URL ||
        (process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : null) ||
        process.env.CI_PROJECT_URL ||
        process.env.BITBUCKET_GIT_HTTP_ORIGIN ||
        null;
    }

    tuiManager.debug(`Getting git info done. Took ${Date.now() - start}ms`);
    return {
      hasUncommitedChanges,
      username,
      branch,
      commit,
      gitUrl
    };
  };
}

export const gitInfoManager = new GitInfoManager();
