import { tagNames } from '@stacktape/naming/tag-names';
import { CliError } from '@utils/errors';

/**
 * Whether `stacktape dev` created this stack. The dev-stack output of the full template is lost when the first dev
 * stack update rolls back to the bootstrap template, so the stack tag `dev` sets from the first create on counts too.
 */
export const isStackCreatedByDev = ({
  isDevStack,
  tags
}: {
  isDevStack: unknown;
  tags?: { Key?: string; Value?: string }[];
}): boolean =>
  isDevStack === true || Boolean(tags?.some(({ Key, Value }) => Key === tagNames.devStack() && Value === 'true'));

export const assertExistingDevStack = ({
  stackName,
  stage,
  isDevStack,
  tags,
  stackStatus
}: {
  stackName: string;
  stage: string;
  isDevStack: unknown;
  tags?: { Key?: string; Value?: string }[];
  stackStatus?: string;
}): void => {
  if (!isStackCreatedByDev({ isDevStack, tags })) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_STACK_CONFLICT',
      message: `Stack \`${stackName}\` exists, but \`stacktape dev\` did not create it.`,
      hints: [
        'Dev mode never updates or deletes a stack it did not create. Choose another stage with `--stage`.',
        `If you no longer need the existing stack, delete it with \`stacktape delete --stage ${stage}\` first.`
      ]
    });
  }
  // A dev stack whose first create rolled back has no resources and cannot be updated, only deleted.
  if (stackStatus === 'ROLLBACK_COMPLETE') {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_DEV_STACK_NOT_UPDATABLE',
      message: `Dev stack \`${stackName}\` failed while it was being created and CloudFormation cannot update it.`,
      hints: `Delete it with \`stacktape delete --stage ${stage}\`, then run \`stacktape dev\` again.`
    });
  }
};
