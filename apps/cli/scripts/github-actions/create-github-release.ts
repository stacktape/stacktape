import yargsParser from 'yargs-parser';
import { createGithubRelease, uploadReleaseAssets } from '../release/github';

const main = async () => {
  const argv = yargsParser(process.argv.slice(2));
  const version = argv.version as string;
  const prerelease = argv.prerelease === 'true';

  if (!version) {
    throw new Error('Version is required. Usage: --version <version> [--prerelease true]');
  }

  const { uploadUrl, releaseId } = await createGithubRelease({ version, isPrerelease: prerelease });
  await uploadReleaseAssets({ uploadUrl, releaseId });
};

if (import.meta.main) {
  main().catch((error) => {
    console.error('Error creating GitHub release:', error);
    process.exit(1);
  });
}
