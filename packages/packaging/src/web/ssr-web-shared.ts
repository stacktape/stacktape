import type {
  ArchiveItem,
  CreatePackagingError,
  ExecuteProcess,
  PackagingProgressLogger as ProgressLogger
} from '../runtime-contracts';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { serializeEnvironment } from '../runtime-helpers';
import { copy, emptyDir, ensureDir, outputFile, pathExists, readFile, remove, writeFile } from 'fs-extra';
import { buildUsingCustomArtifact } from '../artifact/custom-artifact';
import type { EnvironmentVar } from '@stacktape/config/shared';
import { runWebBuildExclusive } from './build-coordinator';
import { parseCommand } from '../process/command';
import { copyTracedNodeRuntimeFiles } from './node-runtime-files';
import { resolveInstalledNodePackage } from './node-runtime-files';
import { copyDockerInstalledModulesForLambda } from '../es/native-dependencies';
import type { DockerBuildOutputArchitecture, RunDocker } from '../runtime-contracts';

/**
 * Framework-specific build configuration
 */
export type SsrWebBuildConfig = {
  /** Actionable adapter configuration shown when the framework did not emit its expected server output. */
  adapterConfigurationHint?: string | undefined;
  /** Build command to execute */
  buildCommand: string;
  /** Declared framework packages whose runtime is already bundled into the emitted server output. */
  bundledApplicationPackages?: string[] | undefined;
  /** Static output directory also required beside the server output at runtime. */
  copyStaticAssetsToServerDirectory?: string | undefined;
  /** Working directory for the build */
  workingDir: string;
  /** Path to server output after build */
  serverOutputPath: string;
  /** Path to static output after build */
  staticOutputPath: string;
  /** Handler file name (e.g., 'index.mjs') */
  handlerFileName: string;
  /** Preserve the server output's final directory name when framework code resolves files relative to it. */
  preserveServerOutputDirectory?: boolean | undefined;
  /** Root used for runtime dependency tracing, normally the Stacktape project directory. */
  traceBasePath?: string | undefined;
  /** Framework runtime adapters which must be declared by the application package. */
  requiredAdapterPackages?: string[] | undefined;
  /** Native runtime packages bundled as JS but loaded dynamically by the framework at runtime. */
  nativeRuntimePackages?: Array<{ name: string; resolveFromPackage?: string | undefined }> | undefined;
  /** Static asset prefix for CDN routing (e.g., '_astro', '_nuxt') */
  staticAssetPrefix: string;
  /** Environment variables to set during build */
  buildEnv?: Record<string, string> | undefined;
  /** Wrapper type for the framework's generated server entrypoint. */
  wrapperType: 'passthrough' | 'node-http' | 'web-fetch' | 'tanstack-fetch';
  /** Supported alternative framework layouts; the freshest emitted handler wins when multiple layouts exist. */
  fallbackOutputVariants?: Array<{
    serverOutputPath: string;
    staticOutputPath: string;
    handlerFileName: string;
    preserveServerOutputDirectory?: boolean | undefined;
    staticAssetPrefix: string;
    wrapperType: 'passthrough' | 'node-http' | 'web-fetch' | 'tanstack-fetch';
  }>;
};

export type SsrWebPackagingProps = {
  resourceName: string;
  resourceType: string;
  serverFunctionName: string;
  distFolderPath: string;
  cwd: string;
  progressLogger: ProgressLogger;
  createProgressLogger: (instanceId: string) => ProgressLogger;
  buildConfig: SsrWebBuildConfig;
  environmentVars: EnvironmentVar[];
  existingDigests?: string[] | undefined;
  archiveItem: ArchiveItem;
  createPackagingError: CreatePackagingError;
  executeProcess: ExecuteProcess;
  runDocker?: RunDocker | undefined;
  nativeDependencyInstallationRootPath?: string | undefined;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
};

type ApplicationManifest = {
  dependencies?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
  optionalDependencies?: Record<string, string> | undefined;
  peerDependencies?: Record<string, string> | undefined;
};

const exactCaseRegularFileMtime = async (filePath: string): Promise<number | undefined> => {
  try {
    const parentEntries = await readdir(dirname(filePath));
    if (!parentEntries.includes(basename(filePath))) return undefined;
    // stat follows a symlink. A symlink to a regular file is valid because output copying
    // dereferences it, while a directory or a symlink to a directory is not a Lambda handler.
    const fileStat = await stat(filePath);
    return fileStat.isFile() ? fileStat.mtimeMs : undefined;
  } catch {
    return undefined;
  }
};

