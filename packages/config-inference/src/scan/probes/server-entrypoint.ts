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
import { activeWorkspaceDirectories, isIncidentalPath } from '../incidental-directories';
import { nearestManifestRoot } from '../service-root';

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
    const activeDirectories = await activeWorkspaceDirectories(context);
    const candidates = context.files.filter(
      (path) =>
        /\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/.test(path) &&
        !/(?:^|\/)(?:test|tests|__tests__|spec|fixtures)(?:\/|$)/i.test(path) &&
        !/(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/i.test(path) &&
        !isIncidentalPath(path, activeDirectories)
    );
    const byRoot = new Map<string, ServiceFactInput>();
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- policy-controlled reads, stopped after one entrypoint per service root.
      const raw = await readText(context, path);
      if (raw === undefined) continue;
      const detection = detectionFor(path, raw);
      if (detection === undefined) continue;
      const root = nearestManifestRoot(path, context.files) ?? '.';
      if (root !== '.' && isIncidentalPath(root, activeDirectories)) continue;
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
        ...(declaredStart === undefined ? {} : { startCommand: declaredStart.command }),
        environmentVariables: [],
        evidence: [
          ...(citation === undefined ? [] : [citation]),
          ...(declaredStart === undefined ? [] : [declaredStart.evidence])
        ],
        source: 'probe'
      });
    }

    return byRoot.size === 0 ? {} : { services: [...byRoot.values()] };
  }
};
