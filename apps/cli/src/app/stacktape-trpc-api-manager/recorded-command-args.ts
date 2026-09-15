/**
 * The arguments recorded with an operation. The Console reads the stage out of them, so a stage that came from
 * `stacktape defaults:configure` rather than `--stage` is added here; without it the deployment record has no
 * stage, and reports about that deployment cannot be attached to a stack.
 */
export const commandArgsForRecording = <T extends Record<string, unknown>>({
  args,
  stage
}: {
  args: T;
  stage: string | number | undefined;
}): T | (T & { stage: string | number }) => (stage !== undefined && args.stage == null ? { ...args, stage } : args);
