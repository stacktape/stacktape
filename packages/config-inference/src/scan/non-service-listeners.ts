/**
 * Listeners that belong to a command-line tool or a library rather than to a service.
 *
 * A CLI's OAuth login callback, a library's SSH tunnel and a desktop tool's process runner all look like servers to the
 * listener scan. They are not services: nothing deploys them, and nothing could reach them. A package is only judged
 * here when nothing beside it starts it as a server (no start script that runs anything but the tool, no Procfile,
 * Dockerfile or other deployment file), so a package whose start command runs a server always stays a service.
 */

import type { NonServiceListener } from '../facts/project-facts';
import type { ProbeContext } from './probe';
import { maskFile } from './lexical';
import { declaredStarts } from './start-entries';

/** A package directory named for tooling: `tools/x`, `cli`, `packages/foo-cli`, `sdk`, `packages/foo-sdk`. */
const TOOLING_DIRECTORY = /(?:^|\/)(?:tools|cli|sdk)(?:\/|$)|(?:^|\/)[^/]*-(?:cli|sdk)$/;
/** A file that is part of a sign-in flow: an OAuth callback server, a login helper. */
const SIGN_IN_FLOW = /(?:^|[/._-])(?:callback|oauth|login|auth|sign-?in)(?:[/._-]|$)/i;
/** A server the Go probe accepts on its own evidence, rather than on a `.Run(` call any library can have. */
const GO_SERVER = /ListenAndServe|fiber\.New\s*\(|echo\.New\s*\(|\bgin\.(?:Default|New)\s*\(/;

/** Every `.listen(` call binds a literal loopback address, so no other machine or container can reach it. */
const listensOnlyOnLoopback = (path: string, raw: string): boolean => {
  const code = maskFile(path, raw, 'keep');
  const calls = code.match(/\.listen\s*\(/g)?.length ?? 0;
  const loopback = code.match(/\.listen\s*\(\s*[^,()]*,\s*(["'])(?:127\.0\.0\.1|localhost|::1)\1/g)?.length ?? 0;
  return calls > 0 && calls === loopback;
};

/**
 * Why the listener in `path` is not a service, or `undefined` when it may be one.
 *
 * - `command-line-tool`: the package declares `bin`. Either it has no start script, or its start script runs the tool
 *   itself and the listener is not the tool's entry but part of a sign-in flow (`dub login`'s callback server).
 * - `tooling-directory`: the package sits in a `tools`, `cli` or `sdk` directory, has no start script, and the listener
 *   is a sign-in callback, binds only the loopback address, or is a Go program with no server call.
 * - `local-only`: the package has no start script and every listener in the file binds the loopback address.
 */
export const nonServiceReason = async (
  { root, path, raw, language }: { root: string; path: string; raw: string; language: string },
  context: ProbeContext
): Promise<NonServiceListener['reason'] | undefined> => {
  const declared = await declaredStarts(root, context);
  if (declared.deploymentFile) return undefined;
  const runsOnlyTheTool = declared.serverScripts.every((file) => file !== undefined && declared.bin.includes(file));
  if (!runsOnlyTheTool) return undefined;
  const hasServerScript = declared.serverScripts.length > 0;
  const signInFlow = SIGN_IN_FLOW.test(path);
  if (declared.bin.length > 0) {
    if (!hasServerScript) return 'command-line-tool';
    return signInFlow && !declared.bin.includes(path) ? 'command-line-tool' : undefined;
  }
  // Without bin, only a package with no start script at all gets here.
  const loopbackOnly = (language === 'javascript' || language === 'typescript') && listensOnlyOnLoopback(path, raw);
  if (TOOLING_DIRECTORY.test(root)) {
    const goWithoutServer = language === 'go' && !GO_SERVER.test(maskFile(path, raw, 'blank'));
    if (signInFlow || loopbackOnly || goWithoutServer) return 'tooling-directory';
  }
  return loopbackOnly ? 'local-only' : undefined;
};
