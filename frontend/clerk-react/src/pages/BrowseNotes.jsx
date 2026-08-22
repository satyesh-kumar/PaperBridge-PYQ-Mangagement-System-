import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaSearch,
    FaBook,
    FaUniversity,
    FaGraduationCap,
    FaEye,
    FaDownload,
    FaShareAlt,
    FaTimes,
    FaRedo,
    FaLock,
    FaFilePdf,
    FaThLarge,
    FaList,
    FaChevronLeft,
    FaChevronRight,
    FaCheck,
    FaSpinner,
    FaUserGraduate,
    FaSortAmountDown,
    FaStickyNote,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import PDFViewer from "../components/PDFViewer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const UNITS = [
    { label: "All Units / Materials", value: "All" },
    { label: "Unit 1", value: "Unit 1" },
    { label: "Unit 2", value: "Unit 2" },
    { label: "Unit 3", value: "Unit 3" },
    { label: "Unit 4", value: "Unit 4" },
    { label: "Unit 5", value: "Unit 5" },
    { label: "Complete Syllabus", value: "Complete Syllabus" },
    { label: "Formula Sheet", value: "Formula Sheet" },
    { label: "Lab Manual", value: "Lab Manual" },
];

const SEMESTERS = [
    { label: "All Semesters", value: "" },
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({ label: `Semester ${s}`, value: String(s) })),
];

