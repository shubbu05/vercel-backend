require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { pool } = require("./db");

const userRoutes = require("./routes/users");
console.log("🔥 Loading auth routes...");
const authRoutes = require("./routes/auth");
const crRoutes = require("./routes/cr");
const implementRoutes = require("./routes/implement");
const reportRoutes = require("./routes/reports");

const app = express();

/* ========================
   ✅ CORS CONFIG
======================== */
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

/* ========================
   ✅ MIDDLEWARE
======================== */
app.use(express.json());

/* ========================
   ✅ HEALTH CHECK ROUTES
======================== */
app.get("/", (req, res) => {
  res.send("AAI CMS Backend Running 🚀");
});


app.get("/test", (req, res) => {
  res.send("Routes working ✅");
});

/* ========================
   ✅ API ROUTES
======================== */
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cr", crRoutes);
app.use("/api/implement", implementRoutes);
app.use("/api/reports", reportRoutes);

/* ========================
   ✅ DATABASE CONNECTION CHECK
======================== */
(async () => {
  try {
    await pool.connect();
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
})();

/* ========================
   ✅ ERROR HANDLER (IMPORTANT)
======================== */
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

/* ========================
   ✅ START SERVER
======================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/* ========================
   ✅ EXPORT (optional)
======================== */
module.exports = app;
