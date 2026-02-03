import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { Client as PgClient } from 'pg';
import { createConnection, type Connection as MysqlConnection } from 'mysql2/promise';
import Redis from 'ioredis';

// Common response types
type BaseResponse = { ok: boolean; hint?: string };
type SuccessResponse<T> = BaseResponse & { ok: true } & T;
type ErrorResponse = BaseResponse & { ok: false; error: string; code?: string };

// SQL response types
export type SqlQueryResponse =
  | SuccessResponse<{
      rows: Record<string, unknown>[];
      fields: string[];
      rowCount: number;
      truncated: boolean;
    }>
  | ErrorResponse;

type TableSchema = {
  columns: Array<{ name: string; type: string; nullable: boolean; default: string | null }>;
  primaryKey: string[];
  foreignKeys: Array<{ columns: string[]; references: { table: string; columns: string[] } }>;
  indexes: Array<{ name: string; columns: string[]; unique: boolean }>;
};

export type SqlSchemaResponse =
  | SuccessResponse<{
      tables: Record<string, TableSchema>;
    }>
  | ErrorResponse;

export type SqlTablesResponse =
  | SuccessResponse<{
      tables: string[];
    }>
  | ErrorResponse;

export type SqlExplainResponse =
  | SuccessResponse<{
      plan: string;
    }>
  | ErrorResponse;

export type SqlIndexesResponse =
  | SuccessResponse<{
      indexes: Array<{ name: string; table: string; columns: string[]; unique: boolean }>;
    }>
  | ErrorResponse;

export type SqlStatsResponse =
  | SuccessResponse<{
      stats: Record<string, { rowCount: number; sizeBytes?: number }>;
    }>
  | ErrorResponse;

export type SqlSampleResponse = SqlQueryResponse;

// Redis response types
export type RedisCommandResponse =
  | SuccessResponse<{
      result: unknown;
      type: string;
    }>
  | ErrorResponse;

export type RedisKeysResponse =
  | SuccessResponse<{
      keys: string[];
      count: number;
      truncated: boolean;
      pattern: string;
    }>
  | ErrorResponse;

export type RedisInfoResponse =
  | SuccessResponse<{
      info: Record<string, string>;
    }>
  | ErrorResponse;

// DynamoDB response types
export type DynamoDbQueryResponse =
  | SuccessResponse<{
      items: Record<string, unknown>[];
      count: number;
      scannedCount: number;
      truncated: boolean;
    }>
  | ErrorResponse;

export type DynamoDbItemResponse =
  | SuccessResponse<{
      item: Record<string, unknown> | null;
    }>
  | ErrorResponse;

export type DynamoDbWriteResponse =
  | SuccessResponse<{
      success: true;
    }>
  | ErrorResponse;

export type DynamoDbSchemaResponse =
  | SuccessResponse<{
      table: string;
      keySchema: {
        partitionKey: { name: string; type: string };
        sortKey?: { name: string; type: string };
      };
      gsi: Array<{ name: string; partitionKey: string; sortKey?: string }>;
      lsi: Array<{ name: string; sortKey: string }>;
      attributes: string[];
    }>
  | ErrorResponse;

// OpenSearch response types
export type OpenSearchResponse =
  | SuccessResponse<{
      data: unknown;
    }>
  | ErrorResponse;

// Connection options
export type PostgresConnectionOpts = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

export type MysqlConnectionOpts = PostgresConnectionOpts;

export type RedisConnectionOpts = {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  tlsServername?: string; // For TLS SNI when tunneling
};

export type DynamoDbConnectionOpts = {
  tableName: string;
} & (
  | { mode: 'local'; port: number }
  | {
      mode: 'deployed';
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
    }
);

export type OpenSearchConnectionOpts =
  | { mode: 'local'; port: number }
  | {
      mode: 'deployed';
      endpoint: string;
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
    };

const DEFAULT_LIMIT = 1000;
const DEFAULT_TIMEOUT = 30000;

// Check if a single SQL statement is destructive
const isStatementDestructive = (statement: string): { destructive: boolean; reason?: string } => {
  const stmtLower = statement.toLowerCase().trim();
  if (!stmtLower) return { destructive: false };

  // DROP statements
  if (/^drop\s+(table|database|schema|index|view|function|procedure|trigger)/i.test(stmtLower)) {
    return { destructive: true, reason: 'DROP statement will permanently delete database objects' };
  }

  // TRUNCATE statements
  if (/^truncate\s+/i.test(stmtLower)) {
    return { destructive: true, reason: 'TRUNCATE will delete all rows from the table' };
  }

  // DELETE without WHERE clause
  if (
    /^delete\s+from\s+\S+\s*$/i.test(stmtLower) ||
    (/^delete\s+from\s+/i.test(stmtLower) && !/\bwhere\b/i.test(stmtLower))
  ) {
    return { destructive: true, reason: 'DELETE without WHERE clause will delete all rows' };
  }

  // UPDATE without WHERE clause
  if (/^update\s+\S+\s+set\s+/i.test(stmtLower) && !/\bwhere\b/i.test(stmtLower)) {
    return { destructive: true, reason: 'UPDATE without WHERE clause will modify all rows' };
  }

  return { destructive: false };
};

// Check if SQL contains any destructive operations (handles multi-statement queries)
const isDestructiveSql = (sql: string): { destructive: boolean; reason?: string } => {
  // Split on semicolons, but be careful about semicolons inside strings
  // Simple approach: split on ; and check each part
  // This won't handle all edge cases (like ; inside string literals) but covers most cases
  const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/);

  for (const statement of statements) {
    const result = isStatementDestructive(statement);
    if (result.destructive) {
      return result;
    }
  }

  return { destructive: false };
};

export type SqlQueryOpts = { sql: string; limit?: number; timeout?: number; confirm?: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────

export const postgresQuery = async (conn: PostgresConnectionOpts, opts: SqlQueryOpts): Promise<SqlQueryResponse> => {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
  let client: PgClient | null = null;

  try {
    // Check for destructive operations
    const { destructive, reason } = isDestructiveSql(opts.sql);
    if (destructive && !opts.confirm) {
      return {
        ok: false,
        error: `Destructive SQL operation requires confirmation`,
        code: 'DESTRUCTIVE_OPERATION',
        hint: `${reason}. To proceed, set confirm: true in the request body.`
      } as ErrorResponse;
    }

    client = new PgClient({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectionTimeoutMillis: 5000,
      query_timeout: timeout,
      ssl: conn.ssl
    });

    await client.connect();

    // Wrap query with limit if not already limited
    const sqlLower = opts.sql.toLowerCase();
    const hasLimit = /\blimit\s+\d+/i.test(opts.sql);
    const isSelect = sqlLower.trimStart().startsWith('select');
    const sql = isSelect && !hasLimit ? `${opts.sql} LIMIT ${limit + 1}` : opts.sql;

    const result = await client.query(sql);
    const truncated = isSelect && !hasLimit && result.rows.length > limit;
    const rows = truncated ? result.rows.slice(0, limit) : result.rows;

    return {
      ok: true,
      rows,
      fields: result.fields?.map((f) => f.name) || [],
      rowCount: rows.length,
      truncated,
      ...(truncated && { hint: `Results limited to ${limit} rows. Use LIMIT/OFFSET or increase limit param.` })
    };
  } catch (err: unknown) {
    return postgresError(err, opts.sql);
  } finally {
    if (client) await client.end().catch(() => {});
  }
};

export const postgresSchema = async (
  conn: PostgresConnectionOpts,
  opts?: { tables?: string[] }
): Promise<SqlSchemaResponse> => {
  let client: PgClient | null = null;

  try {
    client = new PgClient({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectionTimeoutMillis: 5000,
      ssl: conn.ssl
    });

    await client.connect();

    const tableFilter = opts?.tables?.length ? `AND c.table_name = ANY($1)` : '';
    const params = opts?.tables?.length ? [opts.tables] : [];

    // Get columns
    const columnsQuery = `
      SELECT c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' ${tableFilter}
      ORDER BY c.table_name, c.ordinal_position
    `;
    const columnsResult = await client.query(columnsQuery, params);

    // Get primary keys
    const pkQuery = `
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' ${tableFilter}
      ORDER BY tc.table_name, kcu.ordinal_position
    `;
    const pkResult = await client.query(pkQuery, params);

    // Get foreign keys
    const fkQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS ref_table,
        ccu.column_name AS ref_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' ${tableFilter}
    `;
    const fkResult = await client.query(fkQuery, params);

    // Get indexes
    const idxQuery = `
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND NOT ix.indisprimary
      ${opts?.tables?.length ? `AND t.relname = ANY($1)` : ''}
      ORDER BY t.relname, i.relname
    `;
    const idxResult = await client.query(idxQuery, params);

    // Build response
    const tables: Record<string, TableSchema> = {};

    for (const row of columnsResult.rows) {
      const tableName = row.table_name;
      if (!tables[tableName]) {
        tables[tableName] = { columns: [], primaryKey: [], foreignKeys: [], indexes: [] };
      }
      tables[tableName].columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      });
    }

    for (const row of pkResult.rows) {
      if (tables[row.table_name]) {
        tables[row.table_name].primaryKey.push(row.column_name);
      }
    }

    // Group foreign keys
    const fkMap = new Map<string, { columns: string[]; refTable: string; refColumns: string[] }>();
    for (const row of fkResult.rows) {
      const key = `${row.table_name}:${row.ref_table}`;
      if (!fkMap.has(key)) {
        fkMap.set(key, { columns: [], refTable: row.ref_table, refColumns: [] });
      }
      const fk = fkMap.get(key)!;
      fk.columns.push(row.column_name);
      fk.refColumns.push(row.ref_column);
    }
    for (const [key, fk] of fkMap) {
      const tableName = key.split(':')[0];
      if (tables[tableName]) {
        tables[tableName].foreignKeys.push({
          columns: fk.columns,
          references: { table: fk.refTable, columns: fk.refColumns }
        });
      }
    }

    // Group indexes
    const idxMap = new Map<string, { table: string; columns: string[]; unique: boolean }>();
    for (const row of idxResult.rows) {
      if (!idxMap.has(row.index_name)) {
        idxMap.set(row.index_name, { table: row.table_name, columns: [], unique: row.is_unique });
      }
      idxMap.get(row.index_name)!.columns.push(row.column_name);
    }
    for (const [name, idx] of idxMap) {
      if (tables[idx.table]) {
        tables[idx.table].indexes.push({ name, columns: idx.columns, unique: idx.unique });
      }
    }

    return { ok: true, tables };
  } catch (err: unknown) {
    return postgresError(err);
  } finally {
    if (client) await client.end().catch(() => {});
  }
};

export const postgresTables = async (conn: PostgresConnectionOpts): Promise<SqlTablesResponse> => {
  let client: PgClient | null = null;

  try {
    client = new PgClient({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectionTimeoutMillis: 5000,
      ssl: conn.ssl
    });

    await client.connect();
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );

    return { ok: true, tables: result.rows.map((r) => r.table_name) };
  } catch (err: unknown) {
    return postgresError(err);
  } finally {
    if (client) await client.end().catch(() => {});
  }
};

export const postgresExplain = async (
  conn: PostgresConnectionOpts,
  opts: { sql: string; analyze?: boolean }
): Promise<SqlExplainResponse> => {
  let client: PgClient | null = null;

  try {
    client = new PgClient({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectionTimeoutMillis: 5000,
      query_timeout: DEFAULT_TIMEOUT,
      ssl: conn.ssl
    });

    await client.connect();
    const explainType = opts.analyze ? 'EXPLAIN ANALYZE' : 'EXPLAIN';
    const result = await client.query(`${explainType} ${opts.sql}`);
    const plan = result.rows.map((r) => r['QUERY PLAN']).join('\n');

    return { ok: true, plan };
  } catch (err: unknown) {
    return postgresError(err, opts.sql);
  } finally {
    if (client) await client.end().catch(() => {});
  }
};

export const postgresIndexes = async (
  conn: PostgresConnectionOpts,
  opts?: { table?: string }
): Promise<SqlIndexesResponse> => {
  let client: PgClient | null = null;

  try {
    client = new PgClient({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectionTimeoutMillis: 5000,
      ssl: conn.ssl
    });

    await client.connect();

    const tableFilter = opts?.table ? `AND t.relname = $1` : '';
    const params = opts?.table ? [opts.table] : [];

    const query = `
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns,
        ix.indisunique AS is_unique
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' ${tableFilter}
      GROUP BY t.relname, i.relname, ix.indisunique
      ORDER BY t.relname, i.relname
    `;

    const result = await client.query(query, params);

    return {
      ok: true,
      indexes: result.rows.map((r) => ({
        name: r.index_name,
        table: r.table_name,
        columns: r.columns,
        unique: r.is_unique
      }))
    };
  } catch (err: unknown) {
    return postgresError(err);
  } finally {
    if (client) await client.end().catch(() => {});
  }
};

export const postgresStats = async (
  conn: PostgresConnectionOpts,
  opts?: { table?: string }
): Promise<SqlStatsResponse> => {
  let client: PgClient | null = null;

  try {
    client = new PgClient({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectionTimeoutMillis: 5000,
      ssl: conn.ssl
    });

    await client.connect();

    const tableFilter = opts?.table ? `AND relname = $1` : '';
    const params = opts?.table ? [opts.table] : [];

    const query = `
      SELECT relname AS table_name, n_live_tup AS row_count, pg_total_relation_size(relid) AS size_bytes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public' ${tableFilter}
      ORDER BY relname
    `;

    const result = await client.query(query, params);

    const stats: Record<string, { rowCount: number; sizeBytes?: number }> = {};
    for (const row of result.rows) {
      stats[row.table_name] = {
        rowCount: Number(row.row_count),
        sizeBytes: Number(row.size_bytes)
      };
    }

    return { ok: true, stats };
  } catch (err: unknown) {
    return postgresError(err);
  } finally {
    if (client) await client.end().catch(() => {});
  }
};

export const postgresSample = async (
  conn: PostgresConnectionOpts,
  opts: { table: string; limit?: number }
): Promise<SqlSampleResponse> => {
  return postgresQuery(conn, { sql: `SELECT * FROM "${opts.table}"`, limit: opts.limit ?? 5 });
};

const postgresError = (err: unknown, query?: string): ErrorResponse => {
  const pgErr = err as { message?: string; code?: string; hint?: string; detail?: string };
  const message = pgErr.message || 'Unknown error';
  const code = pgErr.code;

  let hint = pgErr.hint || pgErr.detail;
  if (code === 'ECONNREFUSED') {
    hint = 'Database may not be running. Check status or restart.';
  } else if (code === '42P01') {
    hint = hint || 'Table does not exist. Use /tables to list available tables.';
  } else if (code === '42703') {
    hint = hint || 'Column does not exist. Use /schema to see table structure.';
  }

  return {
    ok: false,
    error: message,
    ...(code && { code }),
    ...(hint && { hint }),
    ...(query && { query })
  } as ErrorResponse;
};

// ─────────────────────────────────────────────────────────────────────────────
// MySQL
// ─────────────────────────────────────────────────────────────────────────────

export const mysqlQuery = async (conn: MysqlConnectionOpts, opts: SqlQueryOpts): Promise<SqlQueryResponse> => {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  let connection: MysqlConnection | null = null;

  try {
    // Check for destructive operations
    const { destructive, reason } = isDestructiveSql(opts.sql);
    if (destructive && !opts.confirm) {
      return {
        ok: false,
        error: `Destructive SQL operation requires confirmation`,
        code: 'DESTRUCTIVE_OPERATION',
        hint: `${reason}. To proceed, set confirm: true in the request body.`
      } as ErrorResponse;
    }

    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectTimeout: 5000
    });

    const sqlLower = opts.sql.toLowerCase();
    const hasLimit = /\blimit\s+\d+/i.test(opts.sql);
    const isSelect = sqlLower.trimStart().startsWith('select');
    const sql = isSelect && !hasLimit ? `${opts.sql} LIMIT ${limit + 1}` : opts.sql;

    const [rows, fields] = await connection.query(sql);

    if (Array.isArray(rows)) {
      const truncated = isSelect && !hasLimit && rows.length > limit;
      const resultRows = truncated ? rows.slice(0, limit) : rows;

      return {
        ok: true,
        rows: resultRows as Record<string, unknown>[],
        fields: fields?.map((f) => f.name) || [],
        rowCount: resultRows.length,
        truncated,
        ...(truncated && { hint: `Results limited to ${limit} rows. Use LIMIT/OFFSET or increase limit param.` })
      };
    }

    // Non-SELECT (INSERT/UPDATE/DELETE)
    const resultHeader = rows as { affectedRows?: number };
    return {
      ok: true,
      rows: [],
      fields: [],
      rowCount: resultHeader.affectedRows || 0,
      truncated: false
    };
  } catch (err: unknown) {
    return mysqlError(err, opts.sql);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

export const mysqlSchema = async (
  conn: MysqlConnectionOpts,
  opts?: { tables?: string[] }
): Promise<SqlSchemaResponse> => {
  let connection: MysqlConnection | null = null;

  try {
    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectTimeout: 5000
    });

    const escapedTables = opts?.tables?.length ? opts.tables.map((t) => connection!.escape(t)).join(',') : '';

    // Get columns
    const columnFilter = escapedTables ? `AND c.TABLE_NAME IN (${escapedTables})` : '';
    const [columnsRows] = await connection.query(`
      SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT, c.COLUMN_KEY
      FROM information_schema.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() ${columnFilter}
      ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
    `);

    // Get indexes
    const indexFilter = escapedTables ? `AND TABLE_NAME IN (${escapedTables})` : '';
    const [indexRows] = await connection.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() ${indexFilter}
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `);

    // Get foreign keys
    const fkFilter = escapedTables ? `AND TABLE_NAME IN (${escapedTables})` : '';
    const [fkRows] = await connection.query(`
      SELECT
        TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ${fkFilter}
    `);

    const tables: Record<string, TableSchema> = {};

    for (const row of columnsRows as any[]) {
      const tableName = row.TABLE_NAME;
      if (!tables[tableName]) {
        tables[tableName] = { columns: [], primaryKey: [], foreignKeys: [], indexes: [] };
      }
      tables[tableName].columns.push({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        nullable: row.IS_NULLABLE === 'YES',
        default: row.COLUMN_DEFAULT
      });
      if (row.COLUMN_KEY === 'PRI') {
        tables[tableName].primaryKey.push(row.COLUMN_NAME);
      }
    }

    // Group indexes
    const idxMap = new Map<string, { table: string; columns: string[]; unique: boolean }>();
    for (const row of indexRows as any[]) {
      const key = `${row.TABLE_NAME}:${row.INDEX_NAME}`;
      if (row.INDEX_NAME === 'PRIMARY') continue;
      if (!idxMap.has(key)) {
        idxMap.set(key, { table: row.TABLE_NAME, columns: [], unique: row.NON_UNIQUE === 0 });
      }
      idxMap.get(key)!.columns.push(row.COLUMN_NAME);
    }
    for (const [key, idx] of idxMap) {
      const [tableName, indexName] = key.split(':');
      if (tables[tableName]) {
        tables[tableName].indexes.push({ name: indexName, columns: idx.columns, unique: idx.unique });
      }
    }

    // Group foreign keys
    const fkMap = new Map<string, { columns: string[]; refTable: string; refColumns: string[] }>();
    for (const row of fkRows as any[]) {
      const key = `${row.TABLE_NAME}:${row.REFERENCED_TABLE_NAME}`;
      if (!fkMap.has(key)) {
        fkMap.set(key, { columns: [], refTable: row.REFERENCED_TABLE_NAME, refColumns: [] });
      }
      fkMap.get(key)!.columns.push(row.COLUMN_NAME);
      fkMap.get(key)!.refColumns.push(row.REFERENCED_COLUMN_NAME);
    }
    for (const [key, fk] of fkMap) {
      const tableName = key.split(':')[0];
      if (tables[tableName]) {
        tables[tableName].foreignKeys.push({
          columns: fk.columns,
          references: { table: fk.refTable, columns: fk.refColumns }
        });
      }
    }

    return { ok: true, tables };
  } catch (err: unknown) {
    return mysqlError(err);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

export const mysqlTables = async (conn: MysqlConnectionOpts): Promise<SqlTablesResponse> => {
  let connection: MysqlConnection | null = null;

  try {
    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectTimeout: 5000
    });

    const [rows] = await connection.query(`SHOW TABLES`);
    const tables = (rows as any[]).map((r) => Object.values(r)[0] as string);

    return { ok: true, tables };
  } catch (err: unknown) {
    return mysqlError(err);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

export const mysqlExplain = async (
  conn: MysqlConnectionOpts,
  opts: { sql: string; format?: 'traditional' | 'json' | 'tree' }
): Promise<SqlExplainResponse> => {
  let connection: MysqlConnection | null = null;

  try {
    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectTimeout: 5000
    });

    const format = opts.format ? ` FORMAT=${opts.format.toUpperCase()}` : '';
    const [rows] = await connection.query(`EXPLAIN${format} ${opts.sql}`);

    const plan =
      opts.format === 'json'
        ? JSON.stringify(rows, null, 2)
        : (rows as any[]).map((r) => Object.values(r).join('\t')).join('\n');

    return { ok: true, plan };
  } catch (err: unknown) {
    return mysqlError(err, opts.sql);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

export const mysqlIndexes = async (
  conn: MysqlConnectionOpts,
  opts?: { table?: string }
): Promise<SqlIndexesResponse> => {
  let connection: MysqlConnection | null = null;

  try {
    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectTimeout: 5000
    });

    const tableFilter = opts?.table ? `AND TABLE_NAME = ${connection.escape(opts.table)}` : '';

    const [rows] = await connection.query(`
      SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns, NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() ${tableFilter}
      GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
      ORDER BY TABLE_NAME, INDEX_NAME
    `);

    return {
      ok: true,
      indexes: (rows as any[]).map((r) => ({
        name: r.INDEX_NAME,
        table: r.TABLE_NAME,
        columns: r.columns.split(','),
        unique: r.NON_UNIQUE === 0
      }))
    };
  } catch (err: unknown) {
    return mysqlError(err);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

export const mysqlStats = async (conn: MysqlConnectionOpts, opts?: { table?: string }): Promise<SqlStatsResponse> => {
  let connection: MysqlConnection | null = null;

  try {
    connection = await createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      connectTimeout: 5000
    });

    const tableFilter = opts?.table ? `AND TABLE_NAME = ${connection.escape(opts.table)}` : '';

    const [rows] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH + INDEX_LENGTH AS size_bytes
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() ${tableFilter}
      ORDER BY TABLE_NAME
    `);

    const stats: Record<string, { rowCount: number; sizeBytes?: number }> = {};
    for (const row of rows as any[]) {
      stats[row.TABLE_NAME] = {
        rowCount: Number(row.TABLE_ROWS),
        sizeBytes: Number(row.size_bytes)
      };
    }

    return { ok: true, stats };
  } catch (err: unknown) {
    return mysqlError(err);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

export const mysqlSample = async (
  conn: MysqlConnectionOpts,
  opts: { table: string; limit?: number }
): Promise<SqlSampleResponse> => {
  return mysqlQuery(conn, { sql: `SELECT * FROM \`${opts.table}\``, limit: opts.limit ?? 5 });
};

