import type { StacktapeCommand } from './commands';
import { z } from 'zod';
import { cliCommands, commandDefinitions } from './commands';
import { argAliases } from './options';

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

const getSchemaDescription = (schema: z.ZodType): string | undefined => {
  const schemaAny = schema as any;
  if (schemaAny.description) {
    return schemaAny.description;
  }
  if (schemaAny.type === 'optional' && schemaAny._zod?.def?.innerType) {
    return schemaAny._zod.def.innerType.description;
  }
  return undefined;
};

export const getCommandArgs = (cmd: StacktapeCommand) => {
  return commandDefinitions[cmd].args;
};

export const getAllowedArgs = (cmd: StacktapeCommand): string[] => {
  return Object.keys(commandDefinitions[cmd].args);
};

export const getRequiredArgs = (cmd: StacktapeCommand): readonly string[] => {
  return commandDefinitions[cmd].requiredArgs;
};

export const getCommandDescription = (cmd: StacktapeCommand): string => {
  return commandDefinitions[cmd].description;
};

export const getArgDescription = (cmd: StacktapeCommand, argName: string): string | undefined => {
  const argSchema = commandDefinitions[cmd].args[argName];
  if (!argSchema) return undefined;
  return getSchemaDescription(argSchema as z.ZodType);
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
  const argSchema = commandDefinitions[cmd].args[argName];
  if (!argSchema) {
    return { required: false, allowedTypes: ['string'] };
  }

  const typeInfo = getZodTypeInfo(argSchema as z.ZodType);
  const requiredArgs = commandDefinitions[cmd].requiredArgs as readonly string[];

  return {
    description: getSchemaDescription(argSchema as z.ZodType),
    required: requiredArgs.includes(argName),
    alias: argAliases[argName as keyof typeof argAliases],
    ...typeInfo
  };
};

export const getCommandInfo = (cmd: StacktapeCommand) => {
  const def = commandDefinitions[cmd];
  return {
    description: def.description,
    args: Object.fromEntries(Object.keys(def.args).map((argName) => [argName, getArgInfo(cmd, argName)]))
  };
};

export const buildCommandSchema = (cmd: StacktapeCommand) => {
  return z.object(commandDefinitions[cmd].args as ArgsShape);
};

export const validateCommandArgs = (cmd: StacktapeCommand, args: unknown) => {
  const schema = buildCommandSchema(cmd);
  return schema.safeParse(args);
};

// For backward compatibility - generate schema-like structure
export const generateCommandSchemaInfo = () => {
  const result: Record<
    string,
    {
      description: string;
      args: Record<
        string,
        {
          description?: string;
          required: boolean;
          alias?: string;
          allowedTypes: string[];
          allowedValues?: string[];
        }
      >;
    }
  > = {};

  for (const cmd of cliCommands) {
    result[cmd] = getCommandInfo(cmd);
  }

  return result;
};

export const allowedArgs: Record<StacktapeCommand, string[]> = Object.fromEntries(
  cliCommands.map((cmd) => [cmd, getAllowedArgs(cmd)])
) as Record<StacktapeCommand, string[]>;

export const requiredArgs: Record<StacktapeCommand, readonly string[]> = Object.fromEntries(
  cliCommands.map((cmd) => [cmd, getRequiredArgs(cmd)])
) as Record<StacktapeCommand, readonly string[]>;
