import { describe, expect, it } from 'bun:test';
import { isRunnableMigrationCommand } from './migrations';

describe('literal migration command validation', () => {
  for (const command of [
    'bun migrate.js',
    "bun migrate.js --directory 'db migrations'",
    "bun migrate.js ''",
    `bun migrate.js 'apostrophe'"'"'s'`,
    `bun migrate.js '"double quotes"'`,
    "bun migrate.js '$VALUE' '$(printf changed)' '`printf changed`' '; printf changed'",
    "bun migrate.js 'line\nbreak'"
  ]) {
    it(`accepts literal arguments without shell expansion: ${JSON.stringify(command)}`, () => {
      expect(isRunnableMigrationCommand(command)).toBe(true);
    });
  }

  for (const command of [
    'bun migrate.js && printf changed',
    'bun migrate.js; printf changed',
    'bun migrate.js $(printf changed)',
    'bun migrate.js `printf changed`',
    'bun migrate.js "$VALUE"',
    'bun migrate.js "$(printf changed)"',
    "bun migrate.js 'closed'; printf changed; 'opened'",
    "bun migrate.js 'unterminated",
    "bun migrate.js 'nul\0byte'",
    "bun migrate.js 'safe' > output.sql",
    'bun migrate.js\nprintf changed',
    'bun migrate.js\n',
    'sh -c migrate',
    "'bun' migrate.js"
  ]) {
    it(`rejects interpreted or malformed syntax: ${JSON.stringify(command)}`, () => {
      expect(isRunnableMigrationCommand(command)).toBe(false);
    });
  }
});
