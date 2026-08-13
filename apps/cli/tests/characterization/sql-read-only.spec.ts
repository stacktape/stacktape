import { describe, expect, test } from 'bun:test';
import { assertReadOnlySql, parseSqlConnectionString } from '../../src/commands/query-sql';
import { CliError } from '@utils/errors';

describe('read-only SQL execution', () => {
  test('allows read-only CTEs but rejects mutations and server-file writes', () => {
    expect(() => assertReadOnlySql({ sql: 'WITH customer AS (SELECT 1) SELECT * FROM customer' })).not.toThrow();
    expect(() => assertReadOnlySql({ sql: "SELECT 'DELETE FROM customers' AS example" })).not.toThrow();
    expect(() => assertReadOnlySql({ sql: 'SHOW CREATE TABLE customers' })).not.toThrow();
    expect(() => assertReadOnlySql({ sql: 'SHOW TABLES; DELETE FROM customers' })).toThrow(
      expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' })
    );
    expect(() => assertReadOnlySql({ sql: "VALUES (nextval('customer_id_seq'))" })).toThrow(
      expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' })
    );
    expect(() => assertReadOnlySql({ sql: 'SELECT pg_terminate_backend(42)' })).toThrow(
      expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' })
    );
    expect(() => assertReadOnlySql({ sql: 'SELECT 1 /*!; DELETE FROM customers */' })).toThrow(
      expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' })
    );
    expect(() => assertReadOnlySql({ sql: 'UPDATE customers SET active = false' })).toThrow(
      expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' })
    );
    expect(() =>
      assertReadOnlySql({ sql: 'WITH removed AS (DELETE FROM customers RETURNING *) SELECT * FROM removed' })
    ).toThrow(expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' }));
    expect(() => assertReadOnlySql({ sql: 'SELECT * FROM customers FOR UPDATE' })).toThrow(
      expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' })
    );
    expect(() => assertReadOnlySql({ sql: "SELECT secret INTO OUTFILE '/tmp/export' FROM customers" })).toThrow(
      expect.objectContaining({ code: 'CLI_SQL_QUERY_NOT_READ_ONLY' })
    );
  });

  test('never includes credential-bearing connection input in parse failures', () => {
    const secret = 'DO-NOT-PRINT-THIS-PASSWORD';
    let error: CliError | undefined;
    try {
      parseSqlConnectionString({ connectionString: `postgresql://user:${secret}@[` });
    } catch (caught) {
      error = caught as CliError;
    }

    expect(error).toBeInstanceOf(CliError);
    expect(error?.code).toBe('CLI_SQL_CONNECTION_STRING_INVALID');
    expect(`${error?.message}\n${error?.stack}`).not.toContain(secret);
  });
});
