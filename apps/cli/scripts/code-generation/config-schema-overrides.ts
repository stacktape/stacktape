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
