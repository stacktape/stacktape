import { expect, test } from 'bun:test';
import { describeClientFailure, mysqlIdentitySql, postgresIdentitySql } from './data-identity';

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

// #380 review: the error quoted only "Command failed with exit code 1: docker exec …", not why the client failed.
test("a failed client's cause comes from its standard error, without the password", () => {
  const failure = (stderr: string) =>
    Object.assign(new Error('Command failed with exit code 1: docker exec -i stp-app-db sh -c …'), { stderr });
  expect(
    describeClientFailure(
      failure(
        "mysql: [Warning] Using a password on the command line interface can be insecure.\nERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)\n"
      ),
      'hunter2'
    )
  ).toBe("ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)");
  expect(describeClientFailure(failure('psql: error: FATAL:  password hunter2 is wrong\n'), 'hunter2')).toBe(
    'psql: error: FATAL:  password [redacted] is wrong'
  );
  expect(describeClientFailure(failure(''), 'hunter2')).toBe(
    'Command failed with exit code 1: docker exec -i stp-app-db sh -c …'
  );
});
