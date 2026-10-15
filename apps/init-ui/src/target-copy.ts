import type { WizardState } from './session';

type ObservedTarget = NonNullable<WizardState['deployTarget']>;
type BlockedTarget = Extract<ObservedTarget, { status: 'blocked' }>;

/** A stack that can be updated, in words: what happened to it last. */
export const stackStatusWords = (stackStatus: string): string =>
  ({
    CREATE_COMPLETE: 'it was created and has not changed since',
    UPDATE_COMPLETE: 'its last update finished',
    UPDATE_ROLLBACK_COMPLETE: 'its last update failed and was rolled back',
    UPDATE_FAILED: 'its last update failed',
    IMPORT_COMPLETE: 'its last change finished',
    IMPORT_ROLLBACK_COMPLETE: 'its last change was rolled back'
  })[stackStatus] ?? `its status is ${stackStatus}`;

/**
 * Why Stacktape will not touch a stack, and the way out.
 *
 * `fix` names the command that is the way out: `delete` only where AWS allows nothing else and the
 * stack holds nothing that worked, `rollback` where CloudFormation's own rollback recovers it.
 */
export const blockedTargetCopy = (
  target: BlockedTarget
): { title: string; body: string; fix?: 'delete' | 'rollback' } => {
  const status = target.stackStatus ?? '';
  const name = target.stackName;
  if (target.reason === 'foreign-stack') {
    return {
      title: 'Another tool owns a stack with this name',
      body: `${name} exists in this account and region, but Stacktape did not create it. Pick another stage name above.`
    };
  }
  if (target.reason === 'identity-mismatch') {
    return {
      title: 'This stack belongs to another project or stage',
      body: `${name} was deployed by Stacktape for a different project or stage. Pick another stage name above.`
    };
  }
  if (target.reason === 'incomplete-stack-data') {
    return {
      title: 'AWS did not fully describe this stack',
      body: `Check again in a moment. If this keeps happening, look at ${name} in the AWS CloudFormation console.`
    };
  }
  if (status === 'DELETE_IN_PROGRESS') {
    return {
      title: 'AWS is still removing this stack',
      body: `${name} is being deleted, usually what a failed deploy created. Wait a few minutes, then check again.`
    };
  }
  if (status.endsWith('_IN_PROGRESS')) {
    return {
      title: 'Another change to this stack is still running',
      body: `AWS is still working on ${name}. Wait until it finishes, then check again.`
    };
  }
  if (['ROLLBACK_COMPLETE', 'ROLLBACK_FAILED', 'CREATE_FAILED'].includes(status)) {
    return {
      title: 'A failed first deploy left this stack behind',
      body: `${name} was never created successfully, and AWS only allows deleting it. Delete it with the command below, then check again.`,
      fix: 'delete'
    };
  }
  if (status === 'DELETE_FAILED') {
    return {
      title: 'An earlier delete of this stack did not finish',
      body: `Run the delete again, then check again. If it fails, its output names what AWS could not remove.`,
      fix: 'delete'
    };
  }
  if (status === 'UPDATE_ROLLBACK_FAILED') {
    return {
      title: 'This stack is stuck after a failed update',
      body: `AWS could not roll back the last update of ${name}. This command finishes the rollback; then check again.`,
      fix: 'rollback'
    };
  }
  if (status === 'IMPORT_ROLLBACK_FAILED') {
    return {
      title: 'This stack is stuck after a failed import',
      body: `AWS could not undo a resource import into ${name}. Resolve it in the AWS CloudFormation console, then check again.`
    };
  }
  return {
    title: 'Stacktape will not change this stack',
    body: `${name} is in a state Stacktape does not update (${status || 'unknown'}). Check again once it has settled.`
  };
};
