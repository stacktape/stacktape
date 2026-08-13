import { describe, expect, test } from 'bun:test';
import { buildInfrequentAccessSnapshotQuery, mapInsightsRowsToLogEvents } from './infrequent-access';

describe('Infrequent Access log snapshots', () => {
  test('builds a bounded query and clamps invalid limits', () => {
    expect(buildInfrequentAccessSnapshotQuery(25)).toContain('limit 25');
    expect(buildInfrequentAccessSnapshotQuery(0)).toContain('limit 1');
    expect(buildInfrequentAccessSnapshotQuery(50_000)).toContain('limit 10000');
  });

  test('maps descending Insights rows back to chronological log events', () => {
    expect(
      mapInsightsRowsToLogEvents([
        { '@timestamp': '2026-08-10T10:02:00.000Z', '@message': 'second', '@logStream': 'stream-b' },
        { '@timestamp': '2026-08-10T10:01:00.000Z', '@message': 'first', '@logStream': 'stream-a' }
      ])
    ).toEqual([
      { timestamp: Date.parse('2026-08-10T10:01:00.000Z'), message: 'first', logStreamName: 'stream-a' },
      { timestamp: Date.parse('2026-08-10T10:02:00.000Z'), message: 'second', logStreamName: 'stream-b' }
    ]);
  });
});
