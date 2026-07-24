export type OperationIdentity = Readonly<{
  invocationId: string;
  projectName: string;
  region: string;
  stage: string;
}>;

export type CancellationToken = Readonly<{
  aborted: boolean;
  throwIfAborted(): void;
}>;

export type OperationEvent = Readonly<{
  type: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export interface OperationEventSink {
  emit(event: OperationEvent): void | Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export type OperationContext = Readonly<{
  identity: OperationIdentity;
  clock: Clock;
  ids: IdGenerator;
  aws: unknown;
  console: unknown;
  packaging: unknown;
  files: unknown;
  processes: unknown;
  output: OperationEventSink;
  prompts: unknown;
  cancellation: CancellationToken;
}>;