const mysqlError = (err: unknown, query?: string): ErrorResponse => {
  const mysqlErr = err as { message?: string; code?: string; errno?: number };
  const message = mysqlErr.message || 'Unknown error';
  const code = mysqlErr.code;

  let hint: string | undefined;
  if (code === 'ECONNREFUSED') {
    hint = 'Database may not be running. Check status or restart.';
  } else if (code === 'ER_NO_SUCH_TABLE') {
    hint = 'Table does not exist. Use /tables to list available tables.';
  } else if (code === 'ER_BAD_FIELD_ERROR') {
    hint = 'Column does not exist. Use /schema to see table structure.';
  }

  return {
    ok: false,
    error: message,
    ...(code && { code }),
    ...(hint && { hint }),
    ...(query && { query })
  } as ErrorResponse;
};

// ─────────────────────────────────────────────────────────────────────────────
// Redis
// ─────────────────────────────────────────────────────────────────────────────

// Destructive Redis commands that require confirmation
const DESTRUCTIVE_REDIS_COMMANDS = new Set([
  'FLUSHALL',
  'FLUSHDB',
  'SHUTDOWN',
  'DEBUG',
  'SLAVEOF',
  'REPLICAOF',
  'CONFIG',
  'BGREWRITEAOF',
  'BGSAVE',
  'MIGRATE',
  'FAILOVER',
  'CLUSTER'
]);

