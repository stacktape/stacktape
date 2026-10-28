import { parseCliInput } from '@utils/cli';

/**
 * Whether the source CLI's arguments start the MCP server, which runs straight from source with a clean stdout. Only
 * the bare `mcp` command does; `mcp add`, `mcp remove` and `mcp --help` go through the built CLI like every other
 * command.
 */
export const isMcpServerInvocation = (args: string[]) => {
  try {
    return parseCliInput(args).commands[0] === 'mcp';
  } catch {
    return false;
  }
};
