/**
 * Shared by the resolvers that create resources in place of CloudFormation types (`sqsQueue`, `eventsRule`). Their
 * permission is a policy the stack adds to the service Lambda's role together with the first such resource, so the
 * first calls can briefly be denied while IAM propagates it.
 */
export const permissionRetrySettings = { retryMs: 60_000, intervalMs: 2000 };

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** SDK v3 error names vary between `<Code>` and `<Code>Exception`; matching uses the bare code. */
export const errorName = (error: unknown) => String((error as { name?: string })?.name ?? '').replace(/Exception$/, '');

export const isAccessDenied = (error: unknown) => /^AccessDenied/.test(errorName(error));

export const withPermissionRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  const start = Date.now();
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (!isAccessDenied(error) || Date.now() - start > permissionRetrySettings.retryMs) throw error;
      console.info(`[service-lambda-created-resources] retrying after ${errorName(error)}`);
      await sleep(permissionRetrySettings.intervalMs);
    }
  }
};

/**
 * Marks an error with the physical ID of what the failed operation created. The custom resource framework reports it to
 * CloudFormation, whose rollback then deletes that resource; without it the delete gets a placeholder ID and does
 * nothing.
 */
export const withPhysicalResourceId = (error: unknown, physicalResourceId: string) =>
  Object.assign(error instanceof Error ? error : new Error(String(error)), { physicalResourceId });
