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
 * - the CLI's call sites (`runRailpackPrepare` and the init planner's `planStartCommand`) use a preseeded executable
 *   without any request, and a build variable reaches `railpack prepare` through its environment, not its arguments.
 *
 * The synthetic executables are shell scripts, so this runs on Linux and macOS. The synthetic `railpack prepare`
 * writes a plan and an info file to its `--plan-out` and `--info-out` paths as the real one does. The report goes to
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

type Tool = 'railpack' | 'session-manager-plugin';
type Platform = 'linux' | 'alpine' | 'linux-arm' | 'macos' | 'macos-arm' | 'win';
type Asset = { url: string; sha256: string; bytes: number; archive: 'tar.gz' | 'zip' | 'deb'; executable: string };
type Manifest = Record<Tool, { version: string; assets: Partial<Record<Platform, Asset>> }>;
type DriverResult = { ok: boolean; path?: string; output?: string; message?: string; code?: string };

const CLI_ROOT = resolve(import.meta.dir, '..');
const VERSIONS: Record<Tool, string> = { railpack: '0.40.1', 'session-manager-plugin': '1.2.707.0' };
/** The build variable the prepare call site passes; the synthetic planner reports how it arrived. */
const BUILD_VARIABLE = { name: 'STP_E2E_BUILD_VARIABLE', value: 'synthetic-build-value' };

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
      const { planStartCommand } = await import('@domain-services/packaging-manager/railpack-command');
      const planned = await planStartCommand(argument('cwd')!);
      if (planned === null) throw new Error('The Railpack planner returned no start command.');
      result = { ok: true, path: '', output: planned };
    } else if (callSite === 'prepare') {
      const { runRailpackPrepare } = await import('@domain-services/packaging-manager/railpack-command');
      const prepared = await runRailpackPrepare({
        sourceDirectoryPath: argument('cwd')!,
        variables: { [BUILD_VARIABLE.name]: BUILD_VARIABLE.value }
      });
      result = { ok: true, path: '', output: JSON.stringify(prepared) };
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

/**
 * `--version` prints a recognizable line. `prepare <dir> --plan-out <file> --info-out <file> [--env NAME]...` writes a
 * plan with a start command and an info file recording the source directory, its whole command line, the names passed
 * with `--env` and the value of the build variable as it arrived in the environment.
 */
const syntheticExecutable = (tool: Tool) =>
  [
    '#!/bin/sh',
    'case "$1" in',
    `  --version|version) echo "${tool} synthetic ${VERSIONS[tool]}" ;;`,
    '  prepare)',
    '    all="$*"; shift; source="$1"; shift; plan=""; info=""; names=""',
    '    while [ $# -gt 0 ]; do',
    '      case "$1" in',
    '        --plan-out) plan="$2"; shift 2 ;;',
    '        --info-out) info="$2"; shift 2 ;;',
    '        --env) names="$names $2"; shift 2 ;;',
    '        *) shift ;;',
    '      esac',
    '    done',
    `    printf '%s' '{"deploy":{"startCommand":"node synthetic-server.js"}}' > "$plan"`,
    `    printf '{"success":true,"source":"%s","commandLine":"%s","envNames":"%s","variable":"%s"}' "$source" "$all" "$names" "\${${BUILD_VARIABLE.name}:-}" > "$info"`,
    '    ;;',
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
  const work = await mkdtemp(join(tmpdir(), 'stacktape-j13-external-tools-e2e-'));
  const toolsDirectory = join(work, 'tools');
  const checks: { case: string; ok: boolean; detail: string }[] = [];
  const check = (name: string, ok: boolean, detail: string) => {
    checks.push({ case: name, ok, detail });
    console.info(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
  };

  // Archives in the upstream formats, around synthetic executables.
  const staging = join(work, 'archives');
  const archives: Record<string, { body: Uint8Array; archive: Asset['archive']; executable: string }> = {};
  for (const tool of ['railpack'] as const) {
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
  // Each scenario uses its own platform, so each starts from an empty cache directory.
  const manifest: Manifest = {
    railpack: {
      version: VERSIONS.railpack,
      assets: {
        linux: asset('railpack', 'linux', 'railpack.tar.gz'),
        'linux-arm': asset('railpack', 'linux-arm', 'railpack.tar.gz'),
        // A pinned checksum that the served file does not have.
        'macos-arm': asset(
          'railpack',
          'macos-arm',
          'railpack.tar.gz',
          sha256(new TextEncoder().encode('not the served file'))
        ),
        alpine: asset('railpack', 'alpine', 'railpack.tar.gz'),
        macos: asset('railpack', 'macos', 'railpack.tar.gz')
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
  const { STP_RAILPACK_PLANNER: _plannerOverride, ...inheritedEnv } = process.env;
  const driverEnv = {
    ...inheritedEnv,
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
    const railpackLinux = serve('railpack', 'linux', 'railpack.tar.gz');
    const cold = await resolveIn('railpack', 'linux');
    check(
      'cold first use downloads, verifies, extracts and runs --version',
      cold.ok &&
        cold.path === finalPath('railpack', 'linux') &&
        versionOf(cold.path) === 'railpack synthetic 0.40.1' &&
        requests.get(railpackLinux) === 1,
      JSON.stringify({ result: cold, requests: requests.get(railpackLinux) ?? 0 })
    );

    // Warm use: no request.
    const warm = await resolveIn('railpack', 'linux');
    check(
      'warm use makes no request',
      warm.ok && warm.path === finalPath('railpack', 'linux') && requests.get(railpackLinux) === 1,
      JSON.stringify({ result: warm, requests: requests.get(railpackLinux) ?? 0 })
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
    serve('railpack', 'macos-arm', 'railpack.tar.gz');
    const mismatch = await resolveIn('railpack', 'macos-arm');
    check(
      'a checksum mismatch is refused and leaves no executable',
      !mismatch.ok &&
        /sha-?256/i.test(mismatch.message) &&
        !existsSync(finalPath('railpack', 'macos-arm')) &&
        leftovers('railpack').length === 0,
      JSON.stringify({ result: mismatch, leftovers: leftovers('railpack') })
    );

    // A refused download names the asset, its checksum and the offline path.
    serve('railpack', 'alpine', 'railpack.tar.gz', 'refuse');
    const refused = await resolveIn('railpack', 'alpine');
    const refusedAsset = manifest.railpack.assets.alpine!;
    check(
      'a refused download names the asset URL, its checksum and the path to place it offline',
      !refused.ok &&
        refused.message.includes(refusedAsset.url) &&
        refused.message.includes(refusedAsset.sha256) &&
        refused.message.includes(finalPath('railpack', 'alpine')) &&
        !existsSync(finalPath('railpack', 'alpine')),
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
    const concurrentRoute = serve('railpack', 'linux-arm', 'railpack.tar.gz', 'slow');
    const [first, second] = await Promise.all([
      finish(startDriver(['--manifest', manifestPath, '--tool', 'railpack', '--platform', 'linux-arm'])),
      finish(startDriver(['--manifest', manifestPath, '--tool', 'railpack', '--platform', 'linux-arm']))
    ]);
    check(
      'two concurrent first uses download once',
      first.ok &&
        second.ok &&
        first.path === second.path &&
        requests.get(concurrentRoute) === 1 &&
        versionOf(first.path) === 'railpack synthetic 0.40.1' &&
        leftovers('railpack').length === 0,
      JSON.stringify({ first, second, requests: requests.get(concurrentRoute) ?? 0, left: leftovers('railpack') })
    );

    // A stalled download: headers and 64 bytes, then nothing. Commands allow 30 s without data and 10 minutes in all;
    // the test passes shorter bounds, one run reaching the idle bound and one the overall cap.
    const hangRoute = serve('railpack', 'macos', 'railpack.tar.gz', 'hang');
    const stalledAsset = manifest.railpack.assets.macos!;
    const boundedRun = async (bounds: { idleMs: number; totalMs: number }) => {
      // Monotonic: the wall clock can jump while a run waits.
      const started = performance.now();
      const child = startDriver([
        '--manifest',
        manifestPath,
        '--tool',
        'railpack',
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
      [stalledAsset.url, stalledAsset.sha256, finalPath('railpack', 'macos')].every((part) =>
        (run.result.message ?? '').includes(part)
      );
    const idle = await boundedRun({ idleMs: 1_000, totalMs: 60_000 });
    const overall = await boundedRun({ idleMs: 60_000, totalMs: 1_500 });
    const afterStalls = { executable: existsSync(finalPath('railpack', 'macos')), left: leftovers('railpack') };
    serve('railpack', 'macos', 'railpack.tar.gz');
    const healthy = await resolveIn('railpack', 'macos');
    check(
      'a stalled download fails within its bound and leaves nothing behind, and the retry succeeds',
      failedWithinBound(idle, 1_000, /no data/) &&
        failedWithinBound(overall, 1_500, /did not finish/) &&
        !afterStalls.executable &&
        afterStalls.left.length === 0 &&
        healthy.ok &&
        versionOf(healthy.path!) === 'railpack synthetic 0.40.1' &&
        requests.get(hangRoute) === 3 &&
        leftovers('railpack').length === 0,
      JSON.stringify({ idle, overall, afterStalls, healthy, requests: requests.get(hangRoute) ?? 0 })
    );

    // A payload can match its pinned checksum and still be an invalid archive.
    // None of these formats may publish a partial executable; the healthy retry must recover.
    for (const [tool, platform, archive] of [
      ['railpack', 'macos', 'railpack.tar.gz'],
      ['session-manager-plugin', 'linux', 'session-manager-plugin.deb'],
      ['session-manager-plugin', 'macos', 'sessionmanager-bundle.zip']
    ] as const) {
      await rm(dirname(finalPath(tool, platform)), { recursive: true, force: true });
      const route = serve(tool, platform, archive);
      const corrupt = new TextEncoder().encode('checksum-valid but corrupt archive');
      routes.set(route, { body: corrupt, mode: 'ok' });
      manifest[tool].assets[platform] = { ...asset(tool, platform, archive, sha256(corrupt)), bytes: corrupt.length };
      await writeFile(manifestPath, JSON.stringify(manifest));
      const rejected = await resolveIn(tool, platform);
      const unpublished = !existsSync(finalPath(tool, platform)) && leftovers(tool).length === 0;
      serve(tool, platform, archive);
      manifest[tool].assets[platform] = asset(tool, platform, archive);
      await writeFile(manifestPath, JSON.stringify(manifest));
      const recovered = await resolveIn(tool, platform);
      check(
        `corrupt ${archives[archive]!.archive} with a matching checksum is refused, then healthy retry works`,
        !rejected.ok &&
          unpublished &&
          recovered.ok &&
          versionOf(recovered.path!) === `${tool} synthetic ${VERSIONS[tool]}` &&
          leftovers(tool).length === 0,
        JSON.stringify({ rejected, unpublished, recovered })
      );
    }

    // Preseeded: the CLI's call sites use a file already at the resolver's path, without any request.
    const { externalToolPath } = await import('src/utils/external-tools');
    const project = join(work, 'project');
    await mkdir(project, { recursive: true });
    const preseeded = externalToolPath({ tool: 'railpack', toolsDirectory });
    await mkdir(dirname(preseeded), { recursive: true });
    await writeFile(preseeded, syntheticExecutable('railpack'));
    await chmod(preseeded, 0o755);
    const requestsBefore = [...requests.values()].reduce((sum, count) => sum + count, 0);
    const planner = await finish(startDriver(['--call-site', 'planner', '--cwd', project]));
    const prepare = await finish(startDriver(['--call-site', 'prepare', '--cwd', project]));
    const requestsAfter = [...requests.values()].reduce((sum, count) => sum + count, 0);
    const prepared = prepare.ok
      ? (JSON.parse(prepare.output!) as {
          plan?: { deploy?: { startCommand?: string } };
          info?: { success?: boolean; source?: string; commandLine?: string; envNames?: string; variable?: string };
        })
      : undefined;
    check(
      'a preseeded railpack is used by runRailpackPrepare and planStartCommand without any request',
      planner.ok &&
        planner.output === 'node synthetic-server.js' &&
        prepared?.plan?.deploy?.startCommand === 'node synthetic-server.js' &&
        prepared.info?.success === true &&
        prepared.info.source === project &&
        requestsAfter === requestsBefore,
      JSON.stringify({ preseeded, planner, prepare, requests: requestsAfter - requestsBefore })
    );
    check(
      'a build variable reaches railpack prepare through its environment and never its command line',
      prepared?.info?.envNames?.trim() === BUILD_VARIABLE.name &&
        prepared.info.variable === BUILD_VARIABLE.value &&
        !(prepared.info.commandLine ?? BUILD_VARIABLE.value).includes(BUILD_VARIABLE.value),
      JSON.stringify({ info: prepared?.info })
    );
    // Stop the only download endpoint before resolving the warm cache again.
    // This establishes offline execution, rather than merely a request count while online.
    server.stop(true);
    const offline = await resolveIn('railpack', 'linux');
    const offlinePlanner = await finish(startDriver(['--call-site', 'planner', '--cwd', project]));
    check(
      'warm and preseeded tools execute after the download server is gone',
      offline.ok &&
        versionOf(offline.path!) === 'railpack synthetic 0.40.1' &&
        offlinePlanner.ok &&
        offlinePlanner.output === 'node synthetic-server.js',
      JSON.stringify({ offline, offlinePlanner })
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
