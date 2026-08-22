import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
    },
    // Hierarchical References (New Dynamic Structure)
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      default: null,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      default: null,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
      index: true,
    },

    // Legacy / Direct String Fields
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      index: true,
    },
    subjectCode: {
      type: String,
      default: "",
      trim: true,
    },
    unit: {
      type: String,
      default: "Complete Syllabus",
      trim: true,
    },
    university: {
      type: String,
      default: "United University",
      trim: true,
      index: true,
    },
    course: {
      type: String,
      default: "B.Tech",
      trim: true,
      index: true,
    },
    semester: {
      type: Number,
      default: 1,
      index: true,
    },
    branch: {
      type: String,
      default: "",
      trim: true,
    },
    author: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // File Details
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    fileType: {
      type: String,
      default: "application/pdf",
    },
    fileSize: {
      type: Number,
      default: 0,
    },

    // Upload & Moderation Meta
    uploadedBy: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    downloadsCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
noteSchema.index({ universityId: 1, courseId: 1, semester: 1, status: 1 });
noteSchema.index({ status: 1, createdAt: -1 });

const Note = mongoose.model("Note", noteSchema);

export default Note;
