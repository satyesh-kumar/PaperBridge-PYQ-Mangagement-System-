import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Course code is required"],
      trim: true,
      uppercase: true,
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: [true, "University reference is required"],
      index: true,
    },
    degreeType: {
      type: String,
      enum: ["Undergraduate", "Postgraduate", "Diploma", "Doctorate", "Certificate", "Other"],
      default: "Undergraduate",
    },
    duration: {
      type: String,
      default: "3 Years",
      trim: true,
    },
    numberOfSemesters: {
      type: Number,
      required: [true, "Number of semesters is required"],
      min: [1, "Course must have at least 1 semester"],
      max: [12, "Course cannot exceed 12 semesters"],
      default: 8,
    },
    description: {
      type: String,
      default: "",
      trim: true,
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

// Compound index to ensure uniqueness of course code per university
courseSchema.index({ universityId: 1, code: 1 }, { unique: true });

const Course = mongoose.model("Course", courseSchema);

export default Course;
