/**
 * SNS fanout: one topic delivering every message to several queues, each with its own consumer.
 *
 * A probe sees each SQS handler on its own, and which queue invokes it the code does not say, so every handler lands
 * on the project's one queue. Two different handlers on one queue compete for its messages: each message reaches only
 * one of them. When the project states that its topic fans out to named queues, and each queue's name is one
 * consumer's name (`billingQueue` for `billing`), each consumer gets its own queue subscribed to the topic. Otherwise
 * the consumers stay where they were, and composition reports it.
 */

import type { Citation } from '../facts/citation';
import type { DependencyFact } from '../facts/dependency';
import type { ServiceFactInput } from '../facts/service';

/** A sentence saying a topic delivers to several subscribers. */
const FANOUT_STATEMENT = /\bfan(?:s|ned|ning)?[- ]?out\b|\bsubscrib(?:e|es|ed)\b/i;
const TOPIC_MENTION = /\bSNS\b|\btopics?\b/i;
/** `billingQueue`, `billing-queue`, `billing_queue`. */
const QUEUE_NAME = /\b([a-z][a-zA-Z0-9]*Queue|[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*[-_]queue)\b/g;
/** A consumer reading the SNS envelope (`JSON.parse(record.body).Message`) wants it; otherwise it reads the message. */
const READS_ENVELOPE = /(?:\.|\[\s*['"])Message\b|\bTopicArn\b/;

const words = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** `billing-queue` is the `billingQueue` resource. */
const resourceName = (queue: string): string =>
  queue.replace(/[-_]([a-z0-9])/g, (_, character: string) => character.toUpperCase());

/** The README sentence naming the queues a topic fans out to, and those names. */
const fanoutStatement = (readme: string): { sentence: string; queues: string[] } | undefined => {
  for (const sentence of readme.split(/(?<=[.!?])\s+|\n+/)) {
    if (!FANOUT_STATEMENT.test(sentence) || !TOPIC_MENTION.test(sentence)) continue;
    const queues = [...new Set([...sentence.matchAll(QUEUE_NAME)].map((match) => match[1]!))];
    if (queues.length >= 2) return { sentence: sentence.trim(), queues };
  }
  return undefined;
};

const citeSentence = (readme: string, sentence: string): Citation | undefined => {
  const index = readme.split('\n').findIndex((line) => line.includes(sentence));
  return index === -1
    ? undefined
    : { file: 'README.md', line: index + 1, quote: sentence.slice(0, 200), field: 'functionTriggers' };
};

/**
 * Give each consumer of a shared queue its own queue subscribed to the project's topic, when the README names one
 * queue per consumer. Returns the dependency list with the new queues, and without the shared one once nothing uses it.
 */
export const settleTopicFanout = async ({
  services,
  dependencies,
  read
}: {
  services: readonly ServiceFactInput[];
  dependencies: DependencyFact[];
  read: (path: string) => Promise<string | undefined>;
}): Promise<DependencyFact[]> => {
  const topics = dependencies.filter((dependency) => dependency.kind === 'topic');
  if (topics.length !== 1) return dependencies;
  const consumersByQueue = new Map<string, ServiceFactInput[]>();
  for (const service of services) {
    if (service.functionEntrypoint === undefined) continue;
    for (const trigger of service.functionTriggers ?? []) {
      if (trigger.type !== 'queue') continue;
      consumersByQueue.set(trigger.dependencyName, [...(consumersByQueue.get(trigger.dependencyName) ?? []), service]);
    }
  }
  const shared = [...consumersByQueue].filter(([, consumers]) => consumers.length >= 2);
  if (shared.length !== 1) return dependencies;
  const [[queueName, consumers]] = shared as [[string, ServiceFactInput[]]];
  const queue = dependencies.find((dependency) => dependency.name === queueName && dependency.kind === 'queue');
  // Code that addresses the shared queue itself (sends to it) means it is a real queue, not a stand-in for the topic's
  // subscribers.
  const addressed =
    queue !== undefined &&
    (queue.addressedBy.length > 0 ||
      services.some((service) =>
        (service.environmentVariables ?? []).some((variable) => variable.dependencyName === queue.name)
      ));
  if (queue === undefined || addressed) return dependencies;

  const readme = await read('README.md');
  const statement = readme === undefined ? undefined : fanoutStatement(readme);
  if (readme === undefined || statement === undefined) return dependencies;
  const assignments = consumers.map((consumer) => ({
    consumer,
    queues: statement.queues.filter((name) => words(name).replace(/_queue$/, '') === words(consumer.name))
  }));
  const assigned = assignments.map(({ queues }) => queues[0]);
  if (assignments.some(({ queues }) => queues.length !== 1) || new Set(assigned).size !== assigned.length) {
    return dependencies;
  }

  const names = assigned.map((name) => resourceName(name!));
  if (dependencies.some((dependency) => names.includes(dependency.name) && dependency.kind !== 'queue')) {
    return dependencies;
  }

  const topic = topics[0]!;
  const citation = citeSentence(readme, statement.sentence);
  const next = [...dependencies];
  for (const [index, { consumer }] of assignments.entries()) {
    const name = names[index]!;
    // oxlint-disable-next-line no-await-in-loop -- one entry file per consumer, read in a stable order.
    const source = await read(consumer.functionEntrypoint!);
    const subscription = { topicName: topic.name, rawMessageDelivery: !READS_ENVELOPE.test(source ?? '') };
    const existing = next.find((dependency) => dependency.name === name);
    if (existing === undefined) {
      next.push({
        name,
        kind: 'queue',
        extensions: [],
        consumedBy: [],
        addressedBy: [],
        topicSubscription: subscription,
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    } else {
      existing.topicSubscription = subscription;
    }
    for (const trigger of consumer.functionTriggers ?? []) {
      if (trigger.type === 'queue' && trigger.dependencyName === queueName) trigger.dependencyName = name;
    }
  }
  const stillUsed =
    services.some((service) =>
      (service.functionTriggers ?? []).some(
        (trigger) => 'dependencyName' in trigger && trigger.dependencyName === queueName
      )
    ) || queue.consumedBy.some((serviceName) => !consumers.some((consumer) => consumer.name === serviceName));
  return stillUsed ? next : next.filter((dependency) => dependency !== queue);
};
