import { join } from 'node:path';
import { INSTALL_SCRIPTS_BUCKET_NAME, INSTALL_SCRIPTS_PREVIEW_BUCKET_NAME } from '@config';
import { CLI_RELEASE_FOLDER_PATH, INSTALL_SCRIPTS_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { mkdirp, readdir, readFile, remove, writeFile } from 'fs-extra';
import yargsParser from 'yargs-parser';
import { syncBucket } from './release/stacktape';

const argv = yargsParser(process.argv.slice(2));
// Load environment variables from .env file

export const prepareInstallScripts = async ({ version }: { version: string }) => {
  logInfo('Preparing install scripts.');

  const installScriptsPaths = await readdir(INSTALL_SCRIPTS_PATH);

  const distFolder = join(CLI_RELEASE_FOLDER_PATH, 'install-scripts');
  await remove(distFolder);
  await mkdirp(distFolder);

  await Promise.all(
    installScriptsPaths.map(async (entry) => {
      const scriptContent = await readFile(join(INSTALL_SCRIPTS_PATH, entry), {
        encoding: 'utf8'
      });
      await writeFile(join(distFolder, entry), scriptContent.replace('<<DEFAULT_VERSION>>', version));
    })
  );

  logSuccess('Preparing install scripts finished.');
};

export const publishInstallScripts = async ({
  version,
  bucketType
}: {
  version: string;
  bucketType: 'production' | 'preview';
}) => {
  await prepareInstallScripts({ version });

  if (!version) {
    throw new Error('Version is required');
  }

  logInfo(
    `Publishing install scripts with default version ${version} to ${bucketType} install scripts hosting bucket...`
  );
  await syncBucket({
    bucketName: bucketType === 'production' ? INSTALL_SCRIPTS_BUCKET_NAME : INSTALL_SCRIPTS_PREVIEW_BUCKET_NAME,
    sourcePath: join(CLI_RELEASE_FOLDER_PATH, 'install-scripts')
  });
  logSuccess(
    `Install scripts with default version ${version} published successfully to ${bucketType} install scripts hosting bucket.`
  );
};

if (import.meta.main) {
  publishInstallScripts({
    version: argv.version,
    bucketType: (argv.bucketType as 'production' | 'preview') || 'production'
  });
}
