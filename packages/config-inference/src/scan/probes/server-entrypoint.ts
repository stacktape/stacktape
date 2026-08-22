/** Source files that prove how a long-running HTTP service enters the program. */

import { posix } from 'node:path';
import type { ServiceFactInput } from '../../facts/service';
import { citeFirstMatch, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
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

export const serverEntrypointProbe: Probe = {
  name: 'server-entrypoint',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const candidates = context.files.filter(
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
        environmentVariables: [],
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    return byRoot.size === 0 ? {} : { services: [...byRoot.values()] };
  }
};
