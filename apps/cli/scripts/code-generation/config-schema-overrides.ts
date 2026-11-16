export type ConfigJsonSchema = {
  definitions?: Record<string, ConfigJsonSchema>;
  properties?: Record<string, ConfigJsonSchema>;
  [key: string]: unknown;
};

const INTRINSIC_KEYS = [
  'Ref',
  'Condition',
  'Fn::And',
  'Fn::Base64',
  'Fn::Equals',
  'Fn::FindInMap',
  'Fn::GetAtt',
  'Fn::GetAZs',
  'Fn::If',
  'Fn::ImportValue',
  'Fn::Join',
  'Fn::Not',
  'Fn::Or',
  'Fn::Select',
  'Fn::Split',
  'Fn::Sub'
] as const;

/**
 * `typescript-json-schema` does not follow an imported type alias when it appears inside a union. The TypeScript
 * surface remains correct, but the emitted property becomes unconstrained. Bridge the one current occurrence with
 * the compact structural form the runtime can validate. Inlining the recursive `Intrinsic` union adds thousands of
 * lines to the generated Zod validator for no useful runtime distinction. The config boundary only needs to prove
 * that this is one of the intrinsic object shapes; CloudFormation owns validation of each function's nested value.
 */
export const restoreImportedConfigTypes = ({ schema }: { schema: ConfigJsonSchema }): void => {
  const accessPointArn = schema.definitions?.LambdaS3FilesMountProps?.properties?.accessPointArn;
  if (!accessPointArn) {
    throw new Error(
      'Cannot restore Intrinsic: LambdaS3FilesMountProps.accessPointArn is missing from the config schema.'
    );
  }
  accessPointArn.anyOf = [
    { type: 'string' },
    {
      type: 'object',
      properties: Object.fromEntries(INTRINSIC_KEYS.map((key) => [key, {}])),
      minProperties: 1,
      maxProperties: 1,
      additionalProperties: false
    }
  ];
};

/** Amazon States Language states and the path fields in them that accept `null`. */
const NULLABLE_STATE_PATHS: Record<string, string[]> = {
  Choice: ['InputPath', 'OutputPath'],
  Fail: ['InputPath', 'OutputPath'],
  StateMachineMap: ['InputPath', 'OutputPath', 'ResultPath', 'ItemsPath'],
  Parallel: ['InputPath', 'OutputPath', 'ResultPath'],
  Pass: ['InputPath', 'OutputPath', 'ResultPath'],
  Task: ['InputPath', 'OutputPath', 'ResultPath'],
  Wait: ['InputPath', 'OutputPath', 'SecondsPath', 'TimestampPath']
};

/**
 * The schema is generated without `strictNullChecks`, so `string | null` is emitted as `string`. Amazon States Language
 * uses `null` in path fields to discard input or output, so restore it for those fields only.
 */
export const restoreNullableStatePaths = ({ schema }: { schema: ConfigJsonSchema }): void => {
  for (const [definitionName, paths] of Object.entries(NULLABLE_STATE_PATHS)) {
    for (const path of paths) {
      const property = schema.definitions?.[definitionName]?.properties?.[path];
      if (property?.type !== 'string') {
        throw new Error(
          `Cannot restore null: ${definitionName}.${path} is not a string property in the config schema.`
        );
      }
      property.type = ['string', 'null'];
    }
  }
};
