import type { ErrorCategory } from '@utils/errors';
import type { SupportedPlatform } from '@utils/platform';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import { CliError } from '@utils/errors';
import AdmZip from 'adm-zip';
import { localStatePaths } from 'src/config/local-state-paths';
import manifestJson from 'src/config/external-tools.json' with { type: 'json' };
import * as tar from 'tar';

/**
 * pack, nixpacks and the Session Manager plugin are not in the installer. The first command that needs one downloads it
 * from its upstream release (GitHub for pack and nixpacks, AWS for the plugin) and accepts it only when its SHA-256
 * matches the committed manifest, `src/config/external-tools.json`, which `scripts/pin-external-tools.ts` writes. The
 * executable is kept under `localStatePaths.toolsDirectory()`, one directory per tool, version, platform, architecture
 * and libc. A file already at that path is used without any request, which is also how an offline machine or a runner
 * image preseeds a tool.
 *
 * Concurrent first uses (parallel packaging workers, several terminals or jobs sharing a home directory) download once:
 * a lock directory records its owner, is broken only when that owner is gone or stale, and is removed only by it.
 * Nothing appears at the final path until the executable is verified and extracted, and it appears by one rename. An
 * interrupted download leaves only a staging directory, which the next owner removes. A download fails when no data
 * arrives for 30 s or when it is still running after 9 minutes, and its staging directory goes as for any failure.
 */

export type ExternalTool = 'pack' | 'nixpacks' | 'session-manager-plugin';

export type ExternalToolAsset = {
  /** The versioned upstream URL. */
  url: string;
  sha256: string;
  bytes: number;
  archive: 'tar.gz' | 'zip' | 'deb';
  /** The executable's path inside the archive; for a .deb, inside its `data.tar.gz`. */
  executable: string;
};

export type ExternalToolRelease = {
  version: string;
  /** No asset means the tool is not downloaded on that platform (the Session Manager plugin stays bundled on Windows). */
  assets: Partial<Record<SupportedPlatform, ExternalToolAsset>>;
};

export type ExternalToolManifest = Record<ExternalTool, ExternalToolRelease>;

export type ExternalToolDownloadOptions = {
  /** Called before a download starts, so a command can say why it pauses. */
  onDownloadStart?: (details: { tool: ExternalTool; version: string; bytes: number }) => void;
};

/** What a command prints before a first-use download. */
export const describeToolDownload = ({
  tool,
  version,
  bytes
}: {
  tool: ExternalTool;
  version: string;
  bytes: number;
}) =>
  `Downloading ${tool} ${version} (${(bytes / 1_000_000).toFixed(1)} MB) from its upstream release; this happens once per machine.`;

export const EXTERNAL_TOOL_MANIFEST = manifestJson as ExternalToolManifest;

/** The cache key's platform part: operating system, architecture and libc. */
export const EXTERNAL_TOOL_PLATFORM_KEYS: Record<SupportedPlatform, string> = {
  linux: 'linux-x64-glibc',
  alpine: 'linux-x64-musl',
  'linux-arm': 'linux-arm64-glibc',
  macos: 'darwin-x64',
  'macos-arm': 'darwin-arm64',
  win: 'win32-x64'
};

const ERROR_CATEGORIES: Record<ExternalTool, ErrorCategory> = {
  pack: 'PACK',
  nixpacks: 'NIXPACKS',
  'session-manager-plugin': 'SESSION_MANAGER'
};

/** A lock older than this is taken to be abandoned even if its owner still runs; a download takes seconds. */
const STALE_LOCK_MS = 10 * 60_000;
/** A lock directory without an owner file lost its creator between `mkdir` and the write. */
const OWNERLESS_LOCK_MS = 30_000;
const LOCK_POLL_MS = 200;

type DownloadBounds = { idleMs: number; totalMs: number };

