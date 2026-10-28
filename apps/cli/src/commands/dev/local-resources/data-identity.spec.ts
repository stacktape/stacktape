import { expect, test } from 'bun:test';
import { mysqlIdentitySql, postgresIdentitySql } from './data-identity';

// Names and passwords come from the configuration; a quote in one must not end the statement.
test('MySQL creates the database, and for a user other than root the user with rights on it', () => {
  expect(mysqlIdentitySql({ dbName: 'shelf', username: 'root', password: 'x' })).toBe(
    'CREATE DATABASE IF NOT EXISTS `shelf`;\n'
  );
  expect(mysqlIdentitySql({ dbName: 'my`db', username: "o'neil", password: "it's\\x" })).toBe(
    [
      'CREATE DATABASE IF NOT EXISTS `my``db`;',
      "CREATE USER IF NOT EXISTS 'o''neil'@'%' IDENTIFIED BY 'it''s\\\\x';",
      "GRANT ALL PRIVILEGES ON `my``db`.* TO 'o''neil'@'%';",
      ''
    ].join('\n')
  );
});

test('PostgreSQL creates a missing user and a missing database it owns', () => {
  expect(postgresIdentitySql({ dbName: 'orders', username: "o'neil", password: "it's\\x" })).toBe(
    [
      "SELECT format('CREATE ROLE %I LOGIN SUPERUSER PASSWORD %L', 'o''neil', 'it''s\\x') WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'o''neil')\\gexec",
      "SELECT format('CREATE DATABASE %I OWNER %I', 'orders', 'o''neil') WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'orders')\\gexec",
      ''
    ].join('\n')
  );
});
