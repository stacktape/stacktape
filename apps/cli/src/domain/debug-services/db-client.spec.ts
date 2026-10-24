import { expect, test } from 'bun:test';
import { mysqlReset, readPostgresResult } from './db-client';

// Shapes `pg` returns, recorded from PostgreSQL 16: `rowCount` is the rows a write changed, or the rows a SELECT
// returned, and null for statements such as CREATE TABLE. A query of several statements returns an array.
test('a PostgreSQL result reports the rows a write changed, not the rows it returned', () => {
  const field = (name: string) => ({ name });
  expect(readPostgresResult({ command: 'INSERT', rowCount: 3, rows: [], fields: [] })).toEqual({
    rows: [],
    fields: [],
    affectedRows: 3
  });
  expect(readPostgresResult({ command: 'DELETE', rowCount: 1, rows: [], fields: [] }).affectedRows).toBe(1);
  expect(
    readPostgresResult({ command: 'UPDATE', rowCount: 2, rows: [{ id: 1 }, { id: 2 }], fields: [field('id')] })
  ).toEqual({ rows: [{ id: 1 }, { id: 2 }], fields: ['id'], affectedRows: 2 });
  expect(
    readPostgresResult({ command: 'SELECT', rowCount: 1, rows: [{ count: '3' }], fields: [field('count')] })
  ).toEqual({ rows: [{ count: '3' }], fields: ['count'], affectedRows: undefined });
  expect(readPostgresResult({ command: 'CREATE', rowCount: null, rows: [], fields: [] }).affectedRows).toBeUndefined();
  expect(
    readPostgresResult([
      { command: 'DELETE', rowCount: 4, rows: [], fields: [] },
      { command: 'INSERT', rowCount: 2, rows: [], fields: [] },
      { command: 'SELECT', rowCount: 2, rows: [{ id: 5 }, { id: 6 }], fields: [field('id')] }
    ])
  ).toEqual({ rows: [{ id: 5 }, { id: 6 }], fields: ['id'], affectedRows: 6 });
});

test("a MySQL reset refuses the server's system databases before it connects", async () => {
  for (const database of ['mysql', 'sys', 'performance_schema', 'INFORMATION_SCHEMA']) {
    // Port 1 has no server; a refusal that reached the network would report a connection error instead.
    const result = await mysqlReset({ host: '127.0.0.1', port: 1, user: 'root', password: '', database });
    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toContain('system database');
  }
});
