import { expect, test } from 'bun:test';
import { renderHelp } from './render';

test.each([undefined, 'deploy', 'secret set', 'secret', 'stack', 'dev', 'dev stop', 'mcp', 'mcp add', 'defaults set'])(
  'help for %s',
  (command) => {
    const text = renderHelp(command).join('\n');
    expect(text).toMatchSnapshot();
    // Agent mode is part of what `dev` does, so its help shows it; elsewhere it stays an internal option.
    if (command === 'dev') expect(text).toMatch(/\n {6}--agent {2,}For coding agents: /);
    else if (command !== 'dev stop') expect(text).not.toMatch(/--agent(?:-port)?\b/);
    expect(text).not.toMatch(/--(?:agent-child|ui|output-format|recover-operation)\b/);
    expect(text).not.toContain('secret:set');
  }
);
