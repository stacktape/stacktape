import { describe, expect, test } from 'bun:test';
import { getSqlConfirmationReason, isDefinitelyReadOnlySql, lexSqlStatements } from './sql-statements';

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
    ["SELECT 1; DELETE FROM users WHERE note = ';'; TRUNCATE users", 'postgres']
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
    ['INSERT INTO users VALUES (1) ON CONFLICT (id) DO UPDATE SET note = excluded.note', 'postgres'],
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

  test('lexing removes comments and quoted text and splits statements', () => {
    expect(lexSqlStatements("SELECT 'x;y' /* ; */ FROM t; -- tail\n", 'postgres')).toEqual(['select  _    from t']);
  });
});
