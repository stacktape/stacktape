import { getFirstAndLastItem } from '@shared/utils/misc';

export const groupByEventType = <T extends { eventType: string }>(data: T[]) => {
  const res: { [eventType: string]: T[] } = {};
  for (const eventData of data) {
    if (!res[eventData.eventType]) {
      res[eventData.eventType] = [];
    }
    res[eventData.eventType].push(eventData);
  }
  return res;
};

export const getGroupedEventsWithDetails = (
  data: (EventLogEntry | ChildEventLogEntry)[]
): Omit<FormattedEventData, 'childEvents'>[] => {
  const res: FormattedEventData[] = [];
  const groupedEvents = groupByEventType(data);
  Object.entries(groupedEvents).forEach(([eventType, allEvents]) => {
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
