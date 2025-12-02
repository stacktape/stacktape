type TelemetryData = {
  distinct_id: string;
  cliArgs: string[] | null;
  command: StacktapeCommand;
  duration: number;
  outcome: string;
  locale: string;
  timeZone: string;
  version: string;
  platform: string;
  invokedFrom: string;
  invocationId: string;
};
