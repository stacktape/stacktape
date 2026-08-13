/**
 * Choosing what each observed service becomes.
 *
 * This is the decision the agent is deliberately not allowed to make. It is not a judgement about
 * the repository — it is a judgement about AWS, about what Stacktape can synthesise, and about what
 * fails at three in the morning. The facts say "serves HTTP, holds websockets, writes to /tmp"; the
 * rules here say what that has to run on.
 *
 * The governing bias is **containers unless proven otherwise**. A container runs whatever the
 * repository already runs, with the command the repository already uses. A function is cheaper and
 * scales harder, but it demands a handler-shaped entrypoint, tolerates no local disk, and dies at a
 * fixed timeout — so choosing one on a guess turns a working application into a broken deployment.
 * The cost of being conservative is a few dollars a month; the cost of being wrong is the user's
 * first impression of the product.
 */

import type { Citation } from '../facts/citation';
import type { ServiceFact } from '../facts/service';

export type ServiceResourceType =
  | 'web-service'
  | 'worker-service'
  | 'private-service'
  | 'batch-job'
  | 'hosting-bucket'
  | 'nextjs-web'
  | 'nuxt-web'
  | 'sveltekit-web'
  | 'astro-web'
  | 'remix-web'
  | 'solid-start-web';

export type ServiceClassification = {
  resourceType: ServiceResourceType;
  /**
   * Why, in the house voice.
   *
   * Written for the user, not for a log: it is shown in the wizard next to the resource and emitted
   * as a comment in the generated configuration, so someone reading the file a year later can tell
   * why it says what it says.
   */
  reason: string;
  /** The observations that drove the choice, so the UI can link back into the user's own code. */
  evidence: Citation[];
};

/** Frameworks Stacktape synthesises directly, which always beats packaging them by hand. */
const FRAMEWORK_RESOURCES: Readonly<Record<string, ServiceResourceType>> = {
  nextjs: 'nextjs-web',
  nuxt: 'nuxt-web',
  sveltekit: 'sveltekit-web',
  astro: 'astro-web',
  remix: 'remix-web',
  'solid-start': 'solid-start-web'
};

const evidenceFor = (service: ServiceFact, fields: readonly string[]): Citation[] =>
  service.evidence.filter((citation) => citation.field !== undefined && fields.includes(citation.field)).slice(0, 3);

export const classifyService = (service: ServiceFact): ServiceClassification => {
  const frameworkResource = service.framework === undefined ? undefined : FRAMEWORK_RESOURCES[service.framework];
  if (frameworkResource !== undefined) {
    return {
      resourceType: frameworkResource,
      reason: `Stacktape has first-class support for ${service.framework}, which handles its build output, routing and caching for you.`,
      evidence: service.evidence.slice(0, 2)
    };
  }

  // Nothing to run, only files to serve. Static hosting is dramatically cheaper than a container
  // and there is nothing to keep alive.
  if (!service.exposesHttp && service.startCommand === undefined && service.servesStaticAssets !== undefined) {
    return {
      resourceType: 'hosting-bucket',
      reason:
        'This builds to static files and runs no server, so it is served from storage and a CDN rather than a container.',
      evidence: service.evidence.slice(0, 2)
    };
  }

  if (service.executionModel === 'scheduled' || service.executionModel === 'one-shot') {
    return {
      resourceType: 'batch-job',
      reason:
        service.executionModel === 'scheduled'
          ? `This runs on a schedule (${service.schedule ?? 'unspecified'}) rather than continuously, so it only costs anything while it runs.`
          : 'This runs once and exits, so it does not need anything kept alive.',
      evidence: evidenceFor(service, ['schedule', 'executionModel'])
    };
  }

  if (!service.exposesHttp) {
    return {
      resourceType: 'worker-service',
      reason: 'This runs continuously without serving HTTP, so it needs no address and no load balancer.',
      evidence: evidenceFor(service, ['executionModel'])
    };
  }

  // Serves HTTP. Everything from here is about what it needs to keep working.
  if (service.longLivedConnections !== 'none') {
    return {
      resourceType: 'web-service',
      reason: `This holds ${service.longLivedConnections === 'websocket' ? 'websocket' : 'streaming'} connections open, which needs a long-lived container rather than a per-request function.`,
      evidence: evidenceFor(service, ['longLivedConnections'])
    };
  }

  if (service.writesLocalFilesystem !== undefined) {
    return {
      resourceType: 'web-service',
      reason: 'This writes to local disk, so it runs in a container where that is possible.',
      evidence: evidenceFor(service, ['writesLocalFilesystem'])
    };
  }

  return {
    resourceType: 'web-service',
    reason: 'A container runs this exactly as your own start command does, with no changes to your code.',
    evidence: service.evidence.slice(0, 2)
  };
};

/** Whether a classification produces something with a public address. */
export const isPubliclyAddressable = (resourceType: ServiceResourceType): boolean =>
  resourceType !== 'worker-service' && resourceType !== 'batch-job' && resourceType !== 'private-service';
