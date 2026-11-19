// Prints the rows the afterDeploy migrations wrote, as JSON, for the canary to compare across the upgrade.
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: 'main_db_user',
  password: process.env.DATABASE_PASSWORD,
  database: 'site_db',
  connectTimeout: 20000
});
const [rows] = await connection.query('SELECT label FROM deploy_marks ORDER BY id');
console.log(JSON.stringify(rows.map(({ label }) => label)));
await connection.end();
