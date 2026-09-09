import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
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
    userNameSnapshot: {
      type: String,
      default: "",
      trim: true,
    },
    userEmailSnapshot: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    anonymous: {
      type: Boolean,
      default: false,
      index: true,
    },
    feedbackType: {
      type: String,
      required: [true, "Feedback type is required"],
      enum: [
        // Natural language options
        "Paper not found",
        "Request a paper",
        "Wrong paper",
        "Download problem",
        "Search problem",
        "Subject missing",
        "Website problem",
        "Suggest improvement",
        "Request a new feature",
        "General feedback",
        // Legacy options for full backwards compatibility
        "Suggest an Improvement",
        "Report a Problem",
        "Report a Bug",
        "Suggest a New Feature",
        "Website Experience",
        "Paper/PYQ Issue",
        "Search Issue",
        "Account/Login Issue",
        "Upload Issue",
        "Download Issue",
        "Performance Issue",
        "UI/Design Feedback",
        "Content Quality",
        "Teacher/Faculty Feedback",
        "Other",
      ],
      index: true,
    },
    problemType: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    relatedTo: {
      type: String,
      enum: [
        "Student",
        "Teacher",
        "Administrator",
        "PaperBridge",
        "Website",
        "Paper/PYQ",
        "Course",
        "Department",
        "Other",
      ],
      default: "Website",
      index: true,
    },

    // Contextual references & academic snapshot
    studentName: {
      type: String,
      default: "",
      trim: true,
    },
    teacherName: {
      type: String,
      default: "",
      trim: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    course: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    department: {
      type: String,
      default: "",
      trim: true,
    },
    academicYear: {
      type: String,
      default: "",
      trim: true,
    },
    semester: {
      type: String,
      default: "",
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
      default: "",
      trim: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PYQ",
      default: null,
      index: true,
    },
    paperTitle: {
      type: String,
      default: "",
      trim: true,
    },
    examYear: {
      type: String,
      default: "",
      trim: true,
    },
    searchQuery: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "direct",
      trim: true,
    },

    // Rating & Message Content (Rating is optional)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
      index: true,
    },
    message: {
      type: String,
      required: [true, "Feedback message is required"],
      trim: true,
      minlength: [3, "Feedback message must contain at least 3 characters."],
      maxlength: [3000, "Feedback message cannot exceed 3000 characters."],
    },
    followUpRequested: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Administrative Moderation
    status: {
      type: String,
      enum: [
        "New",
        "Under Review",
        "In Progress",
        "Resolved",
        "Rejected",
        "Archived",
      ],
      default: "New",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true,
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
    auditLog: [
      {
        action: {
          type: String,
          required: true,
        },
        actor: {
          type: String,
          default: "System",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: {
          type: String,
          default: "",
        },
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// High performance compound indexes
feedbackSchema.index({ status: 1, priority: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ course: 1, feedbackType: 1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
