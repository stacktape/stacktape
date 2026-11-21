import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommandLine, CommandText, wrapGroups } from './CommandLine.tsx';

test('a command wraps between options, and a flag that holds its value takes no next word', () => {
  expect(wrapGroups('psql --file=orders.sql "postgresql://user@host:5432/db"')).toEqual([
    ['psql'],
    ['--file=orders.sql'],
    ['"postgresql://user@host:5432/db"']
  ]);
  expect(wrapGroups('aws rds wait --region eu-west-1')).toEqual([
    ['aws'],
    ['rds'],
    ['wait'],
    ['--region', 'eu-west-1']
  ]);
});

test('the program is accented, flags are muted, and each line has its own prompt', () => {
  const markup = renderToStaticMarkup(<CommandText command={'stacktape deploy --stage dev\nstacktape logs'} />);

  expect(markup.match(/stp-ui-command-line__prompt/g)).toHaveLength(2);
  expect(markup).toContain('<span class="stp-ui-command-line__program">stacktape</span>');
  expect(markup).toContain('<span class="stp-ui-command-line__flag">--stage </span>');
  expect(markup).toContain('$');
});

test('PowerShell gets its own prompt', () => {
  expect(renderToStaticMarkup(<CommandText command="iex foo" shell="powershell" />)).toContain('PS&gt;');
});

test('the box is as wide as its longest line, and copies the whole command under its accessible name', () => {
  const markup = renderToStaticMarkup(
    <CommandLine command={'stacktape deploy\nstacktape secret set KEY'} label="Copy the deploy commands" />
  );

  // 24 characters, the prompt and its space, one of slack.
  expect(markup).toContain('width:calc(27ch + 62px)');
  expect(markup).toContain('aria-label="Copy the deploy commands"');
  expect(markup).toContain('<output aria-live="polite"');
});

test('a filling box takes its column, and a reserved command only holds its height', () => {
  const markup = renderToStaticMarkup(
    <CommandLine command="stacktape deploy" fill reserve={[{ command: 'npx stacktape deploy --stage production' }]} />
  );

  expect(markup).toContain('stp-ui-command-line--fill');
  expect(markup).not.toContain('width:calc');
  // The reserved command is drawn through CSS, so it is not text on the page.
  expect(markup).toContain('data-text="npx"');
  expect(markup).not.toContain('>production<');
});
