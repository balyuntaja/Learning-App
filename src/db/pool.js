import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg; 

// Dedicated Pool for new modular structure (uses DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // penting untuk Railway
  },
});

export default pool;

