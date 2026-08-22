import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaFilePdf,
    FaEye,
    FaDownload,
    FaShareAlt,
    FaSearch,
    FaTimes,
    FaGraduationCap,
    FaCalendarAlt,
    FaLayerGroup,
    FaThLarge,
    FaList,
    FaRedo,
    FaSortAmountDown,
    FaChevronLeft,
    FaChevronRight,
    FaSpinner,
    FaBookOpen,
    FaCheck,
    FaLock,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import PDFViewer from "../components/PDFViewer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DEFAULT_COURSES = ["All", "B.Tech", "MCA", "MBA", "BCA", "BBA"];
const EXAM_TYPES = [
    { label: "All Exams", value: "" },
    { label: "Mid Term 1", value: "mid1" },
    { label: "Mid Term 2", value: "mid2" },
    { label: "End Semester", value: "semester" },
    { label: "Makeup / Backlog", value: "makeup" },
];
const SEMESTERS = [
    { label: "All Semesters", value: "" },
    { label: "Semester 1", value: "1" },
    { label: "Semester 2", value: "2" },
    { label: "Semester 3", value: "3" },
    { label: "Semester 4", value: "4" },
    { label: "Semester 5", value: "5" },
    { label: "Semester 6", value: "6" },
    { label: "Semester 7", value: "7" },
    { label: "Semester 8", value: "8" },
];

