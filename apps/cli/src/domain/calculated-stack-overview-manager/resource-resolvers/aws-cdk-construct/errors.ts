import { CliError } from '@utils/errors';

const causeMessage = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

export const awsCdkConstructErrors = {
  entryfileRequired(constructName: string) {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'AWS_CDK_CONSTRUCT_ENTRYFILE_REQUIRED',
      message: `AWS CDK construct \`${constructName}\` has no entry file.`,
      hints: 'Set `properties.entryfilePath` to the file that exports the construct class.'
    });
  },

  importFailed({
    constructName,
    exportName,
    filePath,
    cause
  }: {
    constructName: string;
    exportName: string;
    filePath: string;
    cause: unknown;
  }) {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'AWS_CDK_CONSTRUCT_IMPORT_FAILED',
      message: `Could not import export \`${exportName}\` from \`${filePath}\` for AWS CDK construct \`${constructName}\`: ${causeMessage(cause)}`,
      hints: 'Check that the entry file exists and exports the requested construct class.',
      cause
    });
  },

  invalidExport({
    constructName,
    exportName,
    filePath
  }: {
    constructName: string;
    exportName: string;
    filePath: string;
  }) {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'AWS_CDK_CONSTRUCT_EXPORT_INVALID',
      message: `Export \`${exportName}\` from \`${filePath}\` is not a valid AWS CDK construct for \`${constructName}\`.`,
      hints: 'Export a class that extends `Construct`, or point `properties.exportName` at the correct export.'
    });
  },

  stackNotSupported({ constructName, className }: { constructName: string; className: string }) {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'AWS_CDK_STACK_CONSTRUCT_UNSUPPORTED',
      message: `AWS CDK construct \`${constructName}\` exports \`${className}\`, which extends \`Stack\`. Stacktape accepts reusable constructs, not complete CDK stacks.`,
      hints: 'Wrap the resources in a class that extends `Construct` and export that class instead.'
    });
  },

  synthesisFailed({ constructName, cause }: { constructName: string; cause: unknown }) {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'AWS_CDK_CONSTRUCT_SYNTHESIS_FAILED',
      message: `AWS CDK construct \`${constructName}\` failed to synthesize: ${causeMessage(cause)}`,
      hints: 'Fix the reported CDK error, then run the command again.',
      cause
    });
  },

  dependenciesMissing() {
    return new CliError({
      category: 'MISSING_PREREQUISITE',
      code: 'AWS_CDK_CONSTRUCT_DEPENDENCIES_MISSING',
      message: 'Using AWS CDK constructs requires `aws-cdk-lib` and `constructs` in the project.',
      hints: 'Install both packages in the workspace that contains the construct entry file.'
    });
  },

  instantiationFailed({
    constructName,
    exportName,
    cause
  }: {
    constructName: string;
    exportName: string;
    cause: unknown;
  }) {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'AWS_CDK_CONSTRUCT_INSTANTIATION_FAILED',
      message: `Could not instantiate export \`${exportName}\` for AWS CDK construct \`${constructName}\`: ${causeMessage(cause)}`,
      hints:
        'Ensure the exported class can be constructed with `(scope, id, props)` and does not require additional arguments.',
      cause
    });
  }
};
