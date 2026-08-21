import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaEye, FaTrash, FaFilePdf, FaUpload, FaLock } from "react-icons/fa";
import { MdDriveFolderUpload } from "react-icons/md";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { FaTimes } from "react-icons/fa";
import Navbar2 from "../components/Navbar2";
import confetti from "canvas-confetti";
import axios from "axios";
import {
    FaBook,
    FaCode,
    FaCalendarAlt,
    FaGraduationCap,
    FaAddressBook,
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function UploadPYQ() {

    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    const [formData, setFormData] = useState({
        title: "",
        course: "",
        semester: "",
        examType: "",
        year: "",
        branch: ""
    });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [uploadedPaper, setUploadedPaper] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Confetti on success
    useEffect(() => {
        if (uploadedPaper) {
            const duration = 1800;
            const animationEnd = Date.now() + duration;
            const interval = setInterval(() => {
                if (Date.now() > animationEnd) { clearInterval(interval); return; }
                confetti({
                    particleCount: 3,
                    startVelocity: 28,
                    spread: 360,
                    ticks: 70,
                    origin: { x: Math.random(), y: Math.random() * 0.35 }
                });
            }, 120);
            return () => clearInterval(interval);
        }
    }, [uploadedPaper]);

    // Auto-dismiss success state after 10s
    useEffect(() => {
        if (uploadedPaper) {
            const timer = setTimeout(() => setUploadedPaper(null), 10000);
            return () => clearTimeout(timer);
        }
    }, [uploadedPaper]);

    const onDrop = (acceptedFiles) => {
        setUploadProgress(0);
        setFile(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        onDrop
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { toast.error("Please upload a PDF file"); return; }
        if (!formData.title.trim()) { toast.error("Please enter a paper title"); return; }

        try {
            setLoading(true);
            const token = await getToken();
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            data.append("file", file);

            const res = await axios.post(`${API_URL}/api/upload`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                }
            });

            setUploadedPaper(res.data);
            toast.success("Upload successful 🎉");
            setUploadProgress(0);
            setFormData({ title: "", course: "", semester: "", examType: "", year: "", branch: "" });
            setFile(null);

        } catch (error) {
            toast.error("Upload failed ❌");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // ── AUTH GUARD ────────────────────────────────────────────────────────────
    if (!isSignedIn) {
        return (
            <>
                <Navbar2 />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-12 max-w-md w-full text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-6">
                            <FaLock className="text-indigo-500 text-3xl" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign in to Upload</h1>
                        <p className="text-gray-500 text-sm mb-8">
                            You need to be signed in to upload question papers and contribute to the community.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/"
                                className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition text-sm"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </>
        );
    }

    // ── UPLOAD FORM ───────────────────────────────────────────────────────────
    return (
        <>
            <Navbar2 />
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">

                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#6366f1_1px,transparent_0)] [background-size:40px_40px]" />

                <div className={uploadedPaper ? "blur-sm pointer-events-none select-none" : ""}>
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        whileHover={{ y: -4 }}
                        className="relative z-10 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/40 rounded-3xl p-10 w-full max-w-xl"
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="flex justify-center text-indigo-600 text-4xl mb-3">
                                <FaUpload />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800">Upload Question Paper</h2>
                            <p className="text-gray-500 text-sm mt-1">
                                Help students by sharing previous year papers
                            </p>
                            {user && (
                                <p className="text-xs text-indigo-500 mt-2">
                                    Uploading as {user.firstName || user.emailAddresses[0]?.emailAddress}
                                </p>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                            {/* Title */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600">Paper Title</label>
                                <div className="flex items-center border border-gray-200 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                                    <FaBook className="text-gray-400 mr-2" />
                                    <input
                                        type="text"
                                        id="paper-title"
                                        name="title"
                                        placeholder="Physics Mid 1"
                                        value={formData.title}
                                        onChange={handleChange}
                                        required
                                        className="w-full p-3 outline-none bg-transparent placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Course + Semester */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Course</label>
                                    <div className="flex items-center border border-gray-200 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                                        <FaGraduationCap className="text-gray-400 mr-2" />
                                        <select
                                            id="paper-course"
                                            name="course"
                                            value={formData.course}
                                            onChange={handleChange}
                                            className="w-full p-3 outline-none bg-transparent"
                                        >
                                            <option value="">Select Course</option>
                                            <option value="B.Tech">B.Tech</option>
                                            <option value="BCA">BCA</option>
                                            <option value="Diploma">Diploma</option>
                                            <option value="MCA">MCA</option>
                                            <option value="BBA">BBA</option>
                                            <option value="MBA">MBA</option>
                                            <option value="Law">Law</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Semester</label>
                                    <div className="flex items-center border border-gray-200 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                                        <FaCode className="text-gray-400 mr-2" />
                                        <select
                                            id="paper-semester"
                                            name="semester"
                                            value={formData.semester}
                                            onChange={handleChange}
                                            className="w-full p-3 outline-none bg-transparent"
                                        >
                                            <option value="">Select Semester</option>
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                            <option value="3">3</option>
                                            <option value="4">4</option>
                                            <option value="5">5</option>
                                            <option value="6">6</option>
                                            <option value="7">7</option>
                                            <option value="8">8</option>
                                            <option value="9">9</option>
                                            <option value="10">10</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Exam Type + Year */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Exam Type</label>
                                    <div className="flex items-center border border-gray-200 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                                        <FaAddressBook className="text-gray-400 mr-2" />
                                        <select
                                            id="paper-exam-type"
                                            name="examType"
                                            value={formData.examType}
                                            onChange={handleChange}
                                            className="w-full p-3 outline-none bg-transparent"
                                        >
                                            <option value="">Select Exam</option>
                                            <option value="mid1">Mid 1</option>
                                            <option value="mid2">Mid 2</option>
                                            <option value="makeup">Makeup</option>
                                            <option value="semester">Semester</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Year</label>
                                    <div className="flex items-center border border-gray-200 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                                        <FaCalendarAlt className="text-gray-400 mr-2" />
                                        <select
                                            id="paper-year"
                                            name="year"
                                            value={formData.year}
                                            onChange={handleChange}
                                            className="w-full p-3 outline-none bg-transparent"
                                        >
                                            <option value="">Select Year</option>
                                            <option value="2026">2026</option>
                                            <option value="2025">2025</option>
                                            <option value="2024">2024</option>
                                            <option value="2023">2023</option>
                                            <option value="2022">2022</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Branch */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600">Branch (optional)</label>
                                <div className="flex items-center border border-gray-200 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
                                    <FaBook className="text-gray-400 mr-2" />
                                    <input
                                        type="text"
                                        id="paper-branch"
                                        name="branch"
                                        placeholder="CSE, ECE, IT, Mechanical…"
                                        value={formData.branch}
                                        onChange={handleChange}
                                        className="w-full p-3 outline-none bg-transparent placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Drag & Drop Upload */}
                            <div
                                {...getRootProps()}
                                id="file-dropzone"
                                className={`border border-dashed rounded-xl p-6 text-center hover:border-indigo-500 transition cursor-pointer bg-gray-50 ${
                                    isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
                                }`}
                            >
                                <input {...getInputProps()} />
                                <MdDriveFolderUpload className="mx-auto text-4xl text-indigo-500 mb-2" />
                                <p className="text-sm font-medium text-gray-700">Upload your PDF</p>
                                <p className="text-xs text-gray-400">Drag & drop or click to browse</p>
                                {file && (
                                    <p className="mt-2 text-green-600 text-sm">📄 {file.name}</p>
                                )}
                            </div>

                            {/* File preview / remove buttons */}
                            {file && (
                                <div className="flex gap-3 mt-2 justify-center">
                                    <button
                                        type="button"
                                        id="preview-pdf-btn"
                                        onClick={() => setPreviewOpen(true)}
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md transition hover:shadow-lg"
                                    >
                                        <FaEye /> Preview
                                    </button>
                                    <button
                                        type="button"
                                        id="remove-pdf-btn"
                                        onClick={() => setFile(null)}
                                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md transition hover:shadow-lg"
                                    >
                                        <FaTrash /> Remove
                                    </button>
                                </div>
                            )}

                            {/* Upload progress */}
                            {uploadProgress > 0 && (
                                <div className="w-full">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Uploading…</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                id="upload-submit-btn"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-lg font-semibold shadow-lg"
                            >
                                {loading ? "Uploading…" : "Upload Paper"}
                            </motion.button>

                        </form>
                    </motion.div>
                </div>

                {/* Success modal */}
                {uploadedPaper && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.35 }}
                            className="relative w-full max-w-lg rounded-3xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.12)] p-8 sm:p-10"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-center text-gray-800">Upload Successful</h2>
                            <p className="text-gray-500 text-sm text-center mt-2 mb-6">
                                Your question paper is now available for students.
                            </p>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-7">
                                <p className="font-semibold text-gray-800 truncate">{uploadedPaper.title}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {uploadedPaper.course}{uploadedPaper.branch ? ` • ${uploadedPaper.branch}` : ""} • {uploadedPaper.year}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <a
                                    href={uploadedPaper.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition shadow"
                                >
                                    Preview Paper
                                </a>
                                <button
                                    id="upload-another-btn"
                                    onClick={() => {
                                        setUploadedPaper(null);
                                        setFormData({ title: "", course: "", semester: "", examType: "", year: "", branch: "" });
                                        setFile(null);
                                    }}
                                    className="flex-1 border border-gray-300 hover:bg-gray-100 py-2.5 rounded-lg font-medium transition"
                                >
                                    Upload Another
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Local PDF preview modal */}
                {previewOpen && file && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-2xl w-full h-full md:h-[90vh] md:w-[90%] md:max-w-5xl flex flex-col"
                        >
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <div className="overflow-hidden">
                                    <h2 className="font-semibold text-gray-800">PDF Preview</h2>
                                    <p className="text-xs text-gray-500 truncate max-w-[220px] sm:max-w-md">{file.name}</p>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href={URL.createObjectURL(file)}
                                        download
                                        className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md"
                                    >
                                        Download
                                    </a>
                                    <button
                                        id="close-preview-btn"
                                        onClick={() => setPreviewOpen(false)}
                                        className="text-gray-500 hover:text-black text-lg px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <iframe
                                    src={URL.createObjectURL(file)}
                                    title="PDF Preview"
                                    className="w-full h-full border-0"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}

            </div>
        </>
    );
}

export default UploadPYQ;