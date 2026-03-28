import { clerkMiddleware, requireAuth } from "@clerk/express";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import User from "./models/User.js";
import upload from "./middleware/upload.js";
import cloudinary from "./config/cloudinary.js";
import PYQ from "./models/PYQ.js";

dotenv.config();
const app = express();
const port = process.env.PORT;
app.use(cors());
app.use(express.json());
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
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "PaperBridge API running"
  });
});


app.post("/api/users", requireAuth(), async (req, res) => {

  const clerkId = req.auth.userId

  const user = await User.findOne({ clerkId })

  if (user) {
    return res.json(user)
  }

  const newUser = await User.create({
    clerkId
  })

  res.json(newUser)
})


import fs from "fs";

import streamifier from "streamifier";

app.post("/api/upload", requireAuth(), upload.single("file"), async (req, res) => {
  try {

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
          },
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
      uploadedBy: req.auth.userId
    });

    res.json(pyq);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});


app.get("/api/pyqs", async (req, res) => {
  const pyqs = await PYQ.find().sort({ createdAt: -1 })
  res.json(pyqs)
})


app.post("/api/ai-search", async (req, res) => {
  const { query } = req.body;

  const prompt = `
  Convert this user query into filters:
  "${query}"

  Return JSON:
  {
    course: "",
    examType: "",
    year: ""
  }
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const filters = JSON.parse(response.choices[0].message.content);

  res.json(filters);
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});



