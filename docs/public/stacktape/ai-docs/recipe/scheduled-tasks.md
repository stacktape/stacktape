---
docType: recipe
title: Scheduled Tasks
tags:
  - scheduled
  - tasks
  - recipe
source: docs/_curated-docs/recipes/scheduled-tasks.mdx
priority: 1
---

# Scheduled Tasks (Cron Jobs)

Run Lambda functions on a schedule using CloudWatch Events.

## Configuration

```typescript
import { defineConfig, LambdaFunction, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16' }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  // Daily cleanup job - runs at 3 AM UTC
  const dailyCleanup = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: './src/jobs/cleanup.ts'
      }
    },
    timeout: 900, // 15 minutes
    connectTo: [database],
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'cron(0 3 * * ? *)' // 3 AM UTC daily
        }
      }
    ]
  });

  // Hourly metrics job
  const hourlyMetrics = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: './src/jobs/metrics.ts'
      }
    },
    timeout: 300,
    connectTo: [database],
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'rate(1 hour)'
        }
      }
    ]
  });

  // Weekly report - runs every Monday at 9 AM UTC
  const weeklyReport = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: './src/jobs/weekly-report.ts'
      }
    },
    timeout: 900,
    connectTo: [database],
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'cron(0 9 ? * MON *)' // Monday 9 AM UTC
        }
      }
    ]
  });

  return {
    resources: { database, dailyCleanup, hourlyMetrics, weeklyReport }
  };
});
```

## Schedule Expressions

### Rate Expressions

```
rate(1 minute)
rate(5 minutes)
rate(1 hour)
rate(12 hours)
rate(1 day)
rate(7 days)
```

### Cron Expressions

Format: `cron(minutes hours day-of-month month day-of-week year)`

```
cron(0 3 * * ? *)       # 3:00 AM UTC every day
cron(0 */2 * * ? *)     # Every 2 hours
cron(0 9 ? * MON *)     # 9 AM every Monday
cron(0 0 1 * ? *)       # Midnight on the 1st of each month
cron(0 12 ? * MON-FRI *)# Noon on weekdays
```

## Job Handler

```typescript
// src/jobs/cleanup.ts
import { ScheduledHandler } from 'aws-lambda';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.STP_DATABASE_CONNECTION_STRING
});

export const handler: ScheduledHandler = async (event) => {
  console.log('Starting cleanup job', event);

  // Delete old sessions
  const sessionsResult = await pool.query("DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '30 days'");
  console.log(`Deleted ${sessionsResult.rowCount} expired sessions`);

  // Delete old logs
  const logsResult = await pool.query("DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'");
  console.log(`Deleted ${logsResult.rowCount} old audit logs`);

  // Vacuum analyze for performance
  await pool.query('VACUUM ANALYZE');

  console.log('Cleanup complete');
};
```

## Weekly Report Example

```typescript
// src/jobs/weekly-report.ts
import { ScheduledHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});

export const handler: ScheduledHandler = async () => {
  // Generate report data
  const report = await generateWeeklyStats();

  // Send email
  await ses.send(
    new SendEmailCommand({
      Source: 'reports@myapp.com',
      Destination: {
        ToAddresses: ['team@myapp.com']
      },
      Message: {
        Subject: { Data: `Weekly Report - ${new Date().toLocaleDateString()}` },
        Body: {
          Html: { Data: formatReportHtml(report) }
        }
      }
    })
  );
};
```

## Monitoring

View scheduled job logs:

```bash
stacktape logs --stage dev --region us-east-1 --resourceName dailyCleanup --startTime 24h
```
