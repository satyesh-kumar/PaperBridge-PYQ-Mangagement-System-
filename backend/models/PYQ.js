import mongoose from "mongoose";

const pyqSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    course: { type: String, default: "General" },
    semester: { type: Number, default: 1 },
    examType: { type: String, default: "semester" },
    year: { type: Number, default: new Date().getFullYear() },
    branch: { type: String, default: "" },
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
  },
  { timestamps: true }
);

const PYQ = mongoose.model("PYQ", pyqSchema);

export default PYQ;
