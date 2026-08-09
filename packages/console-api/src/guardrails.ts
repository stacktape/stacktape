import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1).max(200);
const nonEmptyStringList = z.array(nonEmptyString).min(1).max(100);

/**
 * Commands for which the CLI loads organization guardrails before doing the guarded work.
 * Read-only validation/preview commands stay available so a developer can diagnose a blocked deployment.
 */
export const GUARDRAIL_COMMANDS = [
  'deploy',
  'delete',
  'dev',
  'deployment-script:run',
  'script:run',
  'rollback',
  'cf:rollback'
] as const;

const booleanGuardrailPropertiesSchema = z.object({ enabled: z.boolean().optional() }).strict();

/**
 * Tolerant wire/storage schema. Optional properties preserve guardrails written by older Console versions; the
 * stricter input schema below prevents creating a guardrail that has no effect.
 */
export const guardrailDefinitionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stage-restriction'),
    properties: z.object({ allowedStages: nonEmptyStringList.optional() }).strict()
  }),
  z.object({
    type: z.literal('region-restriction'),
    properties: z.object({ allowedRegions: nonEmptyStringList.optional() }).strict()
  }),
  z.object({
    type: z.literal('command-restriction'),
    properties: z.object({ blockedCommands: nonEmptyStringList.optional() }).strict()
  }),
  z.object({
    type: z.literal('resource-type-restriction'),
    properties: z.object({ blockedResourceTypes: nonEmptyStringList.optional() }).strict()
  }),
  z.object({ type: z.literal('require-vpc-databases'), properties: booleanGuardrailPropertiesSchema }),
  z.object({ type: z.literal('require-deletion-protection'), properties: booleanGuardrailPropertiesSchema }),
  z.object({ type: z.literal('require-dead-letter-queue'), properties: booleanGuardrailPropertiesSchema }),
  z.object({
    type: z.literal('function-memory-limit'),
    properties: z.object({ maxMemoryMB: z.number().int().min(128).max(10_240).optional() }).strict()
  }),
  z.object({
    type: z.literal('function-timeout-limit'),
    properties: z.object({ maxTimeoutSeconds: z.number().int().min(1).max(900).optional() }).strict()
  }),
  z.object({
    type: z.literal('container-resource-limit'),
    properties: z
      .object({
        maxCpu: z.number().positive().max(192).optional(),
        maxMemoryMB: z.number().int().positive().max(786_432).optional()
      })
      .strict()
  }),
  z.object({
    type: z.literal('database-engine-restriction'),
    properties: z.object({ allowedEngines: nonEmptyStringList.optional() }).strict()
  }),
  z.object({
    type: z.literal('database-instance-restriction'),
    properties: z
      .object({
        allowedInstanceSizes: nonEmptyStringList.optional(),
        /** Older policies used a blocklist. Keep reading and enforcing it, but new Console forms use an allowlist. */
        blockedInstanceSizes: nonEmptyStringList.optional()
      })
      .strict()
  }),
  z.object({ type: z.literal('require-waf'), properties: booleanGuardrailPropertiesSchema }),
  z.object({ type: z.literal('require-custom-domain'), properties: booleanGuardrailPropertiesSchema }),
  z.object({
    type: z.literal('resource-count-limit'),
    properties: z.object({ maxResources: z.number().int().positive().max(10_000).optional() }).strict()
  }),
  z.object({
    type: z.literal('require-stack-termination-protection'),
    properties: booleanGuardrailPropertiesSchema
  }),
  z.object({ type: z.literal('require-data-backups'), properties: booleanGuardrailPropertiesSchema }),
  z.object({
    type: z.literal('require-multiple-container-instances'),
    properties: booleanGuardrailPropertiesSchema
  })
]);

export type GuardrailDefinition = z.infer<typeof guardrailDefinitionSchema>;
export type GuardrailType = GuardrailDefinition['type'];

const propertiesHaveConfiguredValue = (definition: GuardrailDefinition) => {
  const properties = definition.properties as Record<string, unknown>;
  return Object.values(properties).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== false
  );
};

/** Canonical schema for newly created/replaced guardrails. */
export const guardrailDefinitionInputSchema = guardrailDefinitionSchema.superRefine((definition, context) => {
  if (!propertiesHaveConfiguredValue(definition)) {
    context.addIssue({
      code: 'custom',
      path: ['properties'],
      message: 'Configure at least one value before enabling this guardrail.'
    });
  }

  if (definition.type === 'command-restriction') {
    const invalidCommands =
      definition.properties.blockedCommands?.filter(
        (command) => !GUARDRAIL_COMMANDS.includes(command as (typeof GUARDRAIL_COMMANDS)[number])
      ) || [];
    if (invalidCommands.length) {
      context.addIssue({
        code: 'custom',
        path: ['properties', 'blockedCommands'],
        message: `Unsupported guarded commands: ${invalidCommands.join(', ')}.`
      });
    }
  }
});
