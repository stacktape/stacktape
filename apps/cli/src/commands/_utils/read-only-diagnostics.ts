const READ_ONLY_SQL_KEYWORDS = new Set(['select', 'show', 'describe', 'explain', 'with', 'values']);

const replaceSqlStringsAndComments = (sql: string): string => {
  let result = '';
  let index = 0;
  let mode: 'plain' | 'single-quote' | 'double-quote' | 'backtick' | 'line-comment' | 'block-comment' = 'plain';

  while (index < sql.length) {
    const character = sql[index];
    const next = sql[index + 1];

    if (mode === 'plain') {
      if (character === "'") mode = 'single-quote';
      else if (character === '"') mode = 'double-quote';
      else if (character === '`') mode = 'backtick';
      else if (character === '-' && next === '-') mode = 'line-comment';
      else if (character === '/' && next === '*') mode = 'block-comment';
      else result += character;
    } else if (mode === 'line-comment') {
      if (character === '\n' || character === '\r') {
        mode = 'plain';
        result += character;
      }
    } else if (mode === 'block-comment') {
      if (character === '*' && next === '/') {
        mode = 'plain';
        index += 1;
      }
    } else {
      const quote = mode === 'single-quote' ? "'" : mode === 'double-quote' ? '"' : '`';
      if (character === '\\') {
        index += 1;
      } else if (character === quote && next === quote) {
        index += 1;
      } else if (character === quote) {
        mode = 'plain';
      }
    }

    result += mode === 'plain' ? '' : ' ';
    index += 1;
  }

  return result;
};

const MUTATING_SQL_TOKEN =
  /\b(?:insert|update|delete|merge|replace|truncate|alter|drop|create|grant|revoke|call|execute|copy|load|lock|set|reset|refresh|reindex|cluster|comment|listen|notify|unlisten|vacuum)\b/i;
const TRANSACTION_CONTROL_SQL =
  /\b(?:begin|commit|rollback|savepoint|deallocate)\b|\bstart\s+transaction\b|\bprepare\s+transaction\b|\brelease\s+savepoint\b/i;
const LOCKING_READ_SQL = /\bfor\s+(?:(?:no\s+key|key)\s+)?(?:update|share)\b|\block\s+in\s+share\s+mode\b/i;
const SIDE_EFFECT_SQL_FUNCTION =
  /\b(?:nextval|setval|set_config|pg_advisory_(?:lock|unlock|unlock_all|xact_lock)|pg_try_advisory_(?:lock|xact_lock)|pg_(?:cancel|terminate)_backend|pg_reload_conf|pg_rotate_logfile|pg_create_restore_point|pg_switch_wal|dblink_exec|lo_import|lo_export|get_lock|release_lock|benchmark|sleep)\s*\(/i;

/**
 * Conservative, syntax-only check used before a diagnostic query reaches a database.
 * The database client still runs accepted SQL in a read-only transaction; this check
 * keeps obviously mutating statements out and lets MCP avoid prompting for ordinary reads.
 */
export const isDefinitelyReadOnlySql = (sql: string): boolean => {
  // MySQL executes the body of versioned comments (`/*! ... */`) instead of
  // treating it as a comment, so it cannot be safely discarded by this scanner.
  if (/\/\*!/.test(sql)) return false;
  const normalized = replaceSqlStringsAndComments(sql).trim().toLowerCase();
  const firstKeyword = normalized.match(/^[a-z]+/)?.[0];
  if (!firstKeyword || !READ_ONLY_SQL_KEYWORDS.has(firstKeyword)) return false;

  const withoutTrailingTerminators = normalized.replace(/;+\s*$/, '');
  if (withoutTrailingTerminators.includes(';')) return false;
  if (TRANSACTION_CONTROL_SQL.test(normalized)) return false;
  if (LOCKING_READ_SQL.test(normalized)) return false;
  if (SIDE_EFFECT_SQL_FUNCTION.test(normalized)) return false;
  // SHOW CREATE TABLE and similar metadata statements are read-only even though
  // their grammar contains words that are mutating in other statement positions.
  if (firstKeyword === 'show' || firstKeyword === 'describe' || firstKeyword === 'values') return true;

  if (MUTATING_SQL_TOKEN.test(normalized)) return false;
  if (/\bselect\b[\s\S]*\binto\b/i.test(normalized)) return false;

  return true;
};
