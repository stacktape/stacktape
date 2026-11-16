import { recordedCommandArgs, type RecordedCommandArgs } from '@stacktape/console-api/api-key';

/**
 * The arguments recorded with an operation: only the flags that name the target and how the command ran (see
 * `recordedCommandArgs`). Free-form values such as `--dockerArgs` stay on this machine.
 *
 * The Console reads the stage out of them, so a stage that came from `stacktape defaults:configure` rather than
 * `--stage` is added here; without it the deployment record has no stage, and reports about that deployment cannot be
 * attached to a stack.
 */
export const commandArgsForRecording = ({
  args,
  stage
}: {
  args: Record<string, unknown>;
  stage: string | number | undefined;
}): RecordedCommandArgs => {
  const recorded = recordedCommandArgs(args);
  return stage !== undefined && recorded.stage == null ? { ...recorded, stage } : recorded;
};
