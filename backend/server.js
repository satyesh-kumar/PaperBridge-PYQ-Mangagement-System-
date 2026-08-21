import { clerkMiddleware, requireAuth } from "@clerk/express";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import streamifier from "streamifier";
import OpenAI from "openai";
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
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
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

// ── OpenAI ────────────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// AI search — convert natural-language query into structured filters
app.post("/api/ai-search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return res.status(503).json({ error: "AI search is not configured" });
    }

    const prompt = `
You are a filter extractor for a university question paper search system.
Convert the following user query into structured JSON filters.

User query: "${query}"

Return ONLY valid JSON with these fields (leave empty string "" if not mentioned):
{
  "course": "",
  "examType": "",
  "year": "",
  "semester": "",
  "branch": ""
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const filters = JSON.parse(response.choices[0].message.content);
    res.json(filters);
  } catch (error) {
    console.error("AI search error:", error);
    res.status(500).json({ error: "AI search failed" });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
