/**
 * Listeners that cannot be services: every `.listen(` call in the file binds a literal loopback address.
 *
 * A CLI's OAuth login callback or a library's SSH tunnel listens on 127.0.0.1, which no other machine or container can
 * reach, so deploying it as a web service gives a service nobody can call. Such a listener is left out only when
 * nothing in the repository says how its package runs: no start or serve script, no Nx serve target, no Procfile,
 * Dockerfile or other deployment file in the package, and no deployment file elsewhere that names the package. In
 * every other case the scan keeps its earlier behavior. Only the listener is left out, never the package or another
 * workload found in it.
 */

import { posix } from 'node:path';
import { readText, type ProbeContext } from './probe';
import { maskFile } from './lexical';

/** Files that declare a deployed process by their name alone. */
const DEPLOYMENT_FILE =
  /^(?:Procfile|Dockerfile(?:\..+)?|.+\.[Dd]ockerfile|(?:docker-)?compose(?:\.[\w-]+)?\.ya?ml|fly\.toml|render\.ya?ml|app\.json|railway\.(?:json|toml)|nixpacks\.toml|ecosystem\.config\.[cm]?js|Chart\.ya?ml)$/;
/** Kubernetes workloads and ECS task definitions, which can run a package from anywhere in the repository. */
const KUBERNETES_WORKLOAD = /^\s*kind:\s*["']?(?:Deployment|StatefulSet|DaemonSet|Job|CronJob|Pod|ReplicaSet)\b/m;
const ECS_TASK_DEFINITION = /"containerDefinitions"\s*:/;
const START_SCRIPT = /^(?:start|serve)(?::|$)/;
const LOOPBACK_LISTEN = /\.listen\s*\(\s*[^,()]*,\s*(["'])(?:127\.0\.0\.1|localhost|::1)\1/g;

const baseName = (path: string) => path.split('/').at(-1) ?? path;

/** Every `.listen(` call in the file binds a literal loopback address. */
export const listensOnlyOnLoopback = (path: string, raw: string): boolean => {
  const code = maskFile(path, raw, 'keep');
  const calls = code.match(/\.listen\s*\(/g)?.length ?? 0;
  return calls > 0 && calls === (code.match(LOOPBACK_LISTEN)?.length ?? 0);
};

const parseObject = (raw: string | undefined): Record<string, unknown> | undefined => {
  if (raw === undefined) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const keysOf = (value: unknown): string[] =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.keys(value) : [];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Decides, per listener file, whether it is a loopback-only listener of a package nothing runs. Deployment files are
 * read once per scan, and only when such a listener exists.
 */
export const createLoopbackListenerJudge = (context: ProbeContext) => {
  const files = new Set(context.files);
  const readJson = async (path: string) =>
    files.has(path) ? parseObject(await readText(context, path, { fullFile: true })) : undefined;
  let deploymentTexts: Promise<Array<{ path: string; text: string }>> | undefined;
  const readDeploymentTexts = async () => {
    const found: Array<{ path: string; text: string }> = [];
    for (const path of context.files) {
      const name = baseName(path);
      const byName = DEPLOYMENT_FILE.test(name);
      if (!byName && !/\.(?:ya?ml|json)$/.test(name)) continue;
      if (/(?:^|\/)node_modules\//.test(path) || name === 'package.json') continue;
      // oxlint-disable-next-line no-await-in-loop -- policy-controlled reads, one at a time.
      const text = await readText(context, path, { fullFile: true });
      if (text === undefined) continue;
      if (byName || KUBERNETES_WORKLOAD.test(text) || ECS_TASK_DEFINITION.test(text)) found.push({ path, text });
    }
    return found;
  };

  /** Whether something in the repository says how the package at `root` runs. */
  const runsSomehow = async (root: string): Promise<boolean> => {
    const prefix = root === '.' ? '' : `${root}/`;
    const manifest = await readJson(`${prefix}package.json`);
    if (keysOf(manifest?.scripts).some((name) => START_SCRIPT.test(name))) return true;
    const nxProject = await readJson(`${prefix}project.json`);
    if (keysOf(nxProject?.targets).some((name) => START_SCRIPT.test(name))) return true;
    deploymentTexts ??= readDeploymentTexts();
    const deployments = await deploymentTexts;
    // The repository root has no name another file could use: any deployment file may run it.
    if (root === '.') return deployments.length > 0;
    if (deployments.some(({ path }) => posix.dirname(path) === root)) return true;
    const names = [
      root,
      baseName(root),
      typeof manifest?.name === 'string' ? manifest.name : undefined,
      ...(typeof manifest?.bin === 'string' ? [] : keysOf(manifest?.bin))
    ]
      .filter((name): name is string => name !== undefined && name.length > 0)
      .map((name) => new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`));
    return deployments.some(({ text }) => names.some((name) => name.test(text)));
  };

  return async ({ root, path, raw }: { root: string; path: string; raw: string }): Promise<boolean> =>
    listensOnlyOnLoopback(path, raw) && !(await runsSomehow(root));
};
