import { readFile } from 'node:fs/promises';
import { GitHubApiError, uploadReleaseAsset as uploadAsset } from './github-api';

/**
 * Upload a release asset from a file path
 * Reads the file and uploads it using the GitHub API
 */
export const uploadReleaseAsset = async ({
  assetName,
  sourceFilePath,
  releaseId
}: {
  assetName: string;
  sourceFilePath: string;
  releaseId: number;
}): Promise<Record<string, any>> => {
  try {
    // Read the file as a buffer
    const fileData = await readFile(sourceFilePath);

    // Upload using octokit
    const response = await uploadAsset({
      releaseId,
      assetName,
      data: fileData as any
    });

    return response.data as Record<string, any>;
  } catch (error: any) {
    if (error instanceof GitHubApiError) {
      throw error;
    }
    throw new GitHubApiError(
      `Failed to upload release asset from file '${sourceFilePath}': ${error.message}`,
      undefined,
      error
    );
  }
};
