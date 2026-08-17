import { describe, expect, it } from 'bun:test';
import { uncertaintySchema } from '@stacktape/config-inference/facts/uncertainty';
import { DECISION_COPY } from './decisions';

/**
 * Pulls the closed set of kinds straight out of the schema, so this file cannot drift from it.
 * Adding a decision kind without adding its copy fails here rather than reaching a user as a blank
 * row — which is the coupling the whole typed-decision design depends on.
 */
const KINDS = uncertaintySchema.options.map((option) => option.shape.kind.value as string);

describe('every decision a user can see has house copy', () => {
  it('covers the whole vocabulary', () => {
    expect(KINDS.filter((kind) => !Object.hasOwn(DECISION_COPY, kind))).toEqual([]);
  });

  it('has no copy for a kind that does not exist', () => {
    // The other direction: dead copy is a sign the vocabulary moved and this file did not.
    expect(Object.keys(DECISION_COPY).filter((kind) => !KINDS.includes(kind))).toEqual([]);
  });
});

describe('the copy itself', () => {
  for (const kind of KINDS) {
    it(`${kind} states what was done and what it means`, () => {
      const copy = DECISION_COPY[kind]!;
      const summary = copy.summary({}, 'accept');
      const detail = copy.detail({}, 'accept');

      // A summary is a statement about their project, not a label.
      expect(summary.length).toBeGreaterThan(8);
      // And it always justifies itself: a decision with no consequence explained is one the user
      // cannot evaluate, which is the whole reason for showing it rather than hiding it.
      expect(detail.length).toBeGreaterThan(30);
      expect(detail).not.toBe(summary);
    });

    it(`${kind} labels its alternatives without jargon`, () => {
      const copy = DECISION_COPY[kind]!;
      const label = copy.option('accept', {});

      expect(label.length).toBeGreaterThan(0);
    });
  }

  it('never uses the words a Heroku developer would have to look up', () => {
    // Not exhaustive, and not a substitute for reading it. It catches the drift that happens when
    // someone who knows AWS writes the next line of copy without noticing who it is for.
    const forbidden = [
      'availability zone',
      'ephemeral',
      'provisioned',
      'IOPS',
      'instance class',
      'VPC',
      'subnet',
      'IAM'
    ];

    for (const [kind, copy] of Object.entries(DECISION_COPY)) {
      const rendered = [
        copy.summary({}, 'accept'),
        copy.detail({}, 'accept'),
        copy.option('accept', {}),
        copy.consequence?.('accept', {}) ?? ''
      ]
        .join(' ')
        .toLowerCase();

      for (const word of forbidden) {
        expect(`${kind}: ${rendered}`).not.toContain(word.toLowerCase());
      }
    }
  });

  it('does not present an infrastructure declaration as proof of live data', () => {
    const copy = DECISION_COPY['external-database-disposition']!;
    const parameters = { provider: 'aws', basis: 'deployment-manifest', dependencyKind: 'postgres' };

    expect(copy.summary(parameters, 'point-at-existing')).toContain('declared');
    expect(copy.detail(parameters, 'point-at-existing')).toContain('cannot tell us whether it was deployed');
    expect(copy.detail(parameters, 'point-at-existing')).not.toContain('has your data');
  });

  it('calls a newly created event resource separate and empty', () => {
    const copy = DECISION_COPY['external-database-disposition']!;
    const parameters = {
      dependencyKind: 'queue',
      provider: 'aws',
      basis: 'deployment-manifest'
    };

    expect(copy.summary(parameters, 'create-new')).toBe('Creating a new queue on AWS');
    expect(copy.consequence?.('create-new', parameters)).toBe('A separate, empty queue is created on AWS.');
  });
});
