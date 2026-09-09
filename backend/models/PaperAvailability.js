import mongoose from "mongoose";

const paperAvailabilitySchema = new mongoose.Schema(
  {
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
    semester: {
      type: Number,
      default: 1,
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
    status: {
      type: String,
      enum: ["AVAILABLE", "COMING_SOON", "REQUESTED", "NOT_AVAILABLE", "ARCHIVED"],
      default: "COMING_SOON",
      index: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PYQ",
      default: null,
      index: true,
    },
    requestCount: {
      type: Number,
      default: 0,
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
      trim: true,
    },
    expectedDate: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: String,
      default: "system",
      trim: true,
    },
  },
  { timestamps: true }
);

// High-performance compound indexes
paperAvailabilitySchema.index({ course: 1, subject: 1, examYear: 1 }, { unique: true });
paperAvailabilitySchema.index({ status: 1, requestCount: -1, createdAt: -1 });

const PaperAvailability = mongoose.model("PaperAvailability", paperAvailabilitySchema);

export default PaperAvailability;
