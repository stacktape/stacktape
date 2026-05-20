export const getArgValue = (argv: string[], flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  const value = index === -1 ? undefined : argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
};

export const getAllArgValues = (argv: string[], flag: string): string[] => {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      values.push(argv[i + 1]);
    }
  }
  return values;
};

export const hasFlag = (argv: string[], flag: string) => argv.includes(flag);

export const getNumberArg = (argv: string[], flag: string, fallback: number) => {
  if (!argv.includes(flag)) {
    return fallback;
  }
  const value = getArgValue(argv, flag);
  if (value === undefined) {
    throw new Error(`${flag} requires a numeric value.`);
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${flag} must be a finite number, got "${value}".`);
  }
  return numberValue;
};

export const getPositiveIntegerArg = (argv: string[], flag: string, fallback: number) => {
  const value = getNumberArg(argv, flag, fallback);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${flag} must be a positive integer, got "${value}".`);
  }
  return value;
};
