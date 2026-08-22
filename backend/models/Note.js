import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    unit: { type: String, default: "Complete Syllabus" },
    university: { type: String, default: "Uttaranchal University" },
    course: { type: String, default: "B.Tech" },
    semester: { type: Number, default: 1 },
    branch: { type: String, default: "" },
    author: { type: String, default: "" },
    description: { type: String, default: "" },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, default: "" },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    downloadsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);

export default Note;
