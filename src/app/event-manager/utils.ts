import { getFirstAndLastItem } from '@shared/utils/misc';

type LifecycleGroup = {
  eventType: LoggableEventType;
  entries: (EventLogEntry | ChildEventLogEntry)[];
  started: number;
};

const groupEventLifecycles = (data: (EventLogEntry | ChildEventLogEntry)[]): LifecycleGroup[] => {
  const activeByEventType: Partial<Record<LoggableEventType, LifecycleGroup>> = {};
  const completedGroups: LifecycleGroup[] = [];

  for (const event of data) {
    const eventType = event.eventType;
    const active = activeByEventType[eventType];

    if (event.captureType === 'START') {
      if (active) {
        completedGroups.push(active);
      }
      activeByEventType[eventType] = {
        eventType,
        entries: [event],
        started: event.timestamp
      };
      continue;
    }

    if (active) {
      active.entries.push(event);
      if (event.captureType === 'FINISH') {
        completedGroups.push(active);
        delete activeByEventType[eventType];
      }
      continue;
    }

    const standaloneGroup: LifecycleGroup = {
      eventType,
      entries: [event],
      started: event.timestamp
    };

    if (event.captureType === 'FINISH') {
      completedGroups.push(standaloneGroup);
    } else {
      activeByEventType[eventType] = standaloneGroup;
    }
  }

  for (const openGroup of Object.values(activeByEventType)) {
    if (!openGroup) continue;
    completedGroups.push(openGroup);
  }

  return completedGroups.sort((a, b) => a.started - b.started);
};

export const getGroupedEventsWithDetails = (
  data: (EventLogEntry | ChildEventLogEntry)[]
): Omit<FormattedEventData, 'childEvents'>[] => {
  const res: FormattedEventData[] = [];
  const lifecycleGroups = groupEventLifecycles(data);
  lifecycleGroups.forEach(({ eventType, entries: allEvents }) => {
    const { first, last } = getFirstAndLastItem(allEvents);
    const isFinished = last.captureType === 'FINISH';
    const duration = isFinished ? last.timestamp - first.timestamp : null;
    const eventWithDetails = {
      eventType: eventType as LoggableEventType,
      duration,
      started: first.timestamp || null,
      finished: isFinished ? last.timestamp : null,
      message: first.description || '',
      additionalMessage: last.additionalMessage,
      data: allEvents
        .map((e) => {
          return e.data ? { on: e.captureType, data: e.data } : null;
        })
        .filter(Boolean),
      ...(last.finalMessage ? { finalMessage: last.finalMessage } : {})
    };

    res.push(eventWithDetails as any);
  });
  return res;
};
