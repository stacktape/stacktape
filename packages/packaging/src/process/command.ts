/** Parses a command line into an executable and arguments without invoking a shell. */
export const parseCommand = (command: string): [string, ...string[]] => {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let tokenStarted = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (character === undefined) break;

    if (character === '\\' && quote !== "'") {
      const next = command[index + 1];
      if (next && (next === quote || next === '"' || next === "'" || next === '\\' || /\s/.test(next))) {
        current += next;
        tokenStarted = true;
        index += 1;
        continue;
      }
    }

    if (character === '"' || character === "'") {
      if (quote === character) {
        quote = undefined;
      } else if (quote === undefined) {
        quote = character;
      } else {
        current += character;
      }
      tokenStarted = true;
      continue;
    }

    if (/\s/.test(character) && quote === undefined) {
      if (tokenStarted) {
        args.push(current);
        current = '';
        tokenStarted = false;
      }
      continue;
    }

    current += character;
    tokenStarted = true;
  }

  if (quote) throw new Error('Build command contains an unterminated quote.');
  if (tokenStarted) args.push(current);
  if (args.length === 0) throw new Error('Build command cannot be empty.');
  return args as [string, ...string[]];
};

/**
 * Runs a command line the way a `package.json` script or a PaaS build command runs: through the platform shell, so
 * `a && b`, environment expansion and redirections behave as the author expects.
 */
export const shellInvocation = (command: string): [string, string[]] => {
  if (command.trim() === '') throw new Error('Build command cannot be empty.');
  return process.platform === 'win32'
    ? [process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command]]
    : ['/bin/sh', ['-c', command]];
};
