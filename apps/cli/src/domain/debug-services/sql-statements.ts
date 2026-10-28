export type SqlDialect = 'postgres' | 'mysql';

const SQL_DIALECTS: SqlDialect[] = ['postgres', 'mysql'];

/**
 * One token of a statement. `word` is an unquoted keyword or identifier, lower-cased; `identifier` is a quoted one
 * (`"name"`, MySQL `` `name` ``), which is never a keyword; `string` is a literal of any quoting.
 */
type SqlToken = {
  kind: 'word' | 'identifier' | 'string' | 'number' | 'parameter' | 'punctuation' | 'operator';
  text: string;
};

const isSpaceOrControl = (character: string) => character.charCodeAt(0) <= 0x20 || /\s/.test(character);
/** PostgreSQL identifiers start with a letter or `_` and may contain `$`; MySQL ones may also start with a digit or `$`. */
const WORD_START = { postgres: /[A-Za-z_\u0080-￿]/, mysql: /[\w$\u0080-￿]/ };
const WORD_CHARACTER = /[\w$\u0080-￿]/;
const DOLLAR_QUOTE_TAG = /^\$(?:[A-Za-z_\u0080-￿][\w\u0080-￿]*)?\$/;
const PUNCTUATION = new Set(['(', ')', ',', ';', '.', '[', ']']);
const OPERATOR_CHARACTER = /[+\-*/<>=~!@#%^&|?:]/;

/**
 * The statements of `sql` as tokens, read the way the dialect's server reads them: PostgreSQL nests block comments,
 * has dollar quotes and allows `$` inside identifiers; MySQL has `#` comments, needs a space after `--` and quotes
 * identifiers with backticks. Comments are dropped, so neither a comment nor a quoted word can change how a statement
 * reads.
 *
 * Returns undefined when the server could read the text differently: an unterminated quote or comment, a MySQL
 * executable comment (`/*! ... *\/` runs its body), a backslash inside a quote whose meaning depends on a server setting
 * (`standard_conforming_strings`, `NO_BACKSLASH_ESCAPES`), or a character the dialect does not use.
 */
export const tokenizeSqlStatements = (sql: string, dialect: SqlDialect): SqlToken[][] | undefined => {
  const isMysql = dialect === 'mysql';
  const statements: SqlToken[][] = [[]];
  const push = (token: SqlToken) => statements[statements.length - 1]!.push(token);
  let index = 0;

  /** The index after the quote that closes at or after `from`, or -1 when it does not close or holds a backslash. */
  const skipQuoted = (from: number, quote: string, backslashEscapes: boolean): number => {
    for (let position = from; position < sql.length; position++) {
      const character = sql[position];
      if (character === '\\') {
        if (!backslashEscapes) {
          // Identifiers never read escapes; in a string, whether a backslash escapes depends on the server.
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
    const character = sql[index]!;
    const next = sql[index + 1];

    if (isSpaceOrControl(character)) {
      index++;
      continue;
    }

    // MySQL reads `--` as a comment only before whitespace or a control character: `1--1` is one minus minus one.
    const isLineComment =
      (character === '-' &&
        next === '-' &&
        (!isMysql || index + 2 >= sql.length || isSpaceOrControl(sql[index + 2]!))) ||
      (isMysql && character === '#');
    if (isLineComment) {
      while (index < sql.length && sql[index] !== '\n' && sql[index] !== '\r') index++;
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
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      if (character === '`' && !isMysql) return undefined;
      const end = skipQuoted(index + 1, character, false);
      if (end < 0) return undefined;
      const isIdentifier = character === '`' || (character === '"' && !isMysql);
      push({ kind: isIdentifier ? 'identifier' : 'string', text: sql.slice(index + 1, end - 1) });
      index = end;
      continue;
    }

    if (character === '$' && !isMysql) {
      const tag = DOLLAR_QUOTE_TAG.exec(sql.slice(index))?.[0];
      if (tag) {
        const end = sql.indexOf(tag, index + tag.length);
        if (end < 0) return undefined;
        push({ kind: 'string', text: sql.slice(index + tag.length, end) });
        index = end + tag.length;
        continue;
      }
      const parameter = /^\$\d+/.exec(sql.slice(index))?.[0];
      if (!parameter) return undefined;
      push({ kind: 'parameter', text: parameter });
      index += parameter.length;
      continue;
    }

    if (WORD_START[dialect].test(character)) {
      let end = index + 1;
      while (end < sql.length && WORD_CHARACTER.test(sql[end]!)) end++;
      const text = sql.slice(index, end);
      // PostgreSQL's E'...' strings always read backslash escapes; N'', B'' and X'' are strings with a prefix.
      if (sql[end] === "'" && /^[ebnx]$/i.test(text)) {
        const close = skipQuoted(end + 1, "'", !isMysql && /^e$/i.test(text));
        if (close < 0) return undefined;
        push({ kind: 'string', text: sql.slice(end + 1, close - 1) });
        index = close;
        continue;
      }
      const isNumber = /^\d+(?:e\d+)?$|^0x[\da-f]+$/i.test(text);
      push({ kind: isNumber ? 'number' : 'word', text: isNumber ? text : text.toLowerCase() });
      index = end;
      continue;
    }

    if (/\d/.test(character)) {
      let end = index + 1;
      while (end < sql.length && /[\w.]/.test(sql[end]!)) end++;
      push({ kind: 'number', text: sql.slice(index, end) });
      index = end;
      continue;
    }

    if (PUNCTUATION.has(character)) {
      if (character === ';') statements.push([]);
      else push({ kind: 'punctuation', text: character });
      index++;
      continue;
    }

    if (OPERATOR_CHARACTER.test(character)) {
      let end = index + 1;
      while (end < sql.length && OPERATOR_CHARACTER.test(sql[end]!) && !(sql[end] === '-' && sql[end + 1] === '-')) {
        end++;
      }
      push({ kind: 'operator', text: sql.slice(index, end) });
      index = end;
      continue;
    }

    return undefined;
  }

  return statements.filter((statement) => statement.length > 0);
};

const isWord = (token: SqlToken | undefined, ...words: string[]) =>
  token?.kind === 'word' && (words.length === 0 || words.includes(token.text));
const isPunctuation = (token: SqlToken | undefined, text: string) =>
  token?.kind === 'punctuation' && token.text === text;
const isCall = (tokens: SqlToken[], index: number) => isPunctuation(tokens[index + 1], '(');

const READ_ONLY_KEYWORDS = new Set(['select', 'show', 'describe', 'desc', 'explain', 'with', 'values']);

/** Words that change data or state wherever they appear in a read; `replace(` is a string function, not a statement. */
const MUTATING_WORDS = new Set(
  `insert update delete merge replace truncate alter drop create grant revoke call execute copy load lock set reset
  refresh reindex cluster comment listen notify unlisten vacuum handler rename`.split(/\s+/)
);
const TRANSACTION_WORDS = new Set(['begin', 'commit', 'rollback', 'savepoint', 'deallocate']);
const SIDE_EFFECT_FUNCTIONS = new Set(
  `nextval setval set_config pg_advisory_lock pg_advisory_unlock pg_advisory_unlock_all pg_advisory_xact_lock
  pg_try_advisory_lock pg_try_advisory_xact_lock pg_cancel_backend pg_terminate_backend pg_reload_conf
  pg_rotate_logfile pg_create_restore_point pg_switch_wal dblink_exec lo_import lo_export get_lock release_lock
  benchmark sleep`.split(/\s+/)
);

/** Whether a statement only reads, by its syntax. A function can still write; the database enforces read-only. */
const isReadOnlyStatement = (tokens: SqlToken[]): boolean => {
  const first = tokens[0];
  if (first?.kind !== 'word' || !READ_ONLY_KEYWORDS.has(first.text)) return false;
  for (const [index, token] of tokens.entries()) {
    if (token.kind !== 'word') continue;
    const next = tokens[index + 1];
    if (TRANSACTION_WORDS.has(token.text)) return false;
    if (isWord(token, 'start', 'prepare') && isWord(next, 'transaction')) return false;
    if (isWord(token, 'release') && isWord(next, 'savepoint')) return false;
    // FOR UPDATE, FOR NO KEY UPDATE, FOR SHARE and FOR KEY SHARE take row locks.
    if (isWord(token, 'for') && tokens.slice(index + 1, index + 4).some((later) => isWord(later, 'update', 'share'))) {
      return false;
    }
    if (SIDE_EFFECT_FUNCTIONS.has(token.text) && isCall(tokens, index)) return false;
  }
  // SHOW CREATE TABLE and similar metadata statements are read-only even though their grammar contains words that
  // are mutating in other statement positions.
  if (isWord(first, 'show', 'describe', 'desc', 'values')) return true;
  return !tokens.some(
    (token, index) =>
      token.kind === 'word' &&
      ((MUTATING_WORDS.has(token.text) && !(token.text === 'replace' && isCall(tokens, index))) ||
        token.text === 'into')
  );
};

/**
 * Conservative, syntax-only check used before a diagnostic query reaches a database: one statement that only reads.
 * Without a dialect, the SQL must read as such in both PostgreSQL and MySQL. The database client still runs accepted
 * SQL in a read-only transaction; this check keeps obviously mutating statements out and lets MCP avoid prompting for
 * ordinary reads.
 */
export const isDefinitelyReadOnlySql = (sql: string, dialect?: SqlDialect): boolean =>
  (dialect ? [dialect] : SQL_DIALECTS).every((candidate) => {
    const statements = tokenizeSqlStatements(sql, candidate);
    return statements?.length === 1 && isReadOnlyStatement(statements[0]!);
  });

/** Functions that only compute a value: a statement that calls them changes nothing through them. */
const PURE_FUNCTIONS = new Set(
  `count sum avg min max coalesce nullif greatest least ifnull if isnull lower upper initcap length char_length
  character_length octet_length bit_length trim ltrim rtrim btrim substring substr mid left right lpad rpad concat
  concat_ws replace repeat reverse position strpos locate instr split_part format md5 sha1 sha2 encode decode
  regexp_replace regexp_like regexp_substr starts_with to_char to_date to_timestamp to_number date_trunc date_part
  extract age now current_timestamp current_date localtimestamp make_date make_timestamp date_format datediff
  date_add date_sub timestampdiff timestampadd unix_timestamp from_unixtime str_to_date abs ceil ceiling floor round
  trunc mod power pow sqrt exp ln log log10 sign pi random rand cast convert json_build_object jsonb_build_object
  json_build_array jsonb_build_array json_agg jsonb_agg json_object_agg jsonb_object_agg to_json to_jsonb
  json_extract json_unquote json_object json_array json_arrayagg json_objectagg jsonb_array_length json_array_length
  jsonb_typeof jsonb_pretty jsonb_set jsonb_insert array_agg string_agg group_concat array_length array_to_string
  string_to_array unnest generate_series row_number rank dense_rank percent_rank cume_dist ntile lag lead
  first_value last_value nth_value bool_and bool_or every pg_typeof gen_random_uuid uuid uuid_generate_v4 version
  current_database current_schema current_user database schema user`.split(/\s+/)
);

/** Keywords and type names that a parenthesis can follow without a function call. */
const NOT_CALLS = new Set(
  `select from where and or not in exists any some all values cast over filter within row array as on using join by
  when then else case set into table index group order having limit offset union intersect except distinct with
  returning recursive lateral is null like ilike between key primary references check unique default constraint conflict
  foreign partition window rows range numeric decimal varchar char character int integer bigint smallint tinyint
  float double real timestamp timestamptz date time interval text boolean bool json jsonb uuid bit varbinary binary
  enum`.split(/\s+/)
);

/** Whether a statement calls a function that may write, such as one the application defined. */
const callsUnknownFunction = (tokens: SqlToken[], skip: ReadonlySet<number> = new Set()) =>
  tokens.some(
    (token, index) =>
      !skip.has(index) &&
      token.kind === 'word' &&
      isCall(tokens, index) &&
      !PURE_FUNCTIONS.has(token.text) &&
      !NOT_CALLS.has(token.text)
  );

/**
 * Whether a write also writes somewhere else: a second write keyword after its own verb (an upsert's DO UPDATE, a
 * nested DELETE), a CTE, or a MySQL REPLACE. `ignored` positions are part of the statement's own grammar.
 */
const writesElsewhere = (tokens: SqlToken[], ignored: ReadonlySet<number> = new Set()) =>
  tokens.some(
    (token, index) =>
      index > 0 &&
      !ignored.has(index) &&
      token.kind === 'word' &&
      ((MUTATING_WORDS.has(token.text) &&
        token.text !== 'set' &&
        !(token.text === 'replace' && isCall(tokens, index))) ||
        token.text === 'with')
  );

/** Words that are no column: a condition made of them only is the same for every row. */
const CONDITION_KEYWORDS = new Set(
  'and or not is null true false unknown in like ilike between exists any some all select from where case when then else end cast as'.split(
    ' '
  )
);

/** The parts of `tokens` between the `word`s at their own parenthesis level; the AND of a BETWEEN does not split. */
const splitAtTopLevel = (tokens: SqlToken[], word: 'and' | 'or'): SqlToken[][] => {
  const parts: SqlToken[][] = [[]];
  let depth = 0;
  let between = false;
  for (const token of tokens) {
    if (isPunctuation(token, '(')) depth++;
    else if (isPunctuation(token, ')')) depth--;
    if (depth === 0 && isWord(token, 'between')) between = true;
    if (depth === 0 && isWord(token, word) && !(word === 'and' && between)) {
      parts.push([]);
      continue;
    }
    if (depth === 0 && between && isWord(token, 'and')) between = false;
    parts[parts.length - 1]!.push(token);
  }
  return parts;
};

/** `tokens` without parentheses that enclose all of them. */
const unwrap = (tokens: SqlToken[]): SqlToken[] => {
  while (isPunctuation(tokens[0], '(') && isPunctuation(tokens[tokens.length - 1], ')')) {
    let depth = 0;
    const closesAtEnd = tokens.every((token, index) => {
      if (isPunctuation(token, '(')) depth++;
      else if (isPunctuation(token, ')')) depth--;
      return depth > 0 || index === tokens.length - 1;
    });
    if (!closesAtEnd) break;
    tokens = tokens.slice(1, -1);
  }
  return tokens;
};

/**
 * Whether a condition can be false for some rows. An OR restricts only when every branch does, an AND when any part
 * does, and a single comparison when it refers to a column and does not compare an expression with itself:
 * `true`, `1 = 1`, `id = id` and `id = 5 OR 1 = 1` hold for every row.
 */
const isRestrictive = (condition: SqlToken[]): boolean => {
  const tokens = unwrap(condition);
  if (tokens.length === 0) return false;
  const branches = splitAtTopLevel(tokens, 'or');
  if (branches.length > 1) return branches.every(isRestrictive);
  const parts = splitAtTopLevel(tokens, 'and');
  if (parts.length > 1) return parts.some(isRestrictive);
  if (isWord(tokens[0], 'not')) return isRestrictive(tokens.slice(1));
  const refersToColumn = tokens.some(
    (token, index) =>
      token.kind === 'identifier' ||
      (token.kind === 'word' && !CONDITION_KEYWORDS.has(token.text) && !isCall(tokens, index))
  );
  const [left, operator, right, ...rest] = tokens;
  const comparesWithItself =
    rest.length === 0 && operator?.kind === 'operator' && left?.kind === right?.kind && left?.text === right?.text;
  return refersToColumn && !comparesWithItself;
};

/** Why an UPDATE or DELETE can change every row, or undefined when its own WHERE clause restricts it. */
const getUnrestrictedReason = (tokens: SqlToken[], verb: 'UPDATE' | 'DELETE'): string | undefined => {
  const effect = verb === 'UPDATE' ? 'will modify all rows' : 'will delete all rows';
  let depth = 0;
  const depths = tokens.map((token) => {
    if (isPunctuation(token, ')')) depth--;
    const at = depth;
    if (isPunctuation(token, '(')) depth++;
    return at;
  });
  const where = tokens.findIndex((token, index) => depths[index] === 0 && isWord(token, 'where'));
  if (where < 0) return `${verb} without WHERE clause ${effect}`;
  const end = tokens.findIndex(
    (token, index) => index > where && depths[index] === 0 && isWord(token, 'returning', 'order', 'limit')
  );
  const condition = tokens.slice(where + 1, end < 0 ? undefined : end);
  return isRestrictive(condition) ? undefined : `${verb} whose WHERE clause matches every row ${effect}`;
};

/** `INSERT [IGNORE] INTO name [(columns)] VALUES (...)`: the target name is not a call. */
const getInsertReason = (tokens: SqlToken[]): string | undefined => {
  const into = tokens.findIndex((token) => isWord(token, 'into'));
  const values = tokens.findIndex((token) => isWord(token, 'values'));
  if (into < 0 || values < 0 || tokens.some((token) => isWord(token, 'select'))) {
    return 'Stacktape cannot tell what an INSERT without a VALUES list writes';
  }
  const target = new Set([into + 1, ...(isPunctuation(tokens[into + 2], '.') ? [into + 3] : [])]);
  if (writesElsewhere(tokens) || callsUnknownFunction(tokens, target)) {
    return 'This INSERT also updates rows or calls a function that can change data';
  }
  return undefined;
};

/** `CREATE TABLE name (columns)` and `CREATE INDEX`: new objects that change no data. */
const getCreateReason = (tokens: SqlToken[]): string | undefined => {
  if (isWord(tokens[1], 'or')) return 'CREATE OR REPLACE replaces an existing database object';
  const kind = tokens
    .slice(1)
    .find((token) => !isWord(token, 'temp', 'temporary', 'unlogged', 'global', 'local', 'unique'));
  // A foreign key's ON DELETE / ON UPDATE action is part of the table's definition, not a write.
  const referentialActions = new Set(
    tokens.flatMap((token, index) =>
      isWord(tokens[index - 1], 'on') && isWord(token, 'delete', 'update') ? [index] : []
    )
  );
  const plain =
    !tokens.some((token) => isWord(token, 'as', 'select', 'replace')) && !writesElsewhere(tokens, referentialActions);
  if (plain && isWord(kind, 'table', 'index')) return undefined;
  return `Stacktape cannot tell what this CREATE ${kind?.kind === 'word' ? `${kind.text.toUpperCase()} ` : ''}statement changes`;
};

/** Why one statement needs confirmation, or undefined for one Stacktape fully understands that cannot change data in bulk. */
const getStatementConfirmationReason = (tokens: SqlToken[]): string | undefined => {
  if (isReadOnlyStatement(tokens)) {
    return callsUnknownFunction(tokens) ? 'This statement calls a function that can change data' : undefined;
  }
  const keyword = tokens[0]?.kind === 'word' ? tokens[0].text : undefined;
  switch (keyword) {
    case 'insert':
      return getInsertReason(tokens);
    case 'update':
    case 'delete':
      if (writesElsewhere(tokens) || callsUnknownFunction(tokens)) {
        return `This ${keyword.toUpperCase()} also writes elsewhere or calls a function that can change data`;
      }
      return getUnrestrictedReason(tokens, keyword === 'update' ? 'UPDATE' : 'DELETE');
    case 'create':
      return getCreateReason(tokens);
    case 'drop':
      return 'DROP statement will permanently delete database objects';
    case 'truncate':
      return 'TRUNCATE will delete all rows from the table';
    default:
      return `Stacktape cannot tell how much a ${keyword ? keyword.toUpperCase() : 'statement of this kind'} statement changes`;
  }
};

/**
 * Why `sql` needs confirmation before it runs on a writable database, or undefined when it does not. Fails closed:
 * only statements Stacktape fully understands run without it: reads that call no function that could write,
 * `INSERT ... VALUES`, `CREATE TABLE` with column definitions, `CREATE INDEX`, and UPDATE or DELETE whose top-level
 * WHERE clause can be false for some rows. A writable CTE, a nested write, `CREATE ... AS`, `EXPLAIN ANALYZE`, `DO`
 * and anything the tokenizer cannot read with certainty need it. Every statement of a batch is judged.
 */
export const getSqlConfirmationReason = (sql: string, dialect: SqlDialect): string | undefined => {
  const statements = tokenizeSqlStatements(sql, dialect);
  if (!statements) {
    return 'Stacktape cannot read this SQL with certainty: it has an unterminated quote or comment, a backslash inside a quoted string, or a MySQL executable comment';
  }
  for (const statement of statements) {
    const reason = getStatementConfirmationReason(statement);
    if (reason) return reason;
  }
  return undefined;
};
