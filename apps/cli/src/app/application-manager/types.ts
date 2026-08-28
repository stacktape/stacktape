export type CleanupHookFunction = (input?: { success: boolean; interrupted: boolean; err?: Error }) => unknown;
