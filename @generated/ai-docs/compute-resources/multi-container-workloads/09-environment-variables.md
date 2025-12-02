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