export type RedisCommandOpts = { cmd: string; confirm?: boolean };

export const redisCommand = async (
  conn: RedisConnectionOpts,
  opts: RedisCommandOpts
): Promise<RedisCommandResponse> => {
  let client: Redis | null = null;

  try {
    const parts = parseCommandString(opts.cmd);
    if (parts.length === 0) {
      return { ok: false, error: 'Empty command', hint: 'Provide a Redis command like "GET key" or "SET key value"' };
    }

    const [cmd, ...args] = parts;
    const cmdUpper = cmd.toUpperCase();

    // Check for destructive commands
    if (DESTRUCTIVE_REDIS_COMMANDS.has(cmdUpper) && !opts.confirm) {
      return {
        ok: false,
        error: `Destructive command "${cmdUpper}" requires confirmation`,
        code: 'DESTRUCTIVE_OPERATION',
        hint: `This command can cause data loss or service disruption. To proceed, set confirm: true in the request body.`
      };
    }

    client = new Redis({
      host: conn.host,
      port: conn.port,
      password: conn.password,
      connectTimeout: 10000,
      commandTimeout: 30000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
      ...(conn.tls && { tls: conn.tlsServername ? { servername: conn.tlsServername } : {} })
    });

    await client.connect();

    const result = await client.call(cmd, ...args);
    const type = getRedisResultType(result);

    return { ok: true, result, type };
  } catch (err: unknown) {
    return redisError(err, opts.cmd);
  } finally {
    if (client) await client.quit().catch(() => {});
  }
};

