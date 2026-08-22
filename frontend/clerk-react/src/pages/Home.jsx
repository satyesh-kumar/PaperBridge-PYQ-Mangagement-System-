import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaFilePdf,
    FaEye,
    FaDownload,
    FaRedo,
    FaArrowRight,
    FaCalendarAlt,
    FaGraduationCap,
    FaLayerGroup,
    FaClock,
    FaSpinner,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import PDFViewer from "../components/PDFViewer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COURSE_TABS = ["All", "B.Tech", "MCA", "MBA", "BCA", "BBA"];

const getExamBadgeStyle = (examType = "") => {
    const lower = examType.toLowerCase();
    if (lower.includes("mid")) {
        return "bg-amber-100/90 text-amber-700 border-amber-200";
    }
    if (lower.includes("sem") || lower.includes("final")) {
        return "bg-purple-100/90 text-purple-700 border-purple-200";
    }
    if (lower.includes("make") || lower.includes("sup")) {
        return "bg-emerald-100/90 text-emerald-700 border-emerald-200";
    }
    return "bg-indigo-100/90 text-indigo-700 border-indigo-200";
};

const getCourseBadgeStyle = (course = "") => {
    const lower = course.toLowerCase();
    if (lower.includes("b.tech") || lower.includes("btech")) {
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (lower.includes("mca")) {
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (lower.includes("mba")) {
        return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (lower.includes("bca")) {
        return "bg-teal-50 text-teal-700 border-teal-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
};

function Home() {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState("All");
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const fetchPapers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_URL}/api/pyqs`, { timeout: 15000 });
            if (Array.isArray(res.data)) {
                setPapers(res.data);
            } else {
                setPapers([]);
            }
        } catch (err) {
            console.error("Failed to load papers:", err);
            setError("Unable to load latest papers right now. The server might be waking up.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPapers();
    }, [fetchPapers]);

    const handleDownload = async (paper, e) => {
        if (e) e.stopPropagation();
        if (!paper.fileUrl) {
            toast.error("Paper file link is unavailable.");
            return;
        }

        setDownloadingId(paper._id);
        const toastId = toast.loading(`Preparing ${paper.title || "paper"} for download...`);

        try {
            const response = await fetch(paper.fileUrl);
            if (!response.ok) throw new Error("Download request failed");

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${(paper.title || "paper").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

            toast.success("Download started!", { id: toastId });
        } catch (err) {
            console.error("Direct download failed, opening in new tab:", err);
            window.open(paper.fileUrl, "_blank");
            toast.success("Opening paper in new tab...", { id: toastId });
        } finally {
            setDownloadingId(null);
        }
    };

    // Filter by course tab and limit to latest 8
    const filteredPapers = papers
        .filter((p) => {
            if (selectedCourse === "All") return true;
            return p.course?.toLowerCase() === selectedCourse.toLowerCase();
        })
        .slice(0, 8);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 text-slate-800 flex flex-col font-sans">
            <Navbar2 />

            {/* HERO */}
            <section className="relative px-6 py-20 md:py-24 text-center overflow-hidden">
                {/* Ambient Glows */}
                <div className="absolute w-[520px] h-[520px] bg-indigo-400/20 blur-[130px] rounded-full top-[-140px] left-[-120px] pointer-events-none" />
                <div className="absolute w-[440px] h-[440px] bg-purple-400/20 blur-[130px] rounded-full bottom-[-140px] right-[-120px] pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,#6366f1_1px,transparent_0)] [background-size:32px_32px] pointer-events-none" />

                <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-sm mb-6"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                        Smart Academic Repository
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-slate-900 tracking-tight"
                    >
                        All Your Previous Year Papers{" "}
                        <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block mt-1">
                            In One Place
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-600 mt-6 text-base sm:text-lg max-w-xl leading-relaxed"
                    >
                        Access, preview, and download authentic university examination question papers organized by course, semester, and year.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto"
                    >
                        <Link
                            to="/browse"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-7 py-3.5 rounded-xl shadow-md hover:shadow-indigo-500/25 transition-all text-sm font-semibold hover:-translate-y-0.5"
                        >
                            Browse All Papers <FaArrowRight className="text-xs" />
                        </Link>
                        <Link
                            to="/upload"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200/90 text-slate-700 px-7 py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all text-sm font-semibold hover:-translate-y-0.5"
                        >
                            Upload PYQ
                        </Link>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-xs text-slate-400 mt-6 flex items-center gap-2"
                    >
                        <span>⚡ Instant PDF previews</span>
                        <span>•</span>
                        <span>🚀 Fast direct downloads</span>
                        <span>•</span>
                        <span>🛡️ Verified resources</span>
                    </motion.p>
                </div>
            </section>

            {/* RECENTLY ADDED SECTION */}
            <section id="recently-added" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 mb-20 w-full">
                {/* Section Header */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/70 shadow-lg shadow-indigo-950/5 mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-2">
                                <FaClock className="text-indigo-500" />
                                <span>Freshly Uploaded</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                Recently Added Question Papers
                            </h2>
                            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                                Explore the latest question papers uploaded by peers and professors across all subjects.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Link
                                to="/browse"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-4 py-2 rounded-xl transition"
                            >
                                <span>View all papers ({papers.length})</span>
                                <FaArrowRight className="text-xs" />
                            </Link>
                        </div>
                    </div>

                    {/* Course Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pt-5 pb-1 no-scrollbar">
                        <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1 shrink-0">
                            <FaLayerGroup /> Filter:
                        </span>
                        {COURSE_TABS.map((tab) => {
                            const active = selectedCourse === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setSelectedCourse(tab)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                                        active
                                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 scale-105"
                                            : "bg-slate-100/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                                    }`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* State: Loading */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse flex flex-col justify-between h-80"
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="h-5 bg-slate-200 rounded-md w-1/3" />
                                        <div className="h-5 bg-slate-200 rounded-md w-1/4" />
                                    </div>
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                                    <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                                    <div className="h-28 bg-slate-100 rounded-xl mb-4" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-9 bg-slate-200 rounded-xl flex-1" />
                                    <div className="h-9 bg-slate-200 rounded-xl flex-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* State: Error with Retry */}
                {!loading && error && (
                    <div className="bg-white/90 border border-red-100 rounded-3xl p-10 text-center shadow-sm max-w-xl mx-auto">
                        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
                            ⚠️
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Could Not Load Recent Papers</h3>
                        <p className="text-sm text-slate-500 mb-6">{error}</p>
                        <button
                            onClick={fetchPapers}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition"
                        >
                            <FaRedo className="text-xs" /> Try Again
                        </button>
                    </div>
                )}

                {/* State: Empty */}
                {!loading && !error && filteredPapers.length === 0 && (
                    <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm max-w-lg mx-auto">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto text-3xl mb-4 shadow-inner">
                            📄
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {selectedCourse === "All" ? "No Papers Found Yet" : `No ${selectedCourse} Papers Found`}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            {selectedCourse === "All"
                                ? "Be the first contributor to share previous year papers with fellow students."
                                : `No papers uploaded under ${selectedCourse} yet. Check other courses or upload one.`}
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            {selectedCourse !== "All" && (
                                <button
                                    onClick={() => setSelectedCourse("All")}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                                >
                                    Show All
                                </button>
                            )}
                            <Link
                                to="/upload"
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                            >
                                Upload a Paper →
                            </Link>
                        </div>
                    </div>
                )}

                {/* State: Papers Grid */}
                {!loading && !error && filteredPapers.length > 0 && (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {filteredPapers.map((paper, index) => (
                                <motion.div
                                    key={paper._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: index * 0.04 }}
                                    className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
                                >
                                    {/* Top Accent Gradient Bar */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <div>
                                        {/* Badges Row */}
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getCourseBadgeStyle(
                                                    paper.course
                                                )}`}
                                            >
                                                <FaGraduationCap className="text-xs" />
                                                {paper.course || "General"}
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                {paper.examType && (
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[11px] font-medium border capitalize ${getExamBadgeStyle(
                                                            paper.examType
                                                        )}`}
                                                    >
                                                        {paper.examType}
                                                    </span>
                                                )}
                                                {paper.year && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                        <FaCalendarAlt className="text-[10px] text-slate-400" />
                                                        {paper.year}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Paper Title */}
                                        <h3
                                            title={paper.title}
                                            className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-2"
                                        >
                                            {paper.title || "Untitled Question Paper"}
                                        </h3>

                                        {/* Metadata details */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-4 font-medium">
                                            <span>Sem: {paper.semester ? `Semester ${paper.semester}` : "N/A"}</span>
                                            {paper.branch && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-slate-600">{paper.branch}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Interactive Preview Mockup Box */}
                                        <div
                                            onClick={() =>
                                                setSelectedPdf({
                                                    fileUrl: paper.fileUrl,
                                                    title: `${paper.title} (${paper.course || "PYQ"})`,
                                                })
                                            }
                                            className="relative rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 p-4 mb-4 cursor-pointer group/preview hover:bg-indigo-50/40 hover:border-indigo-200 transition-all flex flex-col items-center justify-center text-center overflow-hidden"
                                        >
                                            <div className="w-12 h-14 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center relative transition-transform duration-200 group-hover/preview:scale-105">
                                                <FaFilePdf className="text-red-500 text-xl mb-1" />
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    PDF
                                                </span>
                                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-slate-200 rounded-bl" />
                                            </div>

                                            <span className="text-xs font-semibold text-slate-600 mt-2">
                                                Click to preview document
                                            </span>

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-[2px] opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                                                <FaEye className="text-sm" /> Quick Preview
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() =>
                                                setSelectedPdf({
                                                    fileUrl: paper.fileUrl,
                                                    title: `${paper.title} (${paper.course || "PYQ"})`,
                                                })
                                            }
                                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                                        >
                                            <FaEye className="text-xs" /> Preview
                                        </button>

                                        <button
                                            onClick={(e) => handleDownload(paper, e)}
                                            disabled={downloadingId === paper._id}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-75"
                                        >
                                            {downloadingId === paper._id ? (
                                                <>
                                                    <FaSpinner className="animate-spin text-xs" /> Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FaDownload className="text-xs" /> Download
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </section>

            {/* FEATURES */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-3 gap-8">
                {[
                    {
                        title: "Centralized PYQ Archive",
                        desc: "All previous year question papers collected in a single organized university archive — no more digging through WhatsApp groups.",
                        icon: "📂",
                        accent: "from-blue-500/10 to-indigo-500/10 text-indigo-600",
                    },
                    {
                        title: "Smart Filter & Search",
                        desc: "Easily filter by branch, semester, course, and exam type to locate the exact question paper you need in seconds.",
                        icon: "🔍",
                        accent: "from-purple-500/10 to-pink-500/10 text-purple-600",
                    },
                    {
                        title: "Instant In-App Viewer",
                        desc: "Preview any paper on your phone or laptop with our built-in viewer or download high quality PDF copies directly.",
                        icon: "⚡",
                        accent: "from-amber-500/10 to-orange-500/10 text-amber-600",
                    },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -4 }}
                        className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-7 shadow-md hover:shadow-xl transition-all"
                    >
                        <div
                            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.accent} flex items-center justify-center text-3xl mb-5 shadow-sm`}
                        >
                            {item.icon}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </motion.div>
                ))}
            </section>

            {/* FOOTER */}
            <footer className="bg-white mt-auto border-t border-slate-200/80">
                <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                                P
                            </span>
                            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                PaperBridge
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                            A modern, student-driven repository to streamline university exam preparation and PYQ management.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Product</h3>
                        <ul className="space-y-2.5 text-sm text-slate-500 font-medium">
                            <li>
                                <Link to="/browse" className="hover:text-indigo-600 transition">
                                    Browse Papers
                                </Link>
                            </li>
                            <li>
                                <Link to="/upload" className="hover:text-indigo-600 transition">
                                    Upload PYQ
                                </Link>
                            </li>
                            <li>
                                <Link to="/dashboard" className="hover:text-indigo-600 transition">
                                    Student Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Quick Links</h3>
                        <ul className="space-y-2.5 text-sm text-slate-500 font-medium">
                            <li>
                                <Link to="/browse" className="hover:text-indigo-600 transition">
                                    B.Tech PYQs
                                </Link>
                            </li>
                            <li>
                                <Link to="/browse" className="hover:text-indigo-600 transition">
                                    MCA PYQs
                                </Link>
                            </li>
                            <li>
                                <Link to="/browse" className="hover:text-indigo-600 transition">
                                    Mid-Term & End-Sem
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Ready to Excel?</h3>
                        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                            Find your subject papers or contribute your exam questions today.
                        </p>
                        <Link
                            to="/browse"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm"
                        >
                            Browse All Papers <FaArrowRight className="text-[10px]" />
                        </Link>
                    </div>
                </div>

                <div className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} PaperBridge • Built for students & academic excellence
                </div>
            </footer>

            {/* Modal PDF Viewer */}
            {selectedPdf && (
                <PDFViewer
                    fileUrl={selectedPdf.fileUrl}
                    title={selectedPdf.title}
                    onClose={() => setSelectedPdf(null)}
                />
            )}
        </div>
    );
}

export default Home;