const isExactCaseRegularFile = async (filePath: string): Promise<boolean> =>
  (await exactCaseRegularFileMtime(filePath)) !== undefined;

type SsrWebOutputVariant = Pick<
  SsrWebBuildConfig,
  | 'handlerFileName'
  | 'preserveServerOutputDirectory'
  | 'serverOutputPath'
  | 'staticAssetPrefix'
  | 'staticOutputPath'
  | 'wrapperType'
>;

const ssrWebOutputVariants = (buildConfig: SsrWebBuildConfig): SsrWebOutputVariant[] => [
  {
    serverOutputPath: buildConfig.serverOutputPath,
    staticOutputPath: buildConfig.staticOutputPath,
    handlerFileName: buildConfig.handlerFileName,
    preserveServerOutputDirectory: buildConfig.preserveServerOutputDirectory,
    staticAssetPrefix: buildConfig.staticAssetPrefix,
    wrapperType: buildConfig.wrapperType
  },
  ...(buildConfig.fallbackOutputVariants ?? [])
];

const clearSsrWebOutputVariants = async (buildConfig: SsrWebBuildConfig): Promise<void> => {
  const workingDirectory = resolve(buildConfig.workingDir);
  const outputPaths = [
    ...new Set(
      ssrWebOutputVariants(buildConfig).flatMap(({ serverOutputPath, staticOutputPath }) => [
        resolve(workingDirectory, serverOutputPath),
        resolve(workingDirectory, staticOutputPath)
      ])
    )
  ];
  for (const outputPath of outputPaths) {
    const relativeOutputPath = relative(workingDirectory, outputPath);
    if (
      relativeOutputPath === '' ||
      relativeOutputPath === '..' ||
      relativeOutputPath.startsWith(`..${sep}`) ||
      isAbsolute(relativeOutputPath)
    ) {
      throw new Error(`Refusing to clear SSR build output outside the application directory: ${outputPath}`);
    }
  }
  const rootOutputPaths = outputPaths.filter(
    (candidatePath) =>
      !outputPaths.some((possibleParentPath) => {
        if (candidatePath === possibleParentPath) return false;
        const pathFromParent = relative(possibleParentPath, candidatePath);
        return (
          pathFromParent !== '' &&
          pathFromParent !== '..' &&
          !pathFromParent.startsWith(`..${sep}`) &&
          !isAbsolute(pathFromParent)
        );
      })
  );
  await Promise.all(rootOutputPaths.map((outputPath) => remove(outputPath)));
};

export const getMissingRequiredAdapterPackages = async ({
  requiredAdapterPackages = [],
  workingDir
}: Pick<SsrWebBuildConfig, 'requiredAdapterPackages' | 'workingDir'>) => {
  if (requiredAdapterPackages.length === 0) return [];
  const manifestPath = join(workingDir, 'package.json');
  if (!(await pathExists(manifestPath))) return requiredAdapterPackages;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ApplicationManifest;
  const declaredPackages = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {})
  ]);
  return requiredAdapterPackages.filter((packageName) => !declaredPackages.has(packageName));
};

export const resolveSsrWebOutputVariant = async (buildConfig: SsrWebBuildConfig): Promise<SsrWebBuildConfig> => {
  const outputVariants = ssrWebOutputVariants(buildConfig);
  const handlerMtimes = await Promise.all(
    outputVariants.map(({ serverOutputPath, handlerFileName }) =>
      exactCaseRegularFileMtime(join(buildConfig.workingDir, serverOutputPath, handlerFileName))
    )
  );
  const selectedIndex = handlerMtimes.reduce<number>((freshestIndex, mtime, index) => {
    if (mtime === undefined) return freshestIndex;
    if (freshestIndex === -1) return index;
    return mtime > handlerMtimes[freshestIndex]! ? index : freshestIndex;
  }, -1);
  if (selectedIndex === -1) {
    throw new Error(
      `The build completed without creating any supported server handler (${outputVariants.map(({ serverOutputPath, handlerFileName }) => `${serverOutputPath.replace(/[\\/]$/, '')}/${handlerFileName}`).join(', ')}).${buildConfig.adapterConfigurationHint ? ` ${buildConfig.adapterConfigurationHint}` : ''}`
    );
  }
  return { ...buildConfig, ...outputVariants[selectedIndex] };
};