export const redisKeys = async (
  conn: RedisConnectionOpts,
  opts?: { pattern?: string; limit?: number }
): Promise<RedisKeysResponse> => {
  let client: Redis | null = null;
  const pattern = opts?.pattern || '*';
  const limit = opts?.limit ?? 100;

  try {
    client = new Redis({
      host: conn.host,
      port: conn.port,
      password: conn.password,
      connectTimeout: 10000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
      ...(conn.tls && { tls: conn.tlsServername ? { servername: conn.tlsServername } : {} })
    });

    await client.connect();

    // Use SCAN for safety (non-blocking)
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [newCursor, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      keys.push(...batch);
    } while (cursor !== '0' && keys.length < limit + 1);

    const truncated = keys.length > limit;
    const resultKeys = truncated ? keys.slice(0, limit) : keys;

    return {
      ok: true,
      keys: resultKeys,
      count: resultKeys.length,
      truncated,
      pattern,
      ...(truncated && { hint: `Results limited to ${limit} keys. Use more specific pattern or increase limit.` })
    };
  } catch (err: unknown) {
    return redisError(err);
  } finally {
    if (client) await client.quit().catch(() => {});
  }
};

export const redisGet = async (conn: RedisConnectionOpts, opts: { key: string }): Promise<RedisCommandResponse> => {
  return redisCommand(conn, { cmd: `GET ${opts.key}` });
};

