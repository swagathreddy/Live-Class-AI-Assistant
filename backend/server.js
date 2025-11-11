
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
console.log(`Key from .env file: ${process.env.ASSEMBLYAI_API_KEY}`);
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import sessionRoutes from "./routes/sessions.js";
import uploadRoutes from "./routes/upload.js";
import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

// ADD THIS LINE FOR DEBUGGING
console.log("My JWT Secret is:", process.env.JWT_SECRET);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-frontend-domain.com"]
        : ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(rateLimiter);

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/live-class-ai")
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed.");
    process.exit(0);
  });
});
