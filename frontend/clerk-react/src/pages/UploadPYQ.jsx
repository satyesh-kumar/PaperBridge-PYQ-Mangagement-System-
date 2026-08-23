import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaEye,
    FaTrash,
    FaFilePdf,
    FaUpload,
    FaBook,
    FaCalendarAlt,
    FaGraduationCap,
    FaStickyNote,
    FaCheck,
    FaSpinner,
    FaLayerGroup,
} from "react-icons/fa";
import { MdDriveFolderUpload } from "react-icons/md";
import { useDropzone } from "react-dropzone";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import confetti from "canvas-confetti";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COURSES = [
    "B.Tech",
    "BCA",
    "MCA",
    "MBA",
    "BBA",
    "Diploma",
    "B.Sc",
    "B.Com",
    "Other",
];

const SEMESTERS = [
    { value: "1", label: "Semester 1" },
    { value: "2", label: "Semester 2" },
    { value: "3", label: "Semester 3" },
    { value: "4", label: "Semester 4" },
    { value: "5", label: "Semester 5" },
    { value: "6", label: "Semester 6" },
    { value: "7", label: "Semester 7" },
    { value: "8", label: "Semester 8" },
];

const EXAM_TYPES = [
    "End Semester",
    "Mid Semester",
    "Mid 1",
    "Mid 2",
    "Mid Term 1",
    "Mid Term 2",
    "Back Paper",
    "Internal",
    "Practical",
    "Other",
];

const EXAM_YEARS = [
    "2026",
    "2025",
    "2024",
    "2023",
    "2022",
    "2021",
    "2020",
    "2019",
    "2018",
    "2017",
    "2016",
    "2015",
];

const UNITS = [
    "Complete Syllabus",
    "Unit 1",
    "Unit 2",
    "Unit 3",
    "Unit 4",
    "Unit 5",
    "Formula Sheet",
    "Lab Manual",
    "Handwritten Notes",
    "Other",
];

