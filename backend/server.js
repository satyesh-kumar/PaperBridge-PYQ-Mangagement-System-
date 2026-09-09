import { clerkMiddleware, requireAuth, clerkClient } from "@clerk/express";
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
import University from "./models/University.js";
import Course from "./models/Course.js";
import Semester from "./models/Semester.js";
import Subject from "./models/Subject.js";
import Feedback from "./models/Feedback.js";
import PaperAvailability from "./models/PaperAvailability.js";
import PaperRequest from "./models/PaperRequest.js";
import {
  sendFeedbackNotificationEmail,
  sendPaperRequestNotificationEmail,
} from "./utils/emailService.js";
import { seedAcademicData } from "./seedAcademicData.js";

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
      if (!origin) return callback(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (/^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$/.test(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (!allowedOrigins) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-user-email",
      "x-admin-email",
      "Accept",
      "Origin",
      "X-Requested-With",
      "Cache-Control",
      "Pragma",
      "*",
    ],
    exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"],
  })
);

app.options(/(.*)/, cors());

app.use(express.json());

// Static PDF serving (if used locally)
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

// ── ADMIN AUTHORIZATION HELPER ────────────────────────────────────────────────
const DEFAULT_ADMIN_EMAILS = [
  "satyeshkumar578@gmail.com",
  "satyeshkumar@gmail.com",
  "satyesh@paperbridge.com",
  "admin@paperbridge.com",
];

const getAdminEmails = () => {
  const envAdminEmailsRaw = process.env.ADMIN_EMAILS || "";
  const envList = envAdminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...envList]));
};

// Middleware: Verify user is an authorized Administrator
const requireAdmin = async (req, res, next) => {
  try {
    const adminEmails = getAdminEmails();
    const sessionClaims = req.auth?.sessionClaims || {};
    
    // Check multiple possible sources for email
    let userEmail = (
      req.headers["x-user-email"] ||
      req.headers["x-admin-email"] ||
      req.body?.userEmail ||
      req.body?.adminEmail ||
      sessionClaims.email ||
      sessionClaims.primary_email ||
      ""
    ).toLowerCase().trim();

    // If email is not in header/claims but Clerk userId is present
    if (!userEmail && req.auth?.userId && typeof clerkClient !== "undefined" && clerkClient.users) {
      try {
        const clerkUser = await clerkClient.users.getUser(req.auth.userId);
        userEmail = (
          clerkUser.primaryEmailAddress?.emailAddress ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          ""
        ).toLowerCase().trim();
      } catch (clerkErr) {
        console.warn("Could not fetch user email from Clerk API:", clerkErr.message);
      }
    }

    // Role check if present in claims
    if (sessionClaims.metadata?.role === "admin") {
      return next();
    }

    // If verified admin email found in headers, payload, claims, or Clerk
    if (userEmail && adminEmails.some((e) => e.toLowerCase() === userEmail)) {
      if (!req.auth) req.auth = {};
      if (!req.auth.userId) req.auth.userId = `admin_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      return next();
    }

    // If authenticated via Clerk userId and no non-admin mismatch
    if (req.auth?.userId) {
      if (userEmail && !adminEmails.some((e) => e.toLowerCase() === userEmail)) {
        return res.status(403).json({ 
          error: `Access denied. Email '${userEmail}' is not registered as an Administrator.` 
        });
      }
      return next();
    }

    return res.status(401).json({ error: "Authentication required. Please sign in with an Administrator account." });
  } catch (err) {
    console.error("Admin auth check error:", err);
    return res.status(500).json({ error: "Authorization verification failed" });
  }
};

// Middleware: Verify user is authenticated (supports JWT or verified user email)
const requireAuthUser = (req, res, next) => {
  const adminEmails = getAdminEmails();
  const sessionClaims = req.auth?.sessionClaims || {};
  const userEmail = (
    req.headers["x-user-email"] ||
    req.body?.userEmail ||
    sessionClaims.email ||
    ""
  ).toLowerCase().trim();

  if (req.auth?.userId) {
    return next();
  }

  if (userEmail) {
    if (!req.auth) req.auth = {};
    req.auth.userId = adminEmails.some((e) => e.toLowerCase() === userEmail)
      ? `admin_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`
      : `user_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    return next();
  }

  return res.status(401).json({ error: "Authentication required" });
};

// Helper: Check whether the current request is from an authorized Administrator
const isUserAdmin = async (req) => {
  try {
    if (!req.auth || !req.auth.userId) return false;
    const sessionClaims = req.auth.sessionClaims || {};
    if (sessionClaims.metadata?.role === "admin") return true;

    const adminEmails = getAdminEmails();
    
    // Check multiple possible sources for email
    let userEmail = (
      req.headers["x-user-email"] ||
      req.body?.userEmail ||
      req.body?.adminEmail ||
      sessionClaims.email ||
      sessionClaims.primary_email ||
      ""
    ).toLowerCase().trim();

    if (!userEmail && req.auth.userId && typeof clerkClient !== "undefined" && clerkClient.users) {
      try {
        const clerkUser = await clerkClient.users.getUser(req.auth.userId);
        userEmail = (
          clerkUser.primaryEmailAddress?.emailAddress ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          ""
        ).toLowerCase().trim();
      } catch (err) {
        // ignore
      }
    }

    if (userEmail && adminEmails.some((e) => e.toLowerCase() === userEmail)) {
      return true;
    }
    return false;
  } catch (err) {
    console.error("isUserAdmin verification error:", err);
    return false;
  }
};

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("MongoDB Connected");
    // Seed initial universities, courses, semesters, and subjects if needed
    await seedAcademicData();
  })
  .catch(err => console.log("MongoDB connection error:", err));

// Helper for Cloudinary streaming upload (Stored as raw with .pdf extension to guarantee 100% public delivery)
const uploadToCloudinary = (fileBuffer, originalName = "document.pdf") => {
  return new Promise((resolve, reject) => {
    const uniqueId = `paperbridge/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.pdf`;
    
    const stream = cloudinary.uploader.upload_stream(
      { 
        public_id: uniqueId,
        resource_type: "raw",
        type: "upload",
        access_mode: "public",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// ── BASE & PDF VIEWER PROXY ──────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "PaperBridge Dynamic Multi-University Academic Platform API is running",
    version: "2.0.0",
  });
});

// Inline PDF Viewer Proxy with Cloudinary signing to guarantee inline rendering for all documents
app.get("/api/pdf/view", async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    const candidateUrls = [];

    // If Cloudinary URL, extract cloud name and public ID and create signed URLs
    if (url.includes("res.cloudinary.com") || url.includes("cloudinary.com")) {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/i);
      const cloudNameMatch = url.match(/res\.cloudinary\.com\/([^/]+)\//i);
      const cloudName = cloudNameMatch ? cloudNameMatch[1] : (process.env.CLOUDINARY_NAME || "ddl1le31s");

      const fullPublicId = match ? decodeURIComponent(match[1]) : null;
      const basePublicId = fullPublicId ? fullPublicId.replace(/\.pdf$/i, "") : null;

      const idsToTry = [fullPublicId, basePublicId].filter(Boolean);

      for (const pid of idsToTry) {
        try {
          // 1. Authenticated private download URLs (works even when Cloudinary has restricted raw/PDF access)
          candidateUrls.push(
            cloudinary.utils.private_download_url(pid.endsWith(".pdf") ? pid : `${pid}.pdf`, "", {
              resource_type: "raw",
              type: "upload",
              cloud_name: cloudName,
            }),
            cloudinary.utils.private_download_url(pid.replace(/\.pdf$/i, ""), "", {
              resource_type: "raw",
              type: "upload",
              cloud_name: cloudName,
            }),
            cloudinary.utils.private_download_url(pid.replace(/\.pdf$/i, ""), "pdf", {
              resource_type: "image",
              type: "upload",
              cloud_name: cloudName,
            }),
            cloudinary.utils.private_download_url(pid.replace(/\.pdf$/i, ""), "", {
              resource_type: "image",
              type: "upload",
              cloud_name: cloudName,
            })
          );

          // 2. Standard signed URLs
          candidateUrls.push(
            cloudinary.url(pid.endsWith(".pdf") ? pid : `${pid}.pdf`, {
              resource_type: "raw",
              sign_url: true,
              secure: true,
              type: "upload",
              cloud_name: cloudName,
            }),
            cloudinary.url(pid.replace(/\.pdf$/i, ""), {
              resource_type: "raw",
              sign_url: true,
              secure: true,
              type: "upload",
              cloud_name: cloudName,
            }),
            cloudinary.url(pid.replace(/\.pdf$/i, ""), {
              resource_type: "image",
              format: "pdf",
              sign_url: true,
              secure: true,
              type: "upload",
              cloud_name: cloudName,
            })
          );

          // 3. Direct API download endpoint
          if (process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET) {
            candidateUrls.push(
              `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?public_id=${encodeURIComponent(pid.endsWith(".pdf") ? pid : `${pid}.pdf`)}`,
              `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?public_id=${encodeURIComponent(pid.replace(/\.pdf$/i, ""))}`,
              `https://api.cloudinary.com/v1_1/${cloudName}/image/download?public_id=${encodeURIComponent(pid.replace(/\.pdf$/i, ""))}&format=pdf`
            );
          }
        } catch (signErr) {
          console.warn("Cloudinary URL signing warning:", signErr.message);
        }
      }

      candidateUrls.push(
        url,
        url.replace("/image/upload/", "/raw/upload/"),
        url.replace("/image/upload/", "/raw/upload/").replace(/\.pdf$/i, ""),
        url.replace("/raw/upload/", "/image/upload/"),
        url.replace(/\.pdf$/i, ""),
        `${url}.pdf`
      );
    } else {
      candidateUrls.push(url);
    }

    let targetResponse = null;
    const authHeader = (process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET)
      ? "Basic " + Buffer.from(`${process.env.CLOUDINARY_KEY}:${process.env.CLOUDINARY_SECRET}`).toString("base64")
      : null;

    for (const testUrl of candidateUrls) {
      if (!testUrl) continue;
      try {
        const fetchOptions = (testUrl.includes("api.cloudinary.com") && authHeader)
          ? { headers: { Authorization: authHeader } }
          : {};
        const resp = await fetch(testUrl, fetchOptions);
        if (resp.ok) {
          const contentType = resp.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            targetResponse = resp;
            break;
          }
        }
      } catch {
        // try next candidate
      }
    }

    // Authenticated Cloudinary fetch fallback if public access returned 401/404
    if ((!targetResponse || !targetResponse.ok) && authHeader) {
      for (const testUrl of candidateUrls.slice(0, 10)) {
        if (!testUrl) continue;
        try {
          const resp = await fetch(testUrl, { headers: { Authorization: authHeader } });
          if (resp.ok) {
            const contentType = resp.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
              targetResponse = resp;
              break;
            }
          }
        } catch {}
      }
    }

    if (!targetResponse || !targetResponse.ok) {
      return res.status(404).json({ error: "Failed to fetch document from storage" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");

    const arrayBuffer = await targetResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("PDF inline proxy error:", err);
    return res.status(500).json({ error: "Unable to render PDF preview" });
  }
});

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

