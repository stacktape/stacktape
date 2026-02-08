import { join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { getJobName } from '@shared/naming/utils';
import { exec } from '@shared/utils/exec';
import { raiseError, serialize } from '@shared/utils/misc';
import { copy, ensureDir, move, outputFile, pathExists, remove, writeFile } from 'fs-extra';
import { buildUsingCustomArtifact } from './custom-artifact';

/**
 * Framework-specific build configuration
 */
export type SsrWebBuildConfig = {
  /** Build command to execute */
  buildCommand: string;
  /** Working directory for the build */
  workingDir: string;
  /** Path to server output after build */
  serverOutputPath: string;
  /** Path to static output after build */
  staticOutputPath: string;
  /** Handler file name (e.g., 'index.mjs') */
  handlerFileName: string;
  /** Static asset prefix for CDN routing (e.g., '_astro', '_nuxt') */
  staticAssetPrefix: string;
  /** Environment variables to set during build */
  buildEnv?: Record<string, string>;
  /** Wrapper type: 'passthrough' for Nitro-based, 'node-http' for Node.js HTTP handler, 'web-fetch' for Web Fetch API handler */
  wrapperType: 'passthrough' | 'node-http' | 'web-fetch';
};

export type SsrWebPackagingProps = {
  resourceName: string;
  resourceType: string;
  serverFunctionName: string;
  distFolderPath: string;
  cwd: string;
  buildConfig: SsrWebBuildConfig;
  environmentVars: EnvironmentVar[];
  existingDigests?: string[];
  parentEventType?: string;
};

/**
 * Creates the Lambda handler wrapper for SSR web resources.
 * Three types:
 * - 'passthrough': for Nitro-based frameworks that already output a Lambda handler
 * - 'node-http': for frameworks that output a Node.js HTTP handler (Astro, SvelteKit)
 * - 'web-fetch': for frameworks that export a Web Fetch API handler (Remix)
 */
const createServerWrapper = async ({
  distFolderPath,
  handlerFileName,
  wrapperType
}: {
  distFolderPath: string;
  handlerFileName: string;
  wrapperType: 'passthrough' | 'node-http' | 'web-fetch';
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
    _server = createServer(h);
    _server.listen(0, "127.0.0.1", () => {
      const addr = _server.address();
      _baseUrl = "http://127.0.0.1:" + addr.port;
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
    rawPath = "/",
    rawQueryString = "",
    body: eventBody,
    isBase64Encoded,
    cookies
  } = event;

  const method = requestContext?.http?.method || event.httpMethod || "GET";
  const url = baseUrl + rawPath + (rawQueryString ? "?" + rawQueryString : "");

  // Build headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(eventHeaders)) {
    headers.set(key, value);
  }
  if (cookies && cookies.length > 0) {
    headers.set("cookie", cookies.join("; "));
  }

  // Build body
  let reqBody = undefined;
  if (eventBody && method !== "GET" && method !== "HEAD") {
    reqBody = isBase64Encoded ? Buffer.from(eventBody, "base64") : eventBody;
  }

  const response = await fetch(url, { method, headers, body: reqBody, redirect: "manual" });

  // Convert response
  const respHeaders = {};
  const setCookies = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookies.push(value);
    } else {
      respHeaders[key] = value;
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const isText = /text\\/|application\\/json|application\\/xml|application\\/javascript|charset=/i.test(contentType);
  const respBuffer = Buffer.from(await response.arrayBuffer());

  return {
    statusCode: response.status,
    headers: respHeaders,
    ...(setCookies.length > 0 ? { cookies: setCookies } : {}),
    body: isText ? respBuffer.toString("utf-8") : respBuffer.toString("base64"),
    isBase64Encoded: !isText
  };
};
`;
    await outputFile(wrapperPath, wrapperContent);
  } else if (wrapperType === 'web-fetch') {
    // web-fetch wrapper: converts Lambda events to Web Fetch API Request/Response.
    // Used by Remix which exports a server build module that needs createRequestHandler.
    const wrapperContent = `
import { Buffer } from "node:buffer";
import { createRequestHandler } from "@remix-run/node";

let requestHandler;

async function getHandler() {
  if (requestHandler) return requestHandler;
  const build = await import("./${handlerFileName}");
  requestHandler = createRequestHandler(build, "production");
  return requestHandler;
}

export const handler = async (event) => {
  const app = await getHandler();

  const {
    requestContext,
    headers: eventHeaders = {},
    rawPath = "/",
    rawQueryString = "",
    body: eventBody,
    isBase64Encoded,
    cookies
  } = event;

  const method = requestContext?.http?.method || event.httpMethod || "GET";
  const host = eventHeaders["host"] || eventHeaders["Host"] || "localhost";
  const protocol = eventHeaders["x-forwarded-proto"] || "https";
  const url = protocol + "://" + host + rawPath + (rawQueryString ? "?" + rawQueryString : "");

  // Build headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(eventHeaders)) {
    headers.set(key, value);
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
  const setCookies = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookies.push(value);
    } else {
      respHeaders[key] = value;
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const isText = /text\\/|application\\/json|application\\/xml|application\\/javascript|charset=/i.test(contentType);
  const respBuffer = Buffer.from(await response.arrayBuffer());

  return {
    statusCode: response.status,
    headers: respHeaders,
    ...(setCookies.length > 0 ? { cookies: setCookies } : {}),
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
const reorganizeBuildOutput = async ({
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

  if (staticIsInsideServer) {
    // Static output is nested inside server output (e.g. SvelteKit: server='build', static='build/client').
    // Copy the server output to server-function, then remove the static subdirectory from it.
    const serverSourcePath = join(distFolderPath, 'build-output', buildConfig.serverOutputPath);
    if (await pathExists(serverSourcePath)) {
      await copy(serverSourcePath, serverFunctionPath);
    }
    // Remove the static assets subdirectory from server-function to avoid bloating Lambda
    const staticRelative = normalizedStatic.slice(normalizedServer.length + 1);
    const staticInServerFunction = join(serverFunctionPath, staticRelative);
    if (await pathExists(staticInServerFunction)) {
      await remove(staticInServerFunction);
    }
    // Copy static assets from __static-assets (created during move phase) to bucket-content
    const staticAssetsPath = join(distFolderPath, 'build-output', '__static-assets');
    if (await pathExists(staticAssetsPath)) {
      await copy(staticAssetsPath, bucketContentPath);
    }
  } else {
    // Independent paths - copy server and static separately
    const serverSourcePath = join(distFolderPath, 'build-output', buildConfig.serverOutputPath);
    if (await pathExists(serverSourcePath)) {
      await copy(serverSourcePath, serverFunctionPath);
    }
    const staticSourcePath = join(distFolderPath, 'build-output', buildConfig.staticOutputPath);
    if (await pathExists(staticSourcePath)) {
      await copy(staticSourcePath, bucketContentPath);
    }
  }

  // For non-passthrough wrappers, copy node_modules into server-function since
  // the build output has external dependencies that aren't bundled
  if (buildConfig.wrapperType !== 'passthrough') {
    const nodeModulesPath = join(buildConfig.workingDir, 'node_modules');
    if (await pathExists(nodeModulesPath)) {
      await copy(nodeModulesPath, join(serverFunctionPath, 'node_modules'));
      // Prune devDependencies to reduce Lambda package size
      const pkgJsonPath = join(buildConfig.workingDir, 'package.json');
      const lockfilePath = join(buildConfig.workingDir, 'package-lock.json');
      if (await pathExists(pkgJsonPath)) {
        await copy(pkgJsonPath, join(serverFunctionPath, 'package.json'));
        if (await pathExists(lockfilePath)) {
          await copy(lockfilePath, join(serverFunctionPath, 'package-lock.json'));
        }
        try {
          await exec('npm', ['prune', '--omit=dev'], {
            cwd: serverFunctionPath,
            disableStderr: true,
            disableStdout: true
          });
        } catch {
          // Pruning is best-effort - if it fails, we still have the full node_modules
        }
        await remove(join(serverFunctionPath, 'package-lock.json')).catch(() => {});
      }
    }
    // Add package.json with "type": "module" so Lambda treats .js files as ESM
    await writeFile(join(serverFunctionPath, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));
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
  buildConfig,
  environmentVars,
  existingDigests = [],
  parentEventType = 'PACKAGE_ARTIFACTS'
}: SsrWebPackagingProps) => {
  const progressLogger = eventManager.createChildLogger({
    parentEventType: parentEventType as 'PACKAGE_ARTIFACTS' | 'REPACKAGE_ARTIFACTS',
    instanceId: resourceName
  });

  // Build the framework project
  await progressLogger.startEvent({
    eventType: 'BUILD_SSR_WEB_PROJECT',
    description: `Building ${resourceType} project`
  });

  const copyEnv = serialize(process.env);

  // Add environment variables
  environmentVars.forEach((env) => {
    copyEnv[env.name] = env.value;
  });

  // Add build-specific env vars (like NITRO_PRESET)
  if (buildConfig.buildEnv) {
    Object.entries(buildConfig.buildEnv).forEach(([key, value]) => {
      copyEnv[key] = value;
    });
  }

  // Ensure dist folder exists
  await ensureDir(distFolderPath);
  const buildOutputPath = join(distFolderPath, 'build-output');
  await ensureDir(buildOutputPath);

  try {
    // Run the build command via npx to ensure local binaries are found
    await exec('npx', ['--yes', ...buildConfig.buildCommand.split(' ')], {
      cwd: buildConfig.workingDir,
      env: { ...copyEnv },
      disableStderr: true,
      disableStdout: true,
      inheritEnvVarsExcept: []
    });

    // Move build output to our dist folder.
    // Handle the case where one output path is nested inside the other (e.g. SvelteKit:
    // serverOutputPath='build', staticOutputPath='build/client') by moving the parent first,
    // then resolving the child from within the already-moved parent.
    const serverOutputFullPath = join(buildConfig.workingDir, buildConfig.serverOutputPath);
    const staticOutputFullPath = join(buildConfig.workingDir, buildConfig.staticOutputPath);

    const normalizedServer = buildConfig.serverOutputPath.replace(/\\/g, '/');
    const normalizedStatic = buildConfig.staticOutputPath.replace(/\\/g, '/');
    const staticIsInsideServer = normalizedStatic.startsWith(`${normalizedServer}/`);
    const serverIsInsideStatic = normalizedServer.startsWith(`${normalizedStatic}/`);

    if (staticIsInsideServer) {
      // Static is nested inside server (e.g. server='build', static='build/client')
      // Move the parent (server) first, then the child (static) is already inside
      if (await pathExists(serverOutputFullPath)) {
        await move(serverOutputFullPath, join(buildOutputPath, buildConfig.serverOutputPath), { overwrite: true });
      }
      // Static output is now at its relative position inside the moved server output
      const staticWithinMoved = join(buildOutputPath, buildConfig.staticOutputPath);
      if (await pathExists(staticWithinMoved)) {
        await ensureDir(join(buildOutputPath, normalizedStatic, '..'));
        // Copy (not move) to build-output/{staticOutputPath} so both exist in build-output
        await copy(staticWithinMoved, join(buildOutputPath, '__static-assets'));
      }
    } else if (serverIsInsideStatic) {
      // Server is nested inside static - move parent (static) first
      if (await pathExists(staticOutputFullPath)) {
        await move(staticOutputFullPath, join(buildOutputPath, buildConfig.staticOutputPath), { overwrite: true });
      }
      const serverWithinMoved = join(buildOutputPath, buildConfig.serverOutputPath);
      if (await pathExists(serverWithinMoved)) {
        await copy(serverWithinMoved, join(buildOutputPath, '__server-output'));
      }
    } else {
      // Independent paths - move both
      if (await pathExists(serverOutputFullPath)) {
        await move(serverOutputFullPath, join(buildOutputPath, buildConfig.serverOutputPath), { overwrite: true });
      }
      if (await pathExists(staticOutputFullPath)) {
        await move(staticOutputFullPath, join(buildOutputPath, buildConfig.staticOutputPath), { overwrite: true });
      }
    }
  } catch (err) {
    raiseError({
      type: 'PACKAGING',
      message: `Error when packaging ${resourceType} "${resourceName}".\n\nBuild process logs:\n\n${err}`
    });
  }

  await progressLogger.finishEvent({
    eventType: 'BUILD_SSR_WEB_PROJECT'
  });

  // Reorganize build output
  await progressLogger.startEvent({
    eventType: 'BUNDLING_SSR_WEB_FUNCTIONS',
    description: `Bundling ${resourceType} functions`
  });

  await reorganizeBuildOutput({ distFolderPath, buildConfig });
  await createServerWrapper({
    distFolderPath,
    handlerFileName: buildConfig.handlerFileName,
    wrapperType: buildConfig.wrapperType
  });

  // Clean up build output
  await remove(join(distFolderPath, 'build-output'));

  // Build the server function package
  const serverFunction = await buildUsingCustomArtifact({
    distFolderPath: join(distFolderPath, 'serverFunction'),
    cwd,
    existingDigests,
    name: getJobName({ workloadName: serverFunctionName, workloadType: 'function' }),
    packagePath: join(distFolderPath, 'server-function'),
    progressLogger: eventManager.createChildLogger({
      instanceId: `${progressLogger.eventContext.instanceId}.serverFunction`,
      parentEventType: progressLogger.eventContext.parentEventType
    }),
    handler: 'index-wrap.handler'
  });

  await progressLogger.finishEvent({
    eventType: 'BUNDLING_SSR_WEB_FUNCTIONS'
  });

  return [serverFunction].filter(Boolean);
};