/**
 * No data for `idleMs`, counted from the request and from each chunk, is a stalled connection. `totalMs` stops a
 * trickling one (the largest asset is 11 MB). It stays below `STALE_LOCK_MS`, so a download always ends before
 * waiters may take its lock as abandoned.
 */
const DOWNLOAD_BOUNDS: DownloadBounds = { idleMs: 30_000, totalMs: STALE_LOCK_MS - 60_000 };

type ToolLocation = {
  tool: ExternalTool;
  platform?: SupportedPlatform;
  manifest?: ExternalToolManifest;
  toolsDirectory?: string;
};

/** Where the tool's executable is kept once resolved, and where to place it for offline use. */
export const externalToolPath = ({
  tool,
  platform = getPlatform(),
  manifest = EXTERNAL_TOOL_MANIFEST,
  toolsDirectory = localStatePaths.toolsDirectory()
}: ToolLocation) =>
  join(
    toolsDirectory,
    tool,
    manifest[tool].version,
    EXTERNAL_TOOL_PLATFORM_KEYS[platform],
    platform === 'win' ? `${tool}.exe` : tool
  );

/** The executable path, downloading, verifying and extracting the tool first when this machine does not have it. */
export const resolveExternalTool = async ({
  tool,
  platform = getPlatform(),
  manifest = EXTERNAL_TOOL_MANIFEST,
  toolsDirectory = localStatePaths.toolsDirectory(),
  onDownloadStart,
  downloadBounds = DOWNLOAD_BOUNDS
}: ToolLocation &
  ExternalToolDownloadOptions & {
    /** Shortened only by `scripts/external-tools-e2e.ts`; commands always use the defaults. */
    downloadBounds?: DownloadBounds;
  }): Promise<string> => {
  const finalPath = externalToolPath({ tool, platform, manifest, toolsDirectory });
  if (existsSync(finalPath)) return finalPath;

  const { version } = manifest[tool];
  const platformKey = EXTERNAL_TOOL_PLATFORM_KEYS[platform];
  const asset = manifest[tool].assets[platform];
  if (!asset) {
    throw new CliError({
      category: ERROR_CATEGORIES[tool],
      code: 'EXTERNAL_TOOL_UNAVAILABLE',
      message: `${tool} ${version} is not downloaded on ${platformKey}. Place its executable at ${finalPath}.`
    });
  }

  const versionDirectory = join(toolsDirectory, tool, version);
  await mkdir(versionDirectory, { recursive: true });
  const lock = await acquireLock({ lockPath: join(versionDirectory, `.${platformKey}.lock`), finalPath });
  if (lock === 'ready') return finalPath;
  try {
    // The previous owner may have finished between our last look and taking the lock.
    if (existsSync(finalPath)) return finalPath;
    await removeAbandonedStaging({ versionDirectory, platformKey });
    const staging = join(versionDirectory, `.${platformKey}.download-${process.pid}-${lock.token}`);
    await mkdir(staging, { recursive: true });
    try {
      onDownloadStart?.({ tool, version, bytes: asset.bytes });
      const archivePath = join(staging, 'archive');
      await download({
        tool,
        version,
        platformKey,
        asset,
        finalPath,
        destination: archivePath,
        bounds: downloadBounds
      });
      const digest = createHash('sha256')
        .update(await readFile(archivePath))
        .digest('hex');
      if (digest !== asset.sha256) {
        throw new CliError({
          category: ERROR_CATEGORIES[tool],
          code: 'EXTERNAL_TOOL_CHECKSUM_MISMATCH',
          message: `The ${tool} ${version} download from ${asset.url} has SHA-256 ${digest}, not the pinned ${asset.sha256}, so it was discarded. ${offlineInstructions({ asset, finalPath })}`
        });
      }
      const extracted = await extractExecutable({ archivePath, asset, directory: staging });
      if (platform !== 'win') await chmod(extracted, 0o755);
      await mkdir(dirname(finalPath), { recursive: true });
      await rename(extracted, finalPath);
      return finalPath;
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  } finally {
    await releaseLock(lock);
  }
};

const offlineInstructions = ({ asset, finalPath }: { asset: ExternalToolAsset; finalPath: string }) =>
  `To work without this download, fetch ${asset.url}, check that its SHA-256 is ${asset.sha256}, and place its ${asset.executable} executable at ${finalPath}.`;

/** `30 s`, `9 min`. */
const describeDuration = (ms: number) => (ms % 60_000 === 0 ? `${ms / 60_000} min` : `${ms / 1000} s`);

const download = async ({
  tool,
  version,
  platformKey,
  asset,
  finalPath,
  destination,
  bounds
}: {
  tool: ExternalTool;
  version: string;
  platformKey: string;
  asset: ExternalToolAsset;
  finalPath: string;
  destination: string;
  bounds: DownloadBounds;
}) => {
  // Either bound aborts the request; the message then names the bound instead of the bare abort.
  const controller = new AbortController();
  let boundReached: string | undefined;
  const stop = (reason: string) => {
    boundReached = reason;
    controller.abort();
  };
  const stalled = `no data arrived for ${describeDuration(bounds.idleMs)}`;
  let idleTimer = setTimeout(() => stop(stalled), bounds.idleMs);
  const receivedData = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => stop(stalled), bounds.idleMs);
  };
  const totalTimer = setTimeout(
    () => stop(`it did not finish within ${describeDuration(bounds.totalMs)}`),
    bounds.totalMs
  );
  const fail = (reason: string, cause?: unknown) =>
    new CliError({
      category: ERROR_CATEGORIES[tool],
      code: 'EXTERNAL_TOOL_DOWNLOAD_FAILED',
      message: `Could not download ${tool} ${version} for ${platformKey} from ${asset.url}: ${reason}. ${offlineInstructions({ asset, finalPath })}`,
      cause
    });
  const failFrom = (error: unknown) =>
    fail(boundReached ?? (error instanceof Error ? error.message : String(error)), error);
  try {
    let response: Response;
    try {
      // The CLI's fetch, so HTTP_PROXY, HTTPS_PROXY and NO_PROXY apply as they do to every other request.
      response = await fetch(asset.url, { signal: controller.signal });
    } catch (error) {
      throw failFrom(error);
    }
    if (!response.ok) throw fail(`the server answered HTTP ${response.status}`);
    receivedData();
    const file = Bun.file(destination).writer();
    try {
      const reader = response.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedData();
        file.write(value);
      }
      await file.end();
    } catch (error) {
      await Promise.resolve(file.end()).catch(() => {});
      throw failFrom(error);
    }
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
  }
};

