import { describe, expect, test } from 'bun:test';
import { getSqlConfirmationReason, isDefinitelyReadOnlySql, tokenizeSqlStatements } from './sql-statements';

describe('SQL confirmation on a writable local database', () => {
  // Bypasses found by the r2xx audit: a comment or a quoted word changed how the statement read.
  test.each([
    ['-- ordinary explanation\nDELETE FROM users', 'postgres'],
    ['/* comment */ TRUNCATE users', 'postgres'],
    ["UPDATE users SET note='where'", 'postgres'],
    ['UPDATE users SET note = "where"', 'mysql'],
    ['# note\nDELETE FROM users', 'mysql'],
    ['/* outer /* nested */ still a comment */ DROP TABLE users', 'postgres'],
    ['DELETE FROM users -- WHERE id = 1', 'postgres'],
    ['DELETE FROM users /* WHERE id = 1 */', 'mysql'],
    ['UPDATE users SET note = $$where$$', 'postgres'],
    ['UPDATE users SET note = $tag$ WHERE $tag$', 'postgres'],
    ['UPDATE users SET id = (SELECT 1 FROM other WHERE true)', 'postgres'],
    ['INSERT INTO log VALUES (1); DELETE FROM users', 'postgres'],
    ["SELECT 1; DELETE FROM users WHERE note = ';'; TRUNCATE users", 'postgres'],
    // Review of #391: a data-modifying CTE or a nested write inside a statement that looks like a read or a create.
    ['CREATE TABLE saved AS WITH wiped AS (DELETE FROM users RETURNING *) SELECT * FROM wiped', 'postgres'],
    ['WITH wiped AS (DELETE FROM users RETURNING *) SELECT * FROM wiped', 'postgres'],
    ['INSERT INTO sink WITH wiped AS (DELETE FROM users RETURNING *) SELECT * FROM wiped', 'postgres'],
    ['INSERT INTO sink SELECT * FROM users', 'postgres'],
    ['INSERT INTO users VALUES (1) ON CONFLICT (id) DO UPDATE SET note = excluded.note', 'postgres'],
    ['EXPLAIN ANALYZE DELETE FROM users', 'postgres'],
    ['EXPLAIN ANALYZE SELECT bump()', 'postgres'],
    ['DO $$ BEGIN DELETE FROM users; END $$', 'postgres'],
    ['SELECT bump()', 'postgres'],
    ['SELECT * FROM users WHERE id = public.bump()', 'postgres'],
    ['CALL wipe()', 'mysql'],
    ['CREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$', 'postgres'],
    // Review of #391: an identifier with `$` or quotes hid a missing WHERE, and constant-true conditions are bulk.
    ["UPDATE ident SET note$where = 'changed'", 'postgres'],
    ['UPDATE ident SET "where" = 1', 'postgres'],
    ['UPDATE ident SET `where` = 1', 'mysql'],
    ['DELETE FROM users WHERE true', 'postgres'],
    ['DELETE FROM users WHERE 1=1', 'mysql'],
    ["DELETE FROM users WHERE 'a' = 'a'", 'postgres'],
    ['UPDATE users SET note = 1 WHERE id = id', 'postgres'],
    ['DELETE FROM users WHERE id = 5 OR 1 = 1', 'postgres'],
    ['DELETE FROM users WHERE (id = 5 OR true)', 'postgres'],
    ['DELETE FROM users WHERE NOT false', 'postgres'],
    ['DELETE FROM users WHERE EXISTS (SELECT 1)', 'postgres']
  ] as const)('%p needs confirmation in %s', (sql, dialect) => {
    expect(getSqlConfirmationReason(sql, dialect)).toBeString();
  });

  // Text the server can read differently from the lexer: confirmation, whatever the statement says.
  test.each([
    ["SELECT '\\'; DELETE FROM users; SELECT '\\'", 'postgres'],
    ["SELECT '\\'; DELETE FROM users; SELECT '\\'", 'mysql'],
    ["SELECT 'unterminated", 'postgres'],
    ['SELECT 1 /* unterminated', 'mysql'],
    ['SELECT 1 /*! , (DELETE FROM users) */', 'mysql'],
    ['SELECT $$ unterminated', 'postgres']
  ] as const)('%p is not readable with certainty in %s', (sql, dialect) => {
    expect(getSqlConfirmationReason(sql, dialect)).toContain('cannot read this SQL with certainty');
  });

  test.each([
    ['SELECT count(*) FROM users', 'postgres'],
    ["-- how many\nSELECT * FROM users WHERE note = 'delete from users'", 'postgres'],
    ["INSERT INTO users (note) VALUES ('drop table users')", 'postgres'],
    ['INSERT INTO users VALUES (1) ON CONFLICT (id) DO NOTHING', 'postgres'],
    ['INSERT INTO users (id, created) VALUES (1, now()) RETURNING id', 'postgres'],
    ['CREATE TABLE orders (id int, user_id int REFERENCES users(id) ON DELETE CASCADE)', 'postgres'],
    ['CREATE UNIQUE INDEX IF NOT EXISTS users_note ON users (lower(note))', 'postgres'],
    ['UPDATE ident SET note$where = 1 WHERE id = 2', 'postgres'],
    ['DELETE FROM users WHERE id = 5 OR note = $1', 'postgres'],
    ['DELETE FROM users WHERE created BETWEEN 1 AND 2', 'mysql'],
    ['DELETE FROM users WHERE true AND id = 3', 'postgres'],
    ["SELECT count(*)::int AS n, replace(note, 'a', 'b') FROM users", 'postgres'],
    ["CREATE TABLE users (id int, note text); INSERT INTO users VALUES (1, 'one')", 'postgres'],
    ["UPDATE users SET note = 'x' WHERE id = 1", 'mysql'],
    ['DELETE FROM users WHERE id IN (SELECT id FROM other)', 'postgres'],
    ['SELECT 1--1', 'mysql'],
    ["SELECT E'it\\'s'", 'postgres'],
    ['SELECT "a""b" FROM `t`', 'mysql']
  ] as const)('%p runs without confirmation in %s', (sql, dialect) => {
    expect(getSqlConfirmationReason(sql, dialect)).toBeUndefined();
  });

  test('names the bulk change it found', () => {
    expect(getSqlConfirmationReason('-- tidy up\nDELETE FROM users', 'postgres')).toBe(
      'DELETE without WHERE clause will delete all rows'
    );
    expect(getSqlConfirmationReason('ALTER TABLE users DROP COLUMN note', 'postgres')).toContain('ALTER');
    expect(getSqlConfirmationReason('CREATE OR REPLACE VIEW v AS SELECT 1', 'postgres')).toContain('OR REPLACE');
  });
});

