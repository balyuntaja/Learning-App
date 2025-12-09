import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

// Use a single connection string to simplify configuration across environments
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export default pool;