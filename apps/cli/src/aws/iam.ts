import type { TuiManager as Printer } from '@application-services/tui-manager';
import type { GetRoleCommandOutput, IAMClient } from '@aws-sdk/client-iam';
import type { Policy } from '@cloudform/iam/role';
import {
  AttachRolePolicyCommand,
  CreateRoleCommand,
  DeleteRolePolicyCommand,
  GetRoleCommand,
  ListRolePoliciesCommand,
  MalformedPolicyDocumentException,
  NoSuchEntityException,
  PutRolePolicyCommand,
  UpdateAssumeRolePolicyCommand,
  waitUntilPolicyExists,
  waitUntilRoleExists
} from '@aws-sdk/client-iam';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsIam {
  readonly #createClient: () => IAMClient;
  readonly #getErrorHandler: ErrorHandlerFactory;
  readonly #printer?: Printer;

  constructor({
    createClient,
    getErrorHandler,
    printer
  }: {
    createClient: () => IAMClient;
    getErrorHandler: ErrorHandlerFactory;
    printer?: Printer;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
    this.#printer = printer;
  }

  getRole = async ({
    roleName,
    throwErrorWhenRoleNotExists
  }: {
    roleName: string;
    throwErrorWhenRoleNotExists?: boolean;
  }): Promise<GetRoleCommandOutput['Role']> => {
    try {
      const existingRole = await this.#createClient().send(new GetRoleCommand({ RoleName: roleName }));
      return existingRole.Role;
    } catch (error) {
      if (error instanceof NoSuchEntityException && !throwErrorWhenRoleNotExists) {
        this.#printer?.debug(`Role with name ${roleName} does NOT exist.`);
        return undefined;
      }
      throw error;
    }
  };

  addUserToRolePrincipals = async ({ userArn, roleName }: { userArn: string; roleName: string }) => {
    const errorHandler = this.#getErrorHandler(`Failed to add user ${userArn} to be a principal in role ${roleName}.`);
    const role = await this.getRole({ roleName, throwErrorWhenRoleNotExists: true }).catch(errorHandler);
    const { AssumeRolePolicyDocument } = role;
    const parsedAssumeRolePolicy = JSON.parse(decodeURIComponent(AssumeRolePolicyDocument));
    const rolePolicyAlreadyHasStatementForThisUser = parsedAssumeRolePolicy.Statement.find(
      ({ Principal }) => Principal?.AWS === userArn
    );
    if (rolePolicyAlreadyHasStatementForThisUser) {
      this.#printer?.debug(`User ${userArn} is already principal for the role ${roleName}.`);
      return;
    }
    parsedAssumeRolePolicy.Statement.push({
      Effect: 'Allow',
      Principal: { AWS: userArn },
      Action: 'sts:AssumeRole'
    });

    return this.#createClient()
      .send(
        new UpdateAssumeRolePolicyCommand({
          PolicyDocument: JSON.stringify(parsedAssumeRolePolicy),
          RoleName: roleName
        })
      )
      .catch(async (error) => {
        if (
          error instanceof MalformedPolicyDocumentException &&
          `${error}`.includes('Invalid principal in policy') &&
          !`${error}`.includes(userArn)
        ) {
          const malformedPrincipalIndex = parsedAssumeRolePolicy.Statement.findIndex(
            ({ Principal }) => Principal.AWS && `${error}`.includes(Principal.AWS)
          );
          if (malformedPrincipalIndex !== -1) {
            parsedAssumeRolePolicy.Statement.splice(malformedPrincipalIndex, 1);
            await this.#createClient()
              .send(
                new UpdateAssumeRolePolicyCommand({
                  PolicyDocument: JSON.stringify(parsedAssumeRolePolicy),
                  RoleName: roleName
                })
              )
              .catch(errorHandler);
            return;
          }
        }
        errorHandler(error as Error);
      });
  };

  createRole = async ({
    roleName,
    assumeRolePolicyDocument,
    description,
    maxSessionDuration
  }: {
    roleName: string;
    assumeRolePolicyDocument: Record<string, any>;
    description?: string;
    maxSessionDuration?: number;
  }) => {
    const errorHandler = this.#getErrorHandler(`Unable to create role ${roleName}.`);
    const commandOutput = await this.#createClient()
      .send(
        new CreateRoleCommand({
          RoleName: roleName,
          AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
          Description: description,
          MaxSessionDuration: maxSessionDuration
        })
      )
      .catch(errorHandler);
    await waitUntilRoleExists(
      { client: this.#createClient(), maxWaitTime: 60 },
      { RoleName: commandOutput.Role.RoleName }
    );
    return commandOutput.Role;
  };

  updateRoleAssumePolicy = async ({
    roleName,
    assumeRolePolicyDocument
  }: {
    roleName: string;
    assumeRolePolicyDocument: Record<string, any>;
  }) => {
    const errorHandler = this.#getErrorHandler(`Unable to update role ${roleName} assume policy.`);
    return this.#createClient()
      .send(
        new UpdateAssumeRolePolicyCommand({
          RoleName: roleName,
          PolicyDocument: JSON.stringify(assumeRolePolicyDocument)
        })
      )
      .catch(errorHandler);
  };

  attachManagedPolicyToRole = async ({ roleName, policyArn }: { roleName: string; policyArn: string }) => {
    const errorHandler = this.#getErrorHandler(`Unable to add policy ${policyArn} to role ${roleName}.`);
    await this.#createClient()
      .send(new AttachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn }))
      .catch(errorHandler);
    await waitUntilPolicyExists({ client: this.#createClient(), maxWaitTime: 60 }, { PolicyArn: policyArn });
  };

  reconcileInlineRolePolicies = async ({
    roleName,
    desiredPolicies
  }: {
    roleName: string;
    desiredPolicies: Policy[];
  }) => {
    const errorHandler = this.#getErrorHandler(`Failed to modify role policies of role ${roleName}.`);
    const currentPolicyNames = await this.listInlineRolePolicies({ roleName });
    const policiesToBeDeleted = currentPolicyNames.filter(
      (currentlyIncludedPolicy) => !desiredPolicies.some(({ PolicyName }) => PolicyName === currentlyIncludedPolicy)
    );
    await Promise.all(
      desiredPolicies.map((policyConfig) =>
        this.#createClient().send(
          new PutRolePolicyCommand({
            PolicyName: `${policyConfig.PolicyName}`,
            PolicyDocument: JSON.stringify(policyConfig.PolicyDocument),
            RoleName: roleName
          })
        )
      )
    ).catch(errorHandler);

    if (policiesToBeDeleted.length) {
      await Promise.all(
        policiesToBeDeleted.map((PolicyName) =>
          this.#createClient().send(new DeleteRolePolicyCommand({ PolicyName, RoleName: roleName }))
        )
      ).catch(errorHandler);
    }
  };

  listInlineRolePolicies = async ({ roleName }: { roleName: string }) => {
    const errorHandler = this.#getErrorHandler(`Failed to list role policies of role ${roleName}.`);
    const allPolicies: string[][] = [];
    let { Marker, PolicyNames } = await this.#createClient()
      .send(new ListRolePoliciesCommand({ RoleName: roleName }))
      .catch(errorHandler);
    allPolicies.push(PolicyNames || []);
    while (Marker) {
      ({ Marker, PolicyNames } = await this.#createClient()
        .send(new ListRolePoliciesCommand({ RoleName: roleName, Marker }))
        .catch(errorHandler));
      allPolicies.push(PolicyNames || []);
    }
    return allPolicies.flat();
  };
}

export const getAssumeRolePolicyDocumentForFunctionRole = () => ({
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: ['lambda.amazonaws.com', 'edgelambda.amazonaws.com']
      },
      Action: 'sts:AssumeRole'
    }
  ],
  Version: '2012-10-17'
});
