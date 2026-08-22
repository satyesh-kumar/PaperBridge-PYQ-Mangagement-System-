import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
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
    FaLock,
    FaSearch,
    FaBook,
    FaStickyNote,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import PDFViewer from "../components/PDFViewer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COURSE_TABS = ["All", "B.Tech", "MCA", "MBA", "BCA", "BBA"];

function Home() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();

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
            setError("Unable to load latest papers right now. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPapers();
    }, [fetchPapers]);

    const handlePreview = (paper, e) => {
        if (e) e.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to view and preview question papers.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        setSelectedPdf({
            fileUrl: paper.fileUrl,
            title: `${paper.title} (${paper.course || "PYQ"})`,
        });
    };

    const handleDownload = async (paper, e) => {
        if (e) e.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to download question papers.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        if (!paper.fileUrl) {
            toast.error("Paper file link is unavailable.");
            return;
        }

        setDownloadingId(paper._id);
        const toastId = toast.loading(`Downloading ${paper.title || "paper"}...`);

        try {
            const response = await fetch(paper.fileUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${(paper.title || "question_paper").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
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
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            {/* HERO SECTION */}
            <section className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-16 md:py-24 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Verified Academic Question Papers & Study Vault
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                        Previous year university papers and study notes, organized.
                    </h1>

                    {/* Subheading */}
                    <p className="text-slate-600 dark:text-slate-400 mt-5 text-base sm:text-lg max-w-2xl leading-relaxed">
                        Access authentic semester examination papers, unit summaries, and lecture notes curated by students and faculty in one clean platform.
                    </p>

                    {/* CTA Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full sm:w-auto">
                        <Link
                            to="/browse"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
                        >
                            <FaBook className="text-xs" /> Browse Question Papers
                        </Link>
                        <Link
                            to="/notes"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-6 py-3 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
                        >
                            <FaStickyNote className="text-xs" /> Explore Study Notes
                        </Link>
                        <Link
                            to="/upload"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-4 py-3 text-sm font-medium transition cursor-pointer"
                        >
                            + Upload Material
                        </Link>
                    </div>

                    {/* Feature Tickers */}
                    <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="text-emerald-500 font-bold">✓</span> Direct PDF Viewer
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="text-emerald-500 font-bold">✓</span> Fast Downloads
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="text-emerald-500 font-bold">✓</span> Verified Submissions
                        </span>
                    </div>
                </div>
            </section>

            {/* RECENTLY ADDED PAPERS */}
            <section id="recently-added" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
                {/* Section Header Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                <FaClock className="text-slate-400" />
                                <span>Recent Additions</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Latest Question Papers
                            </h2>
                        </div>

                        <Link
                            to="/browse"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition"
                        >
                            View all ({papers.length}) <FaArrowRight className="text-[10px]" />
                        </Link>
                    </div>

                    {/* Course Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-4 no-scrollbar">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1 shrink-0">
                            Course:
                        </span>
                        {COURSE_TABS.map((tab) => {
                            const active = selectedCourse === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setSelectedCourse(tab)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
                                        active
                                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    }`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* GUEST ACCESS NOTIFICATION BANNER */}
                {!isSignedIn && (
                    <div className="mb-8 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">
                                <FaLock />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">
                                    Sign in required to view & download question papers
                                </h4>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Create a free student account or sign in to access full PDF downloads and in-app reading.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openSignIn?.()}
                            className="shrink-0 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-lg text-xs transition cursor-pointer shadow-xs"
                        >
                            Sign In / Sign Up
                        </button>
                    </div>
                )}

                {/* LOADING SKELETON */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse flex flex-col justify-between h-72"
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                                    </div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex-1" />
                                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ERROR STATE */}
                {!loading && error && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center shadow-xs max-w-md mx-auto">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Unable to Load Papers</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{error}</p>
                        <button
                            onClick={fetchPapers}
                            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                            <FaRedo className="text-xs" /> Try Again
                        </button>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading && !error && filteredPapers.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs max-w-md mx-auto">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center mx-auto text-xl mb-3">
                            <FaBook />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                            {selectedCourse === "All" ? "No Papers Found" : `No ${selectedCourse} Papers Found`}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                            Be the first to upload previous year question papers for this subject.
                        </p>
                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                        >
                            + Upload Paper
                        </Link>
                    </div>
                )}

                {/* PAPERS GRID */}
                {!loading && !error && filteredPapers.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {filteredPapers.map((paper) => (
                            <div
                                key={paper._id}
                                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
                            >
                                <div>
                                    {/* Top Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                            {paper.course || "General"}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            {paper.examType && (
                                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 capitalize">
                                                    {paper.examType}
                                                </span>
                                            )}
                                            {paper.year && (
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    {paper.year}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Paper Title */}
                                    <h3
                                        title={paper.title}
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer line-clamp-2 leading-snug mb-1"
                                    >
                                        {paper.title || "Untitled Paper"}
                                    </h3>

                                    {/* Metadata */}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        {paper.semester ? `Semester ${paper.semester}` : ""}
                                        {paper.branch ? ` • ${paper.branch}` : ""}
                                    </p>

                                    {/* Quick Preview Thumbnail */}
                                    <div
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 mb-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-900 transition flex items-center justify-center gap-2"
                                    >
                                        <FaFilePdf className="text-red-500 text-base" />
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                            {!isSignedIn ? "Sign in to preview" : "Click to preview"}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                                    >
                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                        {isSignedIn ? "Preview" : "Sign In"}
                                    </button>

                                    <button
                                        onClick={(e) => handleDownload(paper, e)}
                                        disabled={downloadingId === paper._id}
                                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition disabled:opacity-60 cursor-pointer shadow-xs"
                                    >
                                        {downloadingId === paper._id ? (
                                            <FaSpinner className="animate-spin text-xs" />
                                        ) : !isSignedIn ? (
                                            <FaLock className="text-[10px]" />
                                        ) : (
                                            <FaDownload className="text-xs" />
                                        )}
                                        <span>Download</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* THREE COLUMN VALUE PROPOSITION */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 dark:border-slate-800">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold mb-4">
                            01
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Centralized Academic Archive</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Organized past papers and study notes categorized by course, semester, subject, and university curriculum.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold mb-4">
                            02
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Unit-Wise Study Notes</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Find complete syllabus notes, formula sheets, and lab manuals contributed by students and professors.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold mb-4">
                            03
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Direct Preview & Download</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Read documents immediately in the browser or download high quality PDFs directly to your device.
                        </p>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">PaperBridge</span>
                        <span>•</span>
                        <span>Academic Repository & Notes Vault</span>
                    </div>

                    <div className="flex items-center gap-4 font-medium">
                        <Link to="/browse" className="hover:text-slate-900 dark:hover:text-white">Browse Papers</Link>
                        <Link to="/notes" className="hover:text-slate-900 dark:hover:text-white">Study Notes</Link>
                        <Link to="/upload" className="hover:text-slate-900 dark:hover:text-white">Upload</Link>
                        <Link to="/dashboard" className="hover:text-slate-900 dark:hover:text-white">Dashboard</Link>
                    </div>
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