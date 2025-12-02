import { DbClient } from './db';

// using environment variable which was automatically injected thanks to connectTo property
// injected environment variables are using tunneled endpoint
const databaseConnectionString = process.env.STP_MY_DATABASE_CONNECTION_STRING;

const client = new DbClient({ connectionString: databaseConnectionString });

// perform migrations with the client

client.close();