describe('read-only SQL', () => {
  test('a statement is read-only only when every dialect reads it as one read', () => {
    expect(isDefinitelyReadOnlySql('-- comment\nSELECT 1')).toBe(true);
    expect(isDefinitelyReadOnlySql("SELECT 'a;b' AS text")).toBe(true);
    // PostgreSQL treats `#` as an operator, so the rest of the line is code there.
    expect(isDefinitelyReadOnlySql('SELECT 1 # 2; DELETE FROM users')).toBe(false);
    // MySQL reads `--1` as minus minus one, so the statement after it is code there.
    expect(isDefinitelyReadOnlySql('SELECT 1 --1; DELETE FROM users', 'mysql')).toBe(false);
    expect(isDefinitelyReadOnlySql("SELECT $$'$$; DELETE FROM users; SELECT '$$'", 'postgres')).toBe(false);
    expect(isDefinitelyReadOnlySql('SELECT 1 /*! , 2 */')).toBe(false);
    expect(isDefinitelyReadOnlySql('SELECT * FROM users FOR UPDATE')).toBe(false);
  });

  test('tokenizing drops comments, keeps quoted text out of keywords and splits statements', () => {
    expect(tokenizeSqlStatements('SELECT \'x;y\' /* ; */ FROM "Where"; -- tail\n', 'postgres')).toEqual([
      [
        { kind: 'word', text: 'select' },
        { kind: 'string', text: 'x;y' },
        { kind: 'word', text: 'from' },
        { kind: 'identifier', text: 'Where' }
      ]
    ]);
    expect(tokenizeSqlStatements('SELECT note$where FROM t', 'postgres')?.[0]?.[1]).toEqual({
      kind: 'word',
      text: 'note$where'
    });
  });
});
