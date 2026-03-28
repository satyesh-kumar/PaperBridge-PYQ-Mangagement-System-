import mongoose from "mongoose";

const pyqSchema = new mongoose.Schema({
  title: String,
  course: String,
  semester: Number,
  examType: String,
  year: Number,
  branch: String,
  fileUrl: String,
  uploadedBy: String

});

const PYQ = mongoose.model("PYQ", pyqSchema);

export default PYQ;
