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
import Note from "./models/Note.js";

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
  res.json({ status: "success", message: "PaperBridge API running with PYQs & Notes modules" });
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

// Helper for Cloudinary streaming upload
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "raw" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// ── PYQS ENDPOINTS ────────────────────────────────────────────────────────────

// Upload PYQ PDF → Cloudinary → save metadata (Status: "pending" by default)
app.post("/api/upload", requireAuth(), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file attached" });
    }

    const result = await uploadToCloudinary(req.file.buffer);

    const pyq = await PYQ.create({
      title: req.body.title,
      course: req.body.course || "General",
      semester: req.body.semester ? Number(req.body.semester) : 1,
      examType: req.body.examType || "semester",
      year: req.body.year ? Number(req.body.year) : new Date().getFullYear(),
      branch: req.body.branch || "",
      fileUrl: result.secure_url,
      uploadedBy: req.auth.userId,
      status: "pending",
    });

    res.json(pyq);
  } catch (error) {
    console.error("Upload PYQ error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Get Public Approved PYQs
app.get("/api/pyqs", async (req, res) => {
  try {
    const pyqs = await PYQ.find({
      $or: [
        { status: "approved" },
        { status: { $exists: false } },
        { status: null }
      ]
    }).sort({ createdAt: -1, _id: -1 });

    res.json(pyqs);
  } catch (err) {
    console.error("Public PYQs error:", err);
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});

// Get ALL PYQs for Admin
app.get("/api/admin/pyqs", requireAuth(), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const pyqs = await PYQ.find(filter).sort({ createdAt: -1, _id: -1 });
    res.json(pyqs);
  } catch (err) {
    console.error("Admin PYQs error:", err);
    res.status(500).json({ error: "Failed to fetch admin papers" });
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

// Admin Approve / Reject single PYQ
app.patch("/api/admin/pyqs/:id/status", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updated = await PYQ.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          rejectionReason: rejectionReason || "",
          reviewedBy: req.auth.userId,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Question paper not found" });

    res.json({ success: true, message: `Paper status changed to '${status}'`, paper: updated });
  } catch (err) {
    console.error("Change status error:", err);
    res.status(500).json({ error: "Failed to update paper status" });
  }
});

// Admin Bulk Approve / Reject PYQs
app.post("/api/admin/pyqs/bulk-status", requireAuth(), async (req, res) => {
  try {
    const { ids, status, rejectionReason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No paper IDs provided" });
    }

    const result = await PYQ.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status,
          rejectionReason: rejectionReason || "",
          reviewedBy: req.auth.userId,
          reviewedAt: new Date(),
        },
      }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("Bulk status error:", err);
    res.status(500).json({ error: "Failed to update bulk status" });
  }
});

// Update PYQ metadata
app.put("/api/pyqs/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, course, semester, examType, year, branch, status } = req.body;

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
          ...(status && { status }),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Question paper not found" });
    res.json(updated);
  } catch (err) {
    console.error("Update PYQ error:", err);
    res.status(500).json({ error: "Failed to update question paper" });
  }
});

// Delete single PYQ
app.delete("/api/pyqs/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PYQ.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Question paper not found" });
    res.json({ success: true, message: "Question paper deleted", id });
  } catch (err) {
    console.error("Delete PYQ error:", err);
    res.status(500).json({ error: "Failed to delete question paper" });
  }
});

// Bulk delete PYQs
app.post("/api/admin/pyqs/bulk-delete", requireAuth(), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No paper IDs provided" });
    }
    const result = await PYQ.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: "Failed to bulk delete question papers" });
  }
});

// ── NOTES & STUDY MATERIALS ENDPOINTS ─────────────────────────────────────────

// Upload Study Note PDF → Cloudinary → save metadata (Status: "pending" by default)
app.post("/api/notes/upload", requireAuth(), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF / document attached" });
    }

    const result = await uploadToCloudinary(req.file.buffer);

    const note = await Note.create({
      title: req.body.title,
      subject: req.body.subject,
      unit: req.body.unit || "Complete Syllabus",
      university: req.body.university || "Uttaranchal University",
      course: req.body.course || "B.Tech",
      semester: req.body.semester ? Number(req.body.semester) : 1,
      branch: req.body.branch || "",
      author: req.body.author || "",
      description: req.body.description || "",
      fileUrl: result.secure_url,
      uploadedBy: req.auth.userId,
      status: "pending",
    });

    res.json(note);
  } catch (error) {
    console.error("Upload Note error:", error);
    res.status(500).json({ error: "Failed to upload study notes" });
  }
});

// Get Public Approved Notes
app.get("/api/notes", async (req, res) => {
  try {
    const notes = await Note.find({
      $or: [
        { status: "approved" },
        { status: { $exists: false } },
        { status: null },
      ],
    }).sort({ createdAt: -1, _id: -1 });

    res.json(notes);
  } catch (err) {
    console.error("Public Notes error:", err);
    res.status(500).json({ error: "Failed to fetch study notes" });
  }
});

// Get ALL Notes for Admin
app.get("/api/admin/notes", requireAuth(), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const notes = await Note.find(filter).sort({ createdAt: -1, _id: -1 });
    res.json(notes);
  } catch (err) {
    console.error("Admin Notes error:", err);
    res.status(500).json({ error: "Failed to fetch admin notes" });
  }
});

// Get notes uploaded by the authenticated user
app.get("/api/my-notes", requireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const notes = await Note.find({ uploadedBy: clerkId }).sort({ createdAt: -1, _id: -1 });
    res.json(notes);
  } catch (err) {
    console.error("My Notes error:", err);
    res.status(500).json({ error: "Failed to fetch your study notes" });
  }
});

// Admin Approve / Reject single Note
app.patch("/api/admin/notes/:id/status", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updated = await Note.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          rejectionReason: rejectionReason || "",
          reviewedBy: req.auth.userId,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Study note not found" });

    res.json({ success: true, message: `Note status changed to '${status}'`, note: updated });
  } catch (err) {
    console.error("Change note status error:", err);
    res.status(500).json({ error: "Failed to update note status" });
  }
});

// Admin Bulk Approve / Reject Notes
app.post("/api/admin/notes/bulk-status", requireAuth(), async (req, res) => {
  try {
    const { ids, status, rejectionReason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No note IDs provided" });
    }

    const result = await Note.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status,
          rejectionReason: rejectionReason || "",
          reviewedBy: req.auth.userId,
          reviewedAt: new Date(),
        },
      }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("Bulk note status error:", err);
    res.status(500).json({ error: "Failed to update bulk note status" });
  }
});

// Update Note metadata
app.put("/api/notes/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, unit, university, course, semester, branch, author, description, status } = req.body;

    const updated = await Note.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(title && { title }),
          ...(subject && { subject }),
          ...(unit && { unit }),
          ...(university && { university }),
          ...(course && { course }),
          ...(semester && { semester: Number(semester) }),
          ...(branch !== undefined && { branch }),
          ...(author !== undefined && { author }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Study note not found" });
    res.json(updated);
  } catch (err) {
    console.error("Update Note error:", err);
    res.status(500).json({ error: "Failed to update study note" });
  }
});

// Delete single Note
app.delete("/api/notes/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Note.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Study note not found" });
    res.json({ success: true, message: "Study note deleted", id });
  } catch (err) {
    console.error("Delete Note error:", err);
    res.status(500).json({ error: "Failed to delete study note" });
  }
});

// Bulk delete Notes
app.post("/api/admin/notes/bulk-delete", requireAuth(), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No note IDs provided" });
    }
    const result = await Note.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Bulk delete notes error:", err);
    res.status(500).json({ error: "Failed to bulk delete study notes" });
  }
});

// ── COMBINED ADMIN STATS & USER DIRECTORY ──────────────────────────────────────

// Admin stats overview (both PYQs and Notes)
app.get("/api/admin/stats", requireAuth(), async (req, res) => {
  try {
    const totalPapers = await PYQ.countDocuments();
    const pendingPapersCount = await PYQ.countDocuments({ status: "pending" });
    const approvedPapersCount = await PYQ.countDocuments({
      $or: [{ status: "approved" }, { status: { $exists: false } }, { status: null }],
    });
    const rejectedPapersCount = await PYQ.countDocuments({ status: "rejected" });

    const totalNotes = await Note.countDocuments();
    const pendingNotesCount = await Note.countDocuments({ status: "pending" });
    const approvedNotesCount = await Note.countDocuments({
      $or: [{ status: "approved" }, { status: { $exists: false } }, { status: null }],
    });
    const rejectedNotesCount = await Note.countDocuments({ status: "rejected" });

    const totalUsers = await User.countDocuments();

    // Course breakdown (PYQs)
    const courseAggregation = await PYQ.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Subject breakdown (Notes)
    const subjectAggregation = await Note.aggregate([
      { $group: { _id: "$subject", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.json({
      totalPapers,
      pendingCount: pendingPapersCount,
      approvedCount: approvedPapersCount,
      rejectedCount: rejectedPapersCount,
      totalNotes,
      pendingNotesCount,
      approvedNotesCount,
      rejectedNotesCount,
      totalPendingAll: pendingPapersCount + pendingNotesCount,
      totalUsers,
      courseDistribution: courseAggregation,
      subjectDistribution: subjectAggregation,
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

    const pyqCounts = await PYQ.aggregate([
      { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
    ]);
    const noteCounts = await Note.aggregate([
      { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
    ]);

    const pyqMap = {};
    pyqCounts.forEach((item) => {
      if (item._id) pyqMap[item._id] = item.count;
    });

    const noteMap = {};
    noteCounts.forEach((item) => {
      if (item._id) noteMap[item._id] = item.count;
    });

    const userDirectory = users.map((u) => ({
      _id: u._id,
      clerkId: u.clerkId,
      createdAt: u.createdAt,
      pyqUploads: pyqMap[u.clerkId] || 0,
      noteUploads: noteMap[u.clerkId] || 0,
      totalUploads: (pyqMap[u.clerkId] || 0) + (noteMap[u.clerkId] || 0),
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
