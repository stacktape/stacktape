- Full-stack [Next.js](https://nextjs.org/) app with [Drizzle ORM](https://orm.drizzle.team/) and
  [PostgreSQL](https://docs.stacktape.com/resources/databases/relational-database/).
- The web app runs on the [Next.js resource](https://docs.stacktape.com/resources/frontend/nextjs/) (Lambda, S3 and
  CloudFront), which charges per request. The Postgres database is an RDS `db.t3.micro` instance, which costs money
  every hour it runs, with or without traffic.
- Includes database schema, migrations, and a working CRUD example with Server Actions.
