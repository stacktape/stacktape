# AppSyncApiKeyAuthenticationProps API Reference

## TypeScript definition

```typescript
type AppSyncApiKeyAuthenticationProps = {
  /** Fixed RFC 3339 timestamp when the API key expires. */
  expiresAt: string;
};
```

## Property: `expiresAt`

- Required: yes
- Type: `string`

Fixed RFC 3339 timestamp when the API key expires.

The timestamp must include a timezone and be between 1 and 365 days in the future when you deploy. AppSync rounds
expiration down to the hour. Stacktape never silently extends the key on later deployments, so changing this value
is an explicit security decision.

**Example:** `2027-01-31T00:00:00Z`
