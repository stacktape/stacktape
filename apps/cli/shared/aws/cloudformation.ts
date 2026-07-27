import type { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { consoleLinks } from '@shared/naming/console-links';

export const STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS = [
  StackStatus.CREATE_COMPLETE,
  StackStatus.DELETE_COMPLETE,
  StackStatus.IMPORT_ROLLBACK_COMPLETE,
  StackStatus.IMPORT_COMPLETE,
  StackStatus.ROLLBACK_COMPLETE,
  StackStatus.UPDATE_COMPLETE,
  StackStatus.UPDATE_FAILED,
  StackStatus.UPDATE_ROLLBACK_COMPLETE
];

export const STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS = [
  StackStatus.UPDATE_FAILED,
  StackStatus.CREATE_FAILED,
  StackStatus.UPDATE_ROLLBACK_FAILED
];

export const STACK_OPERATION_IN_PROGRESS_STATUS = [
  StackStatus.CREATE_IN_PROGRESS,
  StackStatus.DELETE_IN_PROGRESS,
  StackStatus.IMPORT_IN_PROGRESS,
  StackStatus.IMPORT_ROLLBACK_IN_PROGRESS,
  StackStatus.REVIEW_IN_PROGRESS,
  StackStatus.ROLLBACK_IN_PROGRESS,
  StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS,
  StackStatus.UPDATE_IN_PROGRESS,
  StackStatus.UPDATE_ROLLBACK_IN_PROGRESS,
  StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS
];

export const respondToCloudformation = async ({
  event,
  error,
  physicalResourceId,
  data,
  logGroupName
}: {
  event: CloudFormationCustomResourceEvent;
  error?: Error;
  physicalResourceId?: string;
  data?: CloudFormationCustomResourceResponse['Data'];
  logGroupName: string;
}) => {
  const body: CloudFormationCustomResourceResponse = {
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: physicalResourceId || 'stpservicecustomresource',
    RequestId: event.RequestId,
    StackId: event.StackId,
    Status: error ? 'FAILED' : 'SUCCESS',
    // maximum size for reason is 4k therefore we truncate error response
    Reason: error
      ? `\n${`${error}`.slice(0, 800)}\n\nSee custom resource logs at:\n${consoleLinks.logGroup(
          process.env.AWS_REGION,
          logGroupName
        )}`
      : 'Custom resource success',
    Data: data || {}
  };

  const stringifiedBody = JSON.stringify(body);

  return globalThis.fetch(event.ResponseURL, {
    headers: { 'content-length': `${stringifiedBody.length}` },
    method: 'PUT',
    body: stringifiedBody
  });
};
