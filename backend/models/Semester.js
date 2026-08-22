import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    number: {
      type: Number,
      required: [true, "Semester number is required"],
      min: [1, "Semester number must be at least 1"],
      max: [12, "Semester number cannot exceed 12"],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: [true, "University reference is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of semester number within the course
semesterSchema.index({ courseId: 1, number: 1 }, { unique: true });

const Semester = mongoose.model("Semester", semesterSchema);

export default Semester;
