import { expect, test } from 'bun:test';
import { parse } from 'dotenv';
import { mergeManagedEnvBlock } from './frontend-env';

const START = '# >>> stacktape dev: managed block, rewritten on every dev start >>>';
const END = '# <<< stacktape dev <<<';

// Dev mode owns only the lines between its markers in a frontend's `.env.local`; the developer's lines stay.
test.each([
  ['a new file', '', { API_URL: 'http://localhost:3000' }, `${START}\nAPI_URL=http://localhost:3000\n${END}\n`],
  [
    "the developer's file, block appended",
    'VITE_FLAG=1\n# my notes\n\n',
    { API_URL: 'http://localhost:3000' },
    `VITE_FLAG=1\n# my notes\n\n${START}\nAPI_URL=http://localhost:3000\n${END}\n`
  ],
  [
    'an earlier block, replaced in place',
    `A=1\n${START}\nOLD=x\nSTP_DB_PASSWORD=y\n${END}\nB=2\n`,
    { API_URL: 'http://localhost:3000' },
    `A=1\n${START}\nAPI_URL=http://localhost:3000\n${END}\nB=2\n`
  ],
  ['an earlier block, removed when nothing is injected', `A=1\n${START}\nOLD=x\n${END}\n`, {}, 'A=1\n'],
  ["the developer's file, untouched when nothing is injected", 'A=1\n\n\n', {}, 'A=1\n\n\n'],
  ['Windows line endings', 'A=1\r\n', { B: '2' }, `A=1\r\n\r\n${START}\r\nB=2\r\n${END}\r\n`]
])('%s', (_case, existing, envVars, expected) => {
  expect(mergeManagedEnvBlock(existing, envVars)).toBe(expected);
});

test('dotenv reads every written value back unchanged', () => {
  const values = {
    URL: 'https://abc.execute-api.eu-west-1.amazonaws.com/api?x=1&y=2',
    CONNECTION: 'postgresql://postgres:2f9c1d@localhost:5432/app',
    HASH: 'a#b',
    SPACES: 'two words',
    DOUBLE: 'say "hi"',
    BOTH: `it's "both"`,
    EMPTY: '',
    MULTILINE: 'line one\nline two'
  };
  const parsed: Record<string, string> = parse(mergeManagedEnvBlock('USER_VALUE=kept\n', values));
  expect(parsed).toEqual({ USER_VALUE: 'kept', ...values });
});
