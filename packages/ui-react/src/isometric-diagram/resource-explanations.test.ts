import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { diagramFixtures } from './fixtures.js';
import {
  EDGE_SEMANTIC_LABELS,
  GROUP_EXPLANATION,
  RESOURCE_EXPLANATIONS,
  ZONE_EXPLANATIONS
} from './resource-explanations.js';
import { buildDiagramTopology } from './topology.js';

/**
 * The reader of a tooltip is a developer with little infrastructure experience. These are the parts of the writing
 * rules in `resource-explanations.ts` a test can hold: short sentences, one idea each, and no words that need a
 * networking background.
 */
const JARGON = /synchronous|invo[ck]|fan-out|decoupl|least-privilege|egress|ingress|pull-based|push-based/i;
/** A dash or a semicolon joins two ideas that should be two sentences. */
const JOINED = /\s[—–-]\s|;/;

const explanations = Object.entries({ ...RESOURCE_EXPLANATIONS, ...ZONE_EXPLANATIONS, ...GROUP_EXPLANATION });

describe('what a tooltip says about a kind of resource', () => {
  test.each(explanations)('%s: one short sentence, then at most three short facts', (_type, explanation) => {
    expect(explanation.summary.length).toBeLessThanOrEqual(80);
    expect(explanation.summary).toMatch(/\.$/);
    expect(explanation.facts.length).toBeLessThanOrEqual(3);
    for (const fact of explanation.facts) {
      expect(fact.length).toBeLessThanOrEqual(105);
      expect(fact).toMatch(/\.$/);
    }
  });

  test.each(explanations)('%s: plain words, one idea a sentence', (_type, explanation) => {
    for (const text of [explanation.summary, ...explanation.facts]) {
      expect(text).not.toMatch(JARGON);
      expect(text).not.toMatch(JOINED);
    }
  });

  test('a connector says in a few words whether the caller waits', () => {
    expect(EDGE_SEMANTIC_LABELS.request).toContain('the caller waits');
    expect(EDGE_SEMANTIC_LABELS.event).toContain('does not wait');
    for (const label of Object.values(EDGE_SEMANTIC_LABELS)) expect(label).not.toMatch(JARGON);
  });
});

const configDirectory = new URL('./test-configs/', import.meta.url);
const configs: Array<[string, unknown]> = [
  ...diagramFixtures.map((fixture): [string, unknown] => [fixture.id, parse(fixture.yaml)]),
  ...readdirSync(configDirectory).map((file): [string, unknown] => [
    file,
    parse(readFileSync(new URL(file, configDirectory), 'utf8'))
  ])
];

describe('what a tooltip says about one resource or connector', () => {
  test.each(configs)('%s: connector descriptions and access notes use plain words', (_name, parsedConfig) => {
    const topology = buildDiagramTopology({ parsedConfig: parsedConfig as never });
    if (!topology) return;
    const texts = [
      ...topology.edges.map((edge) => edge.description),
      ...topology.nodes.flatMap((node) => [node.accessNote, node.accessFix])
    ].filter((text): text is string => Boolean(text));
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toMatch(JARGON);
      expect(text).not.toMatch(JOINED);
    }
  });
});
