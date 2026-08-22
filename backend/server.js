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
    const pyqs = await PYQ.find().sort({ createdAt: -1, _id: -1 });
    res.json(pyqs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});

// Get papers uploaded by the authenticated user
app.get("/api/my-pyqs", requireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const pyqs = await PYQ.find({ uploadedBy: clerkId }).sort({ createdAt: -1, _id: -1 });
    res.json(pyqs);
  } catch (err) {
    console.error("My PYQs error:", err);
    res.status(500).json({ error: "Failed to fetch your papers" });
  }
});

// Update paper metadata (Admin & Uploader)
app.put("/api/pyqs/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, course, semester, examType, year, branch } = req.body;

    const updated = await PYQ.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(title && { title }),
          ...(course && { course }),
          ...(semester && { semester: Number(semester) }),
          ...(examType && { examType }),
          ...(year && { year: Number(year) }),
          ...(branch !== undefined && { branch }),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Question paper not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update PYQ error:", err);
    res.status(500).json({ error: "Failed to update question paper" });
  }
});

// Delete single paper
app.delete("/api/pyqs/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PYQ.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Question paper not found" });
    }

    res.json({ success: true, message: "Question paper deleted successfully", id });
  } catch (err) {
    console.error("Delete PYQ error:", err);
    res.status(500).json({ error: "Failed to delete question paper" });
  }
});

// Bulk delete papers (Admin)
app.post("/api/admin/pyqs/bulk-delete", requireAuth(), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No paper IDs provided for bulk deletion" });
    }

    const result = await PYQ.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} question papers`,
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: "Failed to bulk delete question papers" });
  }
});

// Admin stats overview
app.get("/api/admin/stats", requireAuth(), async (req, res) => {
  try {
    const totalPapers = await PYQ.countDocuments();
    const totalUsers = await User.countDocuments();

    // Course breakdown
    const courseAggregation = await PYQ.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Exam type breakdown
    const examAggregation = await PYQ.aggregate([
      { $group: { _id: "$examType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent uploads
    const recentUploads = await PYQ.find().sort({ createdAt: -1, _id: -1 }).limit(5);

    res.json({
      totalPapers,
      totalUsers,
      courseDistribution: courseAggregation,
      examDistribution: examAggregation,
      recentUploads,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to load admin statistics" });
  }
});

// Admin list users & contributors
app.get("/api/admin/users", requireAuth(), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    // Aggregate paper counts per user
    const uploadCounts = await PYQ.aggregate([
      { $group: { _id: "$uploadedBy", paperCount: { $sum: 1 } } },
    ]);

    const countMap = {};
    uploadCounts.forEach((item) => {
      if (item._id) countMap[item._id] = item.paperCount;
    });

    const userDirectory = users.map((u) => ({
      _id: u._id,
      clerkId: u.clerkId,
      createdAt: u.createdAt,
      uploadsCount: countMap[u.clerkId] || 0,
    }));

    res.json(userDirectory);
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed to load user directory" });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
