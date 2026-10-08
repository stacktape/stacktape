/** Source files that prove how a long-running HTTP service enters the program. */

import { posix } from 'node:path';
import type { ServiceFactInput } from '../../facts/service';
import type { Citation } from '../../facts/citation';
import { citeFirstMatch, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { nearestManifestRoot, withoutSampleDirectories } from '../service-root';

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
    const pattern = /(?:http\.ListenAndServe|\.ListenAndServe\s*\(|\.Run\s*\(|fiber\.New\s*\(|echo\.New\s*\()/;
    return /\bfunc\s+main\s*\(/.test(raw) && pattern.test(raw)
      ? { entrypoint: path, pattern, language: 'go' }
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

type ListenPort = { port: number; citation: Citation };

/** A port found at `offset` in `raw`, cited on the line it appears on (a `listen({ ... })` can span lines). */
const portAt = (path: string, raw: string, value: string | undefined, offset: number): ListenPort | undefined => {
  const port = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return undefined;
  const lines = raw.split(/\r?\n/);
  return { port, citation: citeLine(path, lines, raw.slice(0, offset).split(/\r?\n/).length - 1, 'port') };
};

/** The last capture of a match: the port, located inside the match so the citation names its line. */
const matchedPort = (path: string, raw: string, match: RegExpExecArray | null): ListenPort | undefined =>
  match === null ? undefined : portAt(path, raw, match[1], match.index + match[0].lastIndexOf(match[1]!));

/**
 * The port a JavaScript server listens on when the source says so literally: `listen(4000)`,
 * `listen({ port: 4000 })`, `Bun.serve({ port: 4000 })`, `listen(process.env.PORT || 4000)`, or a constant that
 * holds one of those. A fallback is reported too: the service then listens there whether or not `PORT` is set.
 */
const javascriptListenPort = (path: string, raw: string): ListenPort | undefined => {
  const direct =
    /\.listen\(\s*(\d{2,5})\b/.exec(raw) ??
    /\.listen\(\s*[^,)]*?(?:\|\||\?\?)\s*(\d{2,5})\b/.exec(raw) ??
    /(?:\.listen|\bBun\.serve|\bDeno\.serve)\(\s*\{[^}]*?\bport\s*:\s*(\d{2,5})\b/.exec(raw);
  if (direct !== null) return matchedPort(path, raw, direct);
  const named = /\.listen\(\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(raw)?.[1];
  if (named === undefined) return undefined;
  return matchedPort(
    path,
    raw,
    new RegExp(`\\b(?:const|let|var)\\s+${named}\\s*=\\s*(?:[^;\\n]*?(?:\\|\\||\\?\\?)\\s*)?(\\d{2,5})\\b`).exec(raw)
  );
};

/** `http.ListenAndServe(":8080", ...)`, gin's `r.Run(":8080")`, echo's `e.Start(":8080")`, fiber's `app.Listen(":3000")`. */
const goListenPort = (path: string, raw: string): ListenPort | undefined =>
  matchedPort(path, raw, /(?:ListenAndServe(?:TLS)?|\.Run|\.Start|\.Listen)\(\s*"[\w.-]*:(\d{2,5})"/.exec(raw));

const SPRING_BOOT_DEFAULT_PORT = 8080;

/**
 * Spring Boot listens on `server.port`, or 8080. It reads `SERVER_PORT`, never `PORT`, so the port has to be routed
 * explicitly. `${PORT}` without a default means the app follows `PORT`, and nothing is reported.
 */
const springBootPort = async (
  root: string,
  context: ProbeContext,
  entrypoint: ListenPort['citation'] | undefined
): Promise<ListenPort | undefined> => {
  for (const name of ['application.properties', 'application.yml', 'application.yaml']) {
    const path = posix.join(root === '.' ? '' : root, 'src/main/resources', name);
    if (!context.files.includes(path)) continue;
    // oxlint-disable-next-line no-await-in-loop -- at most three small files per Spring module.
    const raw = await readText(context, path);
    if (raw === undefined) continue;
    const declared = name.endsWith('.properties')
      ? /^\s*server\.port\s*[=:]\s*(\S+)/m.exec(raw)
      : /^server:[ \t]*\r?\n(?:[ \t]+.*\r?\n)*?[ \t]+port:[ \t]*(\S+)/m.exec(raw);
    if (declared === null) continue;
    const literal = /^["']?(?:\$\{[A-Za-z_.]+:)?(\d{2,5})\}?["']?$/.exec(declared[1]!);
    if (literal === null) return undefined;
    return portAt(path, raw, literal[1], declared.index + declared[0].lastIndexOf(literal[1]!));
  }
  return entrypoint === undefined
    ? undefined
    : { port: SPRING_BOOT_DEFAULT_PORT, citation: { ...entrypoint, field: 'port' } };
};

export const serverEntrypointProbe: Probe = {
  name: 'server-entrypoint',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const candidates = withoutSampleDirectories(context.files).filter(
      (path) =>
        /\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/.test(path) &&
        !/(?:^|\/)(?:test|tests|__tests__|spec|fixtures)(?:\/|$)/i.test(path) &&
        !/(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/i.test(path)
    );
    const byRoot = new Map<string, ServiceFactInput>();
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- policy-controlled reads, stopped after one entrypoint per service root.
      const raw = await readText(context, path);
      if (raw === undefined) continue;
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
      const listenPort = !exposesHttp
        ? undefined
        : detection.language === 'go'
          ? goListenPort(path, raw)
          : detection.framework === 'spring-boot'
            ? // oxlint-disable-next-line no-await-in-loop -- one Spring module per service root.
              await springBootPort(root, context, citation)
            : detection.language === 'javascript' || detection.language === 'typescript'
              ? javascriptListenPort(path, raw)
              : undefined;
      byRoot.set(key, {
        name:
          detection.processType ??
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
        ...(listenPort === undefined ? {} : { port: listenPort.port }),
        environmentVariables: [],
        evidence: [citation, listenPort?.citation].filter((entry): entry is Citation => entry !== undefined),
        source: 'probe'
      });
    }

    return byRoot.size === 0 ? {} : { services: [...byRoot.values()] };
  }
};
