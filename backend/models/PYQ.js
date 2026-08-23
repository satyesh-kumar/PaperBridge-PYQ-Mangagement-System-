import mongoose from "mongoose";

const pyqSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Paper title is required"],
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

    // Legacy / Direct String Fields (For Fast Display & Backward Compatibility)
    university: {
      type: String,
      default: "United University",
      trim: true,
      index: true,
    },
    course: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    semester: {
      type: Number,
      default: 1,
      set: (v) => (isNaN(Number(v)) ? 1 : Number(v)),
      index: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    subjectCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    examType: {
      type: String,
      default: "End Semester",
      trim: true,
      index: true,
    },
    academicYear: {
      type: String,
      default: "2024-25",
      trim: true,
      index: true,
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear(),
      set: (v) => {
        if (typeof v === "number" && !isNaN(v)) return v;
        const match = String(v).match(/\d{4}/);
        return match ? parseInt(match[0], 10) : new Date().getFullYear();
      },
      index: true,
    },
    branch: {
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
    userEmail: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      default: "",
      trim: true,
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

// Indexes for high-performance multi-filtering
pyqSchema.index({ universityId: 1, courseId: 1, semester: 1, status: 1 });
pyqSchema.index({ status: 1, createdAt: -1 });

const PYQ = mongoose.model("PYQ", pyqSchema);

export default PYQ;
