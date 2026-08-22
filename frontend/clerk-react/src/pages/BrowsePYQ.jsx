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
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({ label: `Semester ${s}`, value: String(s) })),
];

function BrowsePYQ() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();

    const [searchParams, setSearchParams] = useSearchParams();
    const searchInputRef = useRef(null);

    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    // Filters & Sorting state
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
    const [courseFilter, setCourseFilter] = useState(searchParams.get("course") || "All");
    const [examFilter, setExamFilter] = useState(searchParams.get("exam") || "");
    const [semesterFilter, setSemesterFilter] = useState(searchParams.get("semester") || "");
    const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");
    const [branchFilter, setBranchFilter] = useState(searchParams.get("branch") || "");
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState("grid");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

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

    // Synchronize URL parameters
    useEffect(() => {
        const params = {};
        if (debouncedSearch) params.q = debouncedSearch;
        if (courseFilter !== "All") params.course = courseFilter;
        if (examFilter) params.exam = examFilter;
        if (semesterFilter) params.semester = semesterFilter;
        if (yearFilter) params.year = yearFilter;
        if (branchFilter) params.branch = branchFilter;
        setSearchParams(params, { replace: true });
    }, [debouncedSearch, courseFilter, examFilter, semesterFilter, yearFilter, branchFilter, setSearchParams]);

    // Fetch papers from API
    const fetchPapers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/pyqs`, { timeout: 12000 });
            if (Array.isArray(res.data)) {
                setPapers(res.data);
            } else {
                setPapers([]);
            }
        } catch (err) {
            console.error("BrowsePYQ fetch error:", err);
            setError("Unable to load question papers from the server repository.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPapers();
    }, [fetchPapers]);

    // Dynamic Filter Option Lists
    const availableCourses = useMemo(() => {
        const courses = new Set(papers.map((p) => p.course).filter(Boolean));
        DEFAULT_COURSES.forEach((c) => courses.add(c));
        return Array.from(courses);
    }, [papers]);

    const availableYears = useMemo(() => {
        const years = new Set(papers.map((p) => p.year).filter(Boolean));
        return Array.from(years).sort((a, b) => b - a);
    }, [papers]);

    const availableBranches = useMemo(() => {
        const branches = new Set(papers.map((p) => p.branch).filter(Boolean));
        return Array.from(branches).sort();
    }, [papers]);

    // Filter and Sort papers
    const filteredPapers = useMemo(() => {
        let result = [...papers];

        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase().trim();
            result = result.filter((p) => {
                const title = (p.title || "").toLowerCase();
                const course = (p.course || "").toLowerCase();
                const branch = (p.branch || "").toLowerCase();
                const year = String(p.year || "");
                const exam = (p.examType || "").toLowerCase();
                return (
                    title.includes(query) ||
                    course.includes(query) ||
                    branch.includes(query) ||
                    year.includes(query) ||
                    exam.includes(query)
                );
            });
        }

        if (courseFilter !== "All") {
            result = result.filter((p) => (p.course || "").toLowerCase() === courseFilter.toLowerCase());
        }
        if (examFilter) {
            result = result.filter((p) => (p.examType || "").toLowerCase() === examFilter.toLowerCase());
        }
        if (semesterFilter) {
            result = result.filter((p) => String(p.semester) === String(semesterFilter));
        }
        if (yearFilter) {
            result = result.filter((p) => String(p.year) === String(yearFilter));
        }
        if (branchFilter) {
            result = result.filter((p) => (p.branch || "").toLowerCase() === branchFilter.toLowerCase());
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            if (sortBy === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            if (sortBy === "year-desc") return (b.year || 0) - (a.year || 0);
            if (sortBy === "year-asc") return (a.year || 0) - (b.year || 0);
            if (sortBy === "title-az") return (a.title || "").localeCompare(b.title || "");
            return 0;
        });

        return result;
    }, [papers, debouncedSearch, courseFilter, examFilter, semesterFilter, yearFilter, branchFilter, sortBy]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredPapers.length / pageSize) || 1;
    const paginatedPapers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPapers.slice(start, start + pageSize);
    }, [filteredPapers, currentPage, pageSize]);

    // Clear filters
    const clearAllFilters = () => {
        setSearch("");
        setCourseFilter("All");
        setExamFilter("");
        setSemesterFilter("");
        setYearFilter("");
        setBranchFilter("");
        setCurrentPage(1);
    };

    const activeFiltersCount =
        (search ? 1 : 0) +
        (courseFilter !== "All" ? 1 : 0) +
        (examFilter ? 1 : 0) +
        (semesterFilter ? 1 : 0) +
        (yearFilter ? 1 : 0) +
        (branchFilter ? 1 : 0);

    // Preview handler with auth guard
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

    // Download handler with auth guard
    const handleDownload = async (paper, e) => {
        if (e) e.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to download question papers.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        if (!paper.fileUrl) {
            toast.error("File download link is missing.");
            return;
        }

        setDownloadingId(paper._id);
        const toastId = toast.loading(`Downloading ${paper.title || "paper"}...`);

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
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            {/* HEADER HERO */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold mb-2">
                            <FaBookOpen className="text-slate-500" />
                            Academic PYQ Archive
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Browse Question Papers
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                            Search, filter, preview, and download semester and mid-term exam question papers across all university departments.
                        </p>
                    </div>

                    {/* Repository Quick Stats */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-center">
                            <span className="block text-xl font-bold text-slate-900 dark:text-white leading-none">
                                {papers.length}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Total Papers
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-center">
                            <span className="block text-xl font-bold text-slate-900 dark:text-white leading-none">
                                {availableCourses.length > 1 ? availableCourses.length - 1 : 0}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Courses
                            </span>
                        </div>
                        <Link
                            to="/upload"
                            className="hidden sm:inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition"
                        >
                            + Upload Paper
                        </Link>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* SEARCH & FILTERS CARD */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs mb-8">
                    {/* Top Row: Search Input + Sort + View Mode */}
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 transition">
                                <FaSearch className="text-slate-400 mr-2.5 text-xs shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    id="paper-search-input"
                                    placeholder="Search by subject, code, course, year, or branch... (Press '/' to focus)"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent outline-none text-slate-800 dark:text-white text-xs placeholder:text-slate-400 font-medium"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition"
                                        title="Clear search"
                                    >
                                        <FaTimes className="text-xs" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Controls: Sort By & View Mode */}
                        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                <FaSortAmountDown className="text-slate-400" />
                                <span className="text-slate-400 hidden sm:inline">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent outline-none cursor-pointer font-medium text-slate-700 dark:text-slate-200"
                                >
                                    <option value="newest" className="dark:bg-slate-900">Newest Added</option>
                                    <option value="oldest" className="dark:bg-slate-900">Oldest Added</option>
                                    <option value="year-desc" className="dark:bg-slate-900">Exam Year (Recent)</option>
                                    <option value="year-asc" className="dark:bg-slate-900">Exam Year (Oldest)</option>
                                    <option value="title-az" className="dark:bg-slate-900">Subject (A to Z)</option>
                                </select>
                            </div>

                            {/* View Switcher: Grid / List */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-md transition cursor-pointer ${
                                        viewMode === "grid"
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold"
                                            : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    }`}
                                    title="Grid View"
                                >
                                    <FaThLarge className="text-xs" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded-md transition cursor-pointer ${
                                        viewMode === "list"
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold"
                                            : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
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
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                >
                                    <FaTimes className="text-[10px]" /> Clear ({activeFiltersCount})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Middle Row: Course Filter Tabs */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1 shrink-0">
                            Course:
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
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
                                        active
                                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
                                            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                    }`}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bottom Row: Secondary Filters */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Exam Type
                            </label>
                            <select
                                value={examFilter}
                                onChange={(e) => {
                                    setExamFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                            >
                                {EXAM_TYPES.map((t) => (
                                    <option key={t.value} value={t.value} className="dark:bg-slate-900">
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Semester
                            </label>
                            <select
                                value={semesterFilter}
                                onChange={(e) => {
                                    setSemesterFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                            >
                                {SEMESTERS.map((s) => (
                                    <option key={s.value} value={s.value} className="dark:bg-slate-900">
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Exam Year
                            </label>
                            <select
                                value={yearFilter}
                                onChange={(e) => {
                                    setYearFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                            >
                                <option value="" className="dark:bg-slate-900">All Years</option>
                                {availableYears.map((y) => (
                                    <option key={y} value={String(y)} className="dark:bg-slate-900">
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Branch / Dept
                            </label>
                            <select
                                value={branchFilter}
                                onChange={(e) => {
                                    setBranchFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                            >
                                <option value="" className="dark:bg-slate-900">All Branches</option>
                                {availableBranches.map((b) => (
                                    <option key={b} value={b} className="dark:bg-slate-900">
                                        {b}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* GUEST ACCESS NOTIFICATION BANNER */}
                {!isSignedIn && (
                    <div className="mb-8 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs border border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">
                                <FaLock />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">
                                    Sign in required to view & download question papers
                                </h4>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Create a free account or sign in to unlock instant PDF previews and direct downloads.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openSignIn?.()}
                            className="shrink-0 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-lg text-xs transition cursor-pointer shadow-xs"
                        >
                            Sign In / Register →
                        </button>
                    </div>
                )}

                {/* RESULTS HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {filteredPapers.length} Question Paper{filteredPapers.length === 1 ? "" : "s"} Found
                        </span>
                        {debouncedSearch && (
                            <span className="text-xs text-slate-500">
                                for &ldquo;<span className="font-semibold text-slate-800 dark:text-slate-200">{debouncedSearch}</span>&rdquo;
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span>Show:</span>
                        {[12, 24, 48].map((size) => (
                            <button
                                key={size}
                                onClick={() => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                                    pageSize === size
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* EMPTY RESULTS */}
                {!loading && !error && filteredPapers.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs max-w-md mx-auto my-8">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center mx-auto text-xl mb-3">
                            <FaBookOpen />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Papers Found</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                            No question papers match your selected filters. Try clearing your search or upload a paper.
                        </p>
                        <div className="flex items-center justify-center gap-2.5">
                            <button
                                onClick={clearAllFilters}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                                Clear Filters
                            </button>
                            <Link
                                to="/upload"
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                            >
                                Upload Paper →
                            </Link>
                        </div>
                    </div>
                )}

                {/* GRID VIEW */}
                {!loading && !error && filteredPapers.length > 0 && viewMode === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {paginatedPapers.map((paper) => (
                            <div
                                key={paper._id}
                                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
                            >
                                <div>
                                    {/* Badges */}
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

                                    {/* Title */}
                                    <h3
                                        title={paper.title}
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer line-clamp-2 leading-snug mb-1"
                                    >
                                        {paper.title || "Untitled Question Paper"}
                                    </h3>

                                    {/* Metadata */}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        {paper.semester ? `Semester ${paper.semester}` : ""}
                                        {paper.branch ? ` • ${paper.branch}` : ""}
                                    </p>

                                    {/* Thumbnail Preview Box */}
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
                                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        id={`view-btn-${paper._id}`}
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                                    >
                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                        {isSignedIn ? "Preview" : "Sign In"}
                                    </button>

                                    <button
                                        id={`download-btn-${paper._id}`}
                                        onClick={(e) => handleDownload(paper, e)}
                                        disabled={downloadingId === paper._id}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition disabled:opacity-60 cursor-pointer shadow-xs"
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

                                    <button
                                        onClick={(e) => handleShare(paper, e)}
                                        title="Copy Share Link"
                                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition cursor-pointer"
                                    >
                                        {copiedId === paper._id ? (
                                            <FaCheck className="text-emerald-600 text-xs" />
                                        ) : (
                                            <FaShareAlt className="text-xs" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* LIST VIEW */}
                {!loading && !error && filteredPapers.length > 0 && viewMode === "list" && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="py-3 px-4">Subject / Title</th>
                                        <th className="py-3 px-4">Course</th>
                                        <th className="py-3 px-4">Semester</th>
                                        <th className="py-3 px-4">Exam Type</th>
                                        <th className="py-3 px-4">Year</th>
                                        <th className="py-3 px-4">Branch</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                    {paginatedPapers.map((paper) => (
                                        <tr key={paper._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <FaFilePdf className="text-red-500 shrink-0" />
                                                    <span
                                                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-1 max-w-xs"
                                                        onClick={(e) => handlePreview(paper, e)}
                                                    >
                                                        {paper.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                {paper.course || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {paper.semester ? `Sem ${paper.semester}` : "-"}
                                            </td>
                                            <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-300">
                                                {paper.examType || "-"}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                {paper.year || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {paper.branch || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => handlePreview(paper, e)}
                                                        className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md transition"
                                                        title="Preview Paper"
                                                    >
                                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDownload(paper, e)}
                                                        disabled={downloadingId === paper._id}
                                                        className="p-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md transition"
                                                        title="Download PDF"
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
                                                        className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-md transition"
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

                {/* PAGINATION */}
                {!loading && !error && filteredPapers.length > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-slate-500 font-medium">
                            Showing {(currentPage - 1) * pageSize + 1} to{" "}
                            {Math.min(currentPage * pageSize, filteredPapers.length)} of {filteredPapers.length} papers
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold disabled:opacity-40"
                            >
                                <FaChevronLeft className="text-[10px]" /> Prev
                            </button>
                            <span className="px-2 font-bold text-slate-900 dark:text-white">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold disabled:opacity-40"
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