/**
 * Creates the Lambda handler wrapper for SSR web resources.
 * Four types:
 * - 'passthrough': for Nitro-based frameworks that already output a Lambda handler
 * - 'node-http': for frameworks that output a Node.js HTTP handler (Astro, SvelteKit)
 * - 'web-fetch': for Remix server build modules adapted through createRequestHandler
 * - 'tanstack-fetch': for TanStack Start entries whose default export exposes fetch
 */
export const createServerWrapper = async ({
  distFolderPath,
  handlerFileName,
  wrapperType
}: {
  distFolderPath: string;
  handlerFileName: string;
  wrapperType: 'passthrough' | 'node-http' | 'web-fetch' | 'tanstack-fetch';
}) => {
  const serverFunctionPath = join(distFolderPath, 'server-function');
  const wrapperPath = join(serverFunctionPath, 'index-wrap.mjs');

  if (wrapperType === 'passthrough') {
    const wrapperContent = `
export const handler = async (event, context) => {
  const { handler: rawHandler } = await import("./${handlerFileName}");
  return rawHandler(event, context);
};
`;
    await outputFile(wrapperPath, wrapperContent);
  } else if (wrapperType === 'node-http') {
    // node-http wrapper: starts a local HTTP server on a random port, proxies the Lambda event
    // to it via fetch, and returns the response. Handles Astro, SvelteKit.
    const wrapperContent = `
import { createServer } from "node:http";
import { Buffer } from "node:buffer";

let _server;
let _baseUrl;

async function ensureServer() {
  if (_server) return _baseUrl;

  const mod = await import("./${handlerFileName}");
  const h = mod.handler || mod.default?.handler || mod.default;
  if (typeof h !== "function") {
    throw new Error("Could not find request handler in ${handlerFileName}. Expected a (req, res) function export.");
  }

  return new Promise((resolve, reject) => {
    _server = createServer((request, response) => {
      const publicHost = request.headers["x-stacktape-public-host"];
      if (typeof publicHost === "string" && publicHost) {
        request.headers.host = publicHost;
      }
      const publicProtocol = request.headers["x-stacktape-public-protocol"];
      if (publicProtocol === "https") {
        Object.defineProperty(request.socket, "encrypted", { configurable: true, value: true });
      }
      delete request.headers["x-stacktape-public-host"];
      delete request.headers["x-stacktape-public-protocol"];
      return h(request, response);
    });
    _server.listen(0, "127.0.0.1", () => {
      const addr = _server.address();
      _baseUrl = "http://127.0.0.1:" + addr.port;
      _server.unref?.();
      resolve(_baseUrl);
    });
    _server.on("error", reject);
  });
}

export const handler = async (event) => {
  const baseUrl = await ensureServer();

  const {
    requestContext,
    headers: eventHeaders = {},
    rawPath,
    rawQueryString,
    path: requestPath,
    queryStringParameters,
    multiValueQueryStringParameters = {},
    multiValueHeaders = {},
    body: eventBody,
    isBase64Encoded,
    cookies
  } = event;

  const method = requestContext?.http?.method || event.httpMethod || "GET";
  const requestQuery = rawQueryString !== undefined
    ? rawQueryString
    : (() => {
        const params = new URLSearchParams();
        const multiValueKeys = new Set(Object.keys(multiValueQueryStringParameters));
        for (const [key, values] of Object.entries(multiValueQueryStringParameters)) {
          for (const value of values || []) params.append(key, String(value));
        }
        for (const [key, value] of Object.entries(queryStringParameters || {})) {
          if (!multiValueKeys.has(key) && value !== undefined) params.append(key, String(value));
        }
        return params.toString();
      })();
  const url = baseUrl + (rawPath || requestPath || "/") + (requestQuery ? "?" + requestQuery : "");

  // Build headers
  const headers = new Headers();
  const multiValueHeaderNames = new Set(Object.keys(multiValueHeaders).map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(eventHeaders)) {
    if (value !== undefined && !multiValueHeaderNames.has(key.toLowerCase())) headers.set(key, String(value));
  }
  for (const [key, values] of Object.entries(multiValueHeaders)) {
    for (const value of values || []) headers.append(key, String(value));
  }
  if (cookies && cookies.length > 0) {
    headers.set("cookie", cookies.join("; "));
  }
  const publicHost = eventHeaders["x-forwarded-host"] || eventHeaders["X-Forwarded-Host"] || eventHeaders.host || eventHeaders.Host;
  if (publicHost) headers.set("x-stacktape-public-host", String(publicHost));
  const publicProtocol = eventHeaders["x-forwarded-proto"] || eventHeaders["X-Forwarded-Proto"] || "https";
  headers.set("x-stacktape-public-protocol", String(publicProtocol).split(",", 1)[0].trim().toLowerCase());

  // Build body
  let reqBody = undefined;
  if (eventBody && method !== "GET" && method !== "HEAD") {
    reqBody = isBase64Encoded ? Buffer.from(eventBody, "base64") : eventBody;
  }

  const response = await fetch(url, { method, headers, body: reqBody, redirect: "manual" });

  // Convert response
  const respHeaders = {};
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const contentEncoding = response.headers.get("content-encoding");
  const droppedResponseHeaders = new Set([
    "connection", "content-length", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade",
    ...(contentEncoding ? ["content-encoding"] : [])
  ]);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie" && setCookies.length === 0) {
      setCookies.push(value);
    } else if (key.toLowerCase() !== "set-cookie" && !droppedResponseHeaders.has(key.toLowerCase())) {
      respHeaders[key] = value;
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const isText = /text\\/|application\\/json|application\\/xml|application\\/javascript|charset=/i.test(contentType);
  const respBuffer = Buffer.from(await response.arrayBuffer());

  return {
    statusCode: response.status,
    headers: respHeaders,
    ...(setCookies.length > 0
      ? requestContext?.http || event.version === "2.0"
        ? { cookies: setCookies }
        : { multiValueHeaders: { "set-cookie": setCookies } }
      : {}),
    body: isText ? respBuffer.toString("utf-8") : respBuffer.toString("base64"),
    isBase64Encoded: !isText
  };
};
`;
    await outputFile(wrapperPath, wrapperContent);
  } else if (wrapperType === 'web-fetch' || wrapperType === 'tanstack-fetch') {
    // Both entries ultimately consume a Web Fetch API Request. Remix exports a build module that
    // createRequestHandler adapts; current TanStack Start exports an object with a fetch method.
    const requestHandlerInitializer =
      wrapperType === 'web-fetch'
        ? `
import { createRequestHandler } from "@remix-run/node";

let requestHandler;

async function getHandler() {
  if (requestHandler) return requestHandler;
  const build = await import("./${handlerFileName}");
  requestHandler = createRequestHandler(build, "production");
  return requestHandler;
}
`
        : `
let requestHandler;

async function getHandler() {
  if (requestHandler) return requestHandler;
  const entry = await import("./${handlerFileName}");
  const owner = entry.default && typeof entry.default.fetch === "function" ? entry.default : undefined;
  const candidate = owner?.fetch || entry.fetch || entry.default;
  if (typeof candidate !== "function") {
    throw new Error("Could not find a Web Fetch handler in ${handlerFileName}. Expected default.fetch, fetch, or a default function export.");
  }
  requestHandler = owner ? candidate.bind(owner) : candidate;
  return requestHandler;
}
`;
    const wrapperContent = `
import { Buffer } from "node:buffer";
${requestHandlerInitializer}

export const handler = async (event) => {
  const app = await getHandler();

  const {
    requestContext,
    headers: eventHeaders = {},
    rawPath,
    rawQueryString,
    path: requestPath,
    queryStringParameters,
    multiValueQueryStringParameters = {},
    multiValueHeaders = {},
    body: eventBody,
    isBase64Encoded,
    cookies
  } = event;

  const method = requestContext?.http?.method || event.httpMethod || "GET";
  const host = eventHeaders["x-forwarded-host"] || eventHeaders["X-Forwarded-Host"] || multiValueHeaders["x-forwarded-host"]?.[0] || eventHeaders["host"] || eventHeaders["Host"] || multiValueHeaders["host"]?.[0] || "localhost";
  const protocol = eventHeaders["x-forwarded-proto"] || multiValueHeaders["x-forwarded-proto"]?.[0] || "https";
  const requestQuery = rawQueryString !== undefined
    ? rawQueryString
    : (() => {
        const params = new URLSearchParams();
        const multiValueKeys = new Set(Object.keys(multiValueQueryStringParameters));
        for (const [key, values] of Object.entries(multiValueQueryStringParameters)) {
          for (const value of values || []) params.append(key, String(value));
        }
        for (const [key, value] of Object.entries(queryStringParameters || {})) {
          if (!multiValueKeys.has(key) && value !== undefined) params.append(key, String(value));
        }
        return params.toString();
      })();
  const url = protocol + "://" + host + (rawPath || requestPath || "/") + (requestQuery ? "?" + requestQuery : "");

  // Build headers
  const headers = new Headers();
  const multiValueHeaderNames = new Set(Object.keys(multiValueHeaders).map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(eventHeaders)) {
    if (value !== undefined && !multiValueHeaderNames.has(key.toLowerCase())) headers.set(key, String(value));
  }
  for (const [key, values] of Object.entries(multiValueHeaders)) {
    for (const value of values || []) headers.append(key, String(value));
  }
  if (cookies && cookies.length > 0) {
    headers.set("cookie", cookies.join("; "));
  }

  // Build body
  let reqBody = undefined;
  if (eventBody && method !== "GET" && method !== "HEAD") {
    reqBody = isBase64Encoded ? Buffer.from(eventBody, "base64") : eventBody;
  }

  const request = new Request(url, { method, headers, body: reqBody });
  const response = await app(request);

  // Convert Web Response to Lambda response
  const respHeaders = {};
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const droppedResponseHeaders = new Set([
    "connection", "content-length", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade"
  ]);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie" && setCookies.length === 0) {
      setCookies.push(value);
    } else if (key.toLowerCase() !== "set-cookie" && !droppedResponseHeaders.has(key.toLowerCase())) {
      respHeaders[key] = value;
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const contentEncoding = response.headers.get("content-encoding");
  const isText = !contentEncoding && /text\\/|application\\/json|application\\/xml|application\\/javascript|charset=/i.test(contentType);
  const respBuffer = Buffer.from(await response.arrayBuffer());

  return {
    statusCode: response.status,
    headers: respHeaders,
    ...(setCookies.length > 0
      ? requestContext?.http || event.version === "2.0"
        ? { cookies: setCookies }
        : { multiValueHeaders: { "set-cookie": setCookies } }
      : {}),
    body: isText ? respBuffer.toString("utf-8") : respBuffer.toString("base64"),
    isBase64Encoded: !isText
  };
};
`;
    await outputFile(wrapperPath, wrapperContent);
  }
};

