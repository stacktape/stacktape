export type SqlDialect = 'postgres' | 'mysql';

const SQL_DIALECTS: SqlDialect[] = ['postgres', 'mysql'];

const IDENTIFIER_CHARACTER = /[\w$\u0080-￿]/;
const isSpaceOrControl = (character: string) => character.charCodeAt(0) <= 0x20 || /\s/.test(character);
const DOLLAR_QUOTE_TAG = /^\$(?:[A-Za-z_\u0080-￿][\w\u0080-￿]*)?\$/;

/**
 * The statements of `sql` with comments removed and every quoted string or identifier replaced by `_`, lower-cased, so
 * a keyword inside a comment or a literal cannot change how a statement reads. Lexes the way the dialect's server
 * does: PostgreSQL nests block comments and has dollar quotes; MySQL has `#` comments and needs a space after `--`.
 *
 * Returns undefined when the server could read the text differently: an unterminated quote or comment, a MySQL
 * executable comment (`/*! ... *\/` runs its body), or a backslash inside a quote whose meaning depends on a server
 * setting (`standard_conforming_strings`, `NO_BACKSLASH_ESCAPES`).
 */
export const lexSqlStatements = (sql: string, dialect: SqlDialect): string[] | undefined => {
  let lexed = '';
  let index = 0;
  const isMysql = dialect === 'mysql';

  /** The index after the quote closing at `from`, or -1 when it does not close or holds a backslash. */
  const skipQuoted = (from: number, quote: string, backslashEscapes: boolean): number => {
    for (let position = from; position < sql.length; position++) {
      const character = sql[position];
      if (character === '\\') {
        if (!backslashEscapes) {
          if (quote === '`' || (quote === '"' && !isMysql)) continue;
          return -1;
        }
        position++;
      } else if (character === quote) {
        if (sql[position + 1] === quote) position++;
        else return position + 1;
      }
    }
    return -1;
  };

  while (index < sql.length) {
    const character = sql[index];
    const next = sql[index + 1];
    const previous = index > 0 ? sql[index - 1] : '';

    // MySQL reads `--` as a comment only before whitespace or a control character: `1--1` is one minus minus one.
    const isLineComment =
      (character === '-' &&
        next === '-' &&
        (!isMysql || index + 2 >= sql.length || isSpaceOrControl(sql[index + 2]))) ||
      (isMysql && character === '#');
    if (isLineComment) {
      while (index < sql.length && sql[index] !== '\n' && sql[index] !== '\r') index++;
      lexed += ' ';
      continue;
    }

    if (character === '/' && next === '*') {
      if (isMysql && /^\/\*M?!/.test(sql.slice(index, index + 4))) return undefined;
      let depth = 1;
      let position = index + 2;
      while (position < sql.length && depth > 0) {
        if (sql[position] === '*' && sql[position + 1] === '/') {
          depth--;
          position += 2;
        } else if (!isMysql && sql[position] === '/' && sql[position + 1] === '*') {
          depth++;
          position += 2;
        } else {
          position++;
        }
      }
      if (depth > 0) return undefined;
      index = position;
      lexed += ' ';
      continue;
    }

    if (character === "'" || character === '"' || (isMysql && character === '`')) {
      // PostgreSQL's E'...' strings always read backslash escapes; its standard strings and identifiers never do.
      const isEscapeString =
        !isMysql &&
        character === "'" &&
        /e/i.test(previous) &&
        !(index > 1 && IDENTIFIER_CHARACTER.test(sql[index - 2]));
      const end = skipQuoted(index + 1, character, isEscapeString);
      if (end < 0) return undefined;
      index = end;
      lexed += ' _ ';
      continue;
    }

    if (!isMysql && character === '$' && !IDENTIFIER_CHARACTER.test(previous)) {
      const tag = DOLLAR_QUOTE_TAG.exec(sql.slice(index))?.[0];
      if (tag) {
        const end = sql.indexOf(tag, index + tag.length);
        if (end < 0) return undefined;
        index = end + tag.length;
        lexed += ' _ ';
        continue;
      }
    }

    lexed += character;
    index++;
  }

  return lexed
    .toLowerCase()
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
};

const READ_ONLY_SQL_KEYWORDS = new Set(['select', 'show', 'describe', 'explain', 'with', 'values']);

const MUTATING_SQL_TOKEN =
  /\b(?:insert|update|delete|merge|replace|truncate|alter|drop|create|grant|revoke|call|execute|copy|load|lock|set|reset|refresh|reindex|cluster|comment|listen|notify|unlisten|vacuum)\b/i;
