import { describe, expect, test } from 'bun:test';
import { getRelayedLocalResourceNames } from './placement';

// r2rr finding 7: a database used only by a batch job got a relay lease and an address in the job's environment, but
// no tunnel, so the job could not reach it.
describe('getRelayedLocalResourceNames', () => {
  test('a local database that only a batch job reaches is relayed', () => {
    expect(getRelayedLocalResourceNames({ functions: {}, batchJobs: { job: ['db'] } })).toEqual(['db']);
  });

  test('a database of several functions and jobs is relayed once', () => {
    expect(
      getRelayedLocalResourceNames({ functions: { api: ['db', 'cache'], worker: ['db'] }, batchJobs: { job: ['db'] } })
    ).toEqual(['db', 'cache']);
    expect(getRelayedLocalResourceNames({ functions: { api: [] } })).toEqual([]);
  });
});
