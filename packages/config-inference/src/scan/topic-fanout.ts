/**
 * Several consumers on one queue, and a README that talks about a topic fanning out to queues.
 *
 * A probe sees each SQS handler on its own, and which queue invokes it the code does not say, so every handler lands
 * on the project's one queue, where they compete for its messages. Prose cannot settle whether that is wrong: a README
 * can say a topic fans out to queues, or that it does not. So nothing is rearranged; the shared queue carries the
 * README line and the queue names it mentions, and composition names them in the gap it reports.
 */

import type { DependencyFact } from '../facts/dependency';
import type { ServiceFactInput } from '../facts/service';

/** A sentence about a topic delivering to several subscribers. */
const FANOUT_STATEMENT = /\bfan(?:s|ned|ning)?[- ]?out\b|\bsubscrib(?:e|es|ed)\b/i;
const TOPIC_MENTION = /\bSNS\b|\btopics?\b/i;
/** `billingQueue`, `billing-queue`, `billing_queue`. Identifiers only: README prose never reaches the user. */
const QUEUE_NAME = /\b([a-z][a-zA-Z0-9]*Queue|[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*[-_]queue)\b/g;

/** Record the README line about fanning out on every queue several functions consume. */
export const noteFanoutHints = async ({
  services,
  dependencies,
  read
}: {
  services: readonly ServiceFactInput[];
  dependencies: readonly DependencyFact[];
  read: (path: string) => Promise<string | undefined>;
}): Promise<void> => {
  const consumers = new Map<string, Set<string>>();
  for (const service of services) {
    if (service.functionEntrypoint === undefined) continue;
    for (const trigger of service.functionTriggers ?? []) {
      if (trigger.type !== 'queue') continue;
      consumers.set(trigger.dependencyName, (consumers.get(trigger.dependencyName) ?? new Set()).add(service.name));
    }
  }
  const shared = dependencies.filter(
    (dependency) => dependency.kind === 'queue' && (consumers.get(dependency.name)?.size ?? 0) >= 2
  );
  if (shared.length === 0) return;
  const readme = await read('README.md');
  if (readme === undefined) return;
  for (const [index, line] of readme.split('\n').entries()) {
    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      if (!FANOUT_STATEMENT.test(sentence) || !TOPIC_MENTION.test(sentence)) continue;
      const queues = [...new Set([...sentence.matchAll(QUEUE_NAME)].map((match) => match[1]!))];
      if (queues.length < 2) continue;
      for (const dependency of shared) dependency.fanoutHint = { file: 'README.md', line: index + 1, queues };
      return;
    }
  }
};
