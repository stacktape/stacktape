import type { StacktapeArgs } from 'src/config/cli/types';

export const defaultGetErrorFunction = (_message: string) => (err: Error) => {
  throw err;
};

export const transformToCliArgs = (args: StacktapeArgs) => {
  const res = [];
  for (const argName in args) {
    if (typeof args[argName] === 'boolean') {
      if (args[argName] === true) {
        res.push(`--${argName}`);
      }
    } else {
      res.push(`--${argName}`);
      res.push(args[argName]);
    }
  }
  return res;
};