export const redisTtl = async (conn: RedisConnectionOpts, opts: { key: string }): Promise<RedisCommandResponse> => {
  let client: Redis | null = null;

  try {
    client = new Redis({
      host: conn.host,
      port: conn.port,
      password: conn.password,
      connectTimeout: 10000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
      ...(conn.tls && { tls: conn.tlsServername ? { servername: conn.tlsServername } : {} })
    });

    await client.connect();
    const ttl = await client.ttl(opts.key);

    let hint: string | undefined;
    if (ttl === -2) hint = 'Key does not exist';
    else if (ttl === -1) hint = 'Key exists but has no expiration';

    return { ok: true, result: ttl, type: 'integer', ...(hint && { hint }) };
  } catch (err: unknown) {
    return redisError(err);
  } finally {
    if (client) await client.quit().catch(() => {});
  }
};

export const redisInfo = async (conn: RedisConnectionOpts, opts?: { section?: string }): Promise<RedisInfoResponse> => {
  let client: Redis | null = null;

  try {
    client = new Redis({
      host: conn.host,
      port: conn.port,
      password: conn.password,
      connectTimeout: 10000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
      ...(conn.tls && { tls: conn.tlsServername ? { servername: conn.tlsServername } : {} })
    });

    await client.connect();
    const infoStr = opts?.section ? await client.info(opts.section) : await client.info();

    // Parse INFO output into key-value pairs
    const info: Record<string, string> = {};
    for (const line of infoStr.split('\n')) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        info[key.trim()] = value.trim();
      }
    }

    return { ok: true, info };
  } catch (err: unknown) {
    return redisError(err);
  } finally {
    if (client) await client.quit().catch(() => {});
  }
};

export const redisType = async (conn: RedisConnectionOpts, opts: { key: string }): Promise<RedisCommandResponse> => {
  return redisCommand(conn, { cmd: `TYPE ${opts.key}` });
};

const redisError = (err: unknown, command?: string): ErrorResponse => {
  const redisErr = err as { message?: string; code?: string };
  const message = redisErr.message || 'Unknown error';
  const code = redisErr.code;

  let hint: string | undefined;
  if (code === 'ECONNREFUSED') {
    hint = 'Redis may not be running. Check status or restart.';
  } else if (message.includes('NOAUTH')) {
    hint = 'Authentication required. Check Redis password configuration.';
  }

  return {
    ok: false,
    error: message,
    ...(code && { code }),
    ...(hint && { hint }),
    ...(command && { command })
  } as ErrorResponse;
};

const getRedisResultType = (result: unknown): string => {
  if (result === null) return 'null';
  if (typeof result === 'number') return 'integer';
  if (typeof result === 'string') return 'string';
  if (Array.isArray(result)) return 'array';
  return typeof result;
};

const parseCommandString = (command: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const char of command) {
    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = true;
      quoteChar = char;
    } else if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = '';
    } else if (!inQuote && char === ' ') {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) parts.push(current);
  return parts;
};

// ─────────────────────────────────────────────────────────────────────────────
// DynamoDB
// ─────────────────────────────────────────────────────────────────────────────

const getDynamoClient = (conn: DynamoDbConnectionOpts) => {
  const dynamoClient =
    conn.mode === 'local'
      ? new DynamoDBClient({
          endpoint: `http://localhost:${conn.port}`,
          region: 'local',
          credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
        })
      : new DynamoDBClient({
          region: conn.region,
          credentials: conn.credentials
        });
  return DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: { removeUndefinedValues: true }
  });
};

export const dynamoDbQuery = async (
  conn: DynamoDbConnectionOpts,
  opts: { pk: Record<string, unknown>; sk?: Record<string, unknown>; index?: string; limit?: number }
): Promise<DynamoDbQueryResponse> => {
  const limit = opts.limit ?? 100;

  try {
    const client = getDynamoClient(conn);

    // Build key condition expression
    const pkKey = Object.keys(opts.pk)[0];
    const pkValue = opts.pk[pkKey];
    let keyCondition = `#pk = :pk`;
    const exprNames: Record<string, string> = { '#pk': pkKey };
    const exprValues: Record<string, unknown> = { ':pk': pkValue };

    if (opts.sk) {
      const skKey = Object.keys(opts.sk)[0];
      const skValue = opts.sk[skKey];
      keyCondition += ` AND #sk = :sk`;
      exprNames['#sk'] = skKey;
      exprValues[':sk'] = skValue;
    }

    const result = await client.send(
      new QueryCommand({
        TableName: conn.tableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ...(opts.index && { IndexName: opts.index }),
        Limit: limit + 1
      })
    );

    const items = result.Items || [];
    const truncated = items.length > limit;

    return {
      ok: true,
      items: truncated ? items.slice(0, limit) : items,
      count: Math.min(items.length, limit),
      scannedCount: result.ScannedCount || 0,
      truncated,
      ...(truncated && { hint: `Results limited to ${limit} items. Use pagination or increase limit.` })
    };
  } catch (err: unknown) {
    return dynamoDbError(err);
  }
};

