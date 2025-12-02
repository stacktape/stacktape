# Environment variables

```yaml
environment:
  - name: STATIC_ENV_VAR
    value: my-env-var
  - name: DYNAMICALLY_SET_ENV_VAR
    value: $MyCustomDirective('input-for-my-directive')
  - name: DB_HOST
    value: $ResourceParam('myDatabase', 'host')
  - name: DB_PASSWORD
    value: $Secret('dbSecret.password')
```

**Pre-set environment variables**

Stacktape pre-sets the following environment variables for your job:

| Name                   | Value                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| STP_TRIGGER_EVENT_DATA | Contains JSON stringified event from an <a href="#trigger-events">event integration</a> that triggered this batch job. |
| STP_MAXIMUM_ATTEMPTS   | The total number of attempts for this job before it is marked as failed.                                    |
| STP_CURRENT_ATTEMPT    | The current attempt number.                                                                                       |