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
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 text-slate-800 dark:text-slate-100 transition-colors duration-300">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-12 max-w-md w-full text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center mx-auto mb-6 text-indigo-500 dark:text-indigo-400">
                            <FaLock className="text-3xl" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sign in to Upload</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                            You need to be signed in to upload question papers and contribute to the community.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/"
                                className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm cursor-pointer"
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
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">

                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#6366f1_1px,transparent_0)] [background-size:40px_40px] pointer-events-none" />

                <div className={uploadedPaper ? "blur-sm pointer-events-none select-none w-full max-w-xl" : "w-full max-w-xl"}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="relative z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 w-full"
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="flex justify-center text-indigo-600 dark:text-indigo-400 text-4xl mb-3">
                                <FaUpload />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Upload Question Paper</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                                Help fellow students by sharing verified previous year papers
                            </p>
                            {user && (
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-2">
                                    Uploading as: {user.firstName || user.emailAddresses[0]?.emailAddress}
                                </p>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-xs sm:text-sm" noValidate>

                            {/* Title */}
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">Subject / Paper Title</label>
                                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                                    <FaBook className="text-slate-400 mr-2 shrink-0" />
                                    <input
                                        type="text"
                                        id="paper-title"
                                        name="title"
                                        placeholder="e.g. Data Structures & Algorithms Mid Term"
                                        value={formData.title}
                                        onChange={handleChange}
                                        required
                                        className="w-full p-2.5 sm:p-3 outline-none bg-transparent text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Course + Semester */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">Course</label>
                                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                                        <FaGraduationCap className="text-slate-400 mr-2 shrink-0" />
                                        <select
                                            id="paper-course"
                                            name="course"
                                            value={formData.course}
                                            onChange={handleChange}
                                            className="w-full p-2.5 sm:p-3 outline-none bg-transparent text-slate-800 dark:text-white font-medium"
                                        >
                                            <option value="" className="dark:bg-slate-900">Select Course</option>
                                            <option value="B.Tech" className="dark:bg-slate-900">B.Tech</option>
                                            <option value="BCA" className="dark:bg-slate-900">BCA</option>
                                            <option value="Diploma" className="dark:bg-slate-900">Diploma</option>
                                            <option value="MCA" className="dark:bg-slate-900">MCA</option>
                                            <option value="BBA" className="dark:bg-slate-900">BBA</option>
                                            <option value="MBA" className="dark:bg-slate-900">MBA</option>
                                            <option value="Law" className="dark:bg-slate-900">Law</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">Semester</label>
                                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                                        <FaCode className="text-slate-400 mr-2 shrink-0" />
                                        <select
                                            id="paper-semester"
                                            name="semester"
                                            value={formData.semester}
                                            onChange={handleChange}
                                            className="w-full p-2.5 sm:p-3 outline-none bg-transparent text-slate-800 dark:text-white font-medium"
                                        >
                                            <option value="" className="dark:bg-slate-900">Select Semester</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                                <option key={s} value={String(s)} className="dark:bg-slate-900">
                                                    Semester {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Exam Type + Year */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">Exam Type</label>
                                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                                        <FaAddressBook className="text-slate-400 mr-2 shrink-0" />
                                        <select
                                            id="paper-exam-type"
                                            name="examType"
                                            value={formData.examType}
                                            onChange={handleChange}
                                            className="w-full p-2.5 sm:p-3 outline-none bg-transparent text-slate-800 dark:text-white font-medium"
                                        >
                                            <option value="" className="dark:bg-slate-900">Select Exam</option>
                                            <option value="mid1" className="dark:bg-slate-900">Mid 1</option>
                                            <option value="mid2" className="dark:bg-slate-900">Mid 2</option>
                                            <option value="semester" className="dark:bg-slate-900">End Semester</option>
                                            <option value="makeup" className="dark:bg-slate-900">Makeup / Backlog</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">Exam Year</label>
                                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                                        <FaCalendarAlt className="text-slate-400 mr-2 shrink-0" />
                                        <select
                                            id="paper-year"
                                            name="year"
                                            value={formData.year}
                                            onChange={handleChange}
                                            className="w-full p-2.5 sm:p-3 outline-none bg-transparent text-slate-800 dark:text-white font-medium"
                                        >
                                            <option value="" className="dark:bg-slate-900">Select Year</option>
                                            {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
                                                <option key={y} value={String(y)} className="dark:bg-slate-900">
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Branch */}
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">Branch / Dept (optional)</label>
                                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                                    <FaBook className="text-slate-400 mr-2 shrink-0" />
                                    <input
                                        type="text"
                                        id="paper-branch"
                                        name="branch"
                                        placeholder="e.g. Computer Science & Engineering (CSE)"
                                        value={formData.branch}
                                        onChange={handleChange}
                                        className="w-full p-2.5 sm:p-3 outline-none bg-transparent text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Drag & Drop Upload */}
                            <div
                                {...getRootProps()}
                                id="file-dropzone"
                                className={`border border-dashed rounded-2xl p-6 text-center hover:border-indigo-500 transition cursor-pointer bg-slate-50 dark:bg-slate-950/80 ${
                                    isDragActive
                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                                        : "border-slate-300 dark:border-slate-800"
                                }`}
                            >
                                <input {...getInputProps()} />
                                <MdDriveFolderUpload className="mx-auto text-4xl text-indigo-500 mb-2" />
                                <p className="text-sm font-bold text-slate-800 dark:text-white">Upload your PDF Paper</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Drag & drop or click to browse files</p>
                                {file && (
                                    <p className="mt-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1">
                                        <FaFilePdf /> {file.name}
                                    </p>
                                )}
                            </div>

                            {/* File preview / remove buttons */}
                            {file && (
                                <div className="flex gap-3 mt-2 justify-center">
                                    <button
                                        type="button"
                                        id="preview-pdf-btn"
                                        onClick={() => setPreviewOpen(true)}
                                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
                                    >
                                        <FaEye /> Preview PDF
                                    </button>
                                    <button
                                        type="button"
                                        id="remove-pdf-btn"
                                        onClick={() => setFile(null)}
                                        className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
                                    >
                                        <FaTrash /> Remove
                                    </button>
                                </div>
                            )}

                            {/* Upload progress */}
                            {uploadProgress > 0 && (
                                <div className="w-full">
                                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                                        <span>Uploading to Cloudinary…</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                id="upload-submit-btn"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 text-xs sm:text-sm cursor-pointer transition"
                            >
                                {loading ? "Uploading to Repository…" : "Upload Question Paper"}
                            </motion.button>

                        </form>
                    </motion.div>
                </div>

                {/* Success modal */}
                {uploadedPaper && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.35 }}
                            className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-8 sm:p-10 text-slate-800 dark:text-slate-100"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl shadow-sm">
                                    ✓
                                </div>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-slate-900 dark:text-white">Submitted for Review! 🎉</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm text-center mt-2 mb-6">
                                Your question paper has been submitted to the admin moderation queue. It will be verified and made publicly available shortly.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6">
                                <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{uploadedPaper.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                    {uploadedPaper.course}{uploadedPaper.branch ? ` • ${uploadedPaper.branch}` : ""} • {uploadedPaper.year}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <a
                                    href={uploadedPaper.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-xs transition shadow cursor-pointer"
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
                                    className="flex-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                                >
                                    Upload Another
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Local PDF preview modal */}
                {previewOpen && file && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full h-full md:h-[90vh] md:w-[90%] md:max-w-5xl flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-950">
                                <div className="overflow-hidden">
                                    <h2 className="font-bold text-slate-900 dark:text-white text-sm">PDF Preview</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-md">{file.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={URL.createObjectURL(file)}
                                        download={file.name}
                                        className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition"
                                    >
                                        Download
                                    </a>
                                    <button
                                        id="close-preview-btn"
                                        onClick={() => setPreviewOpen(false)}
                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-sm cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950">
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