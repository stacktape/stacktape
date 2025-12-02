# Environment variables

```yaml
resources:
  myPrivateService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      # {start-highlight}
      environment:
        - name: STATIC_ENV_VAR
          value: my-env-var
        - name: DYNAMICALLY_SET_ENV_VAR
          value: $MyCustomDirective('input-for-my-directive')
        - name: DB_HOST
          value: $ResourceParam('myDatabase', 'host')
        - name: DB_PASSWORD
          value: $Secret('dbSecret.password')
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```