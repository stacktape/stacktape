import type { TypeSummary, TypeVersionSummary } from '@aws-sdk/client-cloudformation';
import {
  DeregisterTypeCommand,
  DescribeTypeRegistrationCommand,
  ListTypesCommand,
  ListTypeVersionsCommand,
  RegisterTypeCommand,
  SetTypeDefaultVersionCommand,
  type CloudFormationClient
} from '@aws-sdk/client-cloudformation';
import { CliError } from '@utils/errors';
import { wait } from '@utils/misc';

type CloudFormationClientFactory = () => CloudFormationClient;
type ErrorHandlerFactory = (message: string) => (error: Error) => never;
type RateLimiter = <T>(operation: () => Promise<T>) => Promise<T>;

export type RegisteredPrivateTypeVersion = TypeVersionSummary & {
  Arn: NonNullable<TypeVersionSummary['Arn']>;
};

const hasVersionArn = (version: TypeVersionSummary): version is RegisteredPrivateTypeVersion => Boolean(version.Arn);

export class AwsCloudFormationRegistry {
  readonly #createClient: CloudFormationClientFactory;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: CloudFormationClientFactory;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  /** Lists every private resource type together with all of its registered versions. */
  listTypesWithVersions = async (): Promise<Record<string, RegisteredPrivateTypeVersion[]>> => {
    const handleError = this.#getErrorHandler('Failed to list private cloudformation types.');
    const listTypesInput = { DeprecatedStatus: 'LIVE', Type: 'RESOURCE', Visibility: 'PRIVATE' } as const;
    const types: TypeSummary[] = [];
    let nextToken: string | undefined;

    do {
      const page = await this.#createClient()
        .send(new ListTypesCommand(nextToken ? { ...listTypesInput, NextToken: nextToken } : listTypesInput))
        .catch(handleError);
      types.push(...(page.TypeSummaries || []));
      nextToken = page.NextToken;
    } while (nextToken);

    const versionsByType: Record<string, RegisteredPrivateTypeVersion[]> = {};
    await Promise.all(
      types.map(async ({ TypeArn, TypeName }) => {
        if (!TypeName || !TypeArn) {
          return handleError(
            new Error('CloudFormation listed a private resource type without a type name or a type ARN.')
          );
        }

        const versions: RegisteredPrivateTypeVersion[] = [];
        versionsByType[TypeName] = versions;
        let versionNextToken: string | undefined;
        do {
          const page = await this.#createClient()
            .send(
              new ListTypeVersionsCommand(
                versionNextToken ? { Arn: TypeArn, NextToken: versionNextToken } : { Arn: TypeArn }
              )
            )
            .catch(handleError);
          for (const version of page.TypeVersionSummaries || []) {
            if (!hasVersionArn(version)) {
              return handleError(new Error(`CloudFormation listed a version of ${TypeName} without an ARN.`));
            }
            versions.push(version);
          }
          versionNextToken = page.NextToken;
        } while (versionNextToken);
      })
    );
    return versionsByType;
  };

  registerType = async ({
    schemaHandlerPackageS3Url,
    typeName,
    executionRoleArn,
    rateLimiter
  }: {
    schemaHandlerPackageS3Url: string;
    typeName: string;
    executionRoleArn?: string;
    rateLimiter: RateLimiter;
  }) => {
    const handleError = this.#getErrorHandler(`Failed to register private cloudformation resource type ${typeName}.`);
    const { RegistrationToken } = await rateLimiter(() =>
      this.#createClient()
        .send(
          new RegisterTypeCommand({
            SchemaHandlerPackage: schemaHandlerPackageS3Url,
            TypeName: typeName,
            ExecutionRoleArn: executionRoleArn,
            Type: 'RESOURCE'
          })
        )
        .catch(handleError)
    );

    let { ProgressStatus, Description, TypeVersionArn } = await rateLimiter(() =>
      this.#createClient().send(new DescribeTypeRegistrationCommand({ RegistrationToken })).catch(handleError)
    );
    while (ProgressStatus !== 'COMPLETE') {
      ({ ProgressStatus, Description, TypeVersionArn } = await rateLimiter(() =>
        this.#createClient().send(new DescribeTypeRegistrationCommand({ RegistrationToken })).catch(handleError)
      ));
      await wait(10_000);
      if (ProgressStatus === 'FAILED') {
        throw new CliError({
          category: 'AWS',
          code: 'AWS_CLOUDFORMATION_TYPE_REGISTRATION_FAILED',
          message: `Registration of private cloudformation resource type ${typeName} failed. Registration description: ${Description}`
        });
      }
    }
    return TypeVersionArn;
  };

  setDefaultVersion = async ({ typeVersionArn, rateLimiter }: { typeVersionArn: string; rateLimiter: RateLimiter }) => {
    const handleError = this.#getErrorHandler(
      `Failed to set private cloudformation resource type version ${typeVersionArn} as default`
    );
    await rateLimiter(() =>
      this.#createClient()
        .send(new SetTypeDefaultVersionCommand({ Arn: typeVersionArn }))
        .catch(handleError)
    );
  };

  deregisterVersion = async ({ typeVersionArn, rateLimiter }: { typeVersionArn: string; rateLimiter: RateLimiter }) => {
    const handleError = this.#getErrorHandler(
      `Failed to deregister private cloudformation resource type version ${typeVersionArn}.`
    );
    await rateLimiter(() =>
      this.#createClient()
        .send(new DeregisterTypeCommand({ Arn: typeVersionArn }))
        .catch(handleError)
    );
  };
}
