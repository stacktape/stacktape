## web (nextjs-web)

The `nextjs-web` resource deploys your Next.js app serverlessly using AWS Lambda for server-side rendering, S3 for
static assets, and CloudFront CDN for global edge caching. You pay only for the requests you serve — no idle servers.

## database (relational-database)

A managed PostgreSQL 16.6 instance (AWS RDS `db.t3.micro`). Stacktape handles provisioning, networking, and security
groups. The database is accessible from the `web` resource via the `connectTo` configuration.

## migrateDb (local-script)

A local script that runs `npx drizzle-kit push` after every deploy. It uses `connectTo` to receive the database
connection string as an environment variable (`STP_database_CONNECTION_STRING`), then applies your Drizzle schema
directly to the database.

## connectTo

The `connectTo` directive on both the `web` resource and the `migrateDb` script injects environment variables for
accessing the database (connection string, host, port, credentials). This eliminates the need to manually manage secrets
— Stacktape wires everything together automatically.
