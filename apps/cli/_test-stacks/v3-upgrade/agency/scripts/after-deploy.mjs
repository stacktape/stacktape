// The afterDeploy step a CMS site runs on the CI runner (its schema migration), reduced to what the canary checks:
// it connects to the database through the variables `connectTo` injects, creates the table once and records the CLI
// that deployed, so the rows prove earlier data is still there after the upgrade.
import mysql from 'mysql2/promise';

const label = process.env.DEPLOY_MARK;
if (!label) throw new Error('DEPLOY_MARK is not set.');
const connection = await mysql.createConnection({
  host: process.env.STP_MAIN_DATABASE_HOST,
  port: Number(process.env.STP_MAIN_DATABASE_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 20000
});
await connection.query(
  'CREATE TABLE IF NOT EXISTS deploy_marks (id INT AUTO_INCREMENT PRIMARY KEY, label VARCHAR(100) NOT NULL)'
);
await connection.query('INSERT INTO deploy_marks (label) VALUES (?)', [label]);
const [rows] = await connection.query('SELECT COUNT(*) AS count FROM deploy_marks');
console.log(`deploy_marks rows: ${rows[0].count}`);
await connection.end();
