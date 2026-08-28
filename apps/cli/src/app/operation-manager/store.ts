import { createInitialOperationState, reduceOperationState } from './reducer';
import type { OperationState } from './types';
import type { OperationJournal } from './journal';

type StateListener = (state: OperationState) => void;

export class OperationStore {
  private state = createInitialOperationState();
  private listeners = new Set<StateListener>();
  private notifyTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(journal: OperationJournal) {
    journal.subscribe((record) => {
      this.state = reduceOperationState(this.state, record);
      this.scheduleNotification();
    });
    journal.subscribeReset(() => {
      this.state = createInitialOperationState();
      this.flush();
    });
  }

  getSnapshot = (): OperationState => this.state;

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  flush() {
    if (this.notifyTimer) {
      clearTimeout(this.notifyTimer);
      this.notifyTimer = undefined;
    }
    for (const listener of this.listeners) listener(this.state);
  }

  private scheduleNotification() {
    if (this.notifyTimer) return;
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = undefined;
      for (const listener of this.listeners) listener(this.state);
    }, 16);
  }
}
