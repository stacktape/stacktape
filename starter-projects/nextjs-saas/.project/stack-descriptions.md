### 1.1 Next.js Web

The app runs serverlessly using the `nextjs-web` resource. It connects to the database and auth pool using `connectTo`,
which automatically injects connection details as environment variables.

```yml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      connectTo:
        - database
        - authPool
```

### 1.2 Postgres Database

Aurora-compatible PostgreSQL database for storing application data. Prisma ORM simplifies database access.

```yml
database:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: my_secret_password
    engine:
      type: postgres
      properties:
        version: "18.1"
        primaryInstance:
          instanceSize: db.t3.micro
```

### 1.3 User Auth Pool

Cognito user pool for handling user registration, login, and email verification.

```yml
authPool:
  type: user-auth-pool
  properties:
    allowEmailAsUserName: true
    userVerificationType: email-code
    passwordPolicy:
      minimumLength: 8
      requireLowercase: true
      requireUppercase: true
      requireNumbers: true
      requireSymbols: false
```

## 2. Database migration hooks

### 2.1 Generate Prisma Client

Before each deploy, the Prisma client is generated from the schema.

### 2.2 Database Migration

After deploy, `prisma db push` applies schema changes to the database.
