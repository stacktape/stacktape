import { Buffer } from 'node:buffer';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Mock Octokit and plugins
const mockOctokit = {
  issues: {
    listForRepo: mock(async () => ({ data: [] })),
    create: mock(async () => ({ data: { id: 1, number: 123 } }))
  },
  repos: {
    createInOrg: mock(async () => ({ data: { id: 1, name: 'test-repo' } })),
    get: mock(async () => ({ data: { id: 1, name: 'test-repo' } })),
    delete: mock(async () => ({ data: {} })),
    getReleaseByTag: mock(async () => ({ data: { id: 1, tag_name: 'v1.0.0' } })),
    createRelease: mock(async () => ({ data: { id: 1, tag_name: 'v1.0.0' } })),
    deleteRelease: mock(async () => ({ data: {} })),
    uploadReleaseAsset: mock(async () => ({ data: { id: 1, name: 'asset.zip' } }))
  },
  log: {
    warn: mock(() => {}),
    info: mock(() => {})
  }
};

mock.module('@octokit/rest', () => ({
  Octokit: class {
    static plugin = mock(() => {
      return class {
        constructor() {
          return mockOctokit;
        }
      };
    });
  }
}));

mock.module('@octokit/plugin-retry', () => ({
  retry: {}
}));

mock.module('@octokit/plugin-throttling', () => ({
  throttling: {}
}));

// Set environment variable for token
process.env.GITHUB_AUTH_TOKEN = 'test-token';

describe('github-api', () => {
  beforeEach(() => {
    // Reset mocks
    mockOctokit.issues.listForRepo.mockClear();
    mockOctokit.issues.create.mockClear();
    mockOctokit.repos.createInOrg.mockClear();
    mockOctokit.repos.get.mockClear();
    mockOctokit.repos.delete.mockClear();
    mockOctokit.repos.getReleaseByTag.mockClear();
    mockOctokit.repos.createRelease.mockClear();
    mockOctokit.repos.deleteRelease.mockClear();
    mockOctokit.repos.uploadReleaseAsset.mockClear();
  });

  describe('getAllStacktapeIssues', () => {
    test('should fetch all issues with pagination', async () => {
      mockOctokit.issues.listForRepo.mockResolvedValueOnce({
        data: Array.from({ length: 100 }, () => ({ id: 1, title: 'Issue' }))
      });
      mockOctokit.issues.listForRepo.mockResolvedValueOnce({
        data: Array.from({ length: 50 }, () => ({ id: 2, title: 'Issue 2' }))
      });

      const { getAllStacktapeIssues } = await import('./github-api');
      const issues = await getAllStacktapeIssues();

      expect(issues.length).toBe(150);
      expect(mockOctokit.issues.listForRepo).toHaveBeenCalledTimes(2);
    });

    test('should handle single page of results', async () => {
      mockOctokit.issues.listForRepo.mockResolvedValueOnce({
        data: Array.from({ length: 50 }, () => ({ id: 1, title: 'Issue' }))
      });

      const { getAllStacktapeIssues } = await import('./github-api');
      const issues = await getAllStacktapeIssues();

      expect(issues.length).toBe(50);
      expect(mockOctokit.issues.listForRepo).toHaveBeenCalledTimes(1);
    });
  });

  describe('createIssue', () => {
    test('should create issue with bug label', async () => {
      const { createIssue } = await import('./github-api');
      await createIssue({
        title: 'Bug Report',
        body: 'Description',
        issueType: 'bug',
        userName: 'John Doe',
        email: 'john@example.com'
      });

      expect(mockOctokit.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Bug Report',
          labels: ['bug']
        })
      );
    });

    test('should create issue with new-feature label', async () => {
      const { createIssue } = await import('./github-api');
      await createIssue({
        title: 'Feature Request',
        body: 'New feature',
        issueType: 'new-feature',
        userName: 'Jane Doe',
        email: 'jane@example.com'
      });

      expect(mockOctokit.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ['new feature']
        })
      );
    });

    test('should include user info in issue body', async () => {
      const { createIssue } = await import('./github-api');
      await createIssue({
        title: 'Test Issue',
        body: 'Test body',
        issueType: 'new-idea',
        userName: 'Test User',
        email: 'test@example.com'
      });

      // @ts-expect-error - just ignore
      const callArgs = mockOctokit.issues.create.mock.calls[0][0] as any;
      expect(callArgs?.body).toContain('Test User');
      expect(callArgs?.body).toContain('test@example.com');
    });
  });

  describe('createRepository', () => {
    test('should create repository in stacktape org', async () => {
      const { createRepository } = await import('./github-api');
      await createRepository({ name: 'new-starter' });

      expect(mockOctokit.repos.createInOrg).toHaveBeenCalledWith(
        expect.objectContaining({
          org: 'stacktape',
          name: 'new-starter',
          private: false
        })
      );
    });
  });

  describe('getRepository', () => {
    test('should get repository details', async () => {
      const { getRepository } = await import('./github-api');
      await getRepository({ name: 'test-repo' });

      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: 'stacktape',
        repo: 'test-repo'
      });
    });
  });

  describe('deleteRepository', () => {
    test('should delete repository', async () => {
      const { deleteRepository } = await import('./github-api');
      await deleteRepository({ name: 'old-repo' });

      expect(mockOctokit.repos.delete).toHaveBeenCalledWith({
        owner: 'stacktape',
        repo: 'old-repo'
      });
    });
  });

  describe('getReleaseByTag', () => {
    test('should get release by tag', async () => {
      const { getReleaseByTag } = await import('./github-api');
      await getReleaseByTag({ tag: 'v1.0.0' });

      expect(mockOctokit.repos.getReleaseByTag).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'v1.0.0'
        })
      );
    });

    test('should return null for 404 errors', async () => {
      mockOctokit.repos.getReleaseByTag.mockRejectedValueOnce({
        status: 404,
        message: 'Not found'
      });

      const { getReleaseByTag } = await import('./github-api');
      const result = await getReleaseByTag({ tag: 'nonexistent' });

      expect(result).toBeNull();
    });
  });

  describe('createRelease', () => {
    test('should create release', async () => {
      const { createRelease } = await import('./github-api');
      await createRelease({
        tag: 'v2.0.0',
        body: 'Release notes',
        prerelease: false
      });

      expect(mockOctokit.repos.createRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          tag_name: 'v2.0.0',
          body: 'Release notes',
          prerelease: false
        })
      );
    });

    test('should mark as prerelease when specified', async () => {
      const { createRelease } = await import('./github-api');
      await createRelease({
        tag: 'v2.0.0-beta.1',
        body: 'Beta release',
        prerelease: true
      });

      expect(mockOctokit.repos.createRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          prerelease: true
        })
      );
    });
  });

  describe('deleteRelease', () => {
    test('should delete release by ID', async () => {
      const { deleteRelease } = await import('./github-api');
      await deleteRelease({ releaseId: 123 });

      expect(mockOctokit.repos.deleteRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          release_id: 123
        })
      );
    });
  });

  describe('uploadReleaseAsset', () => {
    test('should upload asset to release', async () => {
      const { uploadReleaseAsset } = await import('./github-api');
      const data = Buffer.from('test data') as any;

      await uploadReleaseAsset({
        releaseId: 456,
        assetName: 'binary.zip',
        data
      });

      expect(mockOctokit.repos.uploadReleaseAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          release_id: 456,
          name: 'binary.zip'
        })
      );
    });
  });
});
