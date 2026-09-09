import mongoose from "mongoose";

const paperRequestSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      default: "Student",
      trim: true,
    },
    studentEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    availabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaperAvailability",
      default: null,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    course: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
      index: true,
    },
    academicYear: {
      type: String,
      default: "1st Year",
      trim: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
      index: true,
    },
    examYear: {
      type: Number,
      required: [true, "Exam year is required"],
      index: true,
    },
    examType: {
      type: String,
      default: "End Semester",
      trim: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PYQ",
      default: null,
      index: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["NEW", "IN_PROGRESS", "COMING_SOON", "AVAILABLE", "REJECTED", "RESOLVED"],
      default: "NEW",
      index: true,
    },
    notifyMe: {
      type: Boolean,
      default: true,
    },
    adminResponse: {
      message: {
        type: String,
        default: "",
        trim: true,
      },
      respondedBy: {
        type: String,
        default: "",
        trim: true,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },
    internalNotes: [
      {
        note: {
          type: String,
          required: true,
          trim: true,
        },
        author: {
          type: String,
          default: "Admin",
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Compound unique index to enforce strict duplicate request protection per student
paperRequestSchema.index(
  { userId: 1, course: 1, subject: 1, examYear: 1 },
  { unique: true }
);
paperRequestSchema.index({ status: 1, createdAt: -1 });

const PaperRequest = mongoose.model("PaperRequest", paperRequestSchema);

export default PaperRequest;
