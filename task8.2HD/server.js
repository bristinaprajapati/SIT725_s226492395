global.crypto = require("crypto").webcrypto;
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./src/routes/rooms");
const applicationRoutes = require("./routes/applications");
const complaintRoutes = require("./routes/complaintRoutes");
const dashboardRoutes = require("./routes/dashboardroutes");
const errorHandler = require("./middleware/errorhandler");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get('/api/student', (req, res) => {
  res.json({ name: "Bristina Prajapati", studentId: "s226492395" });
});

// HTML Page Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/admin/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "dashboard.html"));
});

// Centralized error handler (must be registered after all routes)
app.use(errorHandler);

// MongoDB Connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