export default function UploadPYQ() {
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    // Mode: 'pyq' | 'note'
    const [uploadType, setUploadType] = useState("pyq");

    // PYQ Form State
    const [pyqForm, setPyqForm] = useState({
        title: "",
        course: "B.Tech",
        semester: "1",
        examType: "End Semester",
        examYear: "2026",
        branch: "",
    });

    // Notes Form State
    const [noteForm, setNoteForm] = useState({
        title: "",
        course: "B.Tech",
        semester: "1",
        unit: "Complete Syllabus",
        author: "",
        branch: "",
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [uploadedItem, setUploadedItem] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Dropzone setup
    const onDrop = (acceptedFiles, fileRejections) => {
        if (fileRejections && fileRejections.length > 0) {
            toast.error("Please upload a valid PDF document (under 50MB).");
            return;
        }
        if (acceptedFiles && acceptedFiles.length > 0) {
            const selected = acceptedFiles[0];
            if (selected.type !== "application/pdf" && !selected.name.endsWith(".pdf")) {
                toast.error("Only PDF files are supported.");
                return;
            }
            setFile(selected);
            toast.success(`Attached: ${selected.name}`);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024,
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isSignedIn) {
            toast.error("Please sign in to upload academic materials.");
            return;
        }

        if (!file) {
            toast.error("Please select a PDF document to upload.");
            return;
        }

        const isPyq = uploadType === "pyq";
        if (isPyq && !pyqForm.title.trim()) {
            toast.error("Please enter the subject / paper title.");
            return;
        }
        if (!isPyq && !noteForm.title.trim()) {
            toast.error("Please enter the study note title.");
            return;
        }

        try {
            setLoading(true);
            const token = await getToken();
            const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
            const data = new FormData();

            data.append("file", file);
            data.append("university", "United University");
            if (userEmail) {
                data.append("userEmail", userEmail);
            }

            const uploadHeaders = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
                ...(userEmail && { "x-user-email": userEmail }),
            };

            if (isPyq) {
                data.append("title", pyqForm.title.trim());
                data.append("course", pyqForm.course);
                data.append("semester", pyqForm.semester);
                data.append("subject", pyqForm.title.trim());
                data.append("examType", pyqForm.examType);
                data.append("academicYear", pyqForm.examYear);
                data.append("year", pyqForm.examYear);
                data.append("branch", pyqForm.branch ? pyqForm.branch.trim() : "");

                const res = await axios.post(`${API_URL}/api/upload`, data, {
                    headers: uploadHeaders,
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percent);
                    },
                });

                setUploadedItem({
                    ...res.data,
                    itemType: "Question Paper",
                });

                if (res.data.status === "approved") {
                    toast.success("Question paper approved and published instantly! 🚀");
                } else {
                    toast.success("Submitted for admin verification!");
                }
            } else {
                data.append("title", noteForm.title.trim());
                data.append("course", noteForm.course);
                data.append("semester", noteForm.semester);
                data.append("subject", noteForm.title.trim());
                data.append("unit", noteForm.unit);
                data.append("author", noteForm.author || (user?.fullName || "Student"));
                data.append("branch", noteForm.branch ? noteForm.branch.trim() : "");

                const res = await axios.post(`${API_URL}/api/notes/upload`, data, {
                    headers: uploadHeaders,
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percent);
                    },
                });

                setUploadedItem({
                    ...res.data,
                    itemType: "Study Notes",
                });

                if (res.data.status === "approved") {
                    toast.success("Study material approved and published instantly! 🚀");
                } else {
                    toast.success("Submitted for admin verification!");
                }
            }

            setUploadProgress(0);
            setFile(null);
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(err.response?.data?.error || "Upload failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
                {/* Tab Selector: Question Paper vs Study Notes */}
                <div className="flex items-center justify-center gap-2 mb-8 bg-[#F4EFEA] dark:bg-[#1C1916] p-1 rounded-full max-w-sm mx-auto border border-[#EAE2D8] dark:border-[#2E2822]">
                    <button
                        type="button"
                        onClick={() => {
                            setUploadType("pyq");
                            setUploadedItem(null);
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            uploadType === "pyq"
                                ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A] shadow-sm"
                                : "text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#0D1B2A]"
                        }`}
                    >
                        <FaBook className="text-xs" />
                        <span>Question Paper</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setUploadType("note");
                            setUploadedItem(null);
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            uploadType === "note"
                                ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A] shadow-sm"
                                : "text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#0D1B2A]"
                        }`}
                    >
                        <FaStickyNote className="text-xs" />
                        <span>Study Notes</span>
                    </button>
                </div>

                {/* Main Card Container */}
                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 sm:p-10 shadow-sm">
                    {/* Header Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5] tracking-tight mb-1.5">
                            {uploadType === "pyq" ? "Upload Previous Year Paper" : "Upload Study Notes & Material"}
                        </h1>
                        <p className="text-xs sm:text-sm text-[#8C7862] dark:text-[#A8957E]">
                            {uploadType === "pyq"
                                ? "Share semester and mid-term exam papers with fellow students"
                                : "Share handwritten unit notes, lecture summaries, and formula sheets"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {uploadType === "pyq" ? (
                            <>
                                {/* Subject / Paper Title */}
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                        Subject / Paper Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={pyqForm.title}
                                        onChange={(e) => setPyqForm({ ...pyqForm, title: e.target.value })}
                                        placeholder="e.g. Data Structures & Algorithms End Sem 2024"
                                        className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium placeholder:text-[#A8957E] focus:outline-none focus:border-[#8C6239] transition"
                                    />
                                </div>

                                {/* Row: Course & Semester */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Course
                                        </label>
                                        <select
                                            value={pyqForm.course}
                                            onChange={(e) => setPyqForm({ ...pyqForm, course: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium focus:outline-none focus:border-[#8C6239] transition"
                                        >
                                            {COURSES.map((c) => (
                                                <option key={c} value={c} className="dark:bg-[#161412]">
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Semester
                                        </label>
                                        <select
                                            value={pyqForm.semester}
                                            onChange={(e) => setPyqForm({ ...pyqForm, semester: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium focus:outline-none focus:border-[#8C6239] transition"
                                        >
                                            {SEMESTERS.map((s) => (
                                                <option key={s.value} value={s.value} className="dark:bg-[#161412]">
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row: Exam Type & Exam Year */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Exam Type
                                        </label>
                                        <select
                                            value={pyqForm.examType}
                                            onChange={(e) => setPyqForm({ ...pyqForm, examType: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium focus:outline-none focus:border-[#8C6239] transition"
                                        >
                                            {EXAM_TYPES.map((t) => (
                                                <option key={t} value={t} className="dark:bg-[#161412]">
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Exam Year
                                        </label>
                                        <select
                                            value={pyqForm.examYear}
                                            onChange={(e) => setPyqForm({ ...pyqForm, examYear: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium focus:outline-none focus:border-[#8C6239] transition"
                                        >
                                            {EXAM_YEARS.map((yr) => (
                                                <option key={yr} value={yr} className="dark:bg-[#161412]">
                                                    {yr}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Branch (optional) */}
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                        Branch (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={pyqForm.branch}
                                        onChange={(e) => setPyqForm({ ...pyqForm, branch: e.target.value })}
                                        placeholder="e.g. CSE, ECE, Mechanical..."
                                        className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium placeholder:text-[#A8957E] focus:outline-none focus:border-[#8C6239] transition"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Subject / Notes Title */}
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                        Subject / Notes Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={noteForm.title}
                                        onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                                        placeholder="e.g. Data Structures & Algorithms Unit 1-5 Handwritten Kit"
                                        className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium placeholder:text-[#A8957E] focus:outline-none focus:border-[#8C6239] transition"
                                    />
                                </div>

                                {/* Row: Course & Semester */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Course
                                        </label>
                                        <select
                                            value={noteForm.course}
                                            onChange={(e) => setNoteForm({ ...noteForm, course: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium focus:outline-none focus:border-[#8C6239] transition"
                                        >
                                            {COURSES.map((c) => (
                                                <option key={c} value={c} className="dark:bg-[#161412]">
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Semester
                                        </label>
                                        <select
                                            value={noteForm.semester}
                                            onChange={(e) => setNoteForm({ ...noteForm, semester: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium focus:outline-none focus:border-[#8C6239] transition"
                                        >
                                            {SEMESTERS.map((s) => (
                                                <option key={s.value} value={s.value} className="dark:bg-[#161412]">
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row: Unit & Author */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Unit / Module
                                        </label>
                                        <select
                                            value={noteForm.unit}
                                            onChange={(e) => setNoteForm({ ...noteForm, unit: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium focus:outline-none focus:border-[#8C6239] transition"
                                        >
                                            {UNITS.map((u) => (
                                                <option key={u} value={u} className="dark:bg-[#161412]">
                                                    {u}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                            Author / Contributor
                                        </label>
                                        <input
                                            type="text"
                                            value={noteForm.author}
                                            onChange={(e) => setNoteForm({ ...noteForm, author: e.target.value })}
                                            placeholder={user?.fullName || "Prof. / Student Name"}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium placeholder:text-[#A8957E] focus:outline-none focus:border-[#8C6239] transition"
                                        />
                                    </div>
                                </div>

                                {/* Branch (optional) */}
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1.5">
                                        Branch (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={noteForm.branch}
                                        onChange={(e) => setNoteForm({ ...noteForm, branch: e.target.value })}
                                        placeholder="e.g. CSE, ECE, Mechanical..."
                                        className="w-full px-4 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] font-medium placeholder:text-[#A8957E] focus:outline-none focus:border-[#8C6239] transition"
                                    />
                                </div>
                            </>
                        )}

                        {/* PDF File Dropzone */}
                        <div className="pt-2">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                    isDragActive
                                        ? "border-[#8C6239] bg-[#FAF8F5] dark:bg-[#24201C]"
                                        : file
                                        ? "border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/20"
                                        : "border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] bg-[#FAF8F5]/40 dark:bg-[#1C1916]/40"
                                }`}
                            >
                                <input {...getInputProps()} />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-2">
                                            <FaFilePdf />
                                        </div>
                                        <span className="font-bold text-xs text-[#0D1B2A] dark:text-[#FAF8F5] max-w-sm truncate">
                                            {file.name}
                                        </span>
                                        <span className="text-[11px] text-[#8C7862] mt-0.5">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                                        </span>
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewOpen(true);
                                                }}
                                                className="px-3 py-1 bg-white dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-semibold"
                                            >
                                                <FaEye className="inline mr-1 text-[10px]" /> Local Preview
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                }}
                                                className="px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-xs font-semibold"
                                            >
                                                <FaTrash className="inline mr-1 text-[10px]" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center text-xl mb-2">
                                            <MdDriveFolderUpload />
                                        </div>
                                        <p className="text-xs font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Upload PDF Document
                                        </p>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            Drag and drop PDF file here, or click to browse
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="w-full bg-[#EAE2D8] dark:bg-[#24201C] rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-[#8C6239] dark:bg-[#E5C378] h-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !file}
                            className="w-full py-3.5 px-6 rounded-xl bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                        >
                            {loading ? (
                                <>
                                    <FaSpinner className="animate-spin text-sm" />
                                    <span>Uploading to PaperBridge Vault...</span>
                                </>
                            ) : (
                                <span>
                                    {uploadType === "pyq"
                                        ? "Submit Question Paper for Review"
                                        : "Submit Study Notes for Review"}
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Success Modal */}
                {uploadedItem && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-500/30">
                                <FaCheck />
                            </div>
                            <h3 className="text-lg font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5] mb-2">
                                {uploadedItem.status === "approved"
                                    ? "Published Live Instantly! 🚀"
                                    : "Submission Received!"}
                            </h3>
                            <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-6 leading-relaxed">
                                {uploadedItem.status === "approved" ? (
                                    <>
                                        Your <strong className="text-[#0D1B2A] dark:text-[#FAF8F5]">{uploadedItem.title}</strong> is verified and published directly. It is now live across the library and search directory.
                                    </>
                                ) : (
                                    <>
                                        Your <strong className="text-[#0D1B2A] dark:text-[#FAF8F5]">{uploadedItem.title}</strong> has been submitted to the moderation queue. Once approved, it will be published to all students.
                                    </>
                                )}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    to={uploadType === "pyq" ? "/pyqs" : "/notes"}
                                    className="flex-1 py-2.5 px-4 rounded-full bg-[#0D1B2A] dark:bg-[#C89D5C] text-white dark:text-[#0D1B2A] text-xs font-bold shadow-sm text-center"
                                >
                                    Browse Directory →
                                </Link>
                                <button
                                    onClick={() => {
                                        setUploadedItem(null);
                                        setPyqForm({
                                            title: "",
                                            course: "B.Tech",
                                            semester: "1",
                                            examType: "End Semester",
                                            examYear: "2026",
                                            branch: "",
                                        });
                                        setNoteForm({
                                            title: "",
                                            course: "B.Tech",
                                            semester: "1",
                                            unit: "Complete Syllabus",
                                            author: "",
                                            branch: "",
                                        });
                                    }}
                                    className="flex-1 py-2.5 px-4 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#6B5B49] dark:text-[#C2B3A0] border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-bold text-center"
                                >
                                    Upload Another
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Local PDF Preview Modal */}
                {previewOpen && file && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE2D8] dark:border-[#2E2822] bg-[#FAF8F5] dark:bg-[#1C1916]">
                                <span className="font-bold text-xs text-[#1A1614] dark:text-[#FAF8F5] truncate">{file.name}</span>
                                <button onClick={() => setPreviewOpen(false)} className="text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white text-xs cursor-pointer">✕</button>
                            </div>
                            <div className="flex-1 overflow-hidden bg-[#F4EFEA] dark:bg-[#0F0E0D]">
                                <iframe src={URL.createObjectURL(file)} title="PDF Preview" className="w-full h-full border-0" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <Footer />
        </div>
    );
}