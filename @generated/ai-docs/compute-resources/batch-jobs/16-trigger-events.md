# Trigger events

Batch jobs are invoked in response to events from various integrations. A single job can have multiple triggers. The data payload from the trigger is available in the `STP_TRIGGER_EVENT_DATA` environment variable as a JSON string.