function BrowseNotes() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Search and Filters
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("All");
    const [unitFilter, setUnitFilter] = useState("All");
    const [semesterFilter, setSemesterFilter] = useState("");
    const [universityFilter, setUniversityFilter] = useState("All");
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState("grid");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // PDF Preview Modal & Feedback
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const searchInputRef = useRef(null);

    // Keyboard shortcut '/' to search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "/" && document.activeElement !== searchInputRef.current) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch notes from backend
    const fetchNotes = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/notes`, { timeout: 12000 });
            if (Array.isArray(res.data)) {
                setNotes(res.data);
            } else {
                setNotes([]);
            }
        } catch (err) {
            console.error("Notes fetch error:", err);
            setError("Unable to load study notes from university repository.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    // Available Dynamic Filter Options
    const availableCourses = useMemo(() => {
        const courses = new Set(notes.map((n) => n.course).filter(Boolean));
        return ["All", ...Array.from(courses)];
    }, [notes]);

    const availableUniversities = useMemo(() => {
        const unis = new Set(notes.map((n) => n.university).filter(Boolean));
        return ["All", ...Array.from(unis)];
    }, [notes]);

    // Filter and Sort Notes
    const filteredNotes = useMemo(() => {
        let result = [...notes];

        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase().trim();
            result = result.filter((n) => {
                const title = (n.title || "").toLowerCase();
                const subject = (n.subject || "").toLowerCase();
                const course = (n.course || "").toLowerCase();
                const unit = (n.unit || "").toLowerCase();
                const university = (n.university || "").toLowerCase();
                const author = (n.author || "").toLowerCase();
                const branch = (n.branch || "").toLowerCase();
                return (
                    title.includes(query) ||
                    subject.includes(query) ||
                    course.includes(query) ||
                    unit.includes(query) ||
                    university.includes(query) ||
                    author.includes(query) ||
                    branch.includes(query)
                );
            });
        }

        if (courseFilter !== "All") {
            result = result.filter((n) => n.course === courseFilter);
        }
        if (unitFilter !== "All") {
            result = result.filter((n) => n.unit === unitFilter);
        }
        if (semesterFilter) {
            result = result.filter((n) => String(n.semester) === String(semesterFilter));
        }
        if (universityFilter !== "All") {
            result = result.filter((n) => n.university === universityFilter);
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            if (sortBy === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            if (sortBy === "title-az") return (a.title || "").localeCompare(b.title || "");
            if (sortBy === "subject-az") return (a.subject || "").localeCompare(b.subject || "");
            return 0;
        });

        return result;
    }, [notes, debouncedSearch, courseFilter, unitFilter, semesterFilter, universityFilter, sortBy]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredNotes.length / pageSize) || 1;
    const paginatedNotes = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredNotes.slice(start, start + pageSize);
    }, [filteredNotes, currentPage, pageSize]);

    // Clear filters
    const clearAllFilters = () => {
        setSearch("");
        setCourseFilter("All");
        setUnitFilter("All");
        setSemesterFilter("");
        setUniversityFilter("All");
        setCurrentPage(1);
    };

    const activeFiltersCount =
        (search ? 1 : 0) +
        (courseFilter !== "All" ? 1 : 0) +
        (unitFilter !== "All" ? 1 : 0) +
        (semesterFilter ? 1 : 0) +
        (universityFilter !== "All" ? 1 : 0);

    // Auth-Protected Preview
    const handlePreview = (note, e) => {
        e?.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in or create a free student account to preview notes.", {
                icon: "🔒",
                duration: 4000,
            });
            openSignIn?.();
            return;
        }
        setSelectedPdf({ fileUrl: note.fileUrl, title: note.title });
    };

    // Auth-Protected Download
    const handleDownload = async (note, e) => {
        e?.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to download full PDF notes.", {
                icon: "🔒",
                duration: 4000,
            });
            openSignIn?.();
            return;
        }

        try {
            setDownloadingId(note._id);
            const response = await fetch(note.fileUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${(note.title || "study_notes").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started!");
        } catch {
            window.open(note.fileUrl, "_blank");
        } finally {
            setDownloadingId(null);
        }
    };

    // Share link
    const handleShare = async (note, e) => {
        e?.stopPropagation();
        const shareData = {
            title: note.title,
            text: `Download ${note.title} (${note.subject} - ${note.unit}) on PaperBridge!`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                // fall through to clipboard
            }
        }

        navigator.clipboard.writeText(window.location.href);
        setCopiedId(note._id);
        toast.success("Notes link copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            {/* HEADER HERO */}
            <header className="relative pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-sm mb-3">
                            <FaStickyNote className="text-emerald-600 dark:text-emerald-400" />
                            Academic Notes & Study Vault
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Browse Study Notes & Materials
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 max-w-2xl">
                            Find unit-wise handwritten summaries, professor lecture slides, formula cheat sheets, and lab manuals across university courses.
                        </p>
                    </div>

                    {/* Repository Quick Stats Banner */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm px-5 py-3 text-center">
                            <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                                {notes.length}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Total Notes
                            </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm px-5 py-3 text-center">
                            <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                                {availableCourses.length > 1 ? availableCourses.length - 1 : 0}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Courses
                            </span>
                        </div>
                        <Link
                            to="/upload"
                            className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white px-5 py-3.5 rounded-2xl text-xs font-bold shadow-md hover:shadow-emerald-500/20 transition hover:-translate-y-0.5"
                        >
                            + Upload Notes
                        </Link>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* SEARCH & FILTERS CONTROL CARD */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm mb-8">
                    {/* Top Row: Search Input + Sort + View Mode */}
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <div className="flex items-center bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-900 focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 transition shadow-inner">
                                <FaSearch className="text-slate-400 mr-3 text-sm shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search notes by subject, unit, university, author (press '/' to focus)..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent outline-none text-slate-800 dark:text-white text-sm placeholder:text-slate-400 font-medium"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 transition"
                                        title="Clear search"
                                    >
                                        <FaTimes className="text-xs" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Controls: Sort By & View Mode */}
                        <div className="flex items-center gap-3 shrink-0 flex-wrap">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                <FaSortAmountDown className="text-emerald-600 dark:text-emerald-400" />
                                <span className="text-slate-400 hidden sm:inline">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent outline-none cursor-pointer font-semibold text-slate-700 dark:text-slate-200"
                                >
                                    <option value="newest" className="dark:bg-slate-900">Newest Added</option>
                                    <option value="oldest" className="dark:bg-slate-900">Oldest Added</option>
                                    <option value="subject-az" className="dark:bg-slate-900">Subject (A to Z)</option>
                                    <option value="title-az" className="dark:bg-slate-900">Title (A to Z)</option>
                                </select>
                            </div>

                            {/* View Switcher: Grid / List */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded-xl transition cursor-pointer ${
                                        viewMode === "grid"
                                            ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                    }`}
                                    title="Grid View"
                                >
                                    <FaThLarge className="text-xs" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-2 rounded-xl transition cursor-pointer ${
                                        viewMode === "list"
                                            ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                    }`}
                                    title="List View"
                                >
                                    <FaList className="text-xs" />
                                </button>
                            </div>

                            {/* Clear All Button */}
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-2xl text-xs font-semibold transition border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <FaTimes className="text-[10px]" /> Clear ({activeFiltersCount})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Middle Row: Course Filter Tabs */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1 shrink-0">
                            <FaGraduationCap className="text-emerald-500" /> Course:
                        </span>
                        {availableCourses.map((item) => {
                            const active = courseFilter === item;
                            return (
                                <button
                                    key={item}
                                    onClick={() => {
                                        setCourseFilter(item);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                                        active
                                            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-300 dark:shadow-none scale-105"
                                            : "bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-white"
                                    }`}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bottom Row: Secondary Filters (Unit, Semester, University) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Unit Select */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Unit / Module
                            </label>
                            <select
                                value={unitFilter}
                                onChange={(e) => {
                                    setUnitFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                                {UNITS.map((u) => (
                                    <option key={u.value} value={u.value} className="dark:bg-slate-900">
                                        {u.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Semester Select */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Semester
                            </label>
                            <select
                                value={semesterFilter}
                                onChange={(e) => {
                                    setSemesterFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                                {SEMESTERS.map((s) => (
                                    <option key={s.value} value={s.value} className="dark:bg-slate-900">
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* University Select */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                University / Institute
                            </label>
                            <select
                                value={universityFilter}
                                onChange={(e) => {
                                    setUniversityFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                                {availableUniversities.map((uni) => (
                                    <option key={uni} value={uni} className="dark:bg-slate-900">
                                        {uni === "All" ? "All Universities" : uni}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* GUEST ACCESS NOTIFICATION BANNER */}
                {!isSignedIn && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-emerald-500/30"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-lg shrink-0 text-emerald-300">
                                <FaLock />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>Sign in required to view & download study notes</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 uppercase tracking-wider font-semibold">
                                        Free Access
                                    </span>
                                </h4>
                                <p className="text-xs text-emerald-200/90 mt-0.5">
                                    Create a free student account or sign in to unlock instant PDF previews and direct downloads.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openSignIn?.()}
                            className="shrink-0 w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-indigo-500 hover:from-emerald-600 hover:to-indigo-600 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            Sign In / Register Now →
                        </button>
                    </motion.div>
                )}

                {/* RESULTS HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">
                            {filteredNotes.length} Study Note{filteredNotes.length === 1 ? "" : "s"} Found
                        </span>
                        {debouncedSearch && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                for &ldquo;<span className="font-semibold text-emerald-600 dark:text-emerald-400">{debouncedSearch}</span>&rdquo;
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium self-end sm:self-auto">
                        <span>Show:</span>
                        {[12, 24, 48].map((size) => (
                            <button
                                key={size}
                                onClick={() => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    pageSize === size
                                        ? "bg-emerald-600 text-white font-bold"
                                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* EMPTY RESULTS */}
                {!loading && !error && filteredNotes.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-14 text-center shadow-sm max-w-lg mx-auto my-12">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-3xl mb-4 shadow-inner">
                            📚
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Study Notes Found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            We couldn&rsquo;t find any study notes matching your criteria. Try adjusting your filters or be the first to upload notes for this subject.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                            >
                                Clear All Filters
                            </button>
                            <Link
                                to="/upload"
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                            >
                                Upload Notes →
                            </Link>
                        </div>
                    </div>
                )}

                {/* GRID VIEW */}
                {!loading && !error && filteredNotes.length > 0 && viewMode === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedNotes.map((note, index) => (
                            <motion.div
                                key={note._id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: index * 0.03 }}
                                className="group bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 p-5 shadow-sm hover:shadow-xl dark:shadow-emerald-950/20 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div>
                                    {/* Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                                            <FaStickyNote className="text-xs" />
                                            {note.unit || "Notes"}
                                        </span>

                                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                            {note.course || "General"}
                                        </span>
                                    </div>

                                    {/* Title & Subject */}
                                    <h3
                                        onClick={(e) => handlePreview(note, e)}
                                        className="text-base font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug mb-1 cursor-pointer"
                                        title={note.title}
                                    >
                                        {note.title}
                                    </h3>

                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                                        {note.subject}
                                    </p>

                                    {/* University & Professor tag */}
                                    <div className="space-y-1 mb-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        {note.university && (
                                            <p className="flex items-center gap-1.5 truncate">
                                                <FaUniversity className="text-slate-400 shrink-0 text-[10px]" />
                                                <span className="truncate">{note.university}</span>
                                            </p>
                                        )}
                                        {note.author && (
                                            <p className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                                                <FaUserGraduate className="text-slate-400 shrink-0 text-[10px]" />
                                                <span className="truncate">By {note.author}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Interactive Thumbnail Box */}
                                    <div
                                        onClick={(e) => handlePreview(note, e)}
                                        className="relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900/60 p-4 mb-4 cursor-pointer group/preview hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all flex flex-col items-center justify-center text-center overflow-hidden"
                                    >
                                        <div className="w-12 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative transition-transform duration-200 group-hover/preview:scale-105">
                                            <FaFilePdf className="text-red-500 text-xl mb-1" />
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                                DOC
                                            </span>
                                        </div>

                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2 flex items-center gap-1">
                                            {!isSignedIn && <FaLock className="text-[10px] text-amber-500" />}
                                            {isSignedIn ? "Click to preview notes" : "Sign in to preview"}
                                        </span>

                                        <div className="absolute inset-0 bg-emerald-600/90 dark:bg-emerald-700/90 backdrop-blur-[2px] opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                                            {!isSignedIn ? (
                                                <>
                                                    <FaLock className="text-sm" /> Sign in to Preview
                                                </>
                                            ) : (
                                                <>
                                                    <FaEye className="text-sm" /> Quick Read
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        onClick={(e) => handlePreview(note, e)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                                    >
                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                        {isSignedIn ? "Preview" : "Sign In"}
                                    </button>

                                    <button
                                        onClick={(e) => handleDownload(note, e)}
                                        disabled={downloadingId === note._id}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-75 cursor-pointer"
                                    >
                                        {downloadingId === note._id ? (
                                            <>
                                                <FaSpinner className="animate-spin text-xs" /> Saving...
                                            </>
                                        ) : !isSignedIn ? (
                                            <>
                                                <FaLock className="text-[10px]" /> Download
                                            </>
                                        ) : (
                                            <>
                                                <FaDownload className="text-xs" /> Download
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={(e) => handleShare(note, e)}
                                        title="Share Study Notes"
                                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-xs transition cursor-pointer"
                                    >
                                        {copiedId === note._id ? (
                                            <FaCheck className="text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <FaShareAlt />
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* LIST VIEW */}
                {!loading && !error && filteredNotes.length > 0 && viewMode === "list" && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="py-3.5 px-4">Title & Subject</th>
                                        <th className="py-3.5 px-4">Unit / Module</th>
                                        <th className="py-3.5 px-4">Course & Sem</th>
                                        <th className="py-3.5 px-4">University</th>
                                        <th className="py-3.5 px-4">Author</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                    {paginatedNotes.map((note) => (
                                        <tr key={note._id} className="hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <FaStickyNote />
                                                    </div>
                                                    <div>
                                                        <span
                                                            className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer line-clamp-1 max-w-xs block"
                                                            onClick={(e) => handlePreview(note, e)}
                                                        >
                                                            {note.title}
                                                        </span>
                                                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                                            {note.subject}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                {note.unit || "-"}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span>{note.course || "-"}</span>
                                                <span className="text-slate-400 block text-[11px]">
                                                    {note.semester ? `Sem ${note.semester}` : "-"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                {note.university || "-"}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                                                {note.author || "Student"}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => handlePreview(note, e)}
                                                        className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg transition"
                                                        title="Preview Notes"
                                                    >
                                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDownload(note, e)}
                                                        disabled={downloadingId === note._id}
                                                        className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg transition"
                                                        title="Download PDF"
                                                    >
                                                        {downloadingId === note._id ? (
                                                            <FaSpinner className="animate-spin text-xs" />
                                                        ) : !isSignedIn ? (
                                                            <FaLock className="text-[10px]" />
                                                        ) : (
                                                            <FaDownload className="text-xs" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleShare(note, e)}
                                                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition"
                                                        title="Share Link"
                                                    >
                                                        {copiedId === note._id ? (
                                                            <FaCheck className="text-emerald-600 text-xs" />
                                                        ) : (
                                                            <FaShareAlt className="text-xs" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PAGINATION */}
                {!loading && !error && filteredNotes.length > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Showing {(currentPage - 1) * pageSize + 1} to{" "}
                            {Math.min(currentPage * pageSize, filteredNotes.length)} of {filteredNotes.length} notes
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition shadow-sm cursor-pointer"
                            >
                                <FaChevronLeft className="text-[10px]" /> Prev
                            </button>
                            <span className="px-3 font-bold text-xs text-slate-800 dark:text-white">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition shadow-sm cursor-pointer"
                            >
                                Next <FaChevronRight className="text-[10px]" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL PDF VIEWER */}
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

export default BrowseNotes;