export const dynamoDbScan = async (
  conn: DynamoDbConnectionOpts,
  opts?: { filter?: string; limit?: number }
): Promise<DynamoDbQueryResponse> => {
  const limit = opts?.limit ?? 100;

  try {
    const client = getDynamoClient(conn);

    const result = await client.send(
      new ScanCommand({
        TableName: conn.tableName,
        ...(opts?.filter && { FilterExpression: opts.filter }),
        Limit: limit + 1
      })
    );

    const items = result.Items || [];
    const truncated = items.length > limit;

    return {
      ok: true,
      items: truncated ? items.slice(0, limit) : items,
      count: Math.min(items.length, limit),
      scannedCount: result.ScannedCount || 0,
      truncated,
      ...(truncated && { hint: `Results limited to ${limit} items. Scan is expensive - consider using /query.` })
    };
  } catch (err: unknown) {
    return dynamoDbError(err);
  }
};

export const dynamoDbGet = async (
  conn: DynamoDbConnectionOpts,
  opts: { pk: Record<string, unknown>; sk?: Record<string, unknown> }
): Promise<DynamoDbItemResponse> => {
  try {
    const client = getDynamoClient(conn);
    const key = { ...opts.pk, ...opts.sk };

    const result = await client.send(
      new GetCommand({
        TableName: conn.tableName,
        Key: key
      })
    );

    return {
      ok: true,
      item: result.Item || null,
      ...(!result.Item && { hint: 'Item not found with the given key.' })
    };
  } catch (err: unknown) {
    return dynamoDbError(err);
  }
};

export const dynamoDbPut = async (
  conn: DynamoDbConnectionOpts,
  opts: { item: Record<string, unknown> }
): Promise<DynamoDbWriteResponse> => {
  try {
    const client = getDynamoClient(conn);

    await client.send(
      new PutCommand({
        TableName: conn.tableName,
        Item: opts.item
      })
    );

    return { ok: true, success: true };
  } catch (err: unknown) {
    return dynamoDbError(err);
  }
};

export const dynamoDbDelete = async (
  conn: DynamoDbConnectionOpts,
  opts: { pk: Record<string, unknown>; sk?: Record<string, unknown> }
): Promise<DynamoDbWriteResponse> => {
  try {
    const client = getDynamoClient(conn);
    const key = { ...opts.pk, ...opts.sk };

    await client.send(
      new DeleteCommand({
        TableName: conn.tableName,
        Key: key
      })
    );

    return { ok: true, success: true };
  } catch (err: unknown) {
    return dynamoDbError(err);
  }
};

export const dynamoDbSchema = async (conn: DynamoDbConnectionOpts): Promise<DynamoDbSchemaResponse> => {
  try {
    const dynamoClient =
      conn.mode === 'local'
        ? new DynamoDBClient({
            endpoint: `http://localhost:${conn.port}`,
            region: 'local',
            credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
          })
        : new DynamoDBClient({
            region: conn.region,
            credentials: conn.credentials
          });

    const result = await dynamoClient.send(new DescribeTableCommand({ TableName: conn.tableName }));
    const table = result.Table;

    if (!table) {
      return { ok: false, error: `Table "${conn.tableName}" not found` };
    }

    const keySchema = table.KeySchema || [];
    const attrDefs = table.AttributeDefinitions || [];
    const attrMap = new Map(attrDefs.map((a) => [a.AttributeName, a.AttributeType]));

    const pk = keySchema.find((k) => k.KeyType === 'HASH');
    const sk = keySchema.find((k) => k.KeyType === 'RANGE');

    return {
      ok: true,
      table: conn.tableName,
      keySchema: {
        partitionKey: { name: pk?.AttributeName || '', type: attrMap.get(pk?.AttributeName || '') || 'S' },
        ...(sk && { sortKey: { name: sk.AttributeName || '', type: attrMap.get(sk.AttributeName || '') || 'S' } })
      },
      gsi: (table.GlobalSecondaryIndexes || []).map((idx) => ({
        name: idx.IndexName || '',
        partitionKey: idx.KeySchema?.find((k) => k.KeyType === 'HASH')?.AttributeName || '',
        sortKey: idx.KeySchema?.find((k) => k.KeyType === 'RANGE')?.AttributeName
      })),
      lsi: (table.LocalSecondaryIndexes || []).map((idx) => ({
        name: idx.IndexName || '',
        sortKey: idx.KeySchema?.find((k) => k.KeyType === 'RANGE')?.AttributeName || ''
      })),
      attributes: attrDefs.map((a) => a.AttributeName || '')
    };
  } catch (err: unknown) {
    return dynamoDbError(err);
  }
};

export const dynamoDbSample = async (
  conn: DynamoDbConnectionOpts,
  opts?: { limit?: number }
): Promise<DynamoDbQueryResponse> => {
  return dynamoDbScan(conn, { limit: opts?.limit ?? 5 });
};

