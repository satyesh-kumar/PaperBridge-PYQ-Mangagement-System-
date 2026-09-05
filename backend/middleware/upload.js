import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/x-pdf" ||
      (file.originalname && file.originalname.toLowerCase().endsWith(".pdf"));

    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit matching frontend
});

export default upload;