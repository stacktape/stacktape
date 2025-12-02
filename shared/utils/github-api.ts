import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import { Octokit } from '@octokit/rest';

// Custom error class for GitHub API errors
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

// Validate GitHub token from environment variable
const getGitHubToken = (): string => {
  const token = process.env.GITHUB_AUTH_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || process.env.RELEASE_GITHUB_TOKEN;
  if (!token) {
    throw new GitHubApiError('GitHub token not found. Please set GITHUB_AUTH_TOKEN, GH_TOKEN, GITHUB_TOKEN, or RELEASE_GITHUB_TOKEN environment variable.');
  }
  return token;
};

// Get token for exports (for backward compatibility with github-file-manipulation.ts)
const GITHUB_AUTH_TOKEN = getGitHubToken();

// Create enhanced Octokit with retry and throttling plugins
const ThrottledOctokit = Octokit.plugin(retry, throttling);

// Initialize Octokit with robust configuration
export const octokit = new ThrottledOctokit({
  auth: GITHUB_AUTH_TOKEN,
  throttle: {
    onRateLimit: (retryAfter: number, options: any, octokit: Octokit, retryCount: number) => {
      octokit.log.warn(`Rate limit hit for ${options.method} ${options.url}`);
      // Retry twice on rate limit
      if (retryCount < 2) {
        octokit.log.info(`Retrying after ${retryAfter} seconds (attempt ${retryCount + 1})`);
        return true;
      }
      return false;
    },
    onSecondaryRateLimit: (retryAfter: number, options: any, octokit: Octokit, retryCount: number) => {
      octokit.log.warn(`Secondary rate limit hit for ${options.method} ${options.url}`);
      // Retry once on secondary rate limit
      if (retryCount < 1) {
        octokit.log.info(`Retrying after ${retryAfter} seconds (attempt ${retryCount + 1})`);
        return true;
      }
      return false;
    }
  },
  retry: {
    doNotRetry: [400, 401, 403, 404, 422] // Don't retry client errors
  },
  request: {
    timeout: 30000 // 30 second timeout
  }
});

const defaultParams = { owner: 'stacktape', repo: 'core' } as const;

/**
 * Get all issues for Stacktape repository with proper pagination
 * GitHub API max per_page is 100, so we iterate through pages
 */
const getAllStacktapeIssues = async (): Promise<Array<any>> => {
  try {
    const allIssues: Array<any> = [];
    let page = 1;
    const perPage = 100; // GitHub's maximum

    while (true) {
      const response = await octokit.issues.listForRepo({
        ...defaultParams,
        per_page: perPage,
        page,
        state: 'all'
      });

      allIssues.push(...response.data);

      // If we got less than perPage items, we've reached the end
      if (response.data.length < perPage) {
        break;
      }

      page++;
    }

    return allIssues;
  } catch (error: any) {
    throw new GitHubApiError(`Failed to fetch Stacktape issues: ${error.message}`, error.status, error);
  }
};

/**
 * Create a new issue in the Stacktape repository
 */
const createIssue = async ({
  body,
  title,
  issueType,
  userName,
  email
}: {
  title: string;
  body: string;
  issueType: 'new-feature' | 'new-idea' | 'bug';
  userName: string;
  email: string;
}) => {
  try {
    const labelMap = {
      'new-feature': { id: 2347019595, name: 'new feature' },
      bug: { id: 1601234433, name: 'bug' },
      'new-idea': { id: 6558072877, name: 'new idea' }
    } as const;

    const label = labelMap[issueType];

    return await octokit.issues.create({
      ...defaultParams,
      title,
      body: `${body}
<!-- Originally created by ${userName} <${email}> -->`,
      assignees: ['matuscongrady', 'simi-obs'],
      labels: [label.name]
    });
  } catch (error: any) {
    throw new GitHubApiError(`Failed to create issue: ${error.message}`, error.status, error);
  }
};

/**
 * Create a new repository in the Stacktape organization
 */
export const createRepository = async ({ name }: { name: string }) => {
  try {
    return await octokit.repos.createInOrg({
      org: 'stacktape',
      name,
      description: 'Stacktape starter project',
      homepage: 'https://stacktape.com',
      private: false,
      has_issues: true,
      has_projects: false,
      has_wiki: false
    });
  } catch (error: any) {
    throw new GitHubApiError(`Failed to create repository '${name}': ${error.message}`, error.status, error);
  }
};

/**
 * Get repository details
 */
export const getRepository = async ({ name }: { name: string }) => {
  try {
    return await octokit.repos.get({
      owner: 'stacktape',
      repo: name
    });
  } catch (error: any) {
    throw new GitHubApiError(`Failed to get repository '${name}': ${error.message}`, error.status, error);
  }
};

/**
 * Delete a repository
 */
const deleteRepository = async ({ name }: { name: string }) => {
  try {
    return await octokit.repos.delete({
      owner: 'stacktape',
      repo: name
    });
  } catch (error: any) {
    throw new GitHubApiError(`Failed to delete repository '${name}': ${error.message}`, error.status, error);
  }
};

/**
 * Get a GitHub release by tag name
 */
export const getReleaseByTag = async ({ tag }: { tag: string }) => {
  try {
    return await octokit.repos.getReleaseByTag({
      ...defaultParams,
      tag
    });
  } catch (error: any) {
    if (error.status === 404) {
      return null; // Release doesn't exist
    }
    throw new GitHubApiError(`Failed to get release '${tag}': ${error.message}`, error.status, error);
  }
};

/**
 * Create a GitHub release (or use existing if it already exists)
 */
export const createRelease = async ({ body, tag, prerelease }: { tag: string; body: string; prerelease?: boolean }) => {
  try {
    return await octokit.repos.createRelease({
      ...defaultParams,
      tag_name: tag,
      body,
      draft: false,
      prerelease: prerelease || false
    });
  } catch (error: any) {
    // If release already exists, fetch and return it
    const isAlreadyExists =
      error.status === 422 &&
      (error.response?.data?.errors?.[0]?.code === 'already_exists' ||
        error.response?.data?.code === 'already_exists' ||
        error.message?.includes('already_exists'));

    if (isAlreadyExists) {
      const existingRelease = await getReleaseByTag({ tag });
      if (existingRelease) {
        return existingRelease;
      }
    }
    throw new GitHubApiError(`Failed to create release '${tag}': ${error.message}`, error.status, error);
  }
};

/**
 * Delete a GitHub release by ID
 */
const deleteRelease = async ({ releaseId }: { releaseId: number }) => {
  try {
    return await octokit.repos.deleteRelease({
      ...defaultParams,
      release_id: releaseId
    });
  } catch (error: any) {
    throw new GitHubApiError(`Failed to delete release '${releaseId}': ${error.message}`, error.status, error);
  }
};

/**
 * Upload an asset to a GitHub release
 */
export const uploadReleaseAsset = async ({
  releaseId,
  assetName,
  data
}: {
  releaseId: number;
  assetName: string;
  data: string | ArrayBuffer;
}) => {
  try {
    return await octokit.repos.uploadReleaseAsset({
      ...defaultParams,
      release_id: releaseId,
      name: assetName,
      data: data as any
    });
  } catch (error: any) {
    throw new GitHubApiError(`Failed to upload release asset '${assetName}': ${error.message}`, error.status, error);
  }
};
