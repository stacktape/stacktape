import { z } from 'zod';
import { allCliArgsSchema } from '../../config/cli/options';
import { publicFlag } from '../../config/cli/public-names';
import { configurableGlobalDefaultCliArgs, configurableGlobalDefaultOtherProps } from '../../config/random';
import { CliError } from '../../utils/errors';

export const parseDefaultSetting = (key: string, value: string) => {
  const keys = [...Object.keys(configurableGlobalDefaultCliArgs), ...Object.keys(configurableGlobalDefaultOtherProps)];
  const internalKey = keys.find((name) => name === key || publicFlag(name) === key);
  const schema =
    internalKey &&
    (internalKey === 'stage'
      ? z
          .string()
          .min(2)
          .regex(/^[a-z0-9-]+$/)
      : internalKey === 'projectName'
        ? z
            .string()
            .min(1)
            .regex(/^[a-z0-9-]+$/)
        : (allCliArgsSchema.shape[internalKey] ?? z.string().min(1)));
  const result = schema?.safeParse(value);
  if (!internalKey || !result?.success)
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEFAULT_INVALID',
      message: internalKey ? `Invalid value for default ${publicFlag(internalKey)}.` : `Unknown default key: ${key}.`,
      hints: `Supported keys: ${keys.map(publicFlag).join(', ')}.`
    });
  return { key: internalKey, value: result.data, isCliArg: internalKey in configurableGlobalDefaultCliArgs };
};
