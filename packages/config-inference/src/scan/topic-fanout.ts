/**
 * What a README says about the project's queues that its code does not: a topic fanning out to one queue per consumer,
 * and a dead-letter queue for messages that keep failing.
 *
 * A probe sees each SQS handler on its own, and which queue invokes it the code does not say, so every handler lands
 * on the project's one queue, where they compete for its messages. Prose alone cannot settle whether that is wrong: a
 * README can say a topic fans out to queues, or that it does not. The topology is rearranged only when the README names
 * one queue per consumer in a sentence about the topic, nothing in the code sends to the shared queue, and the project
 * has one topic that its code publishes to. Otherwise the shared queue carries the README line, and composition names it
 * in the gap it reports.
 */

import type { Citation } from '../facts/citation';
import type { DependencyFact } from '../facts/dependency';
import type { ServiceFactInput } from '../facts/service';

/** A sentence about a topic delivering to several subscribers. */
const FANOUT_STATEMENT = /\bfan(?:s|ned|ning)?[- ]?out\b|\bsubscrib(?:e|es|ed)\b/i;
const TOPIC_MENTION = /\bSNS\b|\btopics?\b/i;
/** A sentence that denies what it says: "does not fan out", "instead of a topic". */
const NEGATION = /\b(?:not|never|no|without|instead)\b|n't\b/i;
/** `billingQueue`, `billing-queue`, `billing_queue`. Identifiers only: README prose never reaches the user. */
const QUEUE_NAME = /\b([a-z][a-zA-Z0-9]*Queue|[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*[-_]queue)\b/g;
/** A handler that reads the SNS envelope out of the SQS body rather than the published message itself. */
const READS_SNS_ENVELOPE = /\.\s*Message\b|\[\s*['"]Message['"]\s*\]|\bTopicArn\b/;

const README = 'README.md';

/**
 * README paragraphs and list items with their wrapped lines joined: a sentence that continues on the next line is one
 * sentence. Each keeps its lines, so a finding can cite the line that holds it.
 */
const readmeBlocks = (readme: string): Array<{ text: string; lines: Array<{ number: number; text: string }> }> => {
  const blocks: Array<{ text: string; lines: Array<{ number: number; text: string }> }> = [];
  for (const [index, text] of readme.split('\n').entries()) {
    const starts = /^\s*(?:[-*+]\s|\d+[.)]\s|#|\||>)/.test(text);
    const current = blocks.at(-1);
    if (text.trim() === '') {
      blocks.push({ text: '', lines: [] });
    } else if (current === undefined || starts || current.lines.length === 0) {
      blocks.push({ text: text.trim(), lines: [{ number: index + 1, text }] });
    } else {
      current.text = `${current.text} ${text.trim()}`;
      current.lines.push({ number: index + 1, text });
    }
  }
  return blocks.filter((block) => block.lines.length > 0);
};

/** The line of a block where `pattern` first matches, or its first line. */
const lineOf = (block: ReturnType<typeof readmeBlocks>[number], pattern: RegExp): number =>
  (block.lines.find((line) => pattern.test(line.text)) ?? block.lines[0]!).number;

/** `billingQueue`, `billing-queue` and the `billing` function all name `billing`. */
const identity = (name: string): string =>
  name
    .replace(/[-_]?queue$/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const queueConsumers = (services: readonly ServiceFactInput[]): Map<string, ServiceFactInput[]> => {
  const consumers = new Map<string, ServiceFactInput[]>();
  for (const service of services) {
    if (service.functionEntrypoint === undefined) continue;
    for (const trigger of service.functionTriggers ?? []) {
      if (trigger.type !== 'queue') continue;
      const list = consumers.get(trigger.dependencyName) ?? [];
      if (!list.includes(service)) list.push(service);
      consumers.set(trigger.dependencyName, list);
    }
  }
  return consumers;
};

/**
 * Give each consumer its own queue subscribed to the topic, when the README names exactly those queues, each consumer
 * matches one of them by name, and the shared queue is only the probes' placeholder (nothing sends to it, it has no
 * settings of its own).
 */
const splitFanout = ({
  shared,
  consumers,
  queues,
  line,
  quote,
  dependencies,
  sources
}: {
  shared: DependencyFact;
  consumers: readonly ServiceFactInput[];
  queues: readonly string[];
  line: number;
  quote: string;
  dependencies: DependencyFact[];
  sources: ReadonlyMap<ServiceFactInput, string | undefined>;
}): boolean => {
  const topics = dependencies.filter((dependency) => dependency.kind === 'topic');
  if (topics.length !== 1 || topics[0]!.consumedBy.length === 0) return false;
  if (shared.consumedBy.length > 0 || shared.addressedBy.length > 0 || shared.queueSettings !== undefined) return false;
  if (queues.length !== consumers.length) return false;
  const taken = new Set(
    dependencies.filter((dependency) => dependency !== shared).map((dependency) => dependency.name)
  );
  const pairs = consumers.map((consumer) => {
    const names = [consumer.name, consumer.functionEntrypoint?.replace(/^.*\//, '').replace(/\.[^.]+$/, '') ?? ''];
    const matches = queues.filter((queue) => names.some((name) => name !== '' && identity(name) === identity(queue)));
    return { consumer, queue: matches.length === 1 ? matches[0]! : undefined };
  });
  if (pairs.some((pair) => pair.queue === undefined || taken.has(pair.queue))) return false;
  if (new Set(pairs.map((pair) => pair.queue)).size !== pairs.length) return false;

  const citation: Citation = { field: 'topicSubscription', file: README, line, quote };
  const index = dependencies.indexOf(shared);
  const split = pairs.map(({ consumer, queue }): DependencyFact => {
    for (const trigger of consumer.functionTriggers ?? []) {
      if (trigger.type === 'queue' && trigger.dependencyName === shared.name) trigger.dependencyName = queue!;
    }
    return {
      name: queue!,
      kind: 'queue',
      extensions: [],
      consumedBy: [],
      addressedBy: [],
      topicSubscription: {
        dependencyName: topics[0]!.name,
        rawMessageDelivery: !READS_SNS_ENVELOPE.test(sources.get(consumer) ?? '')
      },
      evidence: [citation, ...shared.evidence.filter((evidence) => evidence.file === consumer.functionEntrypoint)],
      source: 'probe'
    };
  });
  dependencies.splice(index, 1, ...split);
  return true;
};

/**
 * Record the README line about fanning out on every queue several functions consume, or give each consumer its own
 * subscribed queue when the README establishes which.
 */
export const noteFanoutHints = async ({
  services,
  dependencies,
  read
}: {
  services: readonly ServiceFactInput[];
  dependencies: DependencyFact[];
  read: (path: string) => Promise<string | undefined>;
}): Promise<void> => {
  const consumers = queueConsumers(services);
  const shared = dependencies.filter(
    (dependency) => dependency.kind === 'queue' && (consumers.get(dependency.name)?.length ?? 0) >= 2
  );
  if (shared.length === 0) return;
  const readme = await read(README);
  if (readme === undefined) return;
  for (const block of readmeBlocks(readme)) {
    for (const sentence of block.text.split(/(?<=[.!?])\s+/)) {
      if (!FANOUT_STATEMENT.test(sentence) || !TOPIC_MENTION.test(sentence)) continue;
      const queues = [...new Set([...sentence.matchAll(QUEUE_NAME)].map((match) => match[1]!))];
      if (queues.length < 2) continue;
      const line = lineOf(block, FANOUT_STATEMENT);
      for (const dependency of shared) {
        const sharing = consumers.get(dependency.name)!;
        // oxlint-disable-next-line no-await-in-loop -- one handler file per consumer of the one shared queue.
        const texts = await Promise.all(
          sharing.map((consumer) =>
            consumer.functionEntrypoint === undefined ? undefined : read(consumer.functionEntrypoint)
          )
        );
        const sources = new Map(sharing.map((consumer, position) => [consumer, texts[position]] as const));
        const established =
          shared.length === 1 &&
          !NEGATION.test(sentence) &&
          splitFanout({
            shared: dependency,
            consumers: sharing,
            queues,
            line,
            quote: (block.lines.find((entry) => entry.number === line)?.text ?? sentence).trim().slice(0, 200),
            dependencies,
            sources
          });
        if (!established) dependency.fanoutHint = { file: README, line, queues };
      }
      return;
    }
  }
};

const DEAD_LETTER = /\bdead[- ]?letter\b|\bDLQ\b/i;
const COUNT_WORDS: Readonly<Record<string, number>> = {
  once: 1,
  twice: 2,
  thrice: 3,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};
const COUNT = '(\\d{1,4}|one|two|three|four|five|six|seven|eight|nine|ten)';

/** How many times a message is received before it moves to the dead-letter queue, when the sentence says. */
const maxReceiveCountIn = (sentence: string): number | undefined => {
  const explicit = /\bmaxReceiveCount\b\D{0,4}(\d{1,4})/i.exec(sentence)?.[1];
  if (explicit !== undefined) return Number(explicit);
  const adverb = /\bfail(?:s|ed|ing)?\s+(once|twice|thrice)\b/i.exec(sentence)?.[1];
  if (adverb !== undefined) return COUNT_WORDS[adverb.toLowerCase()];
  const attempts = new RegExp(
    `\\b(?:after|fail(?:s|ed|ing)?|than)\\s+${COUNT}\\s+(?:failed\\s+)?(times|attempts|tries|receives|deliveries|retries)\\b`,
    'i'
  ).exec(sentence);
  if (attempts === null) return undefined;
  const count = /^\d+$/.test(attempts[1]!) ? Number(attempts[1]) : COUNT_WORDS[attempts[1]!.toLowerCase()]!;
  // Three retries follow a first attempt: four receives.
  return attempts[2]!.toLowerCase() === 'retries' ? count + 1 : count;
};

/**
 * Note a README's requirement that failed messages of a queue go to a dead-letter queue, when no deployment file
 * declares one. The line names the queue through its consumer's file or the queue's own name, or the project has one
 * queue; otherwise it is recorded on every queue as ambiguous.
 */
export const noteDeadLetterRequirements = async ({
  services,
  dependencies,
  read
}: {
  services: readonly ServiceFactInput[];
  dependencies: readonly DependencyFact[];
  read: (path: string) => Promise<string | undefined>;
}): Promise<void> => {
  const targets = new Set(
    dependencies.flatMap((dependency) => dependency.queueSettings?.deadLetter?.dependencyName ?? [])
  );
  const queues = dependencies.filter(
    (dependency) =>
      dependency.kind === 'queue' && dependency.queueSettings?.deadLetter === undefined && !targets.has(dependency.name)
  );
  if (queues.length === 0) return;
  const readme = await read(README);
  if (readme === undefined) return;
  const consumers = queueConsumers(services);
  for (const block of readmeBlocks(readme)) {
    const line = block.text;
    const sentence = line.split(/(?<=[.!?])\s+/).find((candidate) => DEAD_LETTER.test(candidate));
    if (sentence === undefined || /\b(?:no|not|never|without)\b|n't\b/i.test(sentence)) continue;
    const count = maxReceiveCountIn(sentence);
    const maxReceiveCount = count !== undefined && count >= 1 && count <= 1000 ? count : undefined;
    // The bullet the sentence belongs to names the handler or the queue: `workers/process_receipt.py: consumes ...`.
    const named = queues.filter(
      (queue) =>
        new RegExp(`\\b${queue.name}\\b`).test(line) ||
        queue.addressedBy.some((variable) => line.includes(variable)) ||
        (consumers.get(queue.name) ?? []).some(
          (consumer) =>
            (consumer.functionEntrypoint !== undefined && line.includes(consumer.functionEntrypoint)) ||
            (consumer.path !== '.' && line.includes(`${consumer.path}/`) && consumer.functionEntrypoint === undefined)
        )
    );
    const chosen = named.length === 1 ? named : queues.length === 1 ? queues : [];
    for (const queue of chosen.length === 1 ? chosen : queues) {
      queue.deadLetterRequirement = {
        file: README,
        line: lineOf(block, DEAD_LETTER),
        ...(maxReceiveCount === undefined ? {} : { maxReceiveCount }),
        ...(chosen.length === 1 ? {} : { ambiguous: true as const })
      };
    }
    return;
  }
};
