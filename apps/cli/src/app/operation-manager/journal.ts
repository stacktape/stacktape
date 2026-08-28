import type { OperationRecord, OperationRecordInput } from './types';

type JournalListener = (record: OperationRecord) => void;
type ResetListener = () => void;

/** Ordered, replayable source of truth for one CLI operation. */
export class OperationJournal {
  private sequence = 0;
  private records: OperationRecord[] = [];
  private listeners = new Set<JournalListener>();
  private resetListeners = new Set<ResetListener>();

  append(input: OperationRecordInput, timestamp = Date.now()): OperationRecord {
    const record = { ...input, sequence: ++this.sequence, timestamp } as OperationRecord;
    this.records.push(record);
    for (const listener of this.listeners) listener(record);
    return record;
  }

  reset() {
    this.sequence = 0;
    this.records = [];
    for (const listener of this.resetListeners) listener();
  }

  replay(afterSequence = 0): readonly OperationRecord[] {
    if (afterSequence <= 0) return this.records;
    return this.records.filter((record) => record.sequence > afterSequence);
  }

  get lastSequence(): number {
    return this.sequence;
  }

  subscribe(listener: JournalListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeReset(listener: ResetListener): () => void {
    this.resetListeners.add(listener);
    return () => this.resetListeners.delete(listener);
  }
}
