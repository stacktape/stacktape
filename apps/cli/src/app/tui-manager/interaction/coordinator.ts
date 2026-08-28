import { operationSession, type OperationPromptRequest } from '@application-services/operation-manager';
import { UserCancelledError } from '../prompt/inline';

type PendingPrompt = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  describe: (value: unknown) => string;
  sensitive: boolean;
  sensitiveDefault?: string;
};

type PromptInput = OperationPromptRequest extends infer Prompt
  ? Prompt extends OperationPromptRequest
    ? Omit<Prompt, 'id'>
    : never
  : never;

/** Keeps non-serializable prompt resolvers and cancellation callbacks out of operation state. */
export class InteractionCoordinator {
  private promptSequence = 0;
  private pendingPrompts = new Map<string, PendingPrompt>();
  private cancellationHandler: (() => void) | undefined;

  openPrompt<T>({
    prompt,
    describe,
    sensitive = false
  }: {
    prompt: PromptInput;
    describe: (value: T) => string;
    sensitive?: boolean;
  }): Promise<T> {
    const id = `${operationSession.store.getSnapshot().sessionId}:prompt:${++this.promptSequence}`;
    const sensitiveDefault = prompt.type === 'text' && prompt.isPassword === true ? prompt.defaultValue : undefined;
    const journalPrompt =
      prompt.type === 'text' && prompt.isPassword === true
        ? {
            type: prompt.type,
            message: prompt.message,
            placeholder: prompt.placeholder,
            isPassword: true,
            description: prompt.description
          }
        : prompt;
    const request = { ...journalPrompt, id } as OperationPromptRequest;
    return new Promise<T>((resolve, reject) => {
      this.pendingPrompts.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        describe: (value) => describe(value as T),
        sensitive,
        ...(sensitiveDefault !== undefined && { sensitiveDefault })
      });
      operationSession.journal.append({ type: 'prompt-opened', prompt: request });
    });
  }

  getSensitiveDefault(promptId: string): string | undefined {
    return this.pendingPrompts.get(promptId)?.sensitiveDefault;
  }

  answerPrompt(id: string, value: unknown) {
    const pending = this.pendingPrompts.get(id);
    if (!pending) return;
    this.pendingPrompts.delete(id);
    const answer = pending.sensitive ? undefined : pending.describe(value);
    operationSession.journal.append({
      type: 'prompt-closed',
      promptId: id,
      answer,
      cancelled: false,
      sensitive: pending.sensitive
    });
    queueMicrotask(() => pending.resolve(value));
  }

  cancelPrompt(id?: string) {
    const promptId = id ?? operationSession.store.getSnapshot().activePrompt?.id;
    if (!promptId) return;
    const pending = this.pendingPrompts.get(promptId);
    this.pendingPrompts.delete(promptId);
    operationSession.journal.append({
      type: 'prompt-closed',
      promptId,
      cancelled: true,
      sensitive: pending?.sensitive ?? false
    });
    if (pending) queueMicrotask(() => pending.reject(new UserCancelledError()));
  }

  rejectAllPending() {
    for (const id of [...this.pendingPrompts.keys()]) this.cancelPrompt(id);
  }

  setCancellation(input: { message: string; onCancel: () => void; isCancelling?: boolean }) {
    this.cancellationHandler = input.onCancel;
    operationSession.setCancellation({ message: input.message, isCancelling: input.isCancelling });
  }

  updateCancellation(updates: { message?: string; isCancelling?: boolean }) {
    const current = operationSession.store.getSnapshot().cancellation;
    if (!current) return;
    operationSession.setCancellation({ ...current, ...updates });
  }

  clearCancellation() {
    this.cancellationHandler = undefined;
    operationSession.setCancellation(undefined);
  }

  invokeCancellation() {
    this.cancellationHandler?.();
  }

  reset() {
    this.rejectAllPending();
    this.promptSequence = 0;
    this.cancellationHandler = undefined;
  }
}

export const interactionCoordinator = new InteractionCoordinator();
