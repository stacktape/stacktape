# incidents:ack

Acknowledges an open incident to record that someone is working on it. A new signal or severity increase can still alert after acknowledgement.

```bash
stacktape incidents:ack --incidentId <incident-id>
```

`--incidentId` is required. Use [`incidents`](/cli/incidents) to find it.
