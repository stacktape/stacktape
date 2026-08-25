/** Source files that prove how a long-running HTTP service enters the program. */

import { posix } from 'node:path';
import type { ServiceFactInput } from '../../facts/service';
import {
  citeFirstMatch,
  citeFirstMatchOnly,
  readText,
  type Probe,
  type ProbeContext,
  type ProbeOutput
} from '../probe';
import { nearestManifestRoot } from '../service-root';
import { goCodeWithoutComments, goExecutableCode } from '../go-source';

const javaServiceExposesHttp = async (root: string, context: ProbeContext): Promise<boolean> => {
  const manifestNames = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
  for (const name of manifestNames) {
    const path = root === '.' ? name : posix.join(root, name);
    if (!context.files.includes(path)) continue;
    // oxlint-disable-next-line no-await-in-loop -- there is at most one build manifest in ordinary modules.
    const raw = await readText(context, path);
    if (raw !== undefined && /spring-boot-starter-(?:web|webflux)|quarkus-(?:rest|resteasy|vertx-http)/i.test(raw)) {
      return true;
    }
  }
  return false;
};

type Detection = {
  entrypoint: string;
  framework?: string;
  pattern: RegExp;
  language: string;
  exposesHttp?: boolean;
  processType?: string;
};

const GO_NON_APPLICATION_DIRECTORY = /(?:^|\/)(?:examples?|tools?|scripts?|test|tests|fixtures)(?:\/|$)/i;

type GoHttpEvidence = { framework?: string; pattern: RegExp };

const escapeForPattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const goImportQualifier = (raw: string, moduleName: string, conventionalName: string): string | undefined => {
  const escapedModule = escapeForPattern(moduleName);
  const match = new RegExp(
    `^\\s*(?:import\\s+)?(?:(\\.|_|[A-Za-z_][A-Za-z0-9_]*)\\s+)?["\\']${escapedModule}["\\']`,
    'm'
  ).exec(raw);
  if (match === null) return undefined;
  if (match[1] === '.' || match[1] === '_') return undefined;
  return match[1] ?? conventionalName;
};