/**
 * Reorganizes the build output for Stacktape deployment.
 * Moves server code to server-function/ and static assets to bucket-content/
 */
export const reorganizeBuildOutput = async ({
  distFolderPath,
  buildConfig
}: {
  distFolderPath: string;
  buildConfig: SsrWebBuildConfig;
}) => {
  const serverFunctionPath = join(distFolderPath, 'server-function');
  const bucketContentPath = join(distFolderPath, 'bucket-content');

  await ensureDir(serverFunctionPath);
  await ensureDir(bucketContentPath);

  const normalizedServer = buildConfig.serverOutputPath.replace(/\\/g, '/');
  const normalizedStatic = buildConfig.staticOutputPath.replace(/\\/g, '/');
  const staticIsInsideServer = normalizedStatic.startsWith(`${normalizedServer}/`);
  const serverIsInsideStatic = normalizedServer.startsWith(`${normalizedStatic}/`);
  const serverCopyDestination = buildConfig.preserveServerOutputDirectory
    ? join(serverFunctionPath, basename(normalizedServer))
    : serverFunctionPath;

  // Use dereference: true so symlinks (e.g. Nitro's .nitro/ node_modules symlinks)
  // are resolved to actual files - Lambda zip archives don't support symlinks
  const copyOpts = { dereference: true };

  if (staticIsInsideServer) {
    // Static output is nested inside server output (e.g. SvelteKit: server='build', static='build/client').
    // Copy the server output to server-function, then remove the static subdirectory from it.
    const serverSourcePath = join(distFolderPath, 'build-output', buildConfig.serverOutputPath);
    if (await pathExists(serverSourcePath)) {
      await copy(serverSourcePath, serverCopyDestination, copyOpts);
    }
    // Remove the static assets subdirectory from server-function to avoid bloating Lambda
    const staticRelative = normalizedStatic.slice(normalizedServer.length + 1);
    const staticInServerFunction = join(serverCopyDestination, staticRelative);
    if (await pathExists(staticInServerFunction)) {
      await remove(staticInServerFunction);
    }
    // Copy static assets from __static-assets (created during move phase) to bucket-content
    const staticAssetsPath = join(distFolderPath, 'build-output', '__static-assets');
    if (await pathExists(staticAssetsPath)) {
      await copy(staticAssetsPath, bucketContentPath, copyOpts);
    }
  } else if (serverIsInsideStatic) {
    const serverSourcePath = join(distFolderPath, 'build-output', '__server-output');
    if (await pathExists(serverSourcePath)) {
      await copy(serverSourcePath, serverCopyDestination, copyOpts);
    }
    const staticSourcePath = join(distFolderPath, 'build-output', buildConfig.staticOutputPath);
    if (await pathExists(staticSourcePath)) {
      await copy(staticSourcePath, bucketContentPath, copyOpts);
    }
  } else {
    // Independent paths - copy server and static separately
    const serverSourcePath = join(distFolderPath, 'build-output', buildConfig.serverOutputPath);
    if (await pathExists(serverSourcePath)) {
      await copy(serverSourcePath, serverCopyDestination, copyOpts);
    }
    const staticSourcePath = join(distFolderPath, 'build-output', buildConfig.staticOutputPath);
    if (await pathExists(staticSourcePath)) {
      await copy(staticSourcePath, bucketContentPath, copyOpts);
    }
  }

  // For non-passthrough wrappers, trace and materialize only reachable runtime dependencies. Copying a whole pnpm
  // graph both duplicates symlink targets and can make even a trivial framework app exceed Lambda's ZIP limit.
  if (buildConfig.wrapperType !== 'passthrough') {
    const originalEntrypointPath = join(
      buildConfig.workingDir,
      buildConfig.serverOutputPath,
      buildConfig.handlerFileName
    );
    if (await pathExists(originalEntrypointPath)) {
      await copyTracedNodeRuntimeFiles({
        bundledApplicationPackages: buildConfig.bundledApplicationPackages,
        entrypointPath: originalEntrypointPath,
        serverFunctionPath,
        traceBasePath: buildConfig.traceBasePath ?? buildConfig.workingDir,
        processCwd: buildConfig.workingDir
      });
    }
    // Add package.json with "type": "module" so Lambda treats framework-generated .js files as ESM, while keeping
    // application metadata used by runtime libraries.
    const applicationManifestPath = join(buildConfig.workingDir, 'package.json');
    const applicationManifest = (await pathExists(applicationManifestPath))
      ? (JSON.parse(await readFile(applicationManifestPath, 'utf8')) as Record<string, unknown>)
      : {};
    await writeFile(
      join(serverFunctionPath, 'package.json'),
      JSON.stringify({ ...applicationManifest, type: 'module' }, null, 2)
    );
  }

  if (buildConfig.copyStaticAssetsToServerDirectory) {
    const staticSourcePath = join(distFolderPath, 'build-output', buildConfig.staticOutputPath);
    if (await pathExists(staticSourcePath)) {
      await copy(staticSourcePath, join(serverFunctionPath, buildConfig.copyStaticAssetsToServerDirectory), copyOpts);
    }
  }

  const copiedHandlerPath = buildConfig.preserveServerOutputDirectory
    ? join(serverFunctionPath, basename(normalizedServer), buildConfig.handlerFileName)
    : join(serverFunctionPath, buildConfig.handlerFileName);
  if (!(await isExactCaseRegularFile(copiedHandlerPath))) {
    throw new Error(
      `The packaged server handler is missing at the exact wrapper import path ${copiedHandlerPath}. ` +
        'Ensure the framework output contains a regular file with the expected letter casing.'
    );
  }
};

