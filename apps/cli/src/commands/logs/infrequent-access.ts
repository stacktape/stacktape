export const buildInfrequentAccessSnapshotQuery = (limit: number) =>
  `fields @timestamp, @message, @logStream, @ptr | sort @timestamp desc | limit ${Math.min(10_000, Math.max(1, Math.trunc(limit)))}`;

export const mapInsightsRowsToLogEvents = (rows: Record<string, string>[]) =>
  rows
    .map((row) => ({
      timestamp: Date.parse(row['@timestamp']),
      message: row['@message'],
      logStreamName: row['@logStream']
    }))
    .filter(({ timestamp }) => Number.isFinite(timestamp))
    .reverse();
