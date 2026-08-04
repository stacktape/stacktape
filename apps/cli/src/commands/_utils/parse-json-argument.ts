import { CliError } from '@utils/errors';

export const parseJsonObjectArgument = ({
  value,
  flag,
  code,
  example
}: {
  value: string;
  flag: string;
  code: string;
  example?: string;
}): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Do not retain the parser error as a cause: runtime parser errors may quote credential-bearing input.
    throw new CliError({
      category: 'CLI',
      code,
      message: `Flag \`${flag}\` must contain valid JSON.`,
      hints: example ? `For example: \`${example}\`.` : undefined
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliError({
      category: 'CLI',
      code,
      message: `Flag \`${flag}\` must contain a JSON object.`,
      hints: example ? `For example: \`${example}\`.` : undefined
    });
  }

  return parsed as Record<string, unknown>;
};
