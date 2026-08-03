import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import stripAnsi from 'strip-ansi';
import { x as extractTar } from 'tar';
import { EXPECTED_RELEASE_ARCHIVES, verifyCandidateArchives } from './verify-candidate-assets';
import { parseReleaseChecksums, RELEASE_CHECKSUMS_FILE_NAME, verifyReleaseChecksum } from './checksums';
import { validateReleaseInput } from './validate-release-input';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

export const assertInstalledCliVersion = (output: string, expectedVersion: string) => {
  const actual = stripAnsi(output).trim();
  assert(
    actual === `Stacktape version: ${expectedVersion}.`,
    `Installed release launcher reported ${actual || '<empty>'}, expected Stacktape version: ${expectedVersion}.`
  );
};

const run = async (command: string[], cwd: string, env: Record<string, string | undefined> = process.env) => {
  const child = Bun.spawn({ cmd: command, cwd, env, stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text()
  ]);
  assert(exitCode === 0, `${command.join(' ')} failed with ${exitCode}:\n${stderr.trim().slice(-4_000)}`);
  return { stdout, stderr };
};

const downloadWithRetry = async (url: string, destination: string) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60_000) });
      assert(response.ok, `HTTP ${response.status} ${response.statusText}`);
      await Bun.write(destination, response);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 8) await Bun.sleep(Math.min(1_000 * 2 ** (attempt - 1), 10_000));
    }
  }
  throw new Error(`Could not download published release asset ${url}.`, { cause: lastError });
};

const findNpmTarball = async (directory: string) => {
  const tarballs = (await readdir(directory)).filter((fileName) => /^stacktape-.*\.tgz$/.test(fileName));
  assert(
    tarballs.length === 1,
    `Expected exactly one Stacktape npm tarball; received ${tarballs.join(', ') || '<none>'}.`
  );
  return join(directory, tarballs[0]);
};

const assertTarballManifest = async (tarballPath: string, manifestPath: string, temporaryDirectory: string) => {
  const extractionDirectory = join(temporaryDirectory, 'tarball');
  await mkdir(extractionDirectory, { recursive: true });
  await extractTar({
    cwd: extractionDirectory,
    file: tarballPath,
    filter: (entryPath) => entryPath === `package/${RELEASE_CHECKSUMS_FILE_NAME}`
  });
  const [candidateManifest, packagedManifest] = await Promise.all([
    readFile(manifestPath, 'utf8'),
    readFile(join(extractionDirectory, 'package', RELEASE_CHECKSUMS_FILE_NAME), 'utf8')
  ]);
  assert(
    packagedManifest === candidateManifest,
    'The npm tarball does not contain the candidate archive checksum manifest.'
  );
};

const exerciseNpmTarball = async ({
  tarballPath,
  temporaryDirectory,
  version
}: {
  tarballPath: string;
  temporaryDirectory: string;
  version: string;
}) => {
  const installDirectory = join(temporaryDirectory, 'install');
  const homeDirectory = join(temporaryDirectory, 'home');
  await Promise.all([mkdir(installDirectory, { recursive: true }), mkdir(homeDirectory, { recursive: true })]);
  const env = { ...process.env, HOME: homeDirectory, npm_config_cache: join(temporaryDirectory, 'npm-cache') };
  await run(
    ['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', installDirectory, tarballPath],
    '.',
    env
  );
  const launcherPath = join(installDirectory, 'node_modules', 'stacktape', 'bin', 'stacktape.js');
  const { stdout } = await run(['node', launcherPath, '--version'], installDirectory, env);
  assertInstalledCliVersion(stdout, version);
};

export const verifyPublishedRelease = async ({
  channel,
  version,
  directory
}: {
  channel: string;
  version: string;
  directory: string;
}) => {
  validateReleaseInput({ channel, version });
  const resolvedDirectory = resolve(directory);
  await verifyCandidateArchives(resolvedDirectory);
  const manifestPath = join(resolvedDirectory, RELEASE_CHECKSUMS_FILE_NAME);
  const manifest = parseReleaseChecksums(await readFile(manifestPath, 'utf8'));
  assert(
    JSON.stringify([...manifest.keys()].sort()) === JSON.stringify([...EXPECTED_RELEASE_ARCHIVES]),
    'Release checksum manifest does not describe the exact supported archive set.'
  );

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'stacktape-preview-verification-'));
  try {
    const tarballPath = await findNpmTarball(resolvedDirectory);
    await assertTarballManifest(tarballPath, manifestPath, temporaryDirectory);
    for (const fileName of EXPECTED_RELEASE_ARCHIVES) {
      const downloadedPath = join(temporaryDirectory, fileName);
      await downloadWithRetry(
        `https://github.com/stacktape/stacktape/releases/download/${encodeURIComponent(version)}/${fileName}`,
        downloadedPath
      );
      await verifyReleaseChecksum({ filePath: downloadedPath, manifestPath });
    }
    await exerciseNpmTarball({ tarballPath, temporaryDirectory, version });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
  console.info(`Verified public GitHub assets and the installable stacktape@${version} npm tarball.`);
};

if (import.meta.main) {
  const channel = process.env.RELEASE_CHANNEL || '';
  const version = process.env.RELEASE_VERSION || '';
  const directory = process.env.RELEASE_DIST_DIRECTORY || join(process.cwd(), '__dist');
  verifyPublishedRelease({ channel, version, directory }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
