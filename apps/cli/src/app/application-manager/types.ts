export type CleanupHookFunction = (input?: {
  success: boolean;
  interrupted: boolean;
  err?: Error;
  /**
   * The command did its work and an `afterDeploy` hook failed afterwards. `success` stays true, so nothing is undone;
   * this is for what reports the command's own outcome.
   */
  hookFailure?: Error;
}) => unknown;
