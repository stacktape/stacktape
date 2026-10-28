import { expect, test } from 'bun:test';
import { isMcpServerInvocation } from './mcp-server-invocation';

test('the source CLI starts the MCP server only for the bare mcp command', () => {
  const cases: Array<[string[], boolean]> = [
    [['mcp'], true],
    [['mcp', '--logLevel', 'debug'], true],
    [['--debug', 'mcp'], true],
    [['mcp', '--help'], false],
    [['mcp', '-h'], false],
    [['mcp', 'add'], false],
    [['mcp', 'add', '--coding-agents', 'claude-code'], false],
    [['mcp', 'remove'], false],
    [['mcp:add'], false],
    [['help', 'mcp'], false],
    [['deploy', '--stage', 'mcp'], false],
    [['logs', '--resourceName', 'mcp'], false],
    [[], false]
  ];
  for (const [args, expected] of cases) expect([args, isMcpServerInvocation(args)]).toEqual([args, expected]);
});