const receiverCallPattern = ({
  raw,
  factory,
  methods
}: {
  raw: string;
  factory: RegExp;
  methods: readonly string[];
}): RegExp | undefined => {
  const receivers = [...raw.matchAll(factory)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
  for (const receiver of receivers) {
    const pattern = new RegExp(`\\b${escapeForPattern(receiver)}\\s*\\.\\s*(?:${methods.join('|')})\\s*\\(`);
    if (pattern.test(raw)) return pattern;
  }
  return undefined;
};

/**
 * A Go method named Start/Listen/Serve is ordinary application API, not HTTP evidence. Tie method
 * calls to a receiver constructed by a known web package, or to net/http itself. This stays a
 * lexical proof rather than pretending to type-check an arbitrary module.
 */
const goHttpEvidence = (raw: string): GoHttpEvidence | undefined => {
  const importSource = goCodeWithoutComments(raw);
  const executableSource = goExecutableCode(raw);
  const netHttp = goImportQualifier(importSource, 'net/http', 'http');
  if (netHttp !== undefined) {
    const direct = new RegExp(
      `\\b${escapeForPattern(netHttp)}\\s*\\.\\s*(?:ListenAndServe|ListenAndServeTLS|Serve)\\s*\\(`
    );
    if (direct.test(executableSource)) return { pattern: direct };
    const receiver = receiverCallPattern({
      raw: executableSource,
      factory: new RegExp(
        `(?:^\\s*|[;{]\\s*|\\bvar\\s+)([A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)*)\\s*(?::=|=)\\s*&?${escapeForPattern(netHttp)}\\s*\\.\\s*Server\\s*\\{`,
        'gm'
      ),
      methods: ['ListenAndServe', 'ListenAndServeTLS', 'Serve']
    });
    if (receiver !== undefined) return { pattern: receiver };
  }

  const echo =
    goImportQualifier(importSource, 'github.com/labstack/echo/v4', 'echo') ??
    goImportQualifier(importSource, 'github.com/labstack/echo', 'echo');
  if (echo !== undefined) {
    const receiver = receiverCallPattern({
      raw: executableSource,
      factory: new RegExp(
        `\\b(?:var\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*(?::=|=)\\s*${escapeForPattern(echo)}\\s*\\.\\s*New\\s*\\(`,
        'g'
      ),
      methods: ['Start', 'StartTLS', 'StartAutoTLS']
    });
    if (receiver !== undefined) return { framework: 'echo', pattern: receiver };
  }

  const fiber =
    goImportQualifier(importSource, 'github.com/gofiber/fiber/v3', 'fiber') ??
    goImportQualifier(importSource, 'github.com/gofiber/fiber/v2', 'fiber') ??
    goImportQualifier(importSource, 'github.com/gofiber/fiber', 'fiber');
  if (fiber !== undefined) {
    const receiver = receiverCallPattern({
      raw: executableSource,
      factory: new RegExp(
        `\\b(?:var\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*(?::=|=)\\s*${escapeForPattern(fiber)}\\s*\\.\\s*New\\s*\\(`,
        'g'
      ),
      methods: ['Listen', 'ListenTLS', 'ListenMutualTLS']
    });
    if (receiver !== undefined) return { framework: 'fiber', pattern: receiver };
  }

  const gin = goImportQualifier(importSource, 'github.com/gin-gonic/gin', 'gin');
  if (gin !== undefined) {
    const receiver = receiverCallPattern({
      raw: executableSource,
      factory: new RegExp(
        `\\b(?:var\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*(?::=|=)\\s*${escapeForPattern(gin)}\\s*\\.\\s*(?:Default|New)\\s*\\(`,
        'g'
      ),
      methods: ['Run', 'RunTLS', 'RunUnix']
    });
    if (receiver !== undefined) return { framework: 'gin', pattern: receiver };
  }

  const fastHttp = goImportQualifier(importSource, 'github.com/valyala/fasthttp', 'fasthttp');
  if (fastHttp !== undefined) {
    const direct = new RegExp(
      `\\b${escapeForPattern(fastHttp)}\\s*\\.\\s*(?:ListenAndServe|ListenAndServeTLS|Serve)\\s*\\(`
    );
    if (direct.test(executableSource)) return { framework: 'fasthttp', pattern: direct };
  }
  return undefined;
};

const goModuleName = (raw: string): string | undefined => {
  const modulePath = /^\s*module\s+(\S+)\s*$/m.exec(raw)?.[1];
  if (modulePath === undefined) return undefined;
  const segments = modulePath.split('/');
  while (segments.length > 1 && /^v\d+$/.test(segments.at(-1)!)) segments.pop();
  return segments.at(-1);
};

const workerProcessType = (path: string): string => {
  const stem = posix.basename(path).replace(/\.[^.]+$/, '');
  return /(?:^|\/)(?:worker|workers)(?:\/|$)/i.test(path) && /^(?:index|main|bootstrap)$/i.test(stem) ? 'worker' : stem;
};

const detectionFor = (path: string, raw: string): Detection | undefined => {
  if (/\.(?:[cm]?js|tsx?)$/.test(path)) {
    const queueWorker = /from\s+["'](?:bullmq|bull|bee-queue)["']/.test(raw) && /new\s+Worker\s*\(/.test(raw);
    if (queueWorker) {
      return {
        entrypoint: path,
        pattern: /new\s+Worker\s*\(/,
        language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript',
        exposesHttp: false,
        processType: workerProcessType(path)
      };
    }
    const honoApplication = /\b(?:const|let)\s+(\w+)\s*=\s*new\s+Hono\s*\(/.exec(raw);
    if (honoApplication !== null && new RegExp(`export\\s+default\\s+${honoApplication[1]}\\b`).test(raw)) {
      return {
        entrypoint: path,
        framework: 'hono',
        pattern: /new\s+Hono\s*\(/,
        language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript'
      };
    }
    const pattern = /\.listen\s*\(|\bBun\.serve\s*\(|\bDeno\.serve\s*\(/;
    return pattern.test(raw)
      ? {
          entrypoint: path,
          pattern,
          language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript'
        }
      : undefined;
  }
  if (path.endsWith('.php')) {
    const isWebEntrypoint =
      posix.basename(path).toLowerCase() === 'index.php' &&
      (posix.dirname(path) === '.' || posix.basename(posix.dirname(path)).toLowerCase() === 'public');
    const pattern = /^\s*<\?php/m;
    return isWebEntrypoint && pattern.test(raw) ? { entrypoint: path, pattern, language: 'php' } : undefined;
  }
  if (path.endsWith('.py')) {
    const application = /^\s*(\w+)\s*=\s*(FastAPI|Flask)\s*\(/m.exec(raw);
    if (application !== null) {
      const framework = application[2] === 'FastAPI' ? 'fastapi' : 'flask';
      return {
        entrypoint: `${path}:${application[1]}`,
        framework,
        pattern: new RegExp(`^\\s*${application[1]}\\s*=\\s*${application[2]}\\s*\\(`, 'm'),
        language: 'python'
      };
    }
    const django = /^\s*application\s*=\s*get_wsgi_application\s*\(\s*\)/m;
    return django.test(raw)
      ? {
          entrypoint: `${path}:application`,
          framework: 'django',
          pattern: django,
          language: 'python'
        }
      : undefined;
  }
  if (path.endsWith('.go')) {
    const evidence = goHttpEvidence(raw);
    return /\bfunc\s+main\s*\(/.test(raw) && evidence !== undefined
      ? { entrypoint: path, ...evidence, language: 'go' }
      : undefined;
  }
  if (path.endsWith('.java') || path.endsWith('.kt')) {
    const pattern = /@SpringBootApplication|SpringApplication\.run\s*\(/;
    return pattern.test(raw)
      ? {
          entrypoint: path,
          framework: 'spring-boot',
          pattern,
          language: 'java'
        }
      : undefined;
  }
  return undefined;
};

const commandReferencesEntrypoint = (command: string, root: string, entrypoint: string): boolean => {
  const sourceFile = entrypoint.split(':')[0]!;
  const relativeEntrypoint =
    root === '.' ? sourceFile : sourceFile.startsWith(`${root}/`) ? sourceFile.slice(root.length + 1) : sourceFile;
  if (relativeEntrypoint === sourceFile && root !== '.') return false;
  const normalizedEntrypoint = relativeEntrypoint.replace(/^\.\//, '');
  const tokens = command.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+/g) ?? [];
  return tokens.some((token) => {
    const unquoted = token
      .replace(/^(?:"|')|(?:"|')$/g, '')
      .replaceAll('\\', '/')
      .replace(/^\.\//, '');
    return unquoted === normalizedEntrypoint;
  });
};

const declaredStartFor = async (
  root: string,
  entrypoint: string,
  context: ProbeContext
): Promise<
  | {
      command: string;
      evidence: NonNullable<ServiceFactInput['evidence']>[number];
    }
  | undefined
> => {
  const manifestPath = root === '.' ? 'package.json' : `${root}/package.json`;
  if (!context.files.includes(manifestPath)) return undefined;
  const raw = await readText(context, manifestPath);
  if (raw === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const scripts =
    typeof parsed === 'object' && parsed !== null && 'scripts' in parsed && typeof parsed.scripts === 'object'
      ? parsed.scripts
      : undefined;
  const command =
    scripts !== null && scripts !== undefined && 'start' in scripts && typeof scripts.start === 'string'
      ? scripts.start
      : undefined;
  if (command === undefined || !commandReferencesEntrypoint(command, root, entrypoint)) return undefined;
  const evidence = citeFirstMatchOnly(manifestPath, raw, /"start"\s*:/, 'startCommand');
  return evidence === undefined ? undefined : { command, evidence };
};

export const serverEntrypointProbe: Probe = {
  name: 'server-entrypoint',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const candidates = context.files.filter(
      (path) =>
        /\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/.test(path) &&
        !path.endsWith('_test.go') &&
        !/(?:^|\/)(?:test|tests|__tests__|spec|fixtures)(?:\/|$)/i.test(path) &&
        !/(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/i.test(path)
    );
    const byRoot = new Map<string, ServiceFactInput>();
    const goSources = new Map<string, string>();
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- policy-controlled reads, stopped after one entrypoint per service root.
      const raw = await readText(context, path, path.endsWith('.go') ? { fullFile: true } : undefined);
      if (raw === undefined) continue;
      if (path.endsWith('.go')) {
        if (!GO_NON_APPLICATION_DIRECTORY.test(path)) goSources.set(path, raw);
        // Go main packages are joined below so two real binaries in one module cannot overwrite
        // each other under the old `${root}::main` identity.
        continue;
      }
      const detection = detectionFor(path, raw);
      if (detection === undefined) continue;
      const root = nearestManifestRoot(path, context.files) ?? '.';
      const key = `${root}::${detection.processType ?? 'main'}`;
      if (byRoot.has(key)) continue;
      let exposesHttp = detection.exposesHttp ?? true;
      if (detection.exposesHttp === undefined && detection.language === 'java') {
        // oxlint-disable-next-line no-await-in-loop -- Java manifest evidence is needed before classifying the candidate.
        exposesHttp = await javaServiceExposesHttp(root, context);
      }
      const citation = citeFirstMatch(path, raw, detection.pattern, 'containerEntrypoint');
      // A source bind proves that this file can serve HTTP. Promotion over an explicit static-site
      // configuration additionally requires the package's runnable start script to name this exact
      // file; an unused example server elsewhere in the package is not the deployed application.
      // oxlint-disable-next-line no-await-in-loop -- stopped after one detected entrypoint per service root.
      const declaredStart = await declaredStartFor(root, detection.entrypoint, context);
      const goMod = root === '.' ? 'go.mod' : `${root}/go.mod`;
      let goModRaw: string | undefined;
      if (detection.language === 'go' && context.files.includes(goMod)) {
        // oxlint-disable-next-line no-await-in-loop -- one short module manifest gives a stable Go application name.
        goModRaw = await readText(context, goMod, { fullFile: true });
      }
      byRoot.set(key, {
        name:
          detection.processType ??
          (goModRaw === undefined ? undefined : goModuleName(goModRaw)) ??
          (root === '.'
            ? (context.root.split(/[/\\]/).findLast((segment) => segment !== '') ?? 'app')
            : posix.basename(root)),
        path: root,
        ...(detection.processType === undefined ? {} : { processType: detection.processType }),
        language: detection.language,
        ...(detection.framework === undefined ? {} : { framework: detection.framework }),
        exposesHttp,
        executionModel: 'long-running',
        containerEntrypoint: detection.entrypoint,
        ...(declaredStart === undefined ? {} : { startCommand: declaredStart.command }),
        environmentVariables: [],
        evidence: [
          ...(citation === undefined ? [] : [citation]),
          ...(declaredStart === undefined ? [] : [declaredStart.evidence])
        ],
        source: 'probe'
      });
    }

    // Go applications frequently split `main` and the actual listener across files in one package.
    // Looking at one file at a time misses that ordinary layout. A Dockerfile that exposes a port is
    // also an explicit declaration that the selected main package is the network application, even
    // when the listener lives behind a CLI subcommand in another package (ntfy is a real example).
    const goMainFiles = [...goSources.entries()].filter(
      ([path, raw]) =>
        !GO_NON_APPLICATION_DIRECTORY.test(path) && /^\s*package\s+main\b/m.test(raw) && /\bfunc\s+main\s*\(/.test(raw)
    );
    const mainDirectories = new Map<string, Array<{ path: string; raw: string }>>();
    for (const [path, raw] of goMainFiles) {
      const directory = posix.dirname(path);
      const entries = mainDirectories.get(directory) ?? [];
      entries.push({ path, raw });
      mainDirectories.set(directory, entries);
    }
    const mainPackages = [...mainDirectories.entries()].map(([directory, mains]) => ({
      directory,
      mains,
      root: nearestManifestRoot(mains[0]!.path, context.files) ?? '.'
    }));
    const mainDirectoryCountByRoot = new Map<string, number>();
    const basenameCountByRoot = new Map<string, Map<string, number>>();
    for (const candidate of mainPackages) {
      mainDirectoryCountByRoot.set(candidate.root, (mainDirectoryCountByRoot.get(candidate.root) ?? 0) + 1);
      const basename = posix.basename(candidate.directory);
      const counts = basenameCountByRoot.get(candidate.root) ?? new Map<string, number>();
      counts.set(basename, (counts.get(basename) ?? 0) + 1);
      basenameCountByRoot.set(candidate.root, counts);
    }

    for (const { directory, mains, root } of mainPackages) {
      const entrypoint = mains.find(({ path }) => posix.basename(path) === 'main.go') ?? mains[0]!;
      const key = `${root}::go-main:${directory}`;
      if (byRoot.has(key)) continue;

      const listener = [...goSources.entries()]
        .filter(([path]) => posix.dirname(path) === directory)
        .map(([path, raw]) => ({ path, raw, evidence: goHttpEvidence(raw) }))
        .find((candidate) => candidate.evidence !== undefined);

      const dockerfile = root === '.' ? 'Dockerfile' : `${root}/Dockerfile`;
      let exposedDockerfile: { raw: string; port: number } | undefined;
      // EXPOSE identifies the module as a network application, but it cannot disambiguate two
      // independent binaries in the same Go module. In that layout require source-level listener
      // evidence for the selected package instead of choosing whichever main file was scanned first.
      if (mainDirectoryCountByRoot.get(root) === 1 && context.files.includes(dockerfile)) {
        // oxlint-disable-next-line no-await-in-loop -- one Dockerfile for the candidate Go application.
        const raw = await readText(context, dockerfile, { fullFile: true });
        const rawPort = raw === undefined ? undefined : /^\s*EXPOSE\s+(\d{2,5})(?:\/tcp)?\s*$/im.exec(raw)?.[1];
        const port = rawPort === undefined ? undefined : Number.parseInt(rawPort, 10);
        if (raw !== undefined && port !== undefined && port > 0 && port <= 65_535) {
          exposedDockerfile = { raw, port };
        }
      }
      if (listener === undefined && exposedDockerfile === undefined) continue;

      const goMod = root === '.' ? 'go.mod' : `${root}/go.mod`;
      // oxlint-disable-next-line no-await-in-loop -- one short module manifest per candidate.
      const goModRaw = context.files.includes(goMod) ? await readText(context, goMod, { fullFile: true }) : undefined;
      const mainCitation = citeFirstMatch(entrypoint.path, entrypoint.raw, /\bfunc\s+main\s*\(/, 'containerEntrypoint');
      const listenerCitation =
        listener === undefined
          ? citeFirstMatch(dockerfile, exposedDockerfile!.raw, /^\s*EXPOSE\s+\d{2,5}/im, 'port')
          : citeFirstMatch(listener.path, listener.raw, listener.evidence!.pattern, 'containerEntrypoint');
      const multipleMainPackages = (mainDirectoryCountByRoot.get(root) ?? 0) > 1;
      const relativeDirectory = root === '.' ? directory : posix.relative(root, directory);
      const directoryBasename = posix.basename(directory);
      const packageName =
        directory === root
          ? goModRaw === undefined
            ? 'app'
            : goModuleName(goModRaw)
          : (basenameCountByRoot.get(root)?.get(directoryBasename) ?? 0) === 1
            ? directoryBasename
            : relativeDirectory.replaceAll('/', '-');
      byRoot.set(key, {
        name:
          (multipleMainPackages ? packageName : undefined) ??
          (goModRaw === undefined ? undefined : goModuleName(goModRaw)) ??
          (root === '.'
            ? (context.root.split(/[/\\]/).findLast((segment) => segment !== '') ?? 'app')
            : posix.basename(root)),
        path: multipleMainPackages ? directory : root,
        ...(multipleMainPackages && directory !== root ? { buildRoot: root } : {}),
        language: 'go',
        ...(listener?.evidence?.framework === undefined ? {} : { framework: listener.evidence.framework }),
        exposesHttp: true,
        ...(exposedDockerfile === undefined ? {} : { port: exposedDockerfile.port }),
        executionModel: 'long-running',
        containerEntrypoint: entrypoint.path,
        environmentVariables: [],
        evidence: [mainCitation, listenerCitation].filter((citation) => citation !== undefined),
        source: 'probe'
      });
    }

    return byRoot.size === 0 ? {} : { services: [...byRoot.values()] };
  }
};
