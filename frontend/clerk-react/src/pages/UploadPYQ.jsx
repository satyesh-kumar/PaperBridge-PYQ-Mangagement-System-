import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaEye, FaTrash, FaFilePdf, FaUpload, FaLock, FaBook, FaCode, FaCalendarAlt, FaGraduationCap, FaAddressBook, FaStickyNote, FaUniversity, FaUserGraduate, FaInfoCircle, FaCheck } from "react-icons/fa";
import { MdDriveFolderUpload } from "react-icons/md";
import { useDropzone } from "react-dropzone";
import Navbar2 from "../components/Navbar2";
import confetti from "canvas-confetti";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COURSES = ["B.Tech", "BCA", "MCA", "BBA", "MBA", "Diploma", "Law", "Other"];
const UNITS = [
    "Unit 1",
    "Unit 2",
    "Unit 3",
    "Unit 4",
    "Unit 5",
    "Complete Syllabus",
    "Formula Sheet",
    "Lab Manual",
];

function UploadPYQ() {
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    // Mode: 'pyq' | 'note'
    const [uploadType, setUploadType] = useState("pyq");

    // PYQ Form State
    const [pyqForm, setPyqForm] = useState({
        title: "",
        course: "B.Tech",
        semester: "1",
        examType: "semester",
        year: String(new Date().getFullYear()),
        branch: "",
    });

    // Notes Form State
    const [noteForm, setNoteForm] = useState({
        title: "",
        subject: "",
        unit: "Unit 1",
        university: "Uttaranchal University",
        course: "B.Tech",
        semester: "1",
        branch: "",
        author: "",
        description: "",
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [uploadedItem, setUploadedItem] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Confetti on success
    useEffect(() => {
        if (uploadedItem) {
            confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 },
            });
        }
    }, [uploadedItem]);

    const onDrop = (acceptedFiles) => {
        setUploadProgress(0);
        setFile(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        onDrop,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please upload a PDF document");
            return;
        }

        const isPyq = uploadType === "pyq";
        if (isPyq && !pyqForm.title.trim()) {
            toast.error("Please enter the paper title");
            return;
        }
        if (!isPyq && (!noteForm.title.trim() || !noteForm.subject.trim())) {
            toast.error("Please enter both the note title and subject");
            return;
        }

        try {
            setLoading(true);
            const token = await getToken();
            const data = new FormData();
            const activeForm = isPyq ? pyqForm : noteForm;

            Object.keys(activeForm).forEach((key) => data.append(key, activeForm[key]));
            data.append("file", file);

            const endpoint = isPyq ? `${API_URL}/api/upload` : `${API_URL}/api/notes/upload`;

            const res = await axios.post(endpoint, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                },
            });

            setUploadedItem({
                ...res.data,
                itemType: isPyq ? "Question Paper" : "Study Notes",
            });
            toast.success("Submitted for admin verification!");
            setUploadProgress(0);
            setFile(null);
            if (isPyq) {
                setPyqForm({
                    title: "",
                    course: "B.Tech",
                    semester: "1",
                    examType: "semester",
                    year: String(new Date().getFullYear()),
                    branch: "",
                });
            } else {
                setNoteForm({
                    title: "",
                    subject: "",
                    unit: "Unit 1",
                    university: "Uttaranchal University",
                    course: "B.Tech",
                    semester: "1",
                    branch: "",
                    author: "",
                    description: "",
                });
            }
        } catch (error) {
            toast.error("Upload failed. Please try again.");
            console.error("Upload error:", error);
        } finally {
            setLoading(false);
        }
    };

    // ── AUTH GUARD ────────────────────────────────────────────────────────────
    if (!isSignedIn) {
        return (
            <>
                <Navbar2 />
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-10 max-w-md w-full text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-600 dark:text-slate-300">
                            <FaLock className="text-xl" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1.5">Sign in Required</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">
                            You need to be signed in to upload question papers and study notes to the repository.
                        </p>
                        <Link
                            to="/"
                            className="w-full inline-block py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 text-xs cursor-pointer"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <div className={uploadedItem ? "blur-xs pointer-events-none select-none w-full max-w-2xl" : "w-full max-w-2xl"}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs w-full">
                        {/* Type Switcher Tab */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 w-full max-w-xs">
                                <button
                                    type="button"
                                    onClick={() => setUploadType("pyq")}
                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                        uploadType === "pyq"
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
                                            : "text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    <FaFilePdf className="text-xs" /> Question Paper
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadType("note")}
                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                        uploadType === "note"
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
                                            : "text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    <FaStickyNote className="text-xs" /> Study Notes
                                </button>
                            </div>
                        </div>

                        {/* Form Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {uploadType === "pyq" ? "Upload Previous Year Paper" : "Upload Study Notes & Material"}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                                {uploadType === "pyq"
                                    ? "Share semester and mid-term exam papers with fellow students"
                                    : "Share handwritten notes, unit summaries, and lecture presentations"}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
                            {/* PYQ FORM */}
                            {uploadType === "pyq" && (
                                <>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Subject / Paper Title *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Data Structures & Algorithms End Sem 2024"
                                            value={pyqForm.title}
                                            onChange={(e) => setPyqForm({ ...pyqForm, title: e.target.value })}
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium text-slate-800 dark:text-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                                            <select
                                                value={pyqForm.course}
                                                onChange={(e) => setPyqForm({ ...pyqForm, course: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            >
                                                {COURSES.map((c) => (
                                                    <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                                            <select
                                                value={pyqForm.semester}
                                                onChange={(e) => setPyqForm({ ...pyqForm, semester: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                                    <option key={s} value={String(s)} className="dark:bg-slate-900">
                                                        Semester {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                                            <select
                                                value={pyqForm.examType}
                                                onChange={(e) => setPyqForm({ ...pyqForm, examType: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            >
                                                <option value="mid1" className="dark:bg-slate-900">Mid Term 1</option>
                                                <option value="mid2" className="dark:bg-slate-900">Mid Term 2</option>
                                                <option value="semester" className="dark:bg-slate-900">End Semester</option>
                                                <option value="makeup" className="dark:bg-slate-900">Makeup / Backlog</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Year</label>
                                            <select
                                                value={pyqForm.year}
                                                onChange={(e) => setPyqForm({ ...pyqForm, year: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            >
                                                {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
                                                    <option key={y} value={String(y)} className="dark:bg-slate-900">
                                                        {y}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch (optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CSE, ECE, Mechanical..."
                                            value={pyqForm.branch}
                                            onChange={(e) => setPyqForm({ ...pyqForm, branch: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium text-slate-800 dark:text-white"
                                        />
                                    </div>
                                </>
                            )}

                            {/* NOTES FORM */}
                            {uploadType === "note" && (
                                <>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Notes Title *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Operating Systems - Process Sync Handwritten Notes"
                                            value={noteForm.title}
                                            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium text-slate-800 dark:text-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Subject Name *
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Operating Systems"
                                                value={noteForm.subject}
                                                onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })}
                                                required
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit / Module</label>
                                            <select
                                                value={noteForm.unit}
                                                onChange={(e) => setNoteForm({ ...noteForm, unit: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            >
                                                {UNITS.map((u) => (
                                                    <option key={u} value={u} className="dark:bg-slate-900">{u}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">University / College</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Uttaranchal University"
                                                value={noteForm.university}
                                                onChange={(e) => setNoteForm({ ...noteForm, university: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Author / Professor (optional)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Prof. Sharma / Class Notes"
                                                value={noteForm.author}
                                                onChange={(e) => setNoteForm({ ...noteForm, author: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                                            <select
                                                value={noteForm.course}
                                                onChange={(e) => setNoteForm({ ...noteForm, course: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            >
                                                {COURSES.map((c) => (
                                                    <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                                            <select
                                                value={noteForm.semester}
                                                onChange={(e) => setNoteForm({ ...noteForm, semester: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                                    <option key={s} value={String(s)} className="dark:bg-slate-900">
                                                        Semester {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Key Topics (optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Critical Section, Semaphores, Bankers Algorithm"
                                            value={noteForm.description}
                                            onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 outline-none font-medium"
                                        />
                                    </div>
                                </>
                            )}

                            {/* DRAG & DROP PDF */}
                            <div
                                {...getRootProps()}
                                className={`border border-dashed rounded-xl p-5 text-center hover:border-slate-400 transition cursor-pointer bg-slate-50 dark:bg-slate-950 ${
                                    isDragActive
                                        ? "border-slate-900 bg-slate-100"
                                        : "border-slate-300 dark:border-slate-800"
                                }`}
                            >
                                <input {...getInputProps()} />
                                <MdDriveFolderUpload className="mx-auto text-3xl text-slate-400 mb-1.5" />
                                <p className="text-xs font-bold text-slate-800 dark:text-white">
                                    Upload PDF Document
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Drag and drop PDF file here, or click to browse
                                </p>
                                {file && (
                                    <p className="mt-2 text-emerald-600 font-semibold text-xs flex items-center justify-center gap-1">
                                        <FaFilePdf /> {file.name}
                                    </p>
                                )}
                            </div>

                            {/* File Actions */}
                            {file && (
                                <div className="flex gap-2 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewOpen(true)}
                                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    >
                                        <FaEye /> Preview Local
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    >
                                        <FaTrash /> Remove
                                    </button>
                                </div>
                            )}

                            {/* Progress */}
                            {uploadProgress > 0 && (
                                <div className="w-full">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1 font-semibold">
                                        <span>Uploading…</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-slate-900 h-1.5 rounded-full transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg font-bold text-xs shadow-xs cursor-pointer transition disabled:opacity-60"
                            >
                                {loading ? "Uploading..." : uploadType === "pyq" ? "Submit Question Paper for Review" : "Submit Study Notes for Review"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Success modal */}
                {uploadedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg text-slate-900 dark:text-white text-center">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-3">
                                ✓
                            </div>
                            <h2 className="text-xl font-bold">Submitted for Review</h2>
                            <p className="text-slate-500 text-xs mt-1 mb-5">
                                Your submission is now in the admin moderation queue and will go live once verified.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 mb-5 text-left text-xs">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                    {uploadedItem.title}
                                </p>
                                <p className="text-slate-500 mt-0.5">
                                    {uploadedItem.course} {uploadedItem.subject ? `• ${uploadedItem.subject}` : ""}
                                </p>
                            </div>
                            <div className="flex gap-2.5">
                                <Link
                                    to="/dashboard"
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-semibold text-xs transition"
                                >
                                    Dashboard →
                                </Link>
                                <button
                                    onClick={() => setUploadedItem(null)}
                                    className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg font-semibold text-xs hover:bg-slate-50 transition"
                                >
                                    Upload Another
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Local PDF preview modal */}
                {previewOpen && file && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-full h-[85vh] max-w-4xl flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 bg-slate-50">
                                <span className="font-bold text-xs text-slate-800 truncate">{file.name}</span>
                                <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-800 text-xs">✕</button>
                            </div>
                            <div className="flex-1 overflow-hidden bg-slate-100">
                                <iframe src={URL.createObjectURL(file)} title="PDF Preview" className="w-full h-full border-0" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UploadPYQ;