/**
 * Main packaging function for SSR web resources.
 * Handles building the framework, reorganizing output, and creating deployment packages.
 */
export const createSsrWebArtifacts = async ({
  resourceName,
  resourceType,
  serverFunctionName,
  distFolderPath,
  cwd,
  progressLogger,
  createProgressLogger,
  buildConfig,
  environmentVars,
  existingDigests = [],
  archiveItem,
  createPackagingError,
  executeProcess,
  runDocker,
  nativeDependencyInstallationRootPath,
  dockerBuildOutputArchitecture
}: SsrWebPackagingProps) => {
  const missingAdapterPackages = await getMissingRequiredAdapterPackages(buildConfig);
  if (missingAdapterPackages.length > 0) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `The ${resourceType} application must declare the required server adapter ${missingAdapterPackages.join(', ')} in its package.json.${buildConfig.adapterConfigurationHint ? ` ${buildConfig.adapterConfigurationHint}` : ''}`
    });
  }

  const copyEnv = serializeEnvironment(process.env);

  // Add environment variables
  environmentVars.forEach((env) => {
    copyEnv[env.name] = String(env.value);
  });

  // Add build-specific env vars (like NITRO_PRESET)
  if (buildConfig.buildEnv) {
    Object.entries(buildConfig.buildEnv).forEach(([key, value]) => {
      copyEnv[key] = value;
    });
  }

  // The path can be reused by retries and dev repackaging. Never let removed build output leak into a new artifact.
  await emptyDir(distFolderPath);
  const buildOutputPath = join(distFolderPath, 'build-output');
  await ensureDir(buildOutputPath);
  let resolvedBuildConfig = buildConfig;

  await runWebBuildExclusive({
    workingDirectory: buildConfig.workingDir,
    build: async () => {
      await progressLogger.startEvent({
        eventType: 'BUILD_SSR_WEB_PROJECT',
        description: `Building ${resourceType} project`
      });
      try {
        // Framework output directories belong to the build. Clearing every supported variant inside the exclusive
        // build section prevents a handler left by an older framework version from winning output detection.
        await clearSsrWebOutputVariants(buildConfig);

        // Run the build command via npx to ensure local binaries are found
        await executeProcess('npx', ['--yes', ...parseCommand(buildConfig.buildCommand)], {
          cwd: buildConfig.workingDir,
          env: { ...copyEnv },
          disableStderr: true,
          disableStdout: true,
          inheritEnvVarsExcept: []
        });

        // Copy build output to our dist folder, dereferencing symlinks so they become real files.
        // Nitro-based frameworks (Nuxt, SolidStart, TanStack Start) create symlinks in node_modules
        // that point back to the build directory - these break when moved and don't work in Lambda zips.
        // Handle the case where one output path is nested inside the other (e.g. SvelteKit:
        // serverOutputPath='build', staticOutputPath='build/client') by copying the parent first,
        // then resolving the child from within the already-copied parent.
        resolvedBuildConfig = await resolveSsrWebOutputVariant(buildConfig);
        const serverOutputFullPath = join(resolvedBuildConfig.workingDir, resolvedBuildConfig.serverOutputPath);
        const staticOutputFullPath = join(resolvedBuildConfig.workingDir, resolvedBuildConfig.staticOutputPath);
        const deref = { dereference: true };

        const normalizedServer = resolvedBuildConfig.serverOutputPath.replace(/\\/g, '/');
        const normalizedStatic = resolvedBuildConfig.staticOutputPath.replace(/\\/g, '/');
        const staticIsInsideServer = normalizedStatic.startsWith(`${normalizedServer}/`);
        const serverIsInsideStatic = normalizedServer.startsWith(`${normalizedStatic}/`);

        if (staticIsInsideServer) {
          // Static is nested inside server (e.g. server='build', static='build/client')
          // Copy the parent (server) first, then the child (static) is already inside
          if (await pathExists(serverOutputFullPath)) {
            await copy(serverOutputFullPath, join(buildOutputPath, resolvedBuildConfig.serverOutputPath), deref);
          }
          // Static output is now at its relative position inside the copied server output
          const staticWithinCopied = join(buildOutputPath, resolvedBuildConfig.staticOutputPath);
          if (await pathExists(staticWithinCopied)) {
            await ensureDir(join(buildOutputPath, normalizedStatic, '..'));
            await copy(staticWithinCopied, join(buildOutputPath, '__static-assets'));
          }
        } else if (serverIsInsideStatic) {
          // Server is nested inside static - copy parent (static) first
          if (await pathExists(staticOutputFullPath)) {
            await copy(staticOutputFullPath, join(buildOutputPath, resolvedBuildConfig.staticOutputPath), deref);
          }
          const serverWithinCopied = join(buildOutputPath, resolvedBuildConfig.serverOutputPath);
          if (await pathExists(serverWithinCopied)) {
            await copy(serverWithinCopied, join(buildOutputPath, '__server-output'));
          }
        } else {
          // Independent paths - copy both
          if (await pathExists(serverOutputFullPath)) {
            await copy(serverOutputFullPath, join(buildOutputPath, resolvedBuildConfig.serverOutputPath), deref);
          }
          if (await pathExists(staticOutputFullPath)) {
            await copy(staticOutputFullPath, join(buildOutputPath, resolvedBuildConfig.staticOutputPath), deref);
          }
        }
      } catch (error) {
        throw createPackagingError({
          type: 'PACKAGING',
          message: `Error when packaging ${resourceType} "${resourceName}".`,
          cause: error
        });
      }

      await progressLogger.finishEvent({
        eventType: 'BUILD_SSR_WEB_PROJECT'
      });
    }
  });

  // Reorganize build output
  await progressLogger.startEvent({
    eventType: 'BUNDLING_SSR_WEB_FUNCTIONS',
    description: `Bundling ${resourceType} functions`
  });

  await reorganizeBuildOutput({ distFolderPath, buildConfig: resolvedBuildConfig });
  if (resolvedBuildConfig.nativeRuntimePackages?.length) {
    if (!runDocker || !nativeDependencyInstallationRootPath) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `The ${resourceType} runtime requires Docker-built native dependencies, but no Docker build action was configured.`
      });
    }
    const resolvedPackages = await Promise.all(
      resolvedBuildConfig.nativeRuntimePackages.map(async (runtimePackage) => {
        const resolvedPackage = await resolveInstalledNodePackage({
          applicationRoot: buildConfig.workingDir,
          packageName: runtimePackage.name,
          resolveFromPackage: runtimePackage.resolveFromPackage,
          traceBasePath: resolvedBuildConfig.traceBasePath ?? resolvedBuildConfig.workingDir
        });
        if (!resolvedPackage) {
          throw createPackagingError({
            type: 'PACKAGING',
            message: `Could not resolve native runtime package ${runtimePackage.name}${runtimePackage.resolveFromPackage ? ` from ${runtimePackage.resolveFromPackage}` : ''} for ${resourceType}.`
          });
        }
        return {
          ...resolvedPackage,
          dependencyType: 'root' as const,
          note: 'FRAMEWORK_NATIVE_RUNTIME'
        };
      })
    );
    await copyDockerInstalledModulesForLambda({
      dependencies: resolvedPackages,
      installationRootPath: nativeDependencyInstallationRootPath,
      distFolderPath: join(distFolderPath, 'server-function'),
      lambdaRuntimeVersion: 24,
      packageManager: 'npm',
      dockerBuildOutputArchitecture: dockerBuildOutputArchitecture ?? 'linux/amd64',
      runDocker: (commands) => runDocker(commands)
    });
  }
  await createServerWrapper({
    distFolderPath,
    handlerFileName: resolvedBuildConfig.preserveServerOutputDirectory
      ? `${basename(resolvedBuildConfig.serverOutputPath)}/${resolvedBuildConfig.handlerFileName}`
      : resolvedBuildConfig.handlerFileName,
    wrapperType: resolvedBuildConfig.wrapperType
  });

  // Clean up build output
  await remove(join(distFolderPath, 'build-output'));

  // Build the server function package
  const serverFunction = await buildUsingCustomArtifact({
    distFolderPath: join(distFolderPath, 'serverFunction'),
    cwd,
    existingDigests,
    name: serverFunctionName,
    packagePath: join(distFolderPath, 'server-function'),
    progressLogger: createProgressLogger(`${progressLogger.eventContext.instanceId}.serverFunction`),
    handler: 'index-wrap.handler',
    archiveItem,
    createPackagingError
  });

  await progressLogger.finishEvent({
    eventType: 'BUNDLING_SSR_WEB_FUNCTIONS'
  });

  return [serverFunction].filter(Boolean);
};
