import type { CloudformationTemplate, StackDetails } from '@domain-services/cloudformation-stack-manager/types';
import type {
  CreateChangeSetInput,
  CreateStackInput,
  ListStackResourcesCommandOutput,
  SetStackPolicyInput,
  Stack,
  StackEvent,
  StackResourceSummary,
  StackSummary,
  UpdateStackInput
} from '@aws-sdk/client-cloudformation';
import {
  CancelUpdateStackCommand,
  type CloudFormationClient,
  ContinueUpdateRollbackCommand,
  CreateChangeSetCommand,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeChangeSetCommand,
  DescribeStackEventsCommand,
  DescribeStacksCommand,
  GetTemplateCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  RollbackStackCommand,
  SetStackPolicyCommand,
  UpdateStackCommand,
  UpdateTerminationProtectionCommand,
  ValidateTemplateCommand
} from '@aws-sdk/client-cloudformation';
import { CliError } from '@utils/errors';
import { wait } from '@utils/misc';
import { parseYaml } from '@utils/yaml';

type CloudFormationClientFactory = (region?: string) => CloudFormationClient;
type ErrorHandlerFactory = (message: string) => (error: Error) => never;

/** A stack event carrying every field used by deployment monitoring. */
export type MonitoredStackEvent = StackEvent & {
  Timestamp: NonNullable<StackEvent['Timestamp']>;
  EventId: NonNullable<StackEvent['EventId']>;
  LogicalResourceId: NonNullable<StackEvent['LogicalResourceId']>;
  ResourceStatus: NonNullable<StackEvent['ResourceStatus']>;
};

const hasUsableTimestamp = (event: StackEvent): event is StackEvent & { Timestamp: Date } =>
  event.Timestamp instanceof Date && Number.isFinite(event.Timestamp.getTime());

const isMonitoredStackEvent = (event: StackEvent): event is MonitoredStackEvent =>
  hasUsableTimestamp(event) &&
  typeof event.EventId === 'string' &&
  typeof event.LogicalResourceId === 'string' &&
  typeof event.ResourceStatus === 'string';

const findOldestUsableTimestamp = (events: StackEvent[]): Date | undefined => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (hasUsableTimestamp(event)) {
      return event.Timestamp;
    }
  }
  return undefined;
};

export class AwsCloudFormationStacks {
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

  validateTemplate = ({ templateBody, templateUrl }: { templateUrl?: string; templateBody?: string }) => {
    return this.#createClient()
      .send(
        new ValidateTemplateCommand({
          ...(templateUrl && { TemplateURL: templateUrl }),
          ...(templateBody && { TemplateBody: templateBody })
        })
      )
      .catch((error) => {
        throw new CliError({
          category: 'CLOUDFORMATION',
          code: 'CLOUDFORMATION_TEMPLATE_INVALID',
          message: `Template validation failed.\nCode: ${error.code}\nMessage: ${error.message}`,
          cause: error
        });
      });
  };

  create = (template: CloudformationTemplate, stackParams: CreateStackInput) => {
    const handleError = this.#getErrorHandler('Failed to initiate stack creation.');
    return this.#createClient()
      .send(new CreateStackCommand({ ...stackParams, TemplateBody: JSON.stringify(template) }))
      .catch(handleError);
  };

  update = (templateUrl: string, stackParams: UpdateStackInput) => {
    const handleError = this.#getErrorHandler('Failed to initiate stack update.');
    return this.#createClient()
      .send(new UpdateStackCommand({ ...stackParams, TemplateURL: templateUrl }))
      .then((result) => ({ ...result, skipped: false as const }))
      .catch((error) => {
        if (error.message === 'No updates are to be performed.') {
          return { skipped: true as const };
        }
        return handleError(error);
      });
  };

  cancelUpdate = (stackName: string) => {
    const handleError = this.#getErrorHandler('Failed to cancel update stack.');
    return this.#createClient()
      .send(new CancelUpdateStackCommand({ StackName: stackName }))
      .catch(handleError);
  };

  delete = (stackName: string, { roleArn }: { roleArn?: string }) => {
    const handleError = this.#getErrorHandler('Failed to initiate stack deletion.');
    return this.#createClient()
      .send(new DeleteStackCommand({ StackName: stackName, RoleARN: roleArn }))
      .catch(handleError);
  };

  rollback = (stackName: string, { roleArn }: { roleArn: string }) => {
    const handleError = this.#getErrorHandler('Failed to initiate stack rollback.');
    return this.#createClient()
      .send(new RollbackStackCommand({ StackName: stackName, RoleARN: roleArn }))
      .catch(handleError);
  };

  continueRollback = (
    stackName: string,
    { roleArn, resourcesToSkip }: { roleArn: string; resourcesToSkip?: string[] }
  ) => {
    const handleError = this.#getErrorHandler('Failed to initiate stack rollback continuation.');
    return this.#createClient()
      .send(
        new ContinueUpdateRollbackCommand({
          StackName: stackName,
          RoleARN: roleArn,
          ResourcesToSkip: resourcesToSkip
        })
      )
      .catch(handleError);
  };