const getExamBadgeStyle = (examType = "") => {
    const lower = (examType || "").toLowerCase();
    if (lower.includes("mid1") || lower.includes("mid-1")) {
        return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
    if (lower.includes("mid2") || lower.includes("mid-2")) {
        return "bg-orange-50 text-orange-700 border-orange-200/80";
    }
    if (lower.includes("sem") || lower.includes("final")) {
        return "bg-purple-50 text-purple-700 border-purple-200/80";
    }
    if (lower.includes("make") || lower.includes("sup") || lower.includes("back")) {
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
};

const getCourseBadgeStyle = (course = "") => {
    const lower = (course || "").toLowerCase();
    if (lower.includes("b.tech") || lower.includes("btech")) {
        return "bg-blue-50 text-blue-700 border-blue-200/80";
    }
    if (lower.includes("mca")) {
        return "bg-purple-50 text-purple-700 border-purple-200/80";
    }
    if (lower.includes("mba")) {
        return "bg-rose-50 text-rose-700 border-rose-200/80";
    }
    if (lower.includes("bca")) {
        return "bg-teal-50 text-teal-700 border-teal-200/80";
    }
    if (lower.includes("bba")) {
        return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
    return "bg-slate-50 text-slate-700 border-slate-200/80";
};

function BrowsePYQ() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();

    const [searchParams, setSearchParams] = useSearchParams();
    const searchInputRef = useRef(null);

    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // View mode: grid or list
    const [viewMode, setViewMode] = useState("grid");

    // Filter states
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
    const [courseFilter, setCourseFilter] = useState(searchParams.get("course") || "All");
    const [examFilter, setExamFilter] = useState(searchParams.get("exam") || "");
    const [semesterFilter, setSemesterFilter] = useState(searchParams.get("sem") || "");
    const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");
    const [branchFilter, setBranchFilter] = useState(searchParams.get("branch") || "");
    const [sortBy, setSortBy] = useState("newest"); // newest, oldest, year-desc, year-asc, title-az

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // Fetch papers with abort controller and retry resilience
    const fetchPapers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/pyqs`, { timeout: 15000 });
            if (Array.isArray(res.data)) {
                setPapers(res.data);
            } else {
                setPapers([]);
            }
        } catch (err) {
            console.error("Browse fetch error:", err);
            setError("Unable to connect to the question papers repository. Please check your network or try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPapers();
    }, [fetchPapers]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);

    // Keyboard shortcut to focus search with '/'
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

    // Sync URL parameters when filters change
    useEffect(() => {
        const params = {};
        if (debouncedSearch) params.q = debouncedSearch;
        if (courseFilter && courseFilter !== "All") params.course = courseFilter;
        if (examFilter) params.exam = examFilter;
        if (semesterFilter) params.sem = semesterFilter;
        if (yearFilter) params.year = yearFilter;
        if (branchFilter) params.branch = branchFilter;
        setSearchParams(params, { replace: true });
    }, [debouncedSearch, courseFilter, examFilter, semesterFilter, yearFilter, branchFilter, setSearchParams]);

    // Dynamic unique options extracted from loaded papers
    const availableCourses = useMemo(() => {
        const set = new Set(DEFAULT_COURSES);
        papers.forEach((p) => {
            if (p.course) set.add(p.course);
        });
        return Array.from(set);
    }, [papers]);

    const availableYears = useMemo(() => {
        const set = new Set();
        papers.forEach((p) => {
            if (p.year) set.add(Number(p.year));
        });
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= currentYear - 4; y--) {
            set.add(y);
        }
        return Array.from(set).sort((a, b) => b - a);
    }, [papers]);

    const availableBranches = useMemo(() => {
        const set = new Set();
        papers.forEach((p) => {
            if (p.branch && p.branch.trim()) {
                set.add(p.branch.trim());
            }
        });
        return Array.from(set).sort();
    }, [papers]);

    // Multi-criteria filtering & sorting
    const filteredPapers = useMemo(() => {
        let result = papers.filter((paper) => {
            const searchTarget = `${paper.title || ""} ${paper.course || ""} ${paper.examType || ""} ${paper.year || ""} ${paper.branch || ""} ${paper.semester ? `sem ${paper.semester}` : ""}`.toLowerCase();
            const matchesSearch = !debouncedSearch || searchTarget.includes(debouncedSearch.toLowerCase().trim());
            const matchesCourse = courseFilter === "All" || (paper.course && paper.course.toLowerCase() === courseFilter.toLowerCase());
            const matchesExam = !examFilter || (paper.examType && paper.examType.toLowerCase() === examFilter.toLowerCase());
            const matchesSemester = !semesterFilter || String(paper.semester) === semesterFilter;
            const matchesYear = !yearFilter || String(paper.year) === yearFilter;
            const matchesBranch = !branchFilter || (paper.branch && paper.branch.toLowerCase() === branchFilter.toLowerCase());

            return matchesSearch && matchesCourse && matchesExam && matchesSemester && matchesYear && matchesBranch;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortBy === "newest") {
                return (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) || (b._id > a._id ? 1 : -1);
            }
            if (sortBy === "oldest") {
                return (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) || (a._id > b._id ? 1 : -1);
            }
            if (sortBy === "year-desc") {
                return (Number(b.year) || 0) - (Number(a.year) || 0);
            }
            if (sortBy === "year-asc") {
                return (Number(a.year) || 0) - (Number(b.year) || 0);
            }
            if (sortBy === "title-az") {
                return (a.title || "").localeCompare(b.title || "");
            }
            return 0;
        });

        return result;
    }, [papers, debouncedSearch, courseFilter, examFilter, semesterFilter, yearFilter, branchFilter, sortBy]);

    // Paginated results
    const totalPages = Math.max(1, Math.ceil(filteredPapers.length / pageSize));
    const paginatedPapers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPapers.slice(start, start + pageSize);
    }, [filteredPapers, currentPage, pageSize]);

    // Active filters count
    const activeFiltersCount = [
        courseFilter !== "All" ? 1 : 0,
        examFilter ? 1 : 0,
        semesterFilter ? 1 : 0,
        yearFilter ? 1 : 0,
        branchFilter ? 1 : 0,
        debouncedSearch ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const clearAllFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setCourseFilter("All");
        setExamFilter("");
        setSemesterFilter("");
        setYearFilter("");
        setBranchFilter("");
        setCurrentPage(1);
    };

    // Preview handler with auth guard
    const handlePreview = (paper, e) => {
        if (e) e.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to view and preview question papers.");
            openSignIn ? openSignIn() : null;
            return;
        }
        setSelectedPdf({
            fileUrl: paper.fileUrl,
            title: `${paper.title} (${paper.course || "PYQ"})`,
        });
    };

    // Download handler with auth guard, progress & toast feedback
    const handleDownload = async (paper, e) => {
        if (e) e.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to download question papers.");
            openSignIn ? openSignIn() : null;
            return;
        }
        if (!paper.fileUrl) {
            toast.error("File download link is missing.");
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

            toast.success("Download started successfully!", { id: toastId });
        } catch (err) {
            console.error("Direct download failed, opening in new tab:", err);
            window.open(paper.fileUrl, "_blank");
            toast.success("Opening file in new tab...", { id: toastId });
        } finally {
            setDownloadingId(null);
        }
    };

    // Share link handler
    const handleShare = (paper, e) => {
        if (e) e.stopPropagation();
        const shareUrl = `${window.location.origin}/browse?q=${encodeURIComponent(paper.title || "")}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedId(paper._id);
        toast.success("Paper link copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50 text-slate-800 flex flex-col font-sans">
            <Navbar2 />

            {/* HEADER HERO */}
            <header className="relative pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-white/70 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-sm mb-3">
                            <FaBookOpen className="text-indigo-600" />
                            Academic PYQ Archive
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Browse Question Papers
                        </h1>
                        <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">
                            Search, filter, preview, and download semester, mid-term, and makeup exam papers across all university departments.
                        </p>
                    </div>

                    {/* Repository Quick Stats Banner */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm px-5 py-3 text-center">
                            <span className="block text-2xl font-black text-indigo-600 leading-none">
                                {papers.length}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Total Papers
                            </span>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm px-5 py-3 text-center">
                            <span className="block text-2xl font-black text-purple-600 leading-none">
                                {availableCourses.length > 1 ? availableCourses.length - 1 : 0}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Courses
                            </span>
                        </div>
                        <Link
                            to="/upload"
                            className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-3.5 rounded-2xl text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition hover:-translate-y-0.5"
                        >
                            + Upload Paper
                        </Link>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* SEARCH & FILTERS CONTROL CARD */}
                <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm mb-8">
                    {/* Top Row: Search Input + Sort + View Mode */}
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <div className="flex items-center bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/50 border border-slate-200 rounded-2xl px-4 py-3 transition shadow-inner">
                                <FaSearch className="text-slate-400 mr-3 text-sm shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    id="paper-search-input"
                                    placeholder="Search by subject, code, course, year, or branch... (Press '/' to focus)"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent outline-none text-slate-800 text-sm placeholder:text-slate-400 font-medium"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="text-slate-400 hover:text-slate-600 p-1 transition"
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
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700">
                                <FaSortAmountDown className="text-indigo-600" />
                                <span className="text-slate-400 hidden sm:inline">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent outline-none cursor-pointer font-semibold text-slate-700"
                                >
                                    <option value="newest">Newest Added</option>
                                    <option value="oldest">Oldest Added</option>
                                    <option value="year-desc">Exam Year (Recent)</option>
                                    <option value="year-asc">Exam Year (Oldest)</option>
                                    <option value="title-az">Subject (A to Z)</option>
                                </select>
                            </div>

                            {/* View Switcher: Grid / List */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded-xl transition ${
                                        viewMode === "grid"
                                            ? "bg-white text-indigo-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                    title="Grid View"
                                >
                                    <FaThLarge className="text-xs" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-2 rounded-xl transition ${
                                        viewMode === "list"
                                            ? "bg-white text-indigo-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
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
                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-xs font-semibold transition border border-rose-200 flex items-center gap-1.5"
                                >
                                    <FaTimes className="text-[10px]" /> Clear ({activeFiltersCount})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Middle Row: Course Filter Tabs */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1 shrink-0">
                            <FaGraduationCap className="text-indigo-500" /> Course:
                        </span>
                        {availableCourses.map((item) => {
                            const active = courseFilter === item;
                            return (
                                <button
                                    key={item}
                                    id={`course-filter-${item.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                                    onClick={() => {
                                        setCourseFilter(item);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                                        active
                                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 scale-105"
                                            : "bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600"
                                    }`}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bottom Row: Secondary Filters (Exam Type, Semester, Year, Branch) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Exam Type Select */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Exam Type
                            </label>
                            <select
                                value={examFilter}
                                onChange={(e) => {
                                    setExamFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                {EXAM_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                {SEMESTERS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Year Select */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Exam Year
                            </label>
                            <select
                                value={yearFilter}
                                onChange={(e) => {
                                    setYearFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="">All Years</option>
                                {availableYears.map((y) => (
                                    <option key={y} value={String(y)}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Branch / Stream Select */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Branch / Dept
                            </label>
                            <select
                                value={branchFilter}
                                onChange={(e) => {
                                    setBranchFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="">All Branches</option>
                                {availableBranches.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
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
                        className="mb-8 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-indigo-500/30"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-lg shrink-0 text-indigo-300">
                                <FaLock />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>Sign in required to view & download papers</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider font-semibold">
                                        Free Account
                                    </span>
                                </h4>
                                <p className="text-xs text-indigo-200/90 mt-0.5">
                                    Create a free student account or sign in to unlock instant full-length PDF previews and direct downloads.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openSignIn?.()}
                            className="shrink-0 w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-indigo-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            Sign In / Register Now →
                        </button>
                    </motion.div>
                )}

                {/* RESULTS HEADER & ACTIVE FILTERS CHIPS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                            {filteredPapers.length} Question Paper{filteredPapers.length === 1 ? "" : "s"} Found
                        </span>
                        {debouncedSearch && (
                            <span className="text-xs text-slate-500">
                                for &ldquo;<span className="font-semibold text-indigo-600">{debouncedSearch}</span>&rdquo;
                            </span>
                        )}
                    </div>

                    {/* Items per page selector */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium self-end sm:self-auto">
                        <span>Show:</span>
                        {[12, 24, 48].map((size) => (
                            <button
                                key={size}
                                onClick={() => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-lg transition ${
                                    pageSize === size
                                        ? "bg-indigo-600 text-white font-bold"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ACTIVE FILTER BADGES */}
                {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Applied:
                        </span>
                        {debouncedSearch && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
                                🔍 &ldquo;{debouncedSearch}&rdquo;
                                <button onClick={() => setSearch("")} className="hover:text-indigo-900">
                                    ✕
                                </button>
                            </span>
                        )}
                        {courseFilter !== "All" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                                🎓 {courseFilter}
                                <button onClick={() => setCourseFilter("All")} className="hover:text-blue-900">
                                    ✕
                                </button>
                            </span>
                        )}
                        {examFilter && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium">
                                📝 {examFilter}
                                <button onClick={() => setExamFilter("")} className="hover:text-purple-900">
                                    ✕
                                </button>
                            </span>
                        )}
                        {semesterFilter && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                                📖 Semester {semesterFilter}
                                <button onClick={() => setSemesterFilter("")} className="hover:text-amber-900">
                                    ✕
                                </button>
                            </span>
                        )}
                        {yearFilter && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                                📅 {yearFilter}
                                <button onClick={() => setYearFilter("")} className="hover:text-emerald-900">
                                    ✕
                                </button>
                            </span>
                        )}
                        {branchFilter && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium">
                                🏛️ {branchFilter}
                                <button onClick={() => setBranchFilter("")} className="hover:text-slate-900">
                                    ✕
                                </button>
                            </span>
                        )}
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-rose-500 hover:text-rose-700 font-semibold underline ml-1 cursor-pointer"
                        >
                            Reset all
                        </button>
                    </div>
                )}

                {/* STATE 1: ERROR BANNER */}
                {!loading && error && (
                    <div className="bg-white border border-rose-200 rounded-3xl p-10 text-center shadow-sm max-w-xl mx-auto my-8">
                        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
                            ⚠️
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Could Not Load Repository</h3>
                        <p className="text-sm text-slate-500 mb-6">{error}</p>
                        <button
                            onClick={fetchPapers}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                            <FaRedo className="text-xs" /> Try Again
                        </button>
                    </div>
                )}

                {/* STATE 2: LOADING SKELETON */}
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

                {/* STATE 3: EMPTY RESULTS */}
                {!loading && !error && filteredPapers.length === 0 && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-14 text-center shadow-sm max-w-lg mx-auto my-12">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto text-3xl mb-4 shadow-inner">
                            📂
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Papers Found</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            We couldn&rsquo;t find any question papers matching your selected criteria. Try adjusting your filters or be the first to upload this paper.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                                Clear All Filters
                            </button>
                            <Link
                                to="/upload"
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                            >
                                Upload This PYQ →
                            </Link>
                        </div>
                    </div>
                )}

                {/* STATE 4: PAPERS LISTING (GRID VIEW) */}
                {!loading && !error && filteredPapers.length > 0 && viewMode === "grid" && (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {paginatedPapers.map((paper, index) => (
                                <motion.div
                                    key={paper._id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.25, delay: index * 0.03 }}
                                    className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
                                >
                                    {/* Top Accent Gradient Line */}
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
                                            onClick={(e) => handlePreview(paper, e)}
                                            className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-2 cursor-pointer"
                                        >
                                            {paper.title || "Untitled Question Paper"}
                                        </h3>

                                        {/* Details row */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-4 font-medium">
                                            <span>Sem: {paper.semester ? `Semester ${paper.semester}` : "N/A"}</span>
                                            {paper.branch && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-slate-600">{paper.branch}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Interactive Thumbnail Box */}
                                        <div
                                            onClick={(e) => handlePreview(paper, e)}
                                            className="relative rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 p-4 mb-4 cursor-pointer group/preview hover:bg-indigo-50/40 hover:border-indigo-200 transition-all flex flex-col items-center justify-center text-center overflow-hidden"
                                        >
                                            <div className="w-12 h-14 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center relative transition-transform duration-200 group-hover/preview:scale-105">
                                                <FaFilePdf className="text-red-500 text-xl mb-1" />
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    PDF
                                                </span>
                                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-slate-200 rounded-bl" />
                                            </div>

                                            <span className="text-xs font-semibold text-slate-600 mt-2 flex items-center gap-1">
                                                {!isSignedIn && <FaLock className="text-[10px] text-amber-500" />}
                                                {isSignedIn ? "Click to preview document" : "Sign in to preview"}
                                            </span>

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-[2px] opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                                                {!isSignedIn ? (
                                                    <>
                                                        <FaLock className="text-sm" /> Sign in to Preview
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaEye className="text-sm" /> Quick Preview
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            id={`view-btn-${paper._id}`}
                                            onClick={(e) => handlePreview(paper, e)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                                        >
                                            {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                            {isSignedIn ? "Preview" : "Sign In"}
                                        </button>

                                        <button
                                            id={`download-btn-${paper._id}`}
                                            onClick={(e) => handleDownload(paper, e)}
                                            disabled={downloadingId === paper._id}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-75 cursor-pointer"
                                        >
                                            {downloadingId === paper._id ? (
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
                                            onClick={(e) => handleShare(paper, e)}
                                            title="Copy Share Link"
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl text-xs transition cursor-pointer"
                                        >
                                            {copiedId === paper._id ? (
                                                <FaCheck className="text-emerald-600" />
                                            ) : (
                                                <FaShareAlt />
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* STATE 5: PAPERS LISTING (LIST / TABLE VIEW) */}
                {!loading && !error && filteredPapers.length > 0 && viewMode === "list" && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="py-3.5 px-4">Subject / Title</th>
                                        <th className="py-3.5 px-4">Course</th>
                                        <th className="py-3.5 px-4">Semester</th>
                                        <th className="py-3.5 px-4">Exam Type</th>
                                        <th className="py-3.5 px-4">Year</th>
                                        <th className="py-3.5 px-4">Branch</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {paginatedPapers.map((paper) => (
                                        <tr key={paper._id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                                        <FaFilePdf />
                                                    </div>
                                                    <span
                                                        className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-1 max-w-xs"
                                                        onClick={(e) => handlePreview(paper, e)}
                                                    >
                                                        {paper.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded-md font-semibold border ${getCourseBadgeStyle(
                                                        paper.course
                                                    )}`}
                                                >
                                                    {paper.course || "-"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {paper.semester ? `Sem ${paper.semester}` : "-"}
                                            </td>
                                            <td className="py-3.5 px-4 capitalize">
                                                {paper.examType ? (
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getExamBadgeStyle(
                                                            paper.examType
                                                        )}`}
                                                    >
                                                        {paper.examType}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-600">
                                                {paper.year || "-"}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-500">
                                                {paper.branch || "-"}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => handlePreview(paper, e)}
                                                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition cursor-pointer"
                                                        title={isSignedIn ? "Preview Paper" : "Sign in to Preview"}
                                                    >
                                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDownload(paper, e)}
                                                        disabled={downloadingId === paper._id}
                                                        className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition cursor-pointer"
                                                        title={isSignedIn ? "Download PDF" : "Sign in to Download"}
                                                    >
                                                        {downloadingId === paper._id ? (
                                                            <FaSpinner className="animate-spin text-xs" />
                                                        ) : !isSignedIn ? (
                                                            <FaLock className="text-[10px]" />
                                                        ) : (
                                                            <FaDownload className="text-xs" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleShare(paper, e)}
                                                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                                                        title="Share Link"
                                                    >
                                                        {copiedId === paper._id ? (
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

                {/* PAGINATION BAR */}
                {!loading && !error && filteredPapers.length > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-slate-200/80">
                        <span className="text-xs text-slate-500 font-medium">
                            Showing {(currentPage - 1) * pageSize + 1} to{" "}
                            {Math.min(currentPage * pageSize, filteredPapers.length)} of {filteredPapers.length} papers
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                <FaChevronLeft className="text-[10px]" /> Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((page) => {
                                    return (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    );
                                })
                                .map((page, idx, array) => {
                                    const prevPage = array[idx - 1];
                                    const showEllipsis = prevPage && page - prevPage > 1;

                                    return (
                                        <React.Fragment key={page}>
                                            {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                                                    currentPage === page
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
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

export default BrowsePYQ;
