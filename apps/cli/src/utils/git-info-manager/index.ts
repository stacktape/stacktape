import type { GitInformation } from '@utils/git-info-manager/types';
import { tuiManager } from '@application-services/tui-manager';
import { getGitVariable, sanitizeGitRemoteUrl } from '@utils/git';

export class GitInfoManager {
  readonly #repositories = new Map<string, Promise<GitInformation>>();

  getGitInfo = (cwd: string): Promise<GitInformation> => {
    let information = this.#repositories.get(cwd);
    if (!information) {
      information = this.#getGitInfo(cwd);
      this.#repositories.set(cwd, information);
    }
    return information;
  };

  #getGitInfo = async (cwd: string): Promise<GitInformation> => {
    const start = Date.now();
    tuiManager.debug('Fetching git info...');
    // Each value is read by its own git process; they run at the same time. A value git cannot give comes from the
    // CI environment instead.
    const read = (variable: Parameters<typeof getGitVariable>[0]) =>
      getGitVariable(variable, cwd).then(
        (value) => ({ value }),
        () => ({ value: undefined as string | undefined })
      );
    const [changes, user, gitBranch, gitCommit, repositoryUrl] = await Promise.all([
      read('changes'),
      read('user'),
      read('branch'),
      read('commit'),
      read('repositoryUrl')
    ]);
    const hasUncommitedChanges = changes.value !== undefined && changes.value.length > 0;
    const username =
      user.value ??
      (process.env.STP_GIT_USER_NAME ||
        process.env.GITHUB_TRIGGERING_ACTOR ||
        process.env.GITLAB_USER_NAME ||
        process.env.BITBUCKET_STEP_TRIGGERER_UUID ||
        null);
    const branch =
      gitBranch.value ??
      (process.env.STP_GIT_BRANCH_NAME ||
        process.env.GITHUB_REF_NAME ||
        process.env.CI_COMMIT_REF_NAME ||
        process.env.BITBUCKET_BRANCH ||
        null);
    const commit =
      gitCommit.value ??
      (process.env.STP_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        process.env.CI_COMMIT_SHA ||
        process.env.BITBUCKET_COMMIT ||
        null);
    const gitUrl =
      repositoryUrl.value ??
      (process.env.STP_GIT_URL ||
        (process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : null) ||
        process.env.CI_PROJECT_URL ||
        process.env.BITBUCKET_GIT_HTTP_ORIGIN ||
        null);

    tuiManager.debug(`Git info fetched in ${Date.now() - start}ms.`);
    return {
      hasUncommitedChanges,
      username,
      branch,
      commit,
      gitUrl: sanitizeGitRemoteUrl(gitUrl)
    };
  };
}

export const gitInfoManager = new GitInfoManager();