const TRANSACTION_CONTROL_SQL =
  /\b(?:begin|commit|rollback|savepoint|deallocate)\b|\bstart\s+transaction\b|\bprepare\s+transaction\b|\brelease\s+savepoint\b/i;
const LOCKING_READ_SQL = /\bfor\s+(?:(?:no\s+key|key)\s+)?(?:update|share)\b|\block\s+in\s+share\s+mode\b/i;
const SIDE_EFFECT_SQL_FUNCTION =
  /\b(?:nextval|setval|set_config|pg_advisory_(?:lock|unlock|unlock_all|xact_lock)|pg_try_advisory_(?:lock|xact_lock)|pg_(?:cancel|terminate)_backend|pg_reload_conf|pg_rotate_logfile|pg_create_restore_point|pg_switch_wal|dblink_exec|lo_import|lo_export|get_lock|release_lock|benchmark|sleep)\s*\(/i;

const firstKeyword = (statement: string) => statement.match(/^[a-z]+/)?.[0];

/** Whether one lexed statement only reads. */
const isReadOnlyStatement = (statement: string): boolean => {
  const keyword = firstKeyword(statement);
  if (!keyword || !READ_ONLY_SQL_KEYWORDS.has(keyword)) return false;
  if (TRANSACTION_CONTROL_SQL.test(statement)) return false;
  if (LOCKING_READ_SQL.test(statement)) return false;
  if (SIDE_EFFECT_SQL_FUNCTION.test(statement)) return false;
  // SHOW CREATE TABLE and similar metadata statements are read-only even though
  // their grammar contains words that are mutating in other statement positions.
  if (keyword === 'show' || keyword === 'describe' || keyword === 'values') return true;
  if (MUTATING_SQL_TOKEN.test(statement)) return false;
  if (/\bselect\b[\s\S]*\binto\b/i.test(statement)) return false;
  return true;
};

/**
 * Conservative, syntax-only check used before a diagnostic query reaches a database: one statement that only reads.
 * Without a dialect, the SQL must read as such in both PostgreSQL and MySQL. The database client still runs accepted
 * SQL in a read-only transaction; this check keeps obviously mutating statements out and lets MCP avoid prompting for
 * ordinary reads.
 */
export const isDefinitelyReadOnlySql = (sql: string, dialect?: SqlDialect): boolean =>
  (dialect ? [dialect] : SQL_DIALECTS).every((candidate) => {
    const statements = lexSqlStatements(sql, candidate);
    return statements?.length === 1 && isReadOnlyStatement(statements[0]);
  });

/** Whether a lexed statement has a WHERE clause of its own, not one inside a subquery. */
const hasTopLevelWhere = (statement: string): boolean => {
  let depth = 0;
  for (const token of statement.matchAll(/[()]|\bwhere\b/g)) {
    if (token[0] === '(') depth++;
    else if (token[0] === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) return true;
  }
  return false;
};

/** Why one lexed statement needs confirmation, or undefined for a read or a write that cannot change data in bulk. */
const getStatementConfirmationReason = (statement: string): string | undefined => {
  if (isReadOnlyStatement(statement)) return undefined;
  const keyword = firstKeyword(statement);
  switch (keyword) {
    case 'insert':
      return undefined;
    case 'create':
      return /^create\s+or\s+replace\b/.test(statement)
        ? 'CREATE OR REPLACE replaces an existing database object'
        : undefined;
    case 'update':
      return hasTopLevelWhere(statement) ? undefined : 'UPDATE without WHERE clause will modify all rows';
    case 'delete':
      return hasTopLevelWhere(statement) ? undefined : 'DELETE without WHERE clause will delete all rows';
    case 'drop':
      return 'DROP statement will permanently delete database objects';
    case 'truncate':
      return 'TRUNCATE will delete all rows from the table';
    default:
      return `Stacktape cannot tell how much a ${keyword ? keyword.toUpperCase() : 'statement of this kind'} statement changes`;
  }
};

/**
 * Why `sql` needs confirmation before it runs on a writable database, or undefined when it does not. Fails closed: only
 * reads, inserts, CREATE without OR REPLACE, and UPDATE or DELETE with a WHERE clause of their own run without it.
 * Every statement of a batch is judged, and SQL the lexer cannot read with certainty always needs it.
 */
export const getSqlConfirmationReason = (sql: string, dialect: SqlDialect): string | undefined => {
  const statements = lexSqlStatements(sql, dialect);
  if (!statements) {
    return 'Stacktape cannot read this SQL with certainty: it has an unterminated quote or comment, a backslash inside a quoted string, or a MySQL executable comment';
  }
  for (const statement of statements) {
    const reason = getStatementConfirmationReason(statement);
    if (reason) return reason;
  }
  return undefined;
};