  /** Fetches monitorable events at or after `since`, preserving CloudFormation's newest-first order. */
  getEvents = async (stackName: string, since: Date): Promise<MonitoredStackEvent[]> => {
    const handleError = this.#getErrorHandler('Failed to fetch stack events.');
    const result: MonitoredStackEvent[][] = [];
    let nextToken: string | undefined;

    do {
      const page = await this.#createClient()
        .send(
          new DescribeStackEventsCommand(
            nextToken ? { StackName: stackName, NextToken: nextToken } : { StackName: stackName }
          )
        )
        .catch(handleError);
      const events = page.StackEvents || [];
      result.push(events.filter(isMonitoredStackEvent).filter(({ Timestamp }) => Timestamp >= since));
      nextToken = page.NextToken;
      const oldestUsableTimestamp = findOldestUsableTimestamp(events);
      if (oldestUsableTimestamp && oldestUsableTimestamp < since) {
        break;
      }
    } while (nextToken);

    return result.flat();
  };

  getResources = async (stackName: string): Promise<StackResourceSummary[]> => {
    const handleError = this.#getErrorHandler('Could not fetch existing stack information.');
    const result: StackResourceSummary[] = [];
    const fetchPage = (nextToken?: string) =>
      this.#createClient()
        .send(new ListStackResourcesCommand({ StackName: stackName, ...(nextToken ? { NextToken: nextToken } : {}) }))
        .catch((error) => {
          if (error.message.startsWith('Stack with id') && error.message.endsWith('does not exist')) {
            return {} as ListStackResourcesCommandOutput;
          }
          return handleError(error);
        });

    let { StackResourceSummaries, NextToken } = await fetchPage();
    result.push(...(StackResourceSummaries || []));
    while (NextToken) {
      ({ StackResourceSummaries, NextToken } = await fetchPage(NextToken));
      result.push(...(StackResourceSummaries || []));
    }
    return result;
  };

  list = async (): Promise<StackSummary[]> => {
    const handleError = this.#getErrorHandler('Could not list stacks');
    const result: StackSummary[] = [];
    let { StackSummaries, NextToken } = await this.#createClient().send(new ListStacksCommand({})).catch(handleError);
    result.push(...(StackSummaries || []));
    while (NextToken) {
      ({ StackSummaries, NextToken } = await this.#createClient()
        .send(new ListStacksCommand({ NextToken }))
        .catch(handleError));
      result.push(...(StackSummaries || []));
    }
    return result;
  };

  getDetails = async (stackName: string, region?: string): Promise<StackDetails> => {
    const handleError = this.#getErrorHandler('Could not fetch existing stack information.');
    const stackDescription = await this.#createClient(region)
      .send(new DescribeStacksCommand({ StackName: stackName }))
      .catch((error) => {
        if (error.message.startsWith('Stack with id') && error.message.endsWith('does not exist')) {
          return null;
        }
        return handleError(error);
      });
    if (!stackDescription) {
      return null;
    }

    const stackData = stackDescription.Stacks[0] as Stack;
    return {
      ...stackData,
      Outputs: stackData?.Outputs || [],
      stackOutput: (stackData.Outputs || []).reduce(
        (outputs, { OutputKey, OutputValue }) => {
          outputs[OutputKey] = OutputValue;
          return outputs;
        },
        {} as Record<string, string>
      )
    };
  };

  createChangeSet = async (input: CreateChangeSetInput & { includePropertyValues?: boolean }) => {
    const handleError = this.#getErrorHandler('Failed to fetch change-set details.');
    const { includePropertyValues, ...createChangeSetInput } = input;
    const { Id, StackId } = await this.#createClient()
      .send(new CreateChangeSetCommand(createChangeSetInput))
      .catch(this.#getErrorHandler('Failed to initiate creation of changes set.'));

    let changeSet = await this.#createClient()
      .send(new DescribeChangeSetCommand({ ChangeSetName: Id, IncludePropertyValues: includePropertyValues }))
      .catch(handleError);
    while (changeSet.Status !== 'CREATE_COMPLETE') {
      await wait(750);
      changeSet = await this.#createClient()
        .send(new DescribeChangeSetCommand({ ChangeSetName: Id, IncludePropertyValues: includePropertyValues }))
        .catch(handleError);
    }

    return { changes: changeSet.Changes, changeSetId: Id, stackId: StackId };
  };

  setPolicy = async (input: SetStackPolicyInput) => {
    const handleError = this.#getErrorHandler('Failed to update stack policy.');
    return this.#createClient().send(new SetStackPolicyCommand(input)).catch(handleError);
  };

  setTerminationProtection = async (enabled: boolean, stackName: string) => {
    const handleError = this.#getErrorHandler('Failed to set termination protection');
    return this.#createClient()
      .send(new UpdateTerminationProtectionCommand({ EnableTerminationProtection: enabled, StackName: stackName }))
      .catch(handleError);
  };

  getTemplate = async (stackName: string) => {
    const handleError = this.#getErrorHandler(
      `Unable to retrieve template of a Cloudformation stack with name ${stackName}`
    );
    const result = await this.#createClient()
      .send(new GetTemplateCommand({ StackName: stackName }))
      .catch(handleError);
    return parseYaml(result.TemplateBody);
  };
}