// ═════════════════════════════════════════════════════════════════════════════
// 🏛️ UNIVERSITY MANAGEMENT ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// List Universities (Public: active only; Admin: ?status=all)
app.get("/api/universities", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    } else if (!status) {
      // Default to active for public
      filter.status = "active";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const universities = await University.find(filter).sort({ name: 1 });

    // Aggregate counts for each university
    const uniIds = universities.map((u) => u._id);
    const courseCounts = await Course.aggregate([
      { $match: { universityId: { $in: uniIds } } },
      { $group: { _id: "$universityId", count: { $sum: 1 } } },
    ]);
    const paperCounts = await PYQ.aggregate([
      { $match: { universityId: { $in: uniIds } } },
      { $group: { _id: "$universityId", count: { $sum: 1 } } },
    ]);
    const noteCounts = await Note.aggregate([
      { $match: { universityId: { $in: uniIds } } },
      { $group: { _id: "$universityId", count: { $sum: 1 } } },
    ]);

    const courseMap = {};
    courseCounts.forEach((c) => (courseMap[c._id.toString()] = c.count));
    const paperMap = {};
    paperCounts.forEach((p) => (paperMap[p._id.toString()] = p.count));
    const noteMap = {};
    noteCounts.forEach((n) => (noteMap[n._id.toString()] = n.count));

    const enriched = universities.map((u) => ({
      ...u.toObject(),
      coursesCount: courseMap[u._id.toString()] || 0,
      papersCount: paperMap[u._id.toString()] || 0,
      notesCount: noteMap[u._id.toString()] || 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Fetch universities error:", err);
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});

// Get single University
app.get("/api/universities/:id", async (req, res) => {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return res.status(404).json({ error: "University not found" });

    const coursesCount = await Course.countDocuments({ universityId: university._id });
    const papersCount = await PYQ.countDocuments({ universityId: university._id });
    const notesCount = await Note.countDocuments({ universityId: university._id });

    res.json({
      ...university.toObject(),
      coursesCount,
      papersCount,
      notesCount,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch university details" });
  }
});

// Create University (Admin)
app.post("/api/universities", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { name, code, description, logo, website, location, state, country, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "University name is required" });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ error: "University short code is required" });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await University.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ error: `University with code '${cleanCode}' already exists.` });
    }

    const university = await University.create({
      name: name.trim(),
      code: cleanCode,
      description: description || "",
      logo: logo || "",
      website: website || "",
      location: location || "",
      state: state || "",
      country: country || "India",
      status: status || "active",
    });

    res.status(201).json(university);
  } catch (err) {
    console.error("Create university error:", err);
    res.status(500).json({ error: err.message || "Failed to create university" });
  }
});

// Update University (Admin)
app.put("/api/universities/:id", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { name, code, description, logo, website, location, state, country, status } = req.body;

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const existing = await University.findOne({ code: cleanCode, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ error: `University code '${cleanCode}' is already used by another institution.` });
      }
    }

    const updated = await University.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(name && { name: name.trim() }),
          ...(code && { code: code.trim().toUpperCase() }),
          ...(description !== undefined && { description }),
          ...(logo !== undefined && { logo }),
          ...(website !== undefined && { website }),
          ...(location !== undefined && { location }),
          ...(state !== undefined && { state }),
          ...(country !== undefined && { country }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "University not found" });

    // Also update denormalized university string on papers/notes if name changed
    if (name) {
      await PYQ.updateMany({ universityId: updated._id }, { $set: { university: updated.name } });
      await Note.updateMany({ universityId: updated._id }, { $set: { university: updated.name } });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update university error:", err);
    res.status(500).json({ error: "Failed to update university" });
  }
});

// Delete University (Admin with Cascade Safety Check)
app.delete("/api/universities/:id", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const uniId = req.params.id;
    const force = req.query.force === "true" || req.body.force === true;

    const university = await University.findById(uniId);
    if (!university) return res.status(404).json({ error: "University not found" });

    const coursesCount = await Course.countDocuments({ universityId: uniId });
    const papersCount = await PYQ.countDocuments({ universityId: uniId });
    const notesCount = await Note.countDocuments({ universityId: uniId });

    if ((coursesCount > 0 || papersCount > 0 || notesCount > 0) && !force) {
      return res.status(409).json({
        error: "CASCADE_WARNING",
        message: `This university contains ${coursesCount} courses, ${papersCount} question papers, and ${notesCount} study notes. Deleting it will impact dependent academic records.`,
        coursesCount,
        papersCount,
        notesCount,
        universityName: university.name,
      });
    }

    // Perform deletion
    if (force) {
      await Course.deleteMany({ universityId: uniId });
      await Semester.deleteMany({ universityId: uniId });
      await Subject.deleteMany({ universityId: uniId });
      await PYQ.deleteMany({ universityId: uniId });
      await Note.deleteMany({ universityId: uniId });
    }

    await University.findByIdAndDelete(uniId);

    res.json({
      success: true,
      message: `University '${university.name}' and its relationships were successfully deleted.`,
    });
  } catch (err) {
    console.error("Delete university error:", err);
    res.status(500).json({ error: "Failed to delete university" });
  }
});

// Toggle University Status (Admin)
app.patch("/api/universities/:id/status", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const updated = await University.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "University not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 🎓 COURSE / PROGRAM MANAGEMENT ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// List Courses (Filterable by ?universityId=..., ?status=all, ?search=...)
app.get("/api/courses", async (req, res) => {
  try {
    const { universityId, status, search } = req.query;
    const filter = {};

    if (universityId && universityId !== "all") {
      filter.universityId = universityId;
    }
    if (status && status !== "all") {
      filter.status = status;
    } else if (!status) {
      filter.status = "active";
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(filter)
      .populate("universityId", "name code location")
      .sort({ name: 1 });

    // Aggregate semester, subject & paper counts
    const courseIds = courses.map((c) => c._id);
    const semCounts = await Semester.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ]);
    const subCounts = await Subject.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ]);
    const paperCounts = await PYQ.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
    ]);

    const semMap = {};
    semCounts.forEach((s) => (semMap[s._id.toString()] = s.count));
    const subMap = {};
    subCounts.forEach((s) => (subMap[s._id.toString()] = s.count));
    const paperMap = {};
    paperCounts.forEach((p) => (paperMap[p._id.toString()] = p.count));

    const enriched = courses.map((c) => ({
      ...c.toObject(),
      semestersCount: semMap[c._id.toString()] || c.numberOfSemesters,
      subjectsCount: subMap[c._id.toString()] || 0,
      papersCount: paperMap[c._id.toString()] || 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Fetch courses error:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Create Course & Auto-Generate its Semesters (Admin)
app.post("/api/courses", requireAdmin, async (req, res) => {
  try {
    const { name, code, universityId, degreeType, duration, numberOfSemesters, description, status } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "Course name is required" });
    if (!code || !code.trim()) return res.status(400).json({ error: "Course code is required" });

    // Auto-resolve or default active University if not explicitly provided
    let targetUniversityId = universityId;
    if (!targetUniversityId) {
      let defaultUni = await University.findOne({ status: "active" });
      if (!defaultUni) defaultUni = await University.findOne();
      if (!defaultUni) {
        defaultUni = await University.create({
          name: "United University",
          code: "UU",
          location: "Prayagraj",
          state: "Uttar Pradesh",
          status: "active",
        });
      }
      targetUniversityId = defaultUni._id;
    }

    const numSemesters = numberOfSemesters ? Number(numberOfSemesters) : 8;
    if (numSemesters < 1 || numSemesters > 12) {
      return res.status(400).json({ error: "Number of semesters must be between 1 and 12" });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Course.findOne({ universityId: targetUniversityId, code: cleanCode });
    if (existing) {
      return res.status(400).json({ error: `Course with code '${cleanCode}' already exists.` });
    }

    const course = await Course.create({
      name: name.trim(),
      code: cleanCode,
      universityId: targetUniversityId,
      degreeType: degreeType || "Undergraduate",
      duration: duration || "3 Years",
      numberOfSemesters: numSemesters,
      description: description || "",
      status: status || "active",
    });

    // Auto-generate Semester records for this Course
    const semesterDocs = [];
    for (let i = 1; i <= numSemesters; i++) {
      semesterDocs.push({
        name: `Semester ${i}`,
        number: i,
        courseId: course._id,
        universityId: targetUniversityId,
        status: "active",
      });
    }
    await Semester.insertMany(semesterDocs);

    res.status(201).json(course);
  } catch (err) {
    console.error("Create course error:", err);
    res.status(500).json({ error: err.message || "Failed to create course" });
  }
});

// Update Course (Admin)
app.put("/api/courses/:id", requireAdmin, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { name, code, universityId, degreeType, duration, numberOfSemesters, description, status } = req.body;

    const currentCourse = await Course.findById(courseId);
    if (!currentCourse) return res.status(404).json({ error: "Course not found" });

    const newNumSemesters = numberOfSemesters ? Number(numberOfSemesters) : currentCourse.numberOfSemesters;

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const existing = await Course.findOne({
        universityId: universityId || currentCourse.universityId,
        code: cleanCode,
        _id: { $ne: courseId },
      });
      if (existing) {
        return res.status(400).json({ error: `Course code '${cleanCode}' is already in use.` });
      }
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      {
        $set: {
          ...(name && { name: name.trim() }),
          ...(code && { code: code.trim().toUpperCase() }),
          ...(universityId && { universityId }),
          ...(degreeType && { degreeType }),
          ...(duration && { duration }),
          ...(numberOfSemesters && { numberOfSemesters: newNumSemesters }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    // If numberOfSemesters changed, adjust Semester records safely
    if (numberOfSemesters && newNumSemesters !== currentCourse.numberOfSemesters) {
      const existingSemesters = await Semester.find({ courseId }).sort({ number: 1 });
      const currentCount = existingSemesters.length;

      if (newNumSemesters > currentCount) {
        // Add additional semesters
        const newSems = [];
        for (let i = currentCount + 1; i <= newNumSemesters; i++) {
          newSems.push({
            name: `Semester ${i}`,
            number: i,
            courseId: updated._id,
            universityId: updated.universityId,
            status: "active",
          });
        }
        await Semester.insertMany(newSems);
      } else if (newNumSemesters < currentCount) {
        const excessSemNumbers = [];
        for (let i = newNumSemesters + 1; i <= currentCount; i++) {
          excessSemNumbers.push(i);
        }
        await Semester.deleteMany({
          courseId,
          number: { $in: excessSemNumbers },
        });
      }
    }

    // Denormalized update on PYQs/Notes if course name changed
    if (name) {
      await PYQ.updateMany({ courseId: updated._id }, { $set: { course: updated.name } });
      await Note.updateMany({ courseId: updated._id }, { $set: { course: updated.name } });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update course error:", err);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// Delete Course (Admin with Cascade Safety Check)
app.delete("/api/courses/:id", requireAdmin, async (req, res) => {
  try {
    const courseId = req.params.id;
    const force = req.query.force === "true" || req.body?.force === true;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const papersCount = await PYQ.countDocuments({ courseId });
    const notesCount = await Note.countDocuments({ courseId });

    if ((papersCount > 0 || notesCount > 0) && !force) {
      return res.status(409).json({
        error: "CASCADE_WARNING",
        message: `This course contains ${papersCount} question papers and ${notesCount} study notes.`,
        papersCount,
        notesCount,
        courseName: course.name,
      });
    }

    if (force) {
      await Semester.deleteMany({ courseId });
      await PYQ.deleteMany({ courseId });
      await Note.deleteMany({ courseId });
    } else {
      await Semester.deleteMany({ courseId });
    }

    await Course.findByIdAndDelete(courseId);

    res.json({
      success: true,
      message: `Course '${course.name}' was successfully deleted.`,
    });
  } catch (err) {
    console.error("Delete course error:", err);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

// Toggle Course Status (Admin)
app.patch("/api/courses/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Course.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!updated) return res.status(404).json({ error: "Course not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update course status" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔢 DYNAMIC SEMESTER MANAGEMENT ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// Get Semesters for a Course (?courseId=...)
app.get("/api/semesters", async (req, res) => {
  try {
    const { courseId, universityId } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (universityId) filter.universityId = universityId;

    const semesters = await Semester.find(filter)
      .sort({ number: 1 })
      .populate("courseId", "name code numberOfSemesters");

    // Enrich with subject counts
    const semIds = semesters.map((s) => s._id);
    const subCounts = await Subject.aggregate([
      { $match: { semesterId: { $in: semIds } } },
      { $group: { _id: "$semesterId", count: { $sum: 1 } } },
    ]);
    const subMap = {};
    subCounts.forEach((s) => (subMap[s._id.toString()] = s.count));

    const enriched = semesters.map((s) => ({
      ...s.toObject(),
      subjectsCount: subMap[s._id.toString()] || 0,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch semesters" });
  }
});

// Update Semester name or status
app.put("/api/semesters/:id", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { name, status } = req.body;
    const updated = await Semester.findByIdAndUpdate(
      req.params.id,
      { $set: { ...(name && { name }), ...(status && { status }) } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Semester not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update semester" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 📚 SUBJECT MANAGEMENT ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// List Subjects (?courseId=..., ?semesterId=..., ?semesterNumber=..., ?search=...)
app.get("/api/subjects", async (req, res) => {
  try {
    const { courseId, semesterId, semesterNumber, universityId, status, search } = req.query;
    const filter = {};

    if (courseId && courseId !== "all") filter.courseId = courseId;
    if (semesterId && semesterId !== "all") filter.semesterId = semesterId;
    if (semesterNumber && semesterNumber !== "all") filter.semesterNumber = Number(semesterNumber);
    if (universityId && universityId !== "all") filter.universityId = universityId;
    if (status && status !== "all") filter.status = status;
    else if (!status) filter.status = "active";

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const subjects = await Subject.find(filter)
      .populate("courseId", "name code")
      .populate("semesterId", "name number")
      .populate("universityId", "name code")
      .sort({ name: 1 });

    // Aggregate paper and note counts per subject
    const subjectIds = subjects.map((s) => s._id);
    const paperCounts = await PYQ.aggregate([
      { $match: { subjectId: { $in: subjectIds } } },
      { $group: { _id: "$subjectId", count: { $sum: 1 } } },
    ]);
    const noteCounts = await Note.aggregate([
      { $match: { subjectId: { $in: subjectIds } } },
      { $group: { _id: "$subjectId", count: { $sum: 1 } } },
    ]);

    const paperMap = {};
    paperCounts.forEach((p) => (paperMap[p._id.toString()] = p.count));
    const noteMap = {};
    noteCounts.forEach((n) => (noteMap[n._id.toString()] = n.count));

    const enriched = subjects.map((s) => ({
      ...s.toObject(),
      papersCount: paperMap[s._id.toString()] || 0,
      notesCount: noteMap[s._id.toString()] || 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Fetch subjects error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Create Subject (Admin)
app.post("/api/subjects", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { name, code, universityId, courseId, semesterId, description, status } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "Subject name is required" });
    if (!code || !code.trim()) return res.status(400).json({ error: "Subject code is required" });
    if (!courseId) return res.status(400).json({ error: "Course is required" });
    if (!semesterId) return res.status(400).json({ error: "Semester is required" });

    const semesterDoc = await Semester.findById(semesterId);
    if (!semesterDoc) return res.status(400).json({ error: "Invalid semester selected" });

    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) return res.status(400).json({ error: "Invalid course selected" });

    const uniId = universityId || courseDoc.universityId;
    const cleanCode = code.trim().toUpperCase();

    const existing = await Subject.findOne({ courseId, semesterId, code: cleanCode });
    if (existing) {
      return res.status(400).json({ error: `Subject with code '${cleanCode}' already exists for this course and semester.` });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: cleanCode,
      universityId: uniId,
      courseId,
      semesterId,
      semesterNumber: semesterDoc.number,
      description: description || "",
      status: status || "active",
    });

    res.status(201).json(subject);
  } catch (err) {
    console.error("Create subject error:", err);
    res.status(500).json({ error: err.message || "Failed to create subject" });
  }
});

// Update Subject (Admin)
app.put("/api/subjects/:id", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { name, code, semesterId, description, status } = req.body;
    const subjectId = req.params.id;

    const current = await Subject.findById(subjectId);
    if (!current) return res.status(404).json({ error: "Subject not found" });

    let semNumber = current.semesterNumber;
    if (semesterId && semesterId !== current.semesterId.toString()) {
      const semDoc = await Semester.findById(semesterId);
      if (semDoc) semNumber = semDoc.number;
    }

    const updated = await Subject.findByIdAndUpdate(
      subjectId,
      {
        $set: {
          ...(name && { name: name.trim() }),
          ...(code && { code: code.trim().toUpperCase() }),
          ...(semesterId && { semesterId }),
          ...(semesterId && { semesterNumber: semNumber }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update subject" });
  }
});

// Delete Subject (Admin with cascade safety check)
app.delete("/api/subjects/:id", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const subjectId = req.params.id;
    const force = req.query.force === "true" || req.body.force === true;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ error: "Subject not found" });

    const papersCount = await PYQ.countDocuments({ subjectId });
    const notesCount = await Note.countDocuments({ subjectId });

    if ((papersCount > 0 || notesCount > 0) && !force) {
      return res.status(409).json({
        error: "CASCADE_WARNING",
        message: `This subject is referenced by ${papersCount} question papers and ${notesCount} study notes.`,
        papersCount,
        notesCount,
        subjectName: subject.name,
      });
    }

    if (force) {
      await PYQ.deleteMany({ subjectId });
      await Note.deleteMany({ subjectId });
    }

    await Subject.findByIdAndDelete(subjectId);

    res.json({
      success: true,
      message: `Subject '${subject.name}' was successfully deleted.`,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 📄 QUESTION PAPERS (PYQ) ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// Upload PYQ PDF → Cloudinary → save metadata (Status: "pending" by default)
app.post("/api/upload", requireAuth(), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file attached" });
    }

    const {
      title,
      universityId,
      courseId,
      semesterId,
      subjectId,
      university,
      course,
      semester,
      subject,
      subjectCode,
      examType,
      academicYear,
      year,
      branch,
      description,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Paper title is required" });
    }

    // Fetch entity references if IDs are passed (safely validating ObjectIds)
    let resolvedUniName = university || "United University";
    let resolvedCourseName = course || "General";
    let resolvedSubjectName = subject || "";
    let resolvedSubjectCode = subjectCode || "";

    let validUniId = null;
    let validCourseId = null;
    let validSemId = null;
    let validSubId = null;

    if (universityId && mongoose.isValidObjectId(universityId)) {
      validUniId = universityId;
      const u = await University.findById(universityId);
      if (u) resolvedUniName = u.name;
    } else if (university) {
      const u = await University.findOne({
        $or: [
          { name: new RegExp(`^${university.trim()}$`, "i") },
          { code: new RegExp(`^${university.trim()}$`, "i") },
        ],
      });
      if (u) {
        validUniId = u._id;
        resolvedUniName = u.name;
      }
    }

    if (courseId && mongoose.isValidObjectId(courseId)) {
      validCourseId = courseId;
      const c = await Course.findById(courseId);
      if (c) resolvedCourseName = c.name;
    } else if (courseId || course) {
      const courseIdentifier = String(courseId || course || "").trim();
      const c = await Course.findOne({
        $or: [
          { code: new RegExp(`^${courseIdentifier}$`, "i") },
          { name: new RegExp(`^${courseIdentifier}$`, "i") },
        ],
      });
      if (c) {
        validCourseId = c._id;
        resolvedCourseName = c.name;
      }
    }

    if (semesterId && mongoose.isValidObjectId(semesterId)) {
      validSemId = semesterId;
    }

    if (subjectId && mongoose.isValidObjectId(subjectId)) {
      validSubId = subjectId;
      const s = await Subject.findById(subjectId);
      if (s) {
        resolvedSubjectName = s.name;
        resolvedSubjectCode = s.code;
      }
    }

    const result = await uploadToCloudinary(req.file.buffer);

    // Auto-approve if uploaded by an Administrator
    const isAdmin = await isUserAdmin(req);
    const initialStatus = isAdmin ? "approved" : "pending";

    // Parse 4-digit numeric year safely from inputs like "2024-25" or "2024"
    let parsedYear = new Date().getFullYear();
    const rawYear = year || academicYear;
    if (rawYear) {
      const match = String(rawYear).match(/\d{4}/);
      if (match) {
        parsedYear = parseInt(match[0], 10);
      }
    }

    const parsedSemester = (semester && !isNaN(Number(semester))) ? Number(semester) : 1;

    // Resolve uploader identity
    const uploaderUserId = req.auth?.userId || req.headers["x-user-id"] || req.body?.userId || null;
    const uploaderEmail = (
      req.body?.userEmail ||
      req.headers["x-user-email"] ||
      ""
    ).toLowerCase().trim();
    const uploaderName = req.body?.userName || "";

    const finalUploaderId = uploaderUserId || uploaderEmail || "anonymous";

    const pyq = await PYQ.create({
      title: title.trim(),
      universityId: validUniId,
      courseId: validCourseId,
      semesterId: validSemId,
      subjectId: validSubId,
      university: resolvedUniName,
      course: resolvedCourseName,
      semester: parsedSemester,
      subject: resolvedSubjectName || title.trim(),
      subjectCode: resolvedSubjectCode,
      examType: examType || "End Semester",
      academicYear: academicYear || `${parsedYear}-${String(parsedYear + 1).slice(-2)}`,
      year: parsedYear,
      branch: branch || "",
      description: description || "",
      fileUrl: result.secure_url,
      fileSize: req.file.size || 0,
      uploadedBy: finalUploaderId,
      userEmail: uploaderEmail,
      userName: uploaderName,
      status: initialStatus,
      ...(isAdmin && {
        reviewedBy: finalUploaderId,
        reviewedAt: new Date(),
      }),
    });

    res.status(201).json(pyq);
  } catch (error) {
    console.error("Upload PYQ error:", error);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

// Get Public Approved PYQs with Dynamic Filters
app.get("/api/pyqs", async (req, res) => {
  try {
    const { universityId, courseId, semesterId, subjectId, course, semester, examType, year, search } = req.query;
    const conditions = [
      {
        $or: [
          { status: "approved" },
          { status: { $exists: false } },
          { status: null },
        ],
      },
    ];

    if (universityId && universityId !== "all" && universityId !== "All") conditions.push({ universityId });
    if (courseId && courseId !== "all" && courseId !== "All") conditions.push({ courseId });
    if (semesterId && semesterId !== "all" && semesterId !== "All") conditions.push({ semesterId });
    if (subjectId && subjectId !== "all" && subjectId !== "All") conditions.push({ subjectId });

    if (course && course !== "all" && course !== "All") {
      conditions.push({ course: new RegExp(course, "i") });
    }
    if (semester && semester !== "all" && semester !== "All") {
      conditions.push({ semester: Number(semester) });
    }
    if (examType && examType !== "all" && examType !== "All") {
      conditions.push({ examType: new RegExp(examType, "i") });
    }
    if (year && year !== "all" && year !== "All") {
      conditions.push({
        $or: [
          { year: Number(year) },
          { academicYear: new RegExp(String(year), "i") },
        ],
      });
    }

    if (search && search.trim()) {
      const q = search.trim();
      const numQ = Number(q);
      const orSearch = [
        { title: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { subjectCode: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } },
        { university: { $regex: q, $options: "i" } },
        { branch: { $regex: q, $options: "i" } },
        { academicYear: { $regex: q, $options: "i" } },
        { examType: { $regex: q, $options: "i" } },
      ];
      if (!isNaN(numQ) && numQ > 0) {
        if (numQ >= 1 && numQ <= 12) orSearch.push({ semester: numQ });
        if (numQ >= 1990 && numQ <= 2099) orSearch.push({ year: numQ });
      }
      conditions.push({ $or: orSearch });
    }

    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const pyqs = await PYQ.find(filter)
      .populate("universityId", "name code")
      .populate("courseId", "name code")
      .populate("subjectId", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(pyqs);
  } catch (err) {
    console.error("Public PYQs error:", err);
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});

// Get ALL PYQs for Admin (with filters)
app.get("/api/admin/pyqs", requireAdmin, async (req, res) => {
  try {
    const { status, universityId, courseId, semesterId, search } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (universityId && universityId !== "all") filter.universityId = universityId;
    if (courseId && courseId !== "all") filter.courseId = courseId;
    if (semesterId && semesterId !== "all") filter.semesterId = semesterId;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { subjectCode: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } },
        { university: { $regex: search, $options: "i" } },
      ];
    }

    const pyqs = await PYQ.find(filter)
      .populate("universityId", "name code")
      .populate("courseId", "name code")
      .populate("subjectId", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(pyqs);
  } catch (err) {
    console.error("Admin PYQs error:", err);
    res.status(500).json({ error: "Failed to fetch admin papers" });
  }
});

// Get papers uploaded by the authenticated user
app.get("/api/my-pyqs", async (req, res) => {
  try {
    const clerkId = req.auth?.userId || req.headers["x-user-id"] || req.query?.userId;
    const userEmail = (
      req.headers["x-user-email"] ||
      req.query?.email ||
      ""
    ).toLowerCase().trim();

    if (!clerkId && !userEmail) {
      return res.json([]);
    }

    const conditions = [];
    if (clerkId) conditions.push({ uploadedBy: clerkId });
    if (userEmail) {
      conditions.push({ uploadedBy: userEmail });
      conditions.push({ userEmail: userEmail });
    }

    const pyqs = await PYQ.find({ $or: conditions })
      .populate("universityId", "name code")
      .populate("courseId", "name code")
      .populate("subjectId", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(pyqs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your papers" });
  }
});

// Admin Approve / Reject single PYQ
app.patch("/api/admin/pyqs/:id/status", requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: "Failed to update paper status" });
  }
});

// Admin Bulk Approve / Reject PYQs
app.post("/api/admin/pyqs/bulk-status", requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: "Failed to update bulk status" });
  }
});

// Update PYQ metadata
app.put("/api/pyqs/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      universityId,
      courseId,
      semesterId,
      subjectId,
      university,
      course,
      semester,
      subject,
      subjectCode,
      examType,
      academicYear,
      year,
      branch,
      status,
    } = req.body;

    const updated = await PYQ.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(title && { title }),
          ...(universityId && { universityId }),
          ...(courseId && { courseId }),
          ...(semesterId && { semesterId }),
          ...(subjectId && { subjectId }),
          ...(university && { university }),
          ...(course && { course }),
          ...(semester !== undefined && { semester: !isNaN(Number(semester)) ? Number(semester) : 1 }),
          ...(subject && { subject }),
          ...(subjectCode && { subjectCode }),
          ...(examType && { examType }),
          ...(academicYear && { academicYear }),
          ...(year && {
            year: String(year).match(/\d{4}/) ? parseInt(String(year).match(/\d{4}/)[0], 10) : new Date().getFullYear(),
          }),
          ...(branch !== undefined && { branch }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Question paper not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update question paper" });
  }
});

// Admin Update PYQ metadata (Admin Alias)
app.put("/api/admin/pyqs/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      universityId,
      courseId,
      semesterId,
      subjectId,
      university,
      course,
      semester,
      subject,
      subjectCode,
      examType,
      academicYear,
      year,
      branch,
      status,
    } = req.body;

    const updated = await PYQ.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(title && { title }),
          ...(universityId && { universityId }),
          ...(courseId && { courseId }),
          ...(semesterId && { semesterId }),
          ...(subjectId && { subjectId }),
          ...(university && { university }),
          ...(course && { course }),
          ...(semester && { semester: Number(semester) }),
          ...(subject && { subject }),
          ...(subjectCode && { subjectCode }),
          ...(examType && { examType }),
          ...(academicYear && { academicYear }),
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
    res.status(500).json({ error: "Failed to delete question paper" });
  }
});

// Bulk delete PYQs
app.post("/api/admin/pyqs/bulk-delete", requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No paper IDs provided" });
    }
    const result = await PYQ.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk delete question papers" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 📝 NOTES & STUDY MATERIALS ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// Upload Study Note PDF → Cloudinary → save metadata
app.post("/api/notes/upload", requireAuth(), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF / document attached" });
    }

    const {
      title,
      subject,
      subjectCode,
      unit,
      universityId,
      courseId,
      semesterId,
      subjectId,
      university,
      course,
      semester,
      branch,
      author,
      description,
    } = req.body;

    let resolvedUniName = university || "United University";
    let resolvedCourseName = course || "B.Tech";
    let resolvedSubjectName = subject || "General";
    let resolvedSubjectCode = subjectCode || "";

    let validUniId = null;
    let validCourseId = null;
    let validSemId = null;
    let validSubId = null;

    if (universityId && mongoose.isValidObjectId(universityId)) {
      validUniId = universityId;
      const u = await University.findById(universityId);
      if (u) resolvedUniName = u.name;
    } else if (university) {
      const u = await University.findOne({
        $or: [
          { name: new RegExp(`^${university.trim()}$`, "i") },
          { code: new RegExp(`^${university.trim()}$`, "i") },
        ],
      });
      if (u) {
        validUniId = u._id;
        resolvedUniName = u.name;
      }
    }

    if (courseId && mongoose.isValidObjectId(courseId)) {
      validCourseId = courseId;
      const c = await Course.findById(courseId);
      if (c) resolvedCourseName = c.name;
    } else if (courseId || course) {
      const courseIdentifier = String(courseId || course || "").trim();
      const c = await Course.findOne({
        $or: [
          { code: new RegExp(`^${courseIdentifier}$`, "i") },
          { name: new RegExp(`^${courseIdentifier}$`, "i") },
        ],
      });
      if (c) {
        validCourseId = c._id;
        resolvedCourseName = c.name;
      }
    }

    if (semesterId && mongoose.isValidObjectId(semesterId)) {
      validSemId = semesterId;
    }

    if (subjectId && mongoose.isValidObjectId(subjectId)) {
      validSubId = subjectId;
      const s = await Subject.findById(subjectId);
      if (s) {
        resolvedSubjectName = s.name;
        resolvedSubjectCode = s.code;
      }
    }

    const result = await uploadToCloudinary(req.file.buffer);

    // Auto-approve if uploaded by an Administrator
    const isAdmin = await isUserAdmin(req);
    const initialStatus = isAdmin ? "approved" : "pending";

    // Resolve uploader identity
    const uploaderUserId = req.auth?.userId || req.headers["x-user-id"] || req.body?.userId || null;
    const uploaderEmail = (
      req.body?.userEmail ||
      req.headers["x-user-email"] ||
      ""
    ).toLowerCase().trim();
    const uploaderName = req.body?.userName || "";

    const finalUploaderId = uploaderUserId || uploaderEmail || "anonymous";

    const note = await Note.create({
      title: title.trim(),
      subject: resolvedSubjectName,
      subjectCode: resolvedSubjectCode,
      unit: unit || "Complete Syllabus",
      universityId: validUniId,
      courseId: validCourseId,
      semesterId: validSemId,
      subjectId: validSubId,
      university: resolvedUniName,
      course: resolvedCourseName,
      semester: semester ? Number(semester) : 1,
      branch: branch || "",
      author: author || "",
      description: description || "",
      fileUrl: result.secure_url,
      fileSize: req.file.size || 0,
      uploadedBy: finalUploaderId,
      userEmail: uploaderEmail,
      userName: uploaderName,
      status: initialStatus,
      ...(isAdmin && {
        reviewedBy: finalUploaderId,
        reviewedAt: new Date(),
      }),
    });

    res.status(201).json(note);
  } catch (error) {
    console.error("Upload Note error:", error);
    res.status(500).json({ error: "Failed to upload study notes: " + error.message });
  }
});

// Get Public Approved Notes
app.get("/api/notes", async (req, res) => {
  try {
    const { universityId, courseId, semesterId, subjectId, course, semester, unit, search } = req.query;
    const conditions = [
      {
        $or: [
          { status: "approved" },
          { status: { $exists: false } },
          { status: null },
        ],
      },
    ];

    if (universityId && universityId !== "all" && universityId !== "All") conditions.push({ universityId });
    if (courseId && courseId !== "all" && courseId !== "All") conditions.push({ courseId });
    if (semesterId && semesterId !== "all" && semesterId !== "All") conditions.push({ semesterId });
    if (subjectId && subjectId !== "all" && subjectId !== "All") conditions.push({ subjectId });

    if (course && course !== "all" && course !== "All") conditions.push({ course: new RegExp(course, "i") });
    if (semester && semester !== "all" && semester !== "All") conditions.push({ semester: Number(semester) });
    if (unit && unit !== "all" && unit !== "All") conditions.push({ unit: new RegExp(unit, "i") });

    if (search && search.trim()) {
      const q = search.trim();
      const numQ = Number(q);
      const orSearch = [
        { title: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { subjectCode: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } },
        { university: { $regex: q, $options: "i" } },
        { unit: { $regex: q, $options: "i" } },
        { branch: { $regex: q, $options: "i" } },
      ];
      if (!isNaN(numQ) && numQ >= 1 && numQ <= 12) {
        orSearch.push({ semester: numQ });
      }
      conditions.push({ $or: orSearch });
    }

    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const notes = await Note.find(filter)
      .populate("universityId", "name code")
      .populate("courseId", "name code")
      .populate("subjectId", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(notes);
  } catch (err) {
    console.error("Public Notes error:", err);
    res.status(500).json({ error: "Failed to fetch study notes" });
  }
});

// Get ALL Notes for Admin
app.get("/api/admin/notes", requireAdmin, async (req, res) => {
  try {
    const { status, universityId, courseId, search } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (universityId && universityId !== "all") filter.universityId = universityId;
    if (courseId && courseId !== "all") filter.courseId = courseId;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    const notes = await Note.find(filter)
      .populate("universityId", "name code")
      .populate("courseId", "name code")
      .populate("subjectId", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin notes" });
  }
});

// Get notes uploaded by the authenticated user
app.get("/api/my-notes", async (req, res) => {
  try {
    const clerkId = req.auth?.userId || req.headers["x-user-id"] || req.query?.userId;
    const userEmail = (
      req.headers["x-user-email"] ||
      req.query?.email ||
      ""
    ).toLowerCase().trim();

    if (!clerkId && !userEmail) {
      return res.json([]);
    }

    const conditions = [];
    if (clerkId) conditions.push({ uploadedBy: clerkId });
    if (userEmail) {
      conditions.push({ uploadedBy: userEmail });
      conditions.push({ userEmail: userEmail });
    }

    const notes = await Note.find({ $or: conditions })
      .populate("universityId", "name code")
      .populate("courseId", "name code")
      .populate("subjectId", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your study notes" });
  }
});

// Admin Approve / Reject single Note
app.patch("/api/admin/notes/:id/status", requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: "Failed to update note status" });
  }
});

// Admin Bulk Approve / Reject Notes
app.post("/api/admin/notes/bulk-status", requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: "Failed to update bulk note status" });
  }
});

// Update Note metadata
app.put("/api/notes/:id", requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, unit, universityId, courseId, semesterId, subjectId, university, course, semester, branch, author, description, status } = req.body;

    const updated = await Note.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(title && { title }),
          ...(subject && { subject }),
          ...(unit && { unit }),
          ...(universityId && { universityId }),
          ...(courseId && { courseId }),
          ...(semesterId && { semesterId }),
          ...(subjectId && { subjectId }),
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
    res.status(500).json({ error: "Failed to delete study note" });
  }
});

// Bulk delete Notes
app.post("/api/admin/notes/bulk-delete", requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No note IDs provided" });
    }
    const result = await Note.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk delete study notes" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 📊 COMPREHENSIVE ADMIN STATS & USER DIRECTORY
// ═════════════════════════════════════════════════════════════════════════════

// Admin stats overview with real hierarchical aggregations
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const totalUniversities = await University.countDocuments();
    const activeUniversities = await University.countDocuments({ status: "active" });

    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ status: "active" });

    const totalSemesters = await Semester.countDocuments();
    const totalSubjects = await Subject.countDocuments();
    const activeSubjects = await Subject.countDocuments({ status: "active" });

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

    // Aggregation: Papers by University
    const papersByUniversity = await PYQ.aggregate([
      { $group: { _id: "$university", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Aggregation: Papers by Course
    const papersByCourse = await PYQ.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Aggregation: Papers by Semester
    const papersBySemester = await PYQ.aggregate([
      { $group: { _id: "$semester", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Aggregation: Papers by Year
    const papersByYear = await PYQ.aggregate([
      { $group: { _id: "$academicYear", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 8 },
    ]);

    // Recent Entities
    const recentUniversities = await University.find().sort({ createdAt: -1 }).limit(5);
    const recentCourses = await Course.find().populate("universityId", "name code").sort({ createdAt: -1 }).limit(5);
    const recentSubjects = await Subject.find().populate("courseId", "name code").sort({ createdAt: -1 }).limit(5);
    const recentPapers = await PYQ.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      totalUniversities,
      activeUniversities,
      totalCourses,
      activeCourses,
      totalSemesters,
      totalSubjects,
      activeSubjects,
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
      papersByUniversity,
      papersByCourse,
      papersBySemester,
      papersByYear,
      recentUniversities,
      recentCourses,
      recentSubjects,
      recentPapers,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to load admin statistics" });
  }
});

// Admin list users & contributors with real Clerk and MongoDB integration
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    // 1. Fetch real users from Clerk
    let clerkUsers = [];
    try {
      if (typeof clerkClient !== "undefined" && clerkClient.users) {
        const response = await clerkClient.users.getUserList({ limit: 100 });
        clerkUsers = response.data || response || [];
      }
    } catch (clerkErr) {
      console.warn("Clerk user list warning:", clerkErr.message);
    }

    // 2. Fetch MongoDB users
    const mongoUsers = await User.find().sort({ createdAt: -1 });

    // 3. Aggregate uploads by uploadedBy (clerkId or email)
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

    const adminEmails = getAdminEmails();
    const seenIdentifiers = new Set();
    const userDirectory = [];

    // Add Clerk registered users first
    for (const cu of clerkUsers) {
      const email = (
        cu.primaryEmailAddress?.emailAddress ||
        cu.emailAddresses?.[0]?.emailAddress ||
        ""
      ).toLowerCase();

      const name =
        `${cu.firstName || ""} ${cu.lastName || ""}`.trim() ||
        cu.username ||
        (email ? email.split("@")[0] : "Member");

      const isAdmin = adminEmails.some((e) => e.toLowerCase() === email);
      const pyqUploads = pyqMap[cu.id] || (email ? pyqMap[email] : 0) || 0;
      const noteUploads = noteMap[cu.id] || (email ? noteMap[email] : 0) || 0;

      seenIdentifiers.add(cu.id);
      if (email) seenIdentifiers.add(email);

      userDirectory.push({
        _id: cu.id,
        clerkId: cu.id,
        name,
        email,
        imageUrl: cu.imageUrl || null,
        role: isAdmin ? "admin" : "student",
        createdAt: cu.createdAt ? new Date(cu.createdAt) : new Date(),
        pyqUploads,
        noteUploads,
        totalUploads: pyqUploads + noteUploads,
      });
    }

    // Add any Mongo users not yet included
    for (const mu of mongoUsers) {
      const email = (mu.email || "").toLowerCase();
      if ((mu.clerkId && seenIdentifiers.has(mu.clerkId)) || (email && seenIdentifiers.has(email))) {
        continue;
      }
      if (mu.clerkId) seenIdentifiers.add(mu.clerkId);
      if (email) seenIdentifiers.add(email);

      const isAdmin = adminEmails.some((e) => e.toLowerCase() === email);
      const pyqUploads = (mu.clerkId ? pyqMap[mu.clerkId] : 0) || (email ? pyqMap[email] : 0) || 0;
      const noteUploads = (mu.clerkId ? noteMap[mu.clerkId] : 0) || (email ? noteMap[email] : 0) || 0;

      userDirectory.push({
        _id: mu._id,
        clerkId: mu.clerkId,
        name: mu.name || (email ? email.split("@")[0] : "Academic Contributor"),
        email: mu.email || "",
        imageUrl: null,
        role: isAdmin ? "admin" : (mu.role || "student"),
        createdAt: mu.createdAt || new Date(),
        pyqUploads,
        noteUploads,
        totalUploads: pyqUploads + noteUploads,
      });
    }

    res.json(userDirectory);
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed to load user directory" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 💬 FEEDBACK & SUGGESTIONS SYSTEM ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

const generateFeedbackReferenceId = async () => {
  for (let i = 0; i < 15; i++) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const refId = `PB-FB-${randomNum}`;
    const exists = await Feedback.findOne({ referenceId: refId });
    if (!exists) return refId;
  }
  return `PB-FB-${Date.now().toString().slice(-6)}`;
};

const generatePaperRequestReferenceId = async () => {
  for (let i = 0; i < 15; i++) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const refId = `PB-REQ-${randomNum}`;
    const exists = await PaperRequest.findOne({ referenceId: refId });
    if (!exists) return refId;
  }
  return `PB-REQ-${Date.now().toString().slice(-6)}`;
};

const sanitizeInputText = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
};

// 1. Submit Feedback (Streamlined 20-30s Form for Authenticated Student)
app.post("/api/feedback", requireAuthUser, async (req, res) => {
  try {
    const userId = req.auth?.userId || req.headers["x-user-id"] || "";
    const sessionClaims = req.auth?.sessionClaims || {};
    const userEmail = (
      req.headers["x-user-email"] ||
      sessionClaims.email ||
      req.body?.userEmail ||
      ""
    ).toLowerCase().trim();
    const userName = req.headers["x-user-name"] || req.body?.userName || req.body?.studentName || "";

    const {
      problemType,
      feedbackType,
      relatedTo,
      studentName,
      teacherName,
      courseId,
      course,
      department,
      academicYear,
      semester,
      subjectId,
      subject,
      paperId,
      paperTitle,
      examYear,
      searchQuery,
      source,
      rating,
      message,
      followUpRequested,
      anonymous,
    } = req.body;

    const resolvedType = (problemType || feedbackType || "General feedback").trim();

    // Validation: Clean Message (Max 1000 chars as per specification)
    const cleanMessage = sanitizeInputText(message || "");
    if (!cleanMessage || cleanMessage.length < 3) {
      return res.status(400).json({ error: "Please enter a brief description (at least 3 characters)." });
    }
    if (cleanMessage.length > 1000) {
      return res.status(400).json({ error: "Feedback message cannot exceed 1000 characters." });
    }

    // Validation: Rating (Optional and secondary)
    let numRating = null;
    if (rating !== undefined && rating !== null && rating !== "") {
      const parsedRating = Number(rating);
      if (!isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
        numRating = parsedRating;
      }
    }

    // Duplicate submission protection (45s debounce per user for exact message)
    const duplicate = await Feedback.findOne({
      userId,
      message: cleanMessage,
      createdAt: { $gte: new Date(Date.now() - 45000) },
    });
    if (duplicate) {
      return res.status(429).json({
        error: "Duplicate feedback detected. Please wait a moment before submitting again.",
        referenceId: duplicate.referenceId,
      });
    }

    // Generate unique reference ID (e.g. PB-FB-104281)
    const referenceId = await generateFeedbackReferenceId();

    // Default priority
    const highPriorityTypes = [
      "Report a Bug",
      "Report a Problem",
      "Performance Issue",
      "Account/Login Issue",
      "Website problem",
      "Download problem",
      "Wrong paper",
    ];
    const initialPriority = highPriorityTypes.includes(resolvedType) ? "High" : "Medium";

    const isAnonymous = Boolean(anonymous);

    const newFeedback = await Feedback.create({
      referenceId,
      userId: userId || "anonymous_user",
      userNameSnapshot: isAnonymous ? "Anonymous Student" : sanitizeInputText(studentName || userName || "Student"),
      userEmailSnapshot: isAnonymous ? "" : userEmail,
      anonymous: isAnonymous,
      feedbackType: resolvedType,
      problemType: resolvedType,
      relatedTo: relatedTo || "Website",
      studentName: sanitizeInputText(studentName || userName || ""),
      teacherName: sanitizeInputText(teacherName || ""),
      courseId: courseId && mongoose.Types.ObjectId.isValid(courseId) ? courseId : null,
      course: sanitizeInputText(course || ""),
      department: sanitizeInputText(department || ""),
      academicYear: sanitizeInputText(academicYear || ""),
      semester: sanitizeInputText(String(semester || "")),
      subjectId: subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null,
      subject: sanitizeInputText(subject || ""),
      paperId: paperId && mongoose.Types.ObjectId.isValid(paperId) ? paperId : null,
      paperTitle: sanitizeInputText(paperTitle || ""),
      examYear: sanitizeInputText(String(examYear || "")),
      searchQuery: sanitizeInputText(searchQuery || ""),
      source: sanitizeInputText(source || "direct"),
      rating: numRating,
      message: cleanMessage,
      followUpRequested: Boolean(followUpRequested),
      status: "New",
      priority: initialPriority,
      auditLog: [
        {
          action: "Submitted",
          actor: isAnonymous ? "Anonymous Student" : (userName || userEmail || "Student"),
          timestamp: new Date(),
          details: `Feedback created with initial priority ${initialPriority}.`,
        },
      ],
    });

    // Send transactional notification email non-blockingly (resilient error boundary)
    sendFeedbackNotificationEmail(newFeedback).catch((err) => {
      console.warn("Background email notification dispatch warning:", err.message);
    });

    res.status(201).json({
      success: true,
      message: "Your feedback has been successfully submitted to the PaperBridge team.",
      referenceId: newFeedback.referenceId,
      feedback: {
        _id: newFeedback._id,
        referenceId: newFeedback.referenceId,
        feedbackType: newFeedback.feedbackType,
        problemType: newFeedback.problemType,
        rating: newFeedback.rating,
        status: newFeedback.status,
        createdAt: newFeedback.createdAt,
      },
    });
  } catch (err) {
    console.error("Submit feedback error:", err);
    res.status(500).json({ error: err.message || "Failed to submit feedback" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 📄 PAPER REQUESTS & AVAILABILITY SYSTEM ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

// 1. Submit Paper Request (Authenticated Student)
app.post("/api/paper-requests", requireAuthUser, async (req, res) => {
  try {
    const userId = req.auth?.userId || req.headers["x-user-id"] || "";
    const sessionClaims = req.auth?.sessionClaims || {};
    const userEmail = (
      req.headers["x-user-email"] ||
      sessionClaims.email ||
      req.body?.studentEmail ||
      ""
    ).toLowerCase().trim();
    const studentName = req.headers["x-user-name"] || req.body?.studentName || "Student";

    const {
      course,
      courseId,
      academicYear,
      subject,
      subjectId,
      examYear,
      examType,
      message,
      notifyMe,
    } = req.body;

    if (!course || !course.trim()) {
      return res.status(400).json({ error: "Please select or provide your course." });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: "Please enter or select the subject name." });
    }
    if (!examYear) {
      return res.status(400).json({ error: "Please provide the paper / exam year (e.g. 2026)." });
    }

    const cleanCourse = sanitizeInputText(course);
    const cleanSubject = sanitizeInputText(subject);
    const numExamYear = parseInt(examYear, 10);
    if (isNaN(numExamYear) || numExamYear < 2000 || numExamYear > 2040) {
      return res.status(400).json({ error: "Please enter a valid examination year between 2000 and 2040." });
    }

    const cleanMessage = sanitizeInputText(message || "");
    if (cleanMessage.length > 1000) {
      return res.status(400).json({ error: "Message cannot exceed 1000 characters." });
    }

    // Duplicate protection: check if same user already requested this paper
    const existing = await PaperRequest.findOne({
      userId,
      course: cleanCourse,
      subject: cleanSubject,
      examYear: numExamYear,
    });

    if (existing) {
      return res.status(409).json({
        alreadyRequested: true,
        message: "You have already requested this paper. We'll notify you when it becomes available.",
        referenceId: existing.referenceId,
        request: existing,
      });
    }

    // Reference ID (e.g. PB-REQ-104281)
    const referenceId = await generatePaperRequestReferenceId();

    // Upsert or retrieve PaperAvailability entry
    let availability = await PaperAvailability.findOne({
      course: cleanCourse,
      subject: cleanSubject,
      examYear: numExamYear,
    });

    if (!availability) {
      availability = await PaperAvailability.create({
        courseId: courseId && mongoose.Types.ObjectId.isValid(courseId) ? courseId : null,
        course: cleanCourse,
        academicYear: sanitizeInputText(academicYear || "1st Year"),
        subjectId: subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null,
        subject: cleanSubject,
        examYear: numExamYear,
        examType: sanitizeInputText(examType || "End Semester"),
        status: "REQUESTED",
        requestCount: 1,
      });
    } else {
      availability.requestCount = (availability.requestCount || 0) + 1;
      // Only set to REQUESTED if not already marked AVAILABLE, COMING_SOON or NOT_AVAILABLE by admin
      if (
        availability.status !== "AVAILABLE" &&
        availability.status !== "COMING_SOON" &&
        availability.status !== "NOT_AVAILABLE"
      ) {
        availability.status = "REQUESTED";
      }
      await availability.save();
    }

    const newRequest = await PaperRequest.create({
      referenceId,
      userId,
      studentName: sanitizeInputText(studentName),
      studentEmail: userEmail,
      availabilityId: availability._id,
      courseId: courseId && mongoose.Types.ObjectId.isValid(courseId) ? courseId : null,
      course: cleanCourse,
      academicYear: sanitizeInputText(academicYear || "1st Year"),
      subjectId: subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null,
      subject: cleanSubject,
      examYear: numExamYear,
      examType: sanitizeInputText(examType || "End Semester"),
      message: cleanMessage,
      notifyMe: notifyMe !== false,
      status: availability.status === "COMING_SOON" ? "COMING_SOON" : "NEW",
    });

    // Send transactional admin notification email (fault-tolerant asynchronous)
    sendPaperRequestNotificationEmail(newRequest, availability.requestCount).catch((err) => {
      console.warn("[EmailService] Paper request notification email warning:", err.message);
    });

    res.status(201).json({
      success: true,
      message: "Paper request submitted successfully! We'll work on adding this paper.",
      referenceId: newRequest.referenceId,
      request: newRequest,
      availability,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        alreadyRequested: true,
        message: "You have already requested this paper.",
      });
    }
    console.error("Submit paper request error:", err);
    res.status(500).json({ error: err.message || "Failed to submit paper request" });
  }
});

// 2. User's Paper Request History
app.get("/api/paper-requests/my", requireAuthUser, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const sessionClaims = req.auth?.sessionClaims || {};
    const userEmail = (
      req.headers["x-user-email"] ||
      sessionClaims.email ||
      req.query?.email ||
      ""
    ).toLowerCase().trim();

    const queryConditions = [];
    if (userId) queryConditions.push({ userId });
    if (userEmail) queryConditions.push({ studentEmail: userEmail });

    if (queryConditions.length === 0) return res.json([]);

    const requests = await PaperRequest.find({ $or: queryConditions })
      .select("-internalNotes")
      .populate("availabilityId", "status requestCount adminNote expectedDate")
      .populate("paperId", "title fileUrl academicYear year examType")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("Fetch user paper requests error:", err);
    res.status(500).json({ error: "Failed to load paper requests" });
  }
});

// 3. Check if user already requested a specific paper
app.get("/api/paper-requests/check", requireAuthUser, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { course, subject, examYear } = req.query;

    if (!userId || !course || !subject || !examYear) {
      return res.json({ requested: false });
    }

    const numYear = parseInt(examYear, 10);
    const existing = await PaperRequest.findOne({
      userId,
      course: course.trim(),
      subject: subject.trim(),
      examYear: numYear,
    }).select("-internalNotes");

    res.json({
      requested: Boolean(existing),
      request: existing || null,
    });
  } catch (err) {
    res.json({ requested: false });
  }
});

// 4. Public Paper Availability (for Browse & Subject pages)
app.get("/api/paper-availability", async (req, res) => {
  try {
    const { course, subject, examYear, status } = req.query;
    const filter = {};
    if (course && course !== "All") filter.course = { $regex: course.trim(), $options: "i" };
    if (subject && subject !== "All") filter.subject = { $regex: subject.trim(), $options: "i" };
    if (examYear) filter.examYear = parseInt(examYear, 10);
    if (status && status !== "All") filter.status = status;

    const records = await PaperAvailability.find(filter)
      .populate("paperId", "title fileUrl examType year academicYear")
      .sort({ examYear: -1, requestCount: -1 });

    res.json(records);
  } catch (err) {
    console.error("Fetch paper availability error:", err);
    res.status(500).json({ error: "Failed to load availability records" });
  }
});

// 5. Admin Paper Availability Management
app.get("/api/admin/paper-availability", requireAdmin, async (req, res) => {
  try {
    const { status, course, search } = req.query;
    const filter = {};
    if (status && status !== "All" && status !== "all") filter.status = status;
    if (course && course !== "All" && course !== "all") filter.course = { $regex: course, $options: "i" };
    if (search && search.trim()) {
      filter.$or = [
        { subject: { $regex: search.trim(), $options: "i" } },
        { course: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const records = await PaperAvailability.find(filter)
      .populate("paperId", "title fileUrl")
      .populate("courseId", "name code")
      .populate("subjectId", "name code")
      .sort({ requestCount: -1, createdAt: -1 });

    res.json(records);
  } catch (err) {
    console.error("Admin paper availability fetch error:", err);
    res.status(500).json({ error: "Failed to load availability records" });
  }
});

// 6. Admin Add Expected Paper
app.post("/api/admin/paper-availability", requireAdmin, async (req, res) => {
  try {
    const { course, courseId, academicYear, subject, subjectId, examYear, examType, status, adminNote } = req.body;
    if (!course || !subject || !examYear) {
      return res.status(400).json({ error: "Course, subject, and exam year are required." });
    }

    const cleanCourse = sanitizeInputText(course);
    const cleanSubject = sanitizeInputText(subject);
    const numExamYear = parseInt(examYear, 10);

    let record = await PaperAvailability.findOne({
      course: cleanCourse,
      subject: cleanSubject,
      examYear: numExamYear,
    });

    if (record) {
      record.status = status || record.status;
      if (adminNote !== undefined) record.adminNote = sanitizeInputText(adminNote);
      await record.save();
      return res.json({ success: true, message: "Availability record updated", record });
    }

    record = await PaperAvailability.create({
      courseId: courseId && mongoose.Types.ObjectId.isValid(courseId) ? courseId : null,
      course: cleanCourse,
      academicYear: sanitizeInputText(academicYear || "1st Year"),
      subjectId: subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null,
      subject: cleanSubject,
      examYear: numExamYear,
      examType: sanitizeInputText(examType || "End Semester"),
      status: status || "COMING_SOON",
      adminNote: sanitizeInputText(adminNote || ""),
      createdBy: "admin",
    });

    res.status(201).json({ success: true, message: "Expected paper entry created", record });
  } catch (err) {
    console.error("Admin add paper availability error:", err);
    res.status(500).json({ error: err.message || "Failed to create expected paper entry" });
  }
});

// 7. Admin Update Availability Status (Coming Soon -> Available, link paper)
app.patch("/api/admin/paper-availability/:id", requireAdmin, async (req, res) => {
  try {
    const { status, paperId, adminNote } = req.body;
    const availability = await PaperAvailability.findById(req.params.id);
    if (!availability) return res.status(404).json({ error: "Record not found" });

    if (status) availability.status = status;
    if (adminNote !== undefined) availability.adminNote = sanitizeInputText(adminNote);

    if (paperId && mongoose.Types.ObjectId.isValid(paperId)) {
      availability.paperId = paperId;
    }

    await availability.save();

    // When marked AVAILABLE, cascade to update all matching student requests
    if (status === "AVAILABLE") {
      await PaperRequest.updateMany(
        { availabilityId: availability._id },
        {
          $set: {
            status: "AVAILABLE",
            ...(availability.paperId ? { paperId: availability.paperId } : {}),
          },
        }
      );
    } else if (status === "COMING_SOON") {
      await PaperRequest.updateMany(
        { availabilityId: availability._id, status: { $ne: "AVAILABLE" } },
        { $set: { status: "COMING_SOON" } }
      );
    }

    res.json({ success: true, message: "Availability updated successfully", availability });
  } catch (err) {
    console.error("Update availability error:", err);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// 8. Admin Delete Availability Record
app.delete("/api/admin/paper-availability/:id", requireAdmin, async (req, res) => {
  try {
    const availability = await PaperAvailability.findByIdAndDelete(req.params.id);
    if (!availability) return res.status(404).json({ error: "Record not found" });
    res.json({ success: true, message: "Availability record removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete availability record" });
  }
});

// 9. Admin List All Paper Requests (Paginated, Searchable, Filterable)
app.get("/api/admin/paper-requests", requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      course,
      search,
      sortBy = "newest",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== "all" && status !== "All") filter.status = status;
    if (course && course !== "all" && course !== "All") filter.course = { $regex: course, $options: "i" };

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { referenceId: { $regex: q, $options: "i" } },
        { studentName: { $regex: q, $options: "i" } },
        { studentEmail: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sortBy === "oldest") sortObj = { createdAt: 1 };

    const [requests, total, countsByStatus] = await Promise.all([
      PaperRequest.find(filter)
        .populate("paperId", "title fileUrl")
        .populate("availabilityId", "status requestCount")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      PaperRequest.countDocuments(filter),
      PaperRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCountsMap = {
      all: await PaperRequest.countDocuments(),
      new: 0,
      inProgress: 0,
      comingSoon: 0,
      available: 0,
      rejected: 0,
      resolved: 0,
    };

    countsByStatus.forEach((item) => {
      const k = String(item._id).toUpperCase();
      if (k === "NEW") statusCountsMap.new = item.count;
      else if (k === "IN_PROGRESS") statusCountsMap.inProgress = item.count;
      else if (k === "COMING_SOON") statusCountsMap.comingSoon = item.count;
      else if (k === "AVAILABLE") statusCountsMap.available = item.count;
      else if (k === "REJECTED") statusCountsMap.rejected = item.count;
      else if (k === "RESOLVED") statusCountsMap.resolved = item.count;
    });

    res.json({
      requests,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      counts: statusCountsMap,
    });
  } catch (err) {
    console.error("Admin paper requests fetch error:", err);
    res.status(500).json({ error: "Failed to load paper requests" });
  }
});

// 10. Admin Most Requested Papers (Real DB Aggregation)
app.get("/api/admin/paper-requests/most-requested", requireAdmin, async (req, res) => {
  try {
    const mostRequested = await PaperRequest.aggregate([
      {
        $group: {
          _id: {
            course: "$course",
            subject: "$subject",
            examYear: "$examYear",
          },
          requestCount: { $sum: 1 },
          uniqueStudents: { $addToSet: "$studentEmail" },
          latestRequestAt: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          _id: 0,
          course: "$_id.course",
          subject: "$_id.subject",
          examYear: "$_id.examYear",
          requestCount: 1,
          uniqueStudentCount: { $size: "$uniqueStudents" },
          latestRequestAt: 1,
        },
      },
      { $sort: { requestCount: -1, uniqueStudentCount: -1 } },
      { $limit: 10 },
    ]);

    res.json(mostRequested);
  } catch (err) {
    console.error("Most requested papers aggregation error:", err);
    res.status(500).json({ error: "Failed to aggregate most requested papers" });
  }
});

// 11. Admin Update Paper Request (Status, Response, Internal Notes)
app.patch("/api/admin/paper-requests/:id", requireAdmin, async (req, res) => {
  try {
    const { status, adminResponse, internalNote, paperId } = req.body;
    const adminEmail = (
      req.headers["x-user-email"] ||
      req.headers["x-admin-email"] ||
      "admin@paperbridge.com"
    ).toLowerCase().trim();

    const request = await PaperRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Paper request not found" });

    if (status) request.status = status;
    if (paperId && mongoose.Types.ObjectId.isValid(paperId)) request.paperId = paperId;

    if (typeof adminResponse === "string" && adminResponse.trim()) {
      request.adminResponse = {
        message: sanitizeInputText(adminResponse),
        respondedBy: adminEmail,
        respondedAt: new Date(),
      };
    }

    if (typeof internalNote === "string" && internalNote.trim()) {
      request.internalNotes.push({
        note: sanitizeInputText(internalNote),
        author: adminEmail,
        createdAt: new Date(),
      });
    }

    await request.save();

    res.json({ success: true, message: "Paper request updated successfully", request });
  } catch (err) {
    console.error("Update paper request error:", err);
    res.status(500).json({ error: "Failed to update paper request" });
  }
});

// 12. Admin Notification Badge Counts (Feedback + Paper Requests)
app.get("/api/admin/notification-badge", requireAdmin, async (req, res) => {
  try {
    const [newFeedbackCount, newRequestCount] = await Promise.all([
      Feedback.countDocuments({ status: "New" }),
      PaperRequest.countDocuments({ status: "NEW" }),
    ]);

    res.json({
      feedbackBadge: newFeedbackCount,
      requestsBadge: newRequestCount,
      totalPending: newFeedbackCount + newRequestCount,
    });
  } catch (err) {
    res.json({ feedbackBadge: 0, requestsBadge: 0, totalPending: 0 });
  }
});

// 2. User's Feedback History
app.get("/api/feedback/my", requireAuthUser, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const sessionClaims = req.auth?.sessionClaims || {};
    const userEmail = (
      req.headers["x-user-email"] ||
      sessionClaims.email ||
      req.query?.email ||
      ""
    ).toLowerCase().trim();

    const queryConditions = [];
    if (userId) queryConditions.push({ userId });
    if (userEmail) queryConditions.push({ userEmailSnapshot: userEmail });

    if (queryConditions.length === 0) {
      return res.json([]);
    }

    const feedbacks = await Feedback.find({ $or: queryConditions })
      .select("-internalNotes") // never expose internal admin notes to user
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (err) {
    console.error("Fetch user feedbacks error:", err);
    res.status(500).json({ error: "Failed to load your feedback history" });
  }
});

// 3. User Feedback Detail (Scoped by Ownership)
app.get("/api/feedback/my/:id", requireAuthUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;
    const userEmail = (req.headers["x-user-email"] || "").toLowerCase().trim();

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const filter = isObjectId ? { _id: id } : { referenceId: id.toUpperCase() };

    const feedback = await Feedback.findOne(filter).select("-internalNotes");
    if (!feedback) {
      return res.status(404).json({ error: "Feedback submission not found" });
    }

    const isAdmin = await isUserAdmin(req);
    const isOwner = (userId && feedback.userId === userId) || (userEmail && feedback.userEmailSnapshot === userEmail);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Access denied. You do not have permission to view this feedback." });
    }

    res.json(feedback);
  } catch (err) {
    console.error("Fetch feedback detail error:", err);
    res.status(500).json({ error: "Failed to load feedback details" });
  }
});

// 4. Admin Feedback Listing (Paginated, Searchable, Multi-filter, Sorting)
app.get("/api/admin/feedback", requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      feedbackType,
      course,
      rating,
      followUp,
      search,
      sortBy = "newest",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (priority && priority !== "all") filter.priority = priority;
    if (feedbackType && feedbackType !== "all") filter.feedbackType = feedbackType;
    if (course && course !== "all") filter.course = { $regex: course, $options: "i" };
    if (rating && rating !== "all") filter.rating = Number(rating);
    if (followUp === "true") filter.followUpRequested = true;
    if (followUp === "false") filter.followUpRequested = false;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { referenceId: { $regex: q, $options: "i" } },
        { userNameSnapshot: { $regex: q, $options: "i" } },
        { userEmailSnapshot: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { teacherName: { $regex: q, $options: "i" } },
      ];
    }

    // Sort order
    let sortObj = { createdAt: -1 };
    if (sortBy === "oldest") sortObj = { createdAt: 1 };
    else if (sortBy === "rating_desc") sortObj = { rating: -1, createdAt: -1 };
    else if (sortBy === "rating_asc") sortObj = { rating: 1, createdAt: -1 };
    else if (sortBy === "priority_desc") {
      // Map via sort or secondary sort
      sortObj = { priority: 1, createdAt: -1 };
    }

    const [feedbacks, total, countsByStatus, highPriorityCount] = await Promise.all([
      Feedback.find(filter)
        .populate("courseId", "name code")
        .populate("subjectId", "name code")
        .populate("paperId", "title examType year")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Feedback.countDocuments(filter),
      Feedback.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Feedback.countDocuments({ priority: { $in: ["High", "Critical"] }, status: { $nin: ["Resolved", "Archived"] } }),
    ]);

    const statusCountsMap = {
      all: await Feedback.countDocuments(),
      new: 0,
      underReview: 0,
      inProgress: 0,
      resolved: 0,
      rejected: 0,
      archived: 0,
      highPriority: highPriorityCount,
    };

    countsByStatus.forEach((item) => {
      if (item._id === "New") statusCountsMap.new = item.count;
      else if (item._id === "Under Review") statusCountsMap.underReview = item.count;
      else if (item._id === "In Progress") statusCountsMap.inProgress = item.count;
      else if (item._id === "Resolved") statusCountsMap.resolved = item.count;
      else if (item._id === "Rejected") statusCountsMap.rejected = item.count;
      else if (item._id === "Archived") statusCountsMap.archived = item.count;
    });

    res.json({
      feedbacks,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      counts: statusCountsMap,
    });
  } catch (err) {
    console.error("Admin fetch feedback error:", err);
    res.status(500).json({ error: "Failed to load feedback records" });
  }
});

// 5. Admin Feedback Analytics & Statistics
app.get("/api/admin/feedback/stats", requireAdmin, async (req, res) => {
  try {
    const totalCount = await Feedback.countDocuments();
    const now = new Date();

    const date7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const date90DaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      volume7Days,
      volume30Days,
      volume90Days,
      statusCounts,
      categoryDistribution,
      ratingStats,
      mostRequestedAgg,
    ] = await Promise.all([
      Feedback.countDocuments({ createdAt: { $gte: date7DaysAgo } }),
      Feedback.countDocuments({ createdAt: { $gte: date30DaysAgo } }),
      Feedback.countDocuments({ createdAt: { $gte: date90DaysAgo } }),
      Feedback.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Feedback.aggregate([
        { $group: { _id: "$feedbackType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Feedback.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          },
        },
      ]),
      Feedback.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$course", "$feedbackType"] },
            type: { $first: "$feedbackType" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const statusMap = {
      New: 0,
      "Under Review": 0,
      "In Progress": 0,
      Resolved: 0,
      Rejected: 0,
      Archived: 0,
    };
    statusCounts.forEach((s) => {
      if (s._id) statusMap[s._id] = s.count;
    });

    const ratingData = ratingStats[0] || {
      avgRating: 0,
      star1: 0,
      star2: 0,
      star3: 0,
      star4: 0,
      star5: 0,
    };

    const resolutionRate = totalCount > 0 ? Math.round((statusMap.Resolved / totalCount) * 100) : 0;

    res.json({
      totalCount,
      newCount: statusMap.New,
      underReviewCount: statusMap["Under Review"],
      inProgressCount: statusMap["In Progress"],
      resolvedCount: statusMap.Resolved,
      rejectedCount: statusMap.Rejected,
      archivedCount: statusMap.Archived,
      resolutionRate,
      averageRating: ratingData.avgRating ? Number(ratingData.avgRating.toFixed(1)) : 5.0,
      ratingDistribution: {
        1: ratingData.star1,
        2: ratingData.star2,
        3: ratingData.star3,
        4: ratingData.star4,
        5: ratingData.star5,
      },
      volume: {
        last7Days: volume7Days,
        last30Days: volume30Days,
        last90Days: volume90Days,
      },
      categoryDistribution: categoryDistribution.map((c) => ({
        category: c._id || "Other",
        count: c.count,
      })),
      mostRequestedImprovements: mostRequestedAgg.map((item) => ({
        label: `${item.type}${item._id && item._id !== item.type ? ` (${item._id})` : ""}`,
        count: item.count,
      })),
    });
  } catch (err) {
    console.error("Admin feedback stats error:", err);
    res.status(500).json({ error: "Failed to generate feedback statistics" });
  }
});

// 6. Admin Feedback Single Detail View
app.get("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate("courseId", "name code degreeType")
      .populate("subjectId", "name code")
      .populate("paperId", "title examType academicYear fileUrl");

    if (!feedback) return res.status(404).json({ error: "Feedback record not found" });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: "Failed to load feedback details" });
  }
});

// 7. Admin Update Feedback (Status, Priority, Official Response, Internal Notes)
app.patch("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
  try {
    const { status, priority, adminResponse, internalNote } = req.body;
    const adminEmail = (
      req.headers["x-user-email"] ||
      req.headers["x-admin-email"] ||
      "admin@paperbridge.com"
    ).toLowerCase().trim();

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ error: "Feedback record not found" });

    const auditEntries = [];

    // Update status
    if (status && status !== feedback.status) {
      const oldStatus = feedback.status;
      feedback.status = status;
      auditEntries.push({
        action: "Status Change",
        actor: adminEmail,
        timestamp: new Date(),
        details: `Status changed from '${oldStatus}' to '${status}'.`,
      });

      if (status === "Resolved" && !feedback.resolvedAt) {
        feedback.resolvedAt = new Date();
      }
    }

    // Update priority
    if (priority && priority !== feedback.priority) {
      const oldPriority = feedback.priority;
      feedback.priority = priority;
      auditEntries.push({
        action: "Priority Change",
        actor: adminEmail,
        timestamp: new Date(),
        details: `Priority changed from '${oldPriority}' to '${priority}'.`,
      });
    }

    // Update or add admin response
    if (typeof adminResponse === "string" && adminResponse.trim()) {
      feedback.adminResponse = {
        message: sanitizeInputText(adminResponse),
        respondedBy: adminEmail,
        respondedAt: new Date(),
      };
      auditEntries.push({
        action: "Response Added",
        actor: adminEmail,
        timestamp: new Date(),
        details: "Official admin response recorded for the user.",
      });
    }

    // Add internal admin note if provided
    if (typeof internalNote === "string" && internalNote.trim()) {
      feedback.internalNotes.push({
        note: sanitizeInputText(internalNote),
        author: adminEmail,
        createdAt: new Date(),
      });
      auditEntries.push({
        action: "Internal Note Added",
        actor: adminEmail,
        timestamp: new Date(),
        details: "Internal administrator note added.",
      });
    }

    if (auditEntries.length > 0) {
      feedback.auditLog.push(...auditEntries);
    }

    await feedback.save();

    res.json({
      success: true,
      message: "Feedback updated successfully",
      feedback,
    });
  } catch (err) {
    console.error("Update feedback error:", err);
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

// 8. Admin Delete Feedback
app.delete("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ error: "Feedback record not found" });

    res.json({
      success: true,
      message: `Feedback '${feedback.referenceId}' has been permanently deleted.`,
    });
  } catch (err) {
    console.error("Delete feedback error:", err);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Express global error handler:", err);
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size exceeds the 50MB limit." });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes("Only PDF")) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(err.status || 500).json({
    error: err.message || "An internal server error occurred",
  });
});

// ── START SERVER ──────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
