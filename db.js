const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// optional: test connection
pool.connect()
  .then(() => {
    console.log("Connected to Neon PostgreSQL database 🚀");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

module.exports = { pool };
