// A notifier batch job: logs the message that triggered it, so the canary can find the run.
console.log(`NOTIFIER_JOB_RAN ${process.env.STP_TRIGGER_EVENT_DATA ?? ''}`);
