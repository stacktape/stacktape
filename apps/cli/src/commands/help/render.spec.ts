import { expect, test } from 'bun:test';
import { renderHelp } from './render';

test.each([undefined, 'deploy', 'secret set', 'secret', 'dev', 'dev stop', 'mcp', 'mcp add', 'defaults set'])(
  'help for %s',
  (command) => {
    const text = renderHelp(command).join('\n');
    expect(text).toMatchSnapshot();
    expect(text).not.toMatch(/--(?:agent|ui|output-format|recover-operation)\b/);
    expect(text).not.toContain('secret:set');
  }
);
