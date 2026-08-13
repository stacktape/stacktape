import { describe, expect, it } from 'bun:test';
import { resolveEngineVersion } from './engine-versions';

/**
 * Ordered the way the CLI's generated dataset really is — lexicographically, so `16.9` sits ahead
 * of `16.11`. The resolver must not trust this order.
 */
const CATALOGUE = {
  postgres: ['18.1', '17.7', '17.2', '16.9', '16.8', '16.6', '16.11', '16.10', '15.15', '12.22', '12.22-rds.20250220'],
  mysql: ['8.4.8', '8.4.7', '8.0.43', '8.0.42', '5.7.44-rds.20260212'],
  'sqlserver-ex': ['16.00.4225.2.v1', '16.00.4215.2.v1']
} as const;

describe('resolveEngineVersion', () => {
  it('keeps a pin the deploy already accepts', () => {
    expect(resolveEngineVersion({ engine: 'postgres', pin: '16.10', catalogue: CATALOGUE })).toEqual({
      version: '16.10',
      movedOffPin: false
    });
  });

  it('resolves a major-only pin to the newest of that line, compared numerically', () => {
    // Lexicographic order would pick 16.9 here; 16.11 is the actual newest.
    expect(resolveEngineVersion({ engine: 'postgres', pin: '16', catalogue: CATALOGUE }).version).toBe('16.11');
  });

  it('moves a stale minor to the newest of its line', () => {
    expect(resolveEngineVersion({ engine: 'postgres', pin: '16.2', catalogue: CATALOGUE }).version).toBe('16.11');
  });

  it('keeps mysql release trains apart', () => {
    expect(resolveEngineVersion({ engine: 'mysql', pin: '8.0', catalogue: CATALOGUE }).version).toBe('8.0.43');
    expect(resolveEngineVersion({ engine: 'mysql', pin: '8.4', catalogue: CATALOGUE }).version).toBe('8.4.8');
  });

  it('falls back to the newest accepted version when the pinned line is gone, and says so', () => {
    expect(resolveEngineVersion({ engine: 'postgres', pin: '9.6', catalogue: CATALOGUE })).toEqual({
      version: '18.1',
      movedOffPin: true
    });
  });

  it('picks the newest accepted version when nothing was pinned', () => {
    expect(resolveEngineVersion({ engine: 'postgres', catalogue: CATALOGUE })).toEqual({
      version: '18.1',
      movedOffPin: false
    });
  });

  it('resolves sqlserver-style four-segment versions', () => {
    expect(resolveEngineVersion({ engine: 'sqlserver-ex', pin: '16.00', catalogue: CATALOGUE }).version).toBe(
      '16.00.4225.2.v1'
    );
  });

  it('emits a full version even with no catalogue at all', () => {
    const { version } = resolveEngineVersion({ engine: 'postgres' });
    expect(version).toMatch(/^\d+\.\d+$/);
  });

  it('keeps an explicit pin when there is no catalogue to judge it against', () => {
    expect(resolveEngineVersion({ engine: 'postgres', pin: '16.10' }).version).toBe('16.10');
  });
});