const dynamoDbError = (err: unknown): ErrorResponse => {
  const ddbErr = err as { message?: string; name?: string; code?: string };
  const message = ddbErr.message || 'Unknown error';
  const code = ddbErr.name || ddbErr.code;

  let hint: string | undefined;
  if (code === 'ResourceNotFoundException') {
    hint = 'Table does not exist.';
  } else if (code === 'ValidationException') {
    hint = 'Invalid request. Check key schema with /schema endpoint.';
  }

  return {
    ok: false,
    error: message,
    ...(code && { code }),
    ...(hint && { hint })
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// OpenSearch
// ─────────────────────────────────────────────────────────────────────────────

const getOpenSearchBaseUrl = (conn: OpenSearchConnectionOpts): string => {
  return conn.mode === 'local' ? `http://localhost:${conn.port}` : conn.endpoint;
};

const signedOpenSearchFetch = async (
  conn: OpenSearchConnectionOpts,
  path: string,
  method: string,
  body?: string
): Promise<Response> => {
  const baseUrl = getOpenSearchBaseUrl(conn);
  const url = new URL(path, baseUrl);

  if (conn.mode === 'local') {
    return fetch(url.toString(), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body
    });
  }

  // AWS Signature V4 signing for deployed mode
  const signer = new SignatureV4({
    service: 'es',
    region: conn.region,
    credentials: {
      accessKeyId: conn.credentials.accessKeyId,
      secretAccessKey: conn.credentials.secretAccessKey,
      sessionToken: conn.credentials.sessionToken
    },
    sha256: Sha256
  });

  const headers: Record<string, string> = {
    host: url.host
  };

  // Only include Content-Type for requests with body
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  // Parse query string into object for proper signing
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const request = {
    method,
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port ? parseInt(url.port, 10) : undefined,
    path: url.pathname,
    query,
    headers,
    body
  };

  const signedRequest = await signer.sign(request);

  return fetch(url.toString(), {
    method,
    headers: signedRequest.headers as Record<string, string>,
    body
  });
};

export const opensearchSearch = async (
  conn: OpenSearchConnectionOpts,
  opts: { query: Record<string, unknown>; index?: string; limit?: number }
): Promise<OpenSearchResponse> => {
  try {
    const index = opts.index || '_all';
    const path = `/${index}/_search`;

    const body = JSON.stringify({
      query: opts.query,
      size: opts.limit ?? 10
    });

    const response = await signedOpenSearchFetch(conn, path, 'POST', body);
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

export const opensearchGet = async (
  conn: OpenSearchConnectionOpts,
  opts: { index: string; id: string }
): Promise<OpenSearchResponse> => {
  try {
    const path = `/${opts.index}/_doc/${opts.id}`;
    const response = await signedOpenSearchFetch(conn, path, 'GET');
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

export const opensearchPut = async (
  conn: OpenSearchConnectionOpts,
  opts: { index: string; id?: string; doc: Record<string, unknown> }
): Promise<OpenSearchResponse> => {
  try {
    const path = opts.id ? `/${opts.index}/_doc/${opts.id}` : `/${opts.index}/_doc`;
    const method = opts.id ? 'PUT' : 'POST';
    const body = JSON.stringify(opts.doc);

    const response = await signedOpenSearchFetch(conn, path, method, body);
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

export const opensearchDelete = async (
  conn: OpenSearchConnectionOpts,
  opts: { index: string; id: string }
): Promise<OpenSearchResponse> => {
  try {
    const path = `/${opts.index}/_doc/${opts.id}`;
    const response = await signedOpenSearchFetch(conn, path, 'DELETE');
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

export const opensearchIndices = async (conn: OpenSearchConnectionOpts): Promise<OpenSearchResponse> => {
  try {
    const path = '/_cat/indices?format=json';
    const response = await signedOpenSearchFetch(conn, path, 'GET');
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

export const opensearchMapping = async (
  conn: OpenSearchConnectionOpts,
  opts: { index: string }
): Promise<OpenSearchResponse> => {
  try {
    const path = `/${opts.index}/_mapping`;
    const response = await signedOpenSearchFetch(conn, path, 'GET');
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

export const opensearchAnalyze = async (
  conn: OpenSearchConnectionOpts,
  opts: { text: string; analyzer?: string; index?: string }
): Promise<OpenSearchResponse> => {
  try {
    const path = opts.index ? `/${opts.index}/_analyze` : '/_analyze';

    const body: Record<string, unknown> = { text: opts.text };
    if (opts.analyzer) body.analyzer = opts.analyzer;

    const response = await signedOpenSearchFetch(conn, path, 'POST', JSON.stringify(body));
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

export const opensearchCount = async (
  conn: OpenSearchConnectionOpts,
  opts?: { index?: string }
): Promise<OpenSearchResponse> => {
  try {
    const index = opts?.index || '_all';
    const path = `/${index}/_count`;
    const response = await signedOpenSearchFetch(conn, path, 'GET');
    const data = await response.json();

    if (!response.ok) {
      return opensearchError(data);
    }

    return { ok: true, data };
  } catch (err: unknown) {
    return opensearchError(err);
  }
};

const opensearchError = (err: unknown): ErrorResponse => {
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const osErr = err as { error: { type?: string; reason?: string } };
    return {
      ok: false,
      error: osErr.error.reason || osErr.error.type || 'Unknown error',
      code: osErr.error.type
    };
  }

  const genericErr = err as { message?: string };
  return {
    ok: false,
    error: genericErr.message || 'Unknown error'
  };
};
