/**
 * Process-level check of the first-use tool resolver (`src/utils/external-tools.ts`). A loopback stand-in serves real
 * archive formats (tar.gz, zip, and a .deb: an `ar` archive holding `data.tar.gz`) around synthetic executables, under
 * a test manifest shaped like the committed one. Each resolution runs in its own process, as the CLI's does, so the
 * locking, interruption and caching are real:
 *
 * - cold first use downloads, verifies, extracts and runs `--version`; warm use makes no request;
 * - a checksum mismatch is refused and leaves no executable; a refused download names the asset, its checksum and the
 *   path to place the file offline;
 * - a process killed mid-download leaves nothing usable, and the retry cleans up and succeeds;
 * - two concurrent first uses download once;
 * - a download that stalls fails within its bound (shortened here; commands allow 30 s without data and 10 minutes in
 *   all), leaves nothing behind, and the retry succeeds;
 * - the CLI's call sites (the nixpacks planner, `pack`) use a preseeded executable without any request.
 *
 * The synthetic executables are shell scripts, so this runs on Linux and macOS. The report goes to
 * `.stacktape/external-tools-e2e/<timestamp>/report.json`, or to `--output-dir`.
 */
import type { Subprocess } from 'bun';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import AdmZip from 'adm-zip';
import * as tar from 'tar';

type Tool = 'pack' | 'nixpacks' | 'session-manager-plugin';
type Platform = 'linux' | 'alpine' | 'linux-arm' | 'macos' | 'macos-arm' | 'win';
type Asset = { url: string; sha256: string; bytes: number; archive: 'tar.gz' | 'zip' | 'deb'; executable: string };
type Manifest = Record<Tool, { version: string; assets: Partial<Record<Platform, Asset>> }>;
type DriverResult = { ok: boolean; path?: string; output?: string; message?: string; code?: string };

const CLI_ROOT = resolve(import.meta.dir, '..');
const VERSIONS: Record<Tool, string> = { pack: '0.40.0', nixpacks: '1.39.0', 'session-manager-plugin': '1.2.707.0' };

const argument = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

/** One resolution in this process: what a CLI command that needs the tool does. */
const runDriver = async () => {
  const tool = argument('tool') as Tool;
  const callSite = argument('call-site');
  let result: DriverResult;
  try {
    if (callSite === 'planner') {
      const { createNixpacksPlanner } = await import('src/init/nixpacks-planner');
      const planned = await createNixpacksPlanner(argument('cwd')!).planStart('.');
      if (planned === null) throw new Error('The nixpacks planner returned no start command.');
      result = { ok: true, path: '', output: planned };
    } else if (callSite === 'pack') {
      const { execPack } = await import('@domain-services/packaging-manager/pack-command');
      const { stdout } = await execPack({ args: ['version'], cwd: argument('cwd')! });
      result = { ok: true, path: '', output: stdout.trim() };
    } else {
      const { resolveExternalTool } = await import('src/utils/external-tools');
      const manifest = JSON.parse(await readFile(argument('manifest')!, 'utf8')) as Manifest;
      const idleMs = argument('idle-timeout-ms');
      const totalMs = argument('total-timeout-ms');
      const path = await resolveExternalTool({
        tool,
        platform: argument('platform') as Platform,
        manifest,
        ...(idleMs && totalMs ? { downloadBounds: { idleMs: Number(idleMs), totalMs: Number(totalMs) } } : {})
      });
      result = { ok: true, path };
    }
  } catch (error) {
    result = {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: string }).code
    };
  }
  console.info(JSON.stringify(result));
};

const syntheticExecutable = (tool: Tool) =>
  [
    '#!/bin/sh',
    'case "$1" in',
    `  --version|version) echo "${tool} synthetic ${VERSIONS[tool]}" ;;`,
    `  plan) echo '{"start":{"cmd":"node synthetic-server.js"}}' ;;`,
    `  *) echo "${tool} synthetic: $*" ;;`,
    'esac',
    ''
  ].join('\n');

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** A tarball holding `entry` (written at `entry` below `root`), gzipped as the upstream releases are. */
const tarball = async (root: string, entry: string) => {
  const file = `${root}.tar.gz`;
  await tar.c({ gzip: true, file, cwd: root, portable: true }, [entry]);
  return new Uint8Array(await readFile(file));
};

