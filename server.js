require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { pool } = require("./db");

const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const crRoutes = require("./routes/cr");
const implementRoutes = require("./routes/implement");
const reportRoutes = require("./routes/reports");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://vercel-frontend-eta-sage.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("AAI CMS Backend Running 🚀");
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cr", crRoutes);
app.use("/api/implement", implementRoutes);
app.use("/api/reports", reportRoutes);

pool
  .connect()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const PORT = process.env.PORT || 5000;

// ✅ only listen locally
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
  });
}

// ✅ required for Vercel serverless
module.exports = app;
