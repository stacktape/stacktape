import { basename, join } from 'node:path';
import { DIST_PACKAGE_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { createRelease, getReleaseByTag } from '@shared/utils/github-api';
import { uploadReleaseAsset } from '@shared/utils/github-file-manipulation';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { readdir, stat } from 'fs-extra';

export const checkVersionDoesNotExist = async ({ version }: { version: string }) => {
  logInfo(`Checking if version ${version} already exists on GitHub...`);
  const existingRelease = await getReleaseByTag({ tag: version });
  if (existingRelease) {
    throw new Error(
      `Version ${version} already exists on GitHub. Please use a different version or delete the existing release first.`
    );
  }
  logSuccess(`Version ${version} does not exist - proceeding with release.`);
};

export const createGithubRelease = async ({ version, isPrerelease }: { version: string; isPrerelease?: boolean }) => {
  const releaseType = isPrerelease ? 'prerelease' : 'release';
  logInfo(`Creating Github ${releaseType}...`);
  const releaseNotesText = `Version: ${version}`;
  const {
    data: { upload_url, id, assets }
  } = await createRelease({ tag: version, body: releaseNotesText, prerelease: isPrerelease });

  logSuccess(`Successfully created Github ${releaseType}.`);

  return { uploadUrl: upload_url, releaseId: id, existingAssetNames: assets.map(({ name }) => name) };
};

export const uploadReleaseAssets = async ({
  releaseId,
  existingAssetNames = []
}: {
  uploadUrl: string;
  releaseId: number;
  existingAssetNames?: string[];
}) => {
  logInfo('Uploading release assets...');
  const allItems = await readdir(DIST_PACKAGE_FOLDER_PATH);
  const existingAssets = new Set(existingAssetNames);

  // Filter to only archive files (.tar.gz and .zip), skip directories
  const assetsToUpload: string[] = [];
  for (const item of allItems) {
    const absolutePath = join(DIST_PACKAGE_FOLDER_PATH, item);
    const stats = await stat(absolutePath);
    if (stats.isFile() && (item.endsWith('.tar.gz') || item.endsWith('.zip')) && !existingAssets.has(item)) {
      assetsToUpload.push(item);
    }
  }

  await Promise.all(
    assetsToUpload.map((assetName) => {
      const absoluteAssetPath = join(DIST_PACKAGE_FOLDER_PATH, assetName);
      return uploadReleaseAsset({
        assetName: basename(assetName),
        sourceFilePath: absoluteAssetPath,
        releaseId
      });
    })
  );
  logSuccess('Successfully created Github release and uploaded release assets.');
};