/**
 * Extracts only the executable, read in-process: no system `tar`, `unzip` or `ar`. For a .deb (an `ar` archive), the
 * executable comes from its `data.tar.gz` member.
 */
export const extractExecutable = async ({
  archivePath,
  asset,
  directory
}: {
  archivePath: string;
  asset: ExternalToolAsset;
  directory: string;
}) => {
  const target = join(directory, 'executable');
  const missing = () => new Error(`${asset.url} does not contain ${asset.executable}.`);
  if (asset.archive === 'zip') {
    const entry = new AdmZip(archivePath).getEntry(asset.executable);
    if (!entry || entry.isDirectory) throw missing();
    await writeFile(target, entry.getData());
    return target;
  }
  const tarPath = asset.archive === 'deb' ? await extractDebData({ debPath: archivePath, directory }) : archivePath;
  const extracted = join(directory, 'entry');
  await mkdir(extracted);
  await tar.x({
    file: tarPath,
    cwd: extracted,
    filter: (path) => path.replace(/^\.\//, '') === asset.executable
  });
  const entryPath = join(extracted, asset.executable);
  if (!existsSync(entryPath)) throw missing();
  await rename(entryPath, target);
  return target;
};

/** The `data.tar.gz` (or uncompressed `data.tar`) member of a Debian package, written beside it. */
const extractDebData = async ({ debPath, directory }: { debPath: string; directory: string }) => {
  const bytes = await readFile(debPath);
  if (bytes.toString('latin1', 0, 8) !== '!<arch>\n') throw new Error(`${debPath} is not a Debian package.`);
  let offset = 8;
  while (offset + 60 <= bytes.length) {
    const name = bytes
      .toString('latin1', offset, offset + 16)
      .trim()
      .replace(/\/$/, '');
    const size = Number(bytes.toString('latin1', offset + 48, offset + 58).trim());
    const start = offset + 60;
    if (name === 'data.tar.gz' || name === 'data.tar') {
      const path = join(directory, name);
      await writeFile(path, bytes.subarray(start, start + size));
      return path;
    }
    offset = start + size + (size % 2);
  }
  throw new Error(`${debPath} has no data.tar.gz member.`);
};

type LockOwner = { pid: number; hostname: string; token: string; acquiredAt: number };
type Lock = { lockPath: string; token: string };

const readOwner = async (lockPath: string): Promise<LockOwner | null> => {
  try {
    return JSON.parse(await readFile(join(lockPath, 'owner.json'), 'utf8')) as LockOwner;
  } catch {
    return null;
  }
};

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

const isAbandoned = async (lockPath: string, owner: LockOwner | null) => {
  if (!owner) {
    const created = await stat(lockPath).catch(() => null);
    return created !== null && Date.now() - created.mtimeMs > OWNERLESS_LOCK_MS;
  }
  if (Date.now() - owner.acquiredAt > STALE_LOCK_MS) return true;
  // A process id means something only on the host that wrote it.
  return owner.hostname === hostname() && !isAlive(owner.pid);
};

/** Takes the tool's lock, or answers `ready` when another process finished the tool while this one waited. */
const acquireLock = async ({
  lockPath,
  finalPath
}: {
  lockPath: string;
  finalPath: string;
}): Promise<Lock | 'ready'> => {
  const token = randomBytes(8).toString('hex');
  for (;;) {
    if (existsSync(finalPath)) return 'ready';
    try {
      await mkdir(lockPath);
      const owner: LockOwner = { pid: process.pid, hostname: hostname(), token, acquiredAt: Date.now() };
      await writeFile(join(lockPath, 'owner.json'), JSON.stringify(owner));
      return { lockPath, token };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    const owner = await readOwner(lockPath);
    if (await isAbandoned(lockPath, owner)) {
      // Move the lock aside before deleting it, so only one waiter breaks it.
      const aside = `${lockPath}.broken-${token}`;
      const moved = await rename(lockPath, aside).then(
        () => true,
        () => false
      );
      if (!moved) continue;
      if ((await readOwner(aside))?.token !== owner?.token) {
        // A newer lock replaced the abandoned one after we looked: put it back, never delete it.
        await rename(aside, lockPath).catch(() => {});
        continue;
      }
      await rm(aside, { recursive: true, force: true });
      continue;
    }
    await Bun.sleep(LOCK_POLL_MS);
  }
};

const releaseLock = async (lock: Lock) => {
  // Only the owner removes its lock; one broken as stale meanwhile may already belong to another process.
  if ((await readOwner(lock.lockPath))?.token === lock.token) {
    await rm(lock.lockPath, { recursive: true, force: true });
  }
};

/** Staging and broken-lock directories of earlier owners; only the lock holder calls this. */
const removeAbandonedStaging = async ({
  versionDirectory,
  platformKey
}: {
  versionDirectory: string;
  platformKey: string;
}) => {
  const entries = await readdir(versionDirectory);
  await Promise.all(
    entries
      .filter((name) => name.startsWith(`.${platformKey}.download-`) || name.startsWith(`.${platformKey}.lock.broken-`))
      .map((name) => rm(join(versionDirectory, name), { recursive: true, force: true }))
  );
};
