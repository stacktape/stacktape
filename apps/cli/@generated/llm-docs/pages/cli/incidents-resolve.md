# incidents:resolve

Resolves an incident manually. Use this after deploying and verifying a fix for signals, such as production error groups, that cannot immediately prove their own recovery. A recurring signal reopens the incident.

```bash
stacktape incidents:resolve --incidentId <incident-id>
stacktape incidents:watch --incidentId <incident-id>
```

`--incidentId` is required. Prefer automatic recovery for stateful uptime, synthetic, and alarm signals.
