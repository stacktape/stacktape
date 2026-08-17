/**
 * Deciding what a failed deploy was about.
 *
 * The judgement that matters is `worthRetrying`. Getting it wrong in one direction costs a retry;
 * getting it wrong in the other sends a coding agent to look for a bug in the repository when the
 * real answer is that the user's credentials expired.
 */

import { describe, expect, it } from 'bun:test';
import type { JsonlEvent } from '@application-services/tui-manager/output/jsonl-types';
import { describeFailureForAgent, summariseFailure } from './failure';

const log = (level: 'info' | 'error', message: string): JsonlEvent => ({
  type: 'log',
  ts: '2026-08-13T00:00:00.000Z',
  level,
  source: 'cli',
  message
});

describe('summarising a failed deploy', () => {
  it('says nothing about a deploy that worked', () => {
    expect(summariseFailure({ events: [], lines: [], outcome: { ok: true, code: 'OK', message: 'Deployed' } })).toBe(
      undefined
    );
  });

  it('keeps the errors and the output, and drops the rest', () => {
    const failure = summariseFailure({
      events: [
        log('info', 'Packaging orders-api'),
        log('error', 'Container exited with code 1'),
        { type: 'output', ts: '2026-08-13T00:00:00.000Z', lines: ['sh: dist/server.js: not found'] }
      ],
      lines: [],
      outcome: { ok: false, code: 'DEPLOY_FAILED', message: 'Deployment failed' }
    });

    expect(failure?.errors).toEqual(['Container exited with code 1']);
    expect(failure?.output).toEqual(['sh: dist/server.js: not found']);
    // The informational line about packaging is not evidence of anything.
    expect(failure?.errors).not.toContain('Packaging orders-api');
  });

  it('treats a broken start command as worth another attempt', () => {
    const failure = summariseFailure({
      events: [log('error', 'Essential container in task exited')],
      lines: ['node: cannot find module /app/dist/server.js'],
      outcome: { ok: false, code: 'DEPLOY_FAILED', message: 'Deployment failed' }
    });

    expect(failure?.worthRetrying).toBe(true);
  });

  it('does not send an agent after a problem with the AWS account', () => {
    for (const message of [
      'The security token included in the request is expired',
      'User is not authorized to perform: rds:CreateDBInstance',
      'Cannot exceed quota for PoliciesPerRole',
      // Caught by the first real AWS run: the account layer failed, and the loop was one installed
      // agent away from sending a model to fix an expired login by reading the repository.
      'Invalid API key.'
    ]) {
      const failure = summariseFailure({
        events: [],
        lines: [],
        outcome: { ok: false, code: 'DEPLOY_FAILED', message }
      });
      // Every one of these produces the same error on a second attempt, having spent the user's
      // tokens and several minutes to prove it.
      expect(failure?.worthRetrying).toBe(false);
    }
  });

  it('never asks an agent to work around a changed deploy target', () => {
    expect(
      summariseFailure({
        events: [],
        lines: [],
        outcome: {
          ok: false,
          code: 'INIT_STACK_EXPECTATION_MISMATCH',
          message: 'A stack now exists where a new stack was approved.'
        }
      })?.worthRetrying
    ).toBe(false);
  });

  it('catches an account problem that only ever reached the output stream', () => {
    // The comment in the implementation says the interesting content lands in `output` — an SDK or
    // build step printing to stdout. The retryability judgement has to read the same stream.
    const failure = summariseFailure({
      events: [],
      lines: ['ExpiredToken: The security token included in the request is expired'],
      outcome: { ok: false, code: 'DEPLOY_FAILED', message: 'Deployment failed' }
    });

    expect(failure?.worthRetrying).toBe(false);
  });

  it('does not mistake build output saying "aborted" for a cancellation', () => {
    const failure = summariseFailure({
      events: [log('error', 'Container exited with code 1')],
      lines: ['warning: incremental compilation aborted, falling back to full rebuild'],
      outcome: { ok: false, code: 'DEPLOY_FAILED', message: 'Deployment failed' }
    });

    expect(failure?.worthRetrying).toBe(true);
  });

  it('reads as a transcript rather than as a data structure', () => {
    const failure = summariseFailure({
      events: [log('error', 'Container exited with code 1')],
      lines: [],
      outcome: { ok: false, code: 'DEPLOY_FAILED', message: 'Deployment failed' }
    })!;

    const described = describeFailureForAgent(failure);
    expect(described).toContain('The deploy failed: Deployment failed (DEPLOY_FAILED)');
    expect(described).toContain('Container exited with code 1');
    // Nothing claims an empty section exists.
    expect(described).not.toContain('Resources that did not finish');
  });
});
