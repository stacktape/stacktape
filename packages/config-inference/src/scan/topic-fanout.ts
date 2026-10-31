/**
 * What a README says about the project's queues that its code does not: a topic fanning out to one queue per consumer,
 * and a dead-letter queue for messages that keep failing.
 *
 * Prose never rearranges queues or adds one: a README can describe history, a tutorial or an example as easily as the
 * current design, and a wrong topology loses or duplicates messages without any error. So a queue only carries the
 * README line and the names on it, and composition turns them into a gap that says exactly what to add.
 */

import type { DependencyFact } from '../facts/dependency';
import type { ServiceFactInput } from '../facts/service';

/** A sentence about a topic delivering to several subscribers. */
const FANOUT_STATEMENT = /\bfan(?:s|ned|ning)?[- ]?out\b|\bsubscrib(?:e|es|ed)\b/i;
const TOPIC_MENTION = /\bSNS\b|\btopics?\b/i;
/** `billingQueue`, `billing-queue`, `billing_queue`. Identifiers only: README prose never reaches the user. */
const QUEUE_NAME = /\b([a-z][a-zA-Z0-9]*Queue|[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*[-_]queue)\b/g;

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
      for (const dependency of shared) {
        dependency.fanoutHint = { file: README, line: lineOf(block, FANOUT_STATEMENT), queues };
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
 * Note a README line about a dead-letter queue, when no deployment file declares one. The line names the queue through
 * its consumer's file or the queue's own name; otherwise it is recorded on every queue as ambiguous. Composition reports
 * it and creates nothing.
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
    // Only the line itself naming the queue or its consumer ties it to that queue; a project with one queue can still
    // have a README describing another (a tutorial, an example).
    for (const queue of named.length === 1 ? named : queues) {
      queue.deadLetterRequirement = {
        file: README,
        line: lineOf(block, DEAD_LETTER),
        ...(maxReceiveCount === undefined ? {} : { maxReceiveCount }),
        ...(named.length === 1 ? {} : { ambiguous: true as const })
      };
    }
    return;
  }
};
