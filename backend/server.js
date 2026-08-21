import { clerkMiddleware, requireAuth } from "@clerk/express";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import streamifier from "streamifier";
import User from "./models/User.js";
import upload from "./middleware/upload.js";
import cloudinary from "./config/cloudinary.js";
import PYQ from "./models/PYQ.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);

      // Allow all localhost origins on any port
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow all Vercel preview & production deployments (*.vercel.app)
      if (/^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$/.test(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Check explicit ALLOWED_ORIGIN list if set
      if (allowedOrigins && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // If no strict ALLOWED_ORIGIN is set, allow all
      if (!allowedOrigins) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Static PDF serving
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.static("uploads", {
  setHeaders: (res, path) => {
    if (path.endsWith(".pdf")) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
    }
  }
}));

app.use(clerkMiddleware());

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// ── ROUTES ────────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ status: "success", message: "PaperBridge API running" });
});

// Sync / create user from Clerk
app.post("/api/users", requireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    let user = await User.findOne({ clerkId });
    if (user) return res.json(user);
    const newUser = await User.create({ clerkId });
    res.json(newUser);
  } catch (err) {
    console.error("User sync error:", err);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// Upload PDF → Cloudinary → save PYQ metadata
app.post("/api/upload", requireAuth(), upload.single("file"), async (req, res) => {
  try {
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "raw" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload();

    const pyq = await PYQ.create({
      title: req.body.title,
      course: req.body.course,
      semester: req.body.semester,
      examType: req.body.examType,
      year: req.body.year,
      branch: req.body.branch,
      fileUrl: result.secure_url,
      uploadedBy: req.auth.userId,
    });

    res.json(pyq);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Get all PYQs (newest first)
app.get("/api/pyqs", async (req, res) => {
  try {
    const pyqs = await PYQ.find().sort({ createdAt: -1 });
    res.json(pyqs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});

// Get papers uploaded by the authenticated user
app.get("/api/my-pyqs", requireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const pyqs = await PYQ.find({ uploadedBy: clerkId }).sort({ createdAt: -1 });
    res.json(pyqs);
  } catch (err) {
    console.error("My PYQs error:", err);
    res.status(500).json({ error: "Failed to fetch your papers" });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
