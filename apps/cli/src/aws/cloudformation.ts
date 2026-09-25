import type { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';
import type { StackStatus } from '@aws-sdk/client-cloudformation';
import { consoleLinks } from '@stacktape/naming/console-links';

export const STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS = [
  'CREATE_COMPLETE',
  'DELETE_COMPLETE',
  'IMPORT_ROLLBACK_COMPLETE',
  'IMPORT_COMPLETE',
  'ROLLBACK_COMPLETE',
  'UPDATE_COMPLETE',
  'UPDATE_FAILED',
  'UPDATE_ROLLBACK_COMPLETE'
] satisfies StackStatus[];

export const STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS = [
  'UPDATE_FAILED',
  'CREATE_FAILED',
  'UPDATE_ROLLBACK_FAILED'
] satisfies StackStatus[];

export const STACK_OPERATION_IN_PROGRESS_STATUS = [
  'CREATE_IN_PROGRESS',
  'DELETE_IN_PROGRESS',
  'IMPORT_IN_PROGRESS',
  'IMPORT_ROLLBACK_IN_PROGRESS',
  'REVIEW_IN_PROGRESS',
  'ROLLBACK_IN_PROGRESS',
  'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
  'UPDATE_IN_PROGRESS',
  'UPDATE_ROLLBACK_IN_PROGRESS',
  'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS'
] satisfies StackStatus[];

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
    // Bytes, not characters: a reason with a non-ASCII path is longer in UTF-8, and a short length never completes.
    headers: { 'content-length': `${Buffer.byteLength(stringifiedBody)}` },
    method: 'PUT',
    body: stringifiedBody
  });
};