/** An `ar` archive in the Debian package layout: `debian-binary`, `control.tar.gz`, then `data.tar.gz`. */
const debPackage = (members: [name: string, data: Uint8Array][]) => {
  const parts: Uint8Array[] = [new TextEncoder().encode('!<arch>\n')];
  for (const [name, data] of members) {
    const header = `${name.padEnd(16)}${'0'.padEnd(12)}${'0'.padEnd(6)}${'0'.padEnd(6)}${'100644'.padEnd(8)}${String(
      data.length
    ).padEnd(10)}\`\n`;
    parts.push(new TextEncoder().encode(header), data);
    if (data.length % 2 === 1) parts.push(new TextEncoder().encode('\n'));
  }
  return new Uint8Array(Buffer.concat(parts));
};

type Route = { body: Uint8Array; mode: 'ok' | 'refuse' | 'stall' | 'slow' | 'hang' };

const main = async () => {
  if (process.platform === 'win32') {
    throw new Error('This check runs synthetic shell-script executables; run it on Linux or macOS.');
  }
  const outputDirectory = resolve(
    argument('output-dir') ??
      join(CLI_ROOT, '.stacktape', 'external-tools-e2e', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await mkdir(outputDirectory, { recursive: true });
  const work = await mkdtemp(join(tmpdir(), 'stacktape-external-tools-e2e-'));
  const toolsDirectory = join(work, 'tools');
  const checks: { case: string; ok: boolean; detail: string }[] = [];
  const check = (name: string, ok: boolean, detail: string) => {
    checks.push({ case: name, ok, detail });
    console.info(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
  };

  // Archives in the upstream formats, around synthetic executables.
  const staging = join(work, 'archives');
  const archives: Record<string, { body: Uint8Array; archive: Asset['archive']; executable: string }> = {};
  for (const tool of ['pack', 'nixpacks'] as const) {
    const root = join(staging, tool);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, tool), syntheticExecutable(tool), { mode: 0o755 });
    archives[`${tool}.tar.gz`] = { body: await tarball(root, tool), archive: 'tar.gz', executable: tool };
  }
  const debRoot = join(staging, 'deb');
  const debExecutable = 'usr/local/sessionmanagerplugin/bin/session-manager-plugin';
  await mkdir(join(debRoot, dirname(debExecutable)), { recursive: true });
  await writeFile(join(debRoot, debExecutable), syntheticExecutable('session-manager-plugin'), { mode: 0o755 });
  const controlRoot = join(staging, 'control');
  await mkdir(controlRoot, { recursive: true });
  await writeFile(join(controlRoot, 'control'), 'Package: session-manager-plugin\n');
  archives['session-manager-plugin.deb'] = {
    body: debPackage([
      ['debian-binary', new TextEncoder().encode('2.0\n')],
      ['control.tar.gz', await tarball(controlRoot, 'control')],
      ['data.tar.gz', await tarball(debRoot, 'usr')]
    ]),
    archive: 'deb',
    executable: debExecutable
  };
  const bundle = new AdmZip();
  bundle.addFile(
    'sessionmanager-bundle/bin/session-manager-plugin',
    Buffer.from(syntheticExecutable('session-manager-plugin'))
  );
  archives['sessionmanager-bundle.zip'] = {
    body: new Uint8Array(bundle.toBuffer()),
    archive: 'zip',
    executable: 'sessionmanager-bundle/bin/session-manager-plugin'
  };

  // The stand-in: one route per asset and platform, each counting its requests.
  const routes = new Map<string, Route>();
  const requests = new Map<string, number>();
  let releaseStall: () => void = () => {};
  const stallReleased = new Promise<void>((resolveStall) => {
    releaseStall = resolveStall;
  });
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      requests.set(path, (requests.get(path) ?? 0) + 1);
      const route = routes.get(path);
      if (!route) return new Response('not found', { status: 404 });
      if (route.mode === 'refuse') return new Response('forbidden', { status: 403 });
      if (route.mode === 'slow') await Bun.sleep(1500);
      if (route.mode === 'stall') {
        const half = route.body.slice(0, Math.floor(route.body.length / 2));
        return new Response(
          new ReadableStream({
            start: async (controller) => {
              controller.enqueue(half);
              await stallReleased;
              controller.close();
            }
          }),
          { headers: { 'content-length': String(route.body.length) } }
        );
      }
      if (route.mode === 'hang') {
        // Headers and a few bytes, then nothing until the stand-in stops.
        return new Response(
          new ReadableStream({
            start: (controller) => controller.enqueue(route.body.slice(0, 64))
          }),
          { headers: { 'content-length': String(route.body.length) } }
        );
      }
      return new Response(route.body, { headers: { 'content-length': String(route.body.length) } });
    }
  });
  const base = `http://127.0.0.1:${server.port}`;
  const serve = (tool: Tool, platform: Platform, archive: string, mode: Route['mode'] = 'ok') => {
    const path = `/${tool}/${platform}/${archive}`;
    routes.set(path, { body: archives[archive]!.body, mode });
    return path;
  };
  const asset = (tool: Tool, platform: Platform, archive: string, sha = sha256(archives[archive]!.body)): Asset => ({
    url: `${base}/${tool}/${platform}/${archive}`,
    sha256: sha,
    bytes: archives[archive]!.body.length,
    archive: archives[archive]!.archive,
    executable: archives[archive]!.executable
  });
  const manifest: Manifest = {
    pack: {
      version: VERSIONS.pack,
      assets: { linux: asset('pack', 'linux', 'pack.tar.gz'), 'linux-arm': asset('pack', 'linux-arm', 'pack.tar.gz') }
    },
    nixpacks: {
      version: VERSIONS.nixpacks,
      assets: {
        // A pinned checksum that the served file does not have.
        linux: asset('nixpacks', 'linux', 'nixpacks.tar.gz', sha256(new TextEncoder().encode('not the served file'))),
        alpine: asset('nixpacks', 'alpine', 'nixpacks.tar.gz'),
        macos: asset('nixpacks', 'macos', 'nixpacks.tar.gz')
      }
    },
    'session-manager-plugin': {
      version: VERSIONS['session-manager-plugin'],
      assets: {
        linux: asset('session-manager-plugin', 'linux', 'session-manager-plugin.deb'),
        macos: asset('session-manager-plugin', 'macos', 'sessionmanager-bundle.zip')
      }
    }
  };
  const manifestPath = join(work, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  // A proxy on a closed port: any request that does not go to the stand-in fails at once instead of leaving the host.
  const driverEnv = {
    ...process.env,
    STACKTAPE_TOOLS_DIR: toolsDirectory,
    HTTP_PROXY: 'http://127.0.0.1:9',
    HTTPS_PROXY: 'http://127.0.0.1:9',
    NO_PROXY: '127.0.0.1'
  };
  const startDriver = (args: string[]) =>
    Bun.spawn({
      cmd: [process.execPath, join(CLI_ROOT, 'scripts', 'external-tools-e2e.ts'), '--driver', ...args],
      cwd: CLI_ROOT,
      env: driverEnv,
      stdout: 'pipe',
      stderr: 'pipe'
    });
  const finish = async (child: Subprocess<'ignore', 'pipe', 'pipe'>): Promise<DriverResult> => {
    const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    await child.exited;
    const line = stdout.trim().split('\n').at(-1) ?? '';
    try {
      return JSON.parse(line) as DriverResult;
    } catch {
      return { ok: false, message: `driver printed no result: ${stdout.slice(-400)} ${stderr.slice(-800)}` };
    }
  };
  const resolveIn = (tool: Tool, platform: Platform) =>
    finish(startDriver(['--manifest', manifestPath, '--tool', tool, '--platform', platform]));
  const platformKeys: Record<Platform, string> = {
    linux: 'linux-x64-glibc',
    alpine: 'linux-x64-musl',
    'linux-arm': 'linux-arm64-glibc',
    macos: 'darwin-x64',
    'macos-arm': 'darwin-arm64',
    win: 'win32-x64'
  };
  const executableName = (tool: Tool) => tool;
  const finalPath = (tool: Tool, platform: Platform, version = VERSIONS[tool]) =>
    join(toolsDirectory, tool, version, platformKeys[platform], executableName(tool));
  const leftovers = (tool: Tool) =>
    existsSync(join(toolsDirectory, tool, VERSIONS[tool]))
      ? readdirSync(join(toolsDirectory, tool, VERSIONS[tool])).filter((name) => name.startsWith('.'))
      : [];
  const versionOf = (path: string) => {
    const run = Bun.spawnSync({ cmd: [path, '--version'], stdout: 'pipe', stderr: 'pipe' });
    return run.exitCode === 0 ? run.stdout.toString().trim() : `exit ${run.exitCode}: ${run.stderr.toString().trim()}`;
  };

  try {
    // Cold first use: download, verify, extract, run.
    const packLinux = serve('pack', 'linux', 'pack.tar.gz');
    const cold = await resolveIn('pack', 'linux');
    check(
      'cold first use downloads, verifies, extracts and runs --version',
      cold.ok &&
        cold.path === finalPath('pack', 'linux') &&
        versionOf(cold.path) === 'pack synthetic 0.40.0' &&
        requests.get(packLinux) === 1,
      JSON.stringify({ result: cold, requests: requests.get(packLinux) ?? 0 })
    );

    // Warm use: no request.
    const warm = await resolveIn('pack', 'linux');
    check(
      'warm use makes no request',
      warm.ok && warm.path === finalPath('pack', 'linux') && requests.get(packLinux) === 1,
      JSON.stringify({ result: warm, requests: requests.get(packLinux) ?? 0 })
    );

    // The deb (ar + data.tar.gz) and the macOS zip bundle, read in-process.
    const debRoute = serve('session-manager-plugin', 'linux', 'session-manager-plugin.deb');
    const deb = await resolveIn('session-manager-plugin', 'linux');
    check(
      'a .deb is read in-process and only its executable is extracted',
      deb.ok &&
        versionOf(deb.path) === 'session-manager-plugin synthetic 1.2.707.0' &&
        requests.get(debRoute) === 1 &&
        readdirSync(dirname(deb.path)).length === 1,
      JSON.stringify({ result: deb, files: deb.ok ? readdirSync(dirname(deb.path)) : [] })
    );
    const zipRoute = serve('session-manager-plugin', 'macos', 'sessionmanager-bundle.zip');
    const zip = await resolveIn('session-manager-plugin', 'macos');
    check(
      'a zip bundle is read in-process and its executable is made runnable',
      zip.ok &&
        zip.path === finalPath('session-manager-plugin', 'macos') &&
        versionOf(zip.path) === 'session-manager-plugin synthetic 1.2.707.0' &&
        requests.get(zipRoute) === 1,
      JSON.stringify({ result: zip })
    );

    // A checksum mismatch: refused, nothing left behind.
    serve('nixpacks', 'linux', 'nixpacks.tar.gz');
    const mismatch = await resolveIn('nixpacks', 'linux');
    check(
      'a checksum mismatch is refused and leaves no executable',
      !mismatch.ok &&
        /sha-?256/i.test(mismatch.message) &&
        !existsSync(finalPath('nixpacks', 'linux')) &&
        leftovers('nixpacks').length === 0,
      JSON.stringify({ result: mismatch, leftovers: leftovers('nixpacks') })
    );

    // A refused download names the asset, its checksum and the offline path.
    serve('nixpacks', 'alpine', 'nixpacks.tar.gz', 'refuse');
    const refused = await resolveIn('nixpacks', 'alpine');
    const refusedAsset = manifest.nixpacks.assets.alpine!;
    check(
      'a refused download names the asset URL, its checksum and the path to place it offline',
      !refused.ok &&
        refused.message.includes(refusedAsset.url) &&
        refused.message.includes(refusedAsset.sha256) &&
        refused.message.includes(finalPath('nixpacks', 'alpine')) &&
        !existsSync(finalPath('nixpacks', 'alpine')),
      JSON.stringify({ result: refused })
    );

    // Interrupted: the process dies mid-download; the retry cleans up and succeeds.
    await rm(join(toolsDirectory, 'session-manager-plugin'), { recursive: true, force: true });
    const stallRoute = serve('session-manager-plugin', 'linux', 'session-manager-plugin.deb', 'stall');
    const before = requests.get(stallRoute) ?? 0;
    const interrupted = startDriver([
      '--manifest',
      manifestPath,
      '--tool',
      'session-manager-plugin',
      '--platform',
      'linux'
    ]);
    const deadline = Date.now() + 15_000;
    while ((requests.get(stallRoute) ?? 0) === before && Date.now() < deadline) await Bun.sleep(50);
    await Bun.sleep(500);
    const partial = leftovers('session-manager-plugin');
    interrupted.kill('SIGKILL');
    await interrupted.exited;
    releaseStall();
    const afterKill = {
      executable: existsSync(finalPath('session-manager-plugin', 'linux')),
      partial: leftovers('session-manager-plugin')
    };
    serve('session-manager-plugin', 'linux', 'session-manager-plugin.deb');
    const retry = await resolveIn('session-manager-plugin', 'linux');
    check(
      'an interrupted download leaves nothing usable, and the retry cleans up and succeeds',
      partial.length > 0 &&
        !afterKill.executable &&
        retry.ok &&
        versionOf(retry.path) === 'session-manager-plugin synthetic 1.2.707.0' &&
        leftovers('session-manager-plugin').length === 0,
      JSON.stringify({ partialWhileDownloading: partial, afterKill, retry, left: leftovers('session-manager-plugin') })
    );

    // Two concurrent first uses: one download.
    const concurrentRoute = serve('pack', 'linux-arm', 'pack.tar.gz', 'slow');
    const [first, second] = await Promise.all([
      finish(startDriver(['--manifest', manifestPath, '--tool', 'pack', '--platform', 'linux-arm'])),
      finish(startDriver(['--manifest', manifestPath, '--tool', 'pack', '--platform', 'linux-arm']))
    ]);
    check(
      'two concurrent first uses download once',
      first.ok &&
        second.ok &&
        first.path === second.path &&
        requests.get(concurrentRoute) === 1 &&
        versionOf(first.path) === 'pack synthetic 0.40.0' &&
        leftovers('pack').length === 0,
      JSON.stringify({ first, second, requests: requests.get(concurrentRoute) ?? 0, left: leftovers('pack') })
    );

    // A stalled download: headers and 64 bytes, then nothing. Commands allow 30 s without data and 10 minutes in all;
    // the test passes shorter bounds, one run reaching the idle bound and one the overall cap.
    const hangRoute = serve('nixpacks', 'macos', 'nixpacks.tar.gz', 'hang');
    const stalledAsset = manifest.nixpacks.assets.macos!;
    const boundedRun = async (bounds: { idleMs: number; totalMs: number }) => {
      // Monotonic: the wall clock can jump while a run waits.
      const started = performance.now();
      const child = startDriver([
        '--manifest',
        manifestPath,
        '--tool',
        'nixpacks',
        '--platform',
        'macos',
        '--idle-timeout-ms',
        String(bounds.idleMs),
        '--total-timeout-ms',
        String(bounds.totalMs)
      ]);
      // Well past the bound the driver is still waiting: stop it and report that.
      let stillWaiting = false;
      const deadline = setTimeout(
        () => {
          stillWaiting = true;
          child.kill('SIGKILL');
        },
        Math.min(bounds.idleMs, bounds.totalMs) + 10_000
      );
      const result = await finish(child);
      clearTimeout(deadline);
      return { result, stillWaiting, elapsedMs: Math.round(performance.now() - started) };
    };
    const failedWithinBound = (run: Awaited<ReturnType<typeof boundedRun>>, boundMs: number, reason: RegExp) =>
      !run.stillWaiting &&
      run.elapsedMs < boundMs + 5_000 &&
      !run.result.ok &&
      run.result.code === 'EXTERNAL_TOOL_DOWNLOAD_FAILED' &&
      reason.test(run.result.message ?? '') &&
      [stalledAsset.url, stalledAsset.sha256, finalPath('nixpacks', 'macos')].every((part) =>
        (run.result.message ?? '').includes(part)
      );
    const idle = await boundedRun({ idleMs: 1_000, totalMs: 60_000 });
    const overall = await boundedRun({ idleMs: 60_000, totalMs: 1_500 });
    const afterStalls = { executable: existsSync(finalPath('nixpacks', 'macos')), left: leftovers('nixpacks') };
    serve('nixpacks', 'macos', 'nixpacks.tar.gz');
    const healthy = await resolveIn('nixpacks', 'macos');
    check(
      'a stalled download fails within its bound and leaves nothing behind, and the retry succeeds',
      failedWithinBound(idle, 1_000, /no data/) &&
        failedWithinBound(overall, 1_500, /did not finish/) &&
        !afterStalls.executable &&
        afterStalls.left.length === 0 &&
        healthy.ok &&
        versionOf(healthy.path!) === 'nixpacks synthetic 1.39.0' &&
        requests.get(hangRoute) === 3 &&
        leftovers('nixpacks').length === 0,
      JSON.stringify({ idle, overall, afterStalls, healthy, requests: requests.get(hangRoute) ?? 0 })
    );

    // Preseeded: the CLI's call sites use a file already at the resolver's path, without any request.
    const { EXTERNAL_TOOL_MANIFEST, externalToolPath } = await import('src/utils/external-tools');
    const project = join(work, 'project');
    await mkdir(project, { recursive: true });
    const preseeded: string[] = [];
    for (const tool of ['nixpacks', 'pack'] as const) {
      const path = externalToolPath({ tool, toolsDirectory });
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, syntheticExecutable(tool));
      await chmod(path, 0o755);
      preseeded.push(path);
    }
    const requestsBefore = [...requests.values()].reduce((sum, count) => sum + count, 0);
    const planner = await finish(startDriver(['--call-site', 'planner', '--cwd', project]));
    const pack = await finish(startDriver(['--call-site', 'pack', '--cwd', project]));
    const requestsAfter = [...requests.values()].reduce((sum, count) => sum + count, 0);
    check(
      'a preseeded file is used by the nixpacks planner and by pack without any request',
      planner.ok &&
        planner.output === 'node synthetic-server.js' &&
        pack.ok &&
        pack.output === `pack synthetic ${EXTERNAL_TOOL_MANIFEST.pack.version}` &&
        requestsAfter === requestsBefore,
      JSON.stringify({ preseeded, planner, pack, requests: requestsAfter - requestsBefore })
    );
  } catch (error) {
    check('the check ran to the end', false, error instanceof Error ? (error.stack ?? error.message) : String(error));
  } finally {
    releaseStall();
    server.stop(true);
    await writeFile(
      join(outputDirectory, 'report.json'),
      `${JSON.stringify({ checks, requests: Object.fromEntries(requests), manifest }, null, 2)}\n`
    );
    await rm(work, { recursive: true, force: true });
  }

  const failed = checks.filter(({ ok }) => !ok).length;
  console.info(
    `${checks.length - failed} of ${checks.length} checks passed. Report: ${join(outputDirectory, 'report.json')}`
  );
  if (failed > 0) process.exitCode = 1;
};

(process.argv.includes('--driver') ? runDriver() : main()).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
