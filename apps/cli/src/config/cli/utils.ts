import type { StacktapeCommand } from './commands';
import { z } from 'zod';
import { cliCommands, commandDefinitions } from './commands';
import { allCliArgsSchema, argAliases } from './options';
import { globalArgs, publicCommandName, publicFlag, shortFlags, commandPositionals, isHiddenArg } from './public-names';

type ArgSchema = z.ZodType;
type ArgsShape = Record<string, ArgSchema>;

const getZodTypeInfo = (schema: z.ZodType): { allowedTypes: string[]; allowedValues?: string[] } => {
  const schemaAny = schema as any;
  const typeName = schemaAny.type;
  const zodDef = schemaAny._zod?.def;

  if (typeName === 'optional' && zodDef?.innerType) {
    return getZodTypeInfo(zodDef.innerType);
  }

  if (typeName === 'enum') {
    const values = schemaAny.options || (schemaAny._zod?.values ? [...schemaAny._zod.values] : undefined);
    return {
      allowedTypes: ['string'],
      allowedValues: values
    };
  }

  if (typeName === 'union' && zodDef?.options) {
    const types = new Set<string>();
    for (const option of zodDef.options) {
      const info = getZodTypeInfo(option);
      info.allowedTypes.forEach((t: string) => types.add(t));
    }
    return { allowedTypes: Array.from(types) };
  }

  if (typeName === 'array') {
    return { allowedTypes: ['array'] };
  }

  if (typeName === 'string') return { allowedTypes: ['string'] };
  if (typeName === 'number') return { allowedTypes: ['number'] };
  if (typeName === 'boolean') return { allowedTypes: ['boolean'] };
  if (typeName === 'any') return { allowedTypes: ['object'] };

  return { allowedTypes: ['string'] };
};

const presentDescription = (text: string): string =>
  text?.replace(/\b[a-z-]+:[a-z-]+\b/g, (name) =>
    cliCommands.includes(name as StacktapeCommand) ? publicCommandName(name) : name
  );

const getSchemaDescription = (schema: z.ZodType): string | undefined => {
  const schemaAny = schema as any;
  if (schemaAny.description) {
    return presentDescription(schemaAny.description);
  }
  if (schemaAny.type === 'optional' && schemaAny._zod?.def?.innerType) {
    return presentDescription(schemaAny._zod.def.innerType.description);
  }
  return undefined;
};

export const getAllowedArgs = (cmd: StacktapeCommand): string[] => {
  return [...new Set([...Object.keys(commandDefinitions[cmd].args), ...globalArgs])];
};

export const getRequiredArgs = (cmd: StacktapeCommand): readonly string[] => {
  return commandDefinitions[cmd].requiredArgs;
};

export const getCommandDescription = (cmd: StacktapeCommand): string => {
  return presentDescription(commandDefinitions[cmd].description);
};

export const getArgInfo = (
  cmd: StacktapeCommand,
  argName: string
): {
  description?: string;
  required: boolean;
  alias?: string;
  allowedTypes: string[];
  allowedValues?: string[];
} => {
  const argSchema =
    commandDefinitions[cmd].args[argName] ?? (globalArgs.has(argName) ? allCliArgsSchema.shape[argName] : undefined);
  if (!argSchema) {
    return { required: false, allowedTypes: ['string'] };
  }

  const typeInfo = getZodTypeInfo(argSchema as z.ZodType);
  const requiredArgs = commandDefinitions[cmd].requiredArgs as readonly string[];
  const rawAlias = argAliases[argName as keyof typeof argAliases];
  const alias = typeof rawAlias === 'string' ? rawAlias : rawAlias?.join(', ');

  return {
    description: getSchemaDescription(argSchema as z.ZodType),
    required: requiredArgs.includes(argName),
    alias,
    ...typeInfo
  };
};

export const getCommandInfo = (cmd: StacktapeCommand) => {
  const def = commandDefinitions[cmd];
  return {
    description: presentDescription(def.description),
    args: Object.fromEntries(getAllowedArgs(cmd).map((argName) => [argName, getArgInfo(cmd, argName)]))
  };
};

const buildCommandSchema = (cmd: StacktapeCommand) => {
  return z.object({
    ...commandDefinitions[cmd].args,
    ...Object.fromEntries([...globalArgs].map((name) => [name, allCliArgsSchema.shape[name]]))
  } as ArgsShape);
};

export const validateCommandArgs = (cmd: StacktapeCommand, args: unknown) => {
  const schema = buildCommandSchema(cmd);
  return schema.safeParse(args);
};

// Generate serializable command metadata for docs and MCP tooling.
export const generateCommandSchemaInfo = () => {
  const result: Record<
    string,
    {
      description: string;
      publicName: string;
      positionals: readonly string[];
      args: Record<
        string,
        {
          description?: string;
          flag: string;
          positional?: number;
          required: boolean;
          alias?: string;
          allowedTypes: string[];
          allowedValues?: string[];
        }
      >;
    }
  > = {};

  for (const cmd of cliCommands) {
    const info = getCommandInfo(cmd);
    result[cmd] = {
      ...info,
      publicName: publicCommandName(cmd),
      positionals: commandPositionals[cmd] ?? [],
      args: Object.fromEntries(
        Object.entries(info.args)
          .filter(([name]) => !isHiddenArg(cmd, name))
          .map(([name, arg]) => [
            name,
            {
              ...arg,
              alias: shortFlags[name],
              flag: publicFlag(name),
              ...(commandPositionals[cmd]?.includes(name) ? { positional: commandPositionals[cmd].indexOf(name) } : {})
            }
          ])
      )
    };
  }

  return result;
};
