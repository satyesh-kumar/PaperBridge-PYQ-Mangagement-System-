import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
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
    FaBookmark,
    FaRegBookmark,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import PDFViewer from "../components/PDFViewer";
import { downloadPDF } from "../utils/downloadHelper";
import { toggleBookmark, isBookmarked } from "../utils/bookmarkHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EXAM_TYPES = [
    { label: "All Exams", value: "" },
    { label: "End Semester", value: "End Semester" },
    { label: "Mid Semester", value: "Mid Semester" },
    { label: "Mid Term 1", value: "Mid Term 1" },
    { label: "Mid Term 2", value: "Mid Term 2" },
    { label: "Back Paper", value: "Back Paper" },
    { label: "Internal", value: "Internal" },
    { label: "Practical", value: "Practical" },
];

const getExamBadgeStyle = (examType = "") => {
    const lower = (examType || "").toLowerCase();
    if (lower.includes("mid1") || lower.includes("mid 1") || lower.includes("mid-1")) {
        return "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60";
    }
    if (lower.includes("mid2") || lower.includes("mid 2") || lower.includes("mid-2")) {
        return "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/60";
    }
    if (lower.includes("sem") || lower.includes("final") || lower.includes("end")) {
        return "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60";
    }
    if (lower.includes("make") || lower.includes("sup") || lower.includes("back")) {
        return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60";
    }
    return "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60";
};

const getCourseBadgeStyle = (course = "") => {
    const lower = (course || "").toLowerCase();
    if (lower.includes("b.tech") || lower.includes("btech") || lower.includes("cse")) {
        return "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60";
    }
    if (lower.includes("mca")) {
        return "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60";
    }
    if (lower.includes("mba")) {
        return "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60";
    }
    if (lower.includes("bca")) {
        return "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60";
    }
    if (lower.includes("bba")) {
        return "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60";
    }
    return "bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#C2B3A0] border-[#EAE2D8] dark:border-[#2E2822]";
};

const formatCourseBadge = (courseStr = "") => {
    if (!courseStr) return "General";
    const map = {
        "B.Tech Computer Science": "B.Tech CSE",
        "B.Tech Computer Science and Engineering": "B.Tech CSE",
        "Bachelor of Computer Applications": "BCA",
        "Master of Computer Applications": "MCA",
        "Master of Business Administration": "MBA",
        "Bachelor of Business Administration": "BBA",
        "Diploma in Computer Science": "Diploma CS",
        "Diploma in Engineering": "Diploma",
    };
    if (map[courseStr]) return map[courseStr];
    return courseStr
        .replace(/Computer Science and Engineering/gi, "CSE")
        .replace(/Computer Science/gi, "CS")
        .replace(/Information Technology/gi, "IT")
        .replace(/Electronics & Communication/gi, "ECE")
        .replace(/Mechanical Engineering/gi, "ME")
        .replace(/Civil Engineering/gi, "CE")
        .replace(/Bachelor of /gi, "B.")
        .replace(/Master of /gi, "M.");
};

const FALLBACK_UNIVERSITIES = [
    { _id: "uni_uu", name: "United University", code: "UU", location: "Prayagraj, UP" },
    { _id: "uni_au", name: "University of Allahabad", code: "AU", location: "Prayagraj, UP" },
    { _id: "uni_aktu", name: "Dr. A.P.J. Abdul Kalam Technical University", code: "AKTU", location: "Lucknow, UP" },
    { _id: "uni_du", name: "University of Delhi", code: "DU", location: "New Delhi" },
];

const FALLBACK_COURSES = [
    { _id: "course_btech", name: "B.Tech", code: "B.Tech", numberOfSemesters: 8 },
    { _id: "course_bca", name: "BCA", code: "BCA", numberOfSemesters: 6 },
    { _id: "course_mca", name: "MCA", code: "MCA", numberOfSemesters: 4 },
    { _id: "course_mba", name: "MBA", code: "MBA", numberOfSemesters: 4 },
    { _id: "course_bba", name: "BBA", code: "BBA", numberOfSemesters: 6 },
    { _id: "course_diploma", name: "Diploma", code: "Diploma", numberOfSemesters: 6 },
];

function BrowsePYQ() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();

    const [searchParams, setSearchParams] = useSearchParams();
    const searchInputRef = useRef(null);

    const [papers, setPapers] = useState([]);
    const [universities, setUniversities] = useState(FALLBACK_UNIVERSITIES);
    const [courses, setCourses] = useState(FALLBACK_COURSES);
    const [semesters, setSemesters] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // Filters state
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
    const [universityFilter, setUniversityFilter] = useState(searchParams.get("university") || "All");
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

    // Load universities & courses
    useEffect(() => {
        const loadAcademicEntities = async () => {
            try {
                const [uniRes, courseRes] = await Promise.all([
                    axios.get(`${API_URL}/api/universities`, { timeout: 30000 }).catch(() => ({ data: [] })),
                    axios.get(`${API_URL}/api/courses`, { timeout: 30000 }).catch(() => ({ data: [] })),
                ]);
                if (Array.isArray(uniRes.data) && uniRes.data.length > 0) {
                    setUniversities(uniRes.data);
                }
                if (Array.isArray(courseRes.data) && courseRes.data.length > 0) {
                    setCourses(courseRes.data);
                }
            } catch {
                // keep fallback
            }
        };
        loadAcademicEntities();
    }, []);

    // Fetch dynamic semesters when course changes
    useEffect(() => {
        if (courseFilter === "All") {
            setSemesters([]);
            return;
        }
        const matchedCourse = courses.find(
            (c) => c.name?.toLowerCase() === courseFilter.toLowerCase() || c.code?.toLowerCase() === courseFilter.toLowerCase()
        );
        if (matchedCourse) {
            axios
                .get(`${API_URL}/api/semesters?courseId=${matchedCourse._id}`, { timeout: 30000 })
                .then((res) => setSemesters(res.data || []))
                .catch(() => setSemesters([]));
        } else {
            setSemesters([]);
        }
    }, [courseFilter, courses]);

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

    // Sync state when URL searchParams change
    useEffect(() => {
        const qParam = searchParams.get("q") || "";
        if (qParam !== search) {
            setSearch(qParam);
            setDebouncedSearch(qParam);
        }
        const uniParam = searchParams.get("university") || "All";
        if (uniParam !== universityFilter) setUniversityFilter(uniParam);
        const courseParam = searchParams.get("course") || "All";
        if (courseParam !== courseFilter) setCourseFilter(courseParam);
        const examParam = searchParams.get("exam") || "";
        if (examParam !== examFilter) setExamFilter(examParam);
        const semParam = searchParams.get("semester") || "";
        if (semParam !== semesterFilter) setSemesterFilter(semParam);
        const yrParam = searchParams.get("year") || "";
        if (yrParam !== yearFilter) setYearFilter(yrParam);
        const brParam = searchParams.get("branch") || "";
        if (brParam !== branchFilter) setBranchFilter(brParam);
    }, [searchParams]);

    // Synchronize URL parameters when filters change
    useEffect(() => {
        const params = {};
        if (debouncedSearch) params.q = debouncedSearch;
        if (universityFilter !== "All") params.university = universityFilter;
        if (courseFilter !== "All") params.course = courseFilter;
        if (examFilter) params.exam = examFilter;
        if (semesterFilter) params.semester = semesterFilter;
        if (yearFilter) params.year = yearFilter;
        if (branchFilter) params.branch = branchFilter;

        // Check if params actually changed before updating to prevent infinite loop
        const currentQ = searchParams.get("q") || "";
        const currentUni = searchParams.get("university") || "All";
        const currentCourse = searchParams.get("course") || "All";
        const currentExam = searchParams.get("exam") || "";
        const currentSem = searchParams.get("semester") || "";
        const currentYr = searchParams.get("year") || "";
        const currentBr = searchParams.get("branch") || "";

        if (
            (debouncedSearch || "") !== currentQ ||
            universityFilter !== currentUni ||
            courseFilter !== currentCourse ||
            (examFilter || "") !== currentExam ||
            (semesterFilter || "") !== currentSem ||
            (yearFilter || "") !== currentYr ||
            (branchFilter || "") !== currentBr
        ) {
            setSearchParams(params, { replace: true });
        }
    }, [debouncedSearch, universityFilter, courseFilter, examFilter, semesterFilter, yearFilter, branchFilter, searchParams, setSearchParams]);

    // Fetch papers from API
    const fetchPapers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/pyqs`, { timeout: 30000 });
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
        const list = ["All"];
        courses.forEach((c) => {
            if (!list.includes(c.name)) list.push(c.name);
        });
        // also include any legacy courses from papers
        papers.forEach((p) => {
            if (p.course && !list.includes(p.course)) list.push(p.course);
        });
        return list;
    }, [courses, papers]);

    const availableYears = useMemo(() => {
        const years = new Set(papers.map((p) => p.academicYear || String(p.year)).filter(Boolean));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
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
                const course = (p.courseId?.name || p.course || "").toLowerCase();
                const subject = (p.subjectId?.name || p.subject || "").toLowerCase();
                const subjectCode = (p.subjectId?.code || p.subjectCode || "").toLowerCase();
                const uni = (p.universityId?.name || p.university || "").toLowerCase();
                const branch = (p.branch || "").toLowerCase();
                const year = String(p.academicYear || p.year || "");
                const exam = (p.examType || "").toLowerCase();
                return (
                    title.includes(query) ||
                    course.includes(query) ||
                    subject.includes(query) ||
                    subjectCode.includes(query) ||
                    uni.includes(query) ||
                    branch.includes(query) ||
                    year.includes(query) ||
                    exam.includes(query)
                );
            });
        }

        if (universityFilter !== "All") {
            result = result.filter((p) => {
                const uName = (p.universityId?.name || p.university || "").toLowerCase();
                const uCode = (p.universityId?.code || "").toLowerCase();
                return uName.includes(universityFilter.toLowerCase()) || uCode === universityFilter.toLowerCase();
            });
        }

        if (courseFilter !== "All") {
            result = result.filter((p) => {
                const cName = (p.courseId?.name || p.course || "").toLowerCase();
                const cCode = (p.courseId?.code || "").toLowerCase();
                return cName.includes(courseFilter.toLowerCase()) || cCode === courseFilter.toLowerCase();
            });
        }
        if (examFilter) {
            result = result.filter((p) => (p.examType || "").toLowerCase().includes(examFilter.toLowerCase()));
        }
        if (semesterFilter) {
            result = result.filter((p) => String(p.semester) === String(semesterFilter));
        }
        if (yearFilter) {
            result = result.filter((p) => String(p.academicYear || p.year).includes(yearFilter));
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
        await downloadPDF(paper.fileUrl, `${paper.title || "paper"}_${paper.course || ""}`);
        setDownloadingId(null);
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
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            {/* HEADER HERO */}
            <header className="bg-white dark:bg-[#161412] border-b border-[#EAE2D8] dark:border-[#2E2822] py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#2E2822] text-[#8C6239] dark:text-[#E5C378] text-xs font-semibold mb-2 shadow-2xs">
                            <FaBookOpen className="text-[#8C6239] dark:text-[#E5C378]" />
                            Academic PYQ Archive
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#1A1614] dark:text-[#FAF8F5] tracking-tight">
                            Browse Question Papers
                        </h1>
                        <p className="text-[#8C7862] dark:text-[#A8957E] text-xs sm:text-sm mt-1 max-w-2xl">
                            Search, filter, preview, and download semester, mid-term, and makeup exam papers across United University departments.
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-[#FAF8F5] dark:bg-[#1C1916] rounded-2xl border border-[#EAE2D8] dark:border-[#2E2822] px-4 py-2.5 text-center">
                            <span className="block text-xl font-serif font-bold text-[#4A2E1B] dark:text-[#E5C378] leading-none">
                                {papers.length}
                            </span>
                            <span className="text-[10px] font-semibold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                Total Papers
                            </span>
                        </div>
                        <div className="bg-[#FAF8F5] dark:bg-[#1C1916] rounded-2xl border border-[#EAE2D8] dark:border-[#2E2822] px-4 py-2.5 text-center">
                            <span className="block text-xl font-serif font-bold text-[#8C6239] dark:text-[#C5A059] leading-none">
                                {availableCourses.length > 1 ? availableCourses.length - 1 : 0}
                            </span>
                            <span className="text-[10px] font-semibold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                Courses
                            </span>
                        </div>
                        <Link
                            to="/upload"
                            className="hidden sm:inline-flex items-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] px-5 py-2.5 rounded-full text-xs font-bold shadow-xs transition"
                        >
                            + Upload Paper
                        </Link>
                    </div>
                </div>
            </header>
            {/* MAIN CONTENT AREA */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* SEARCH & FILTERS CARD */}
                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-sm mb-8">
                    {/* Top Row: Search Input + Sort + View Mode */}
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <div className="flex items-center bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full px-4 py-2.5 focus-within:border-[#8C6239] dark:focus-within:border-[#C5A059] transition">
                                <FaSearch className="text-[#A8957E] mr-2.5 text-xs shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    id="paper-search-input"
                                    placeholder="Search by paper title, code, course, year, or branch... (Press '/' to focus)"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent outline-none text-[#1A1614] dark:text-[#FAF8F5] text-xs placeholder:text-[#A8957E] font-medium"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="text-[#A8957E] hover:text-[#4A2E1B] dark:hover:text-white p-1 transition cursor-pointer"
                                        title="Clear search"
                                    >
                                        <FaTimes className="text-xs" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Mobile Filter Drawer Trigger */}
                            <button
                                type="button"
                                onClick={() => setIsMobileFilterOpen(true)}
                                className="md:hidden px-3.5 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-[#4A3E31] dark:text-[#EAE2D8] rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer min-h-[38px]"
                            >
                                <span>Filters</span>
                                {activeFiltersCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-[#8C6239] dark:bg-[#C5A059] text-white text-[9px] flex items-center justify-center font-bold">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>

                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full px-3.5 py-2 text-xs font-semibold text-[#4A3E31] dark:text-[#EAE2D8] min-h-[38px]">
                                <FaSortAmountDown className="text-[#8C6239] dark:text-[#E5C378]" />
                                <span className="text-[#8C7862] dark:text-[#A8957E] hidden sm:inline">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent outline-none cursor-pointer font-semibold text-[#4A3E31] dark:text-[#EAE2D8]"
                                >
                                    <option value="newest" className="dark:bg-[#161412]">Newest Added</option>
                                    <option value="oldest" className="dark:bg-[#161412]">Oldest Added</option>
                                    <option value="year-desc" className="dark:bg-[#161412]">Exam Year (Recent)</option>
                                    <option value="year-asc" className="dark:bg-[#161412]">Exam Year (Oldest)</option>
                                    <option value="title-az" className="dark:bg-[#161412]">Title (A to Z)</option>
                                </select>
                            </div>

                            {/* View Switcher: Grid / List */}
                            <div className="flex items-center bg-[#F4EFEA] dark:bg-[#1C1916] p-1 rounded-full border border-[#EAE2D8] dark:border-[#2E2822] min-h-[38px]">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded-full transition cursor-pointer ${
                                        viewMode === "grid"
                                            ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                                            : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                    }`}
                                    title="Grid View"
                                >
                                    <FaThLarge className="text-xs" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-2 rounded-full transition cursor-pointer ${
                                        viewMode === "list"
                                            ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                                            : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                    }`}
                                    title="List View"
                                >
                                    <FaList className="text-xs" />
                                </button>
                            </div>

                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-full text-xs font-semibold transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800 min-h-[38px]"
                                >
                                    <FaTimes className="text-[10px]" /> Clear ({activeFiltersCount})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop Filters Grid (Hidden on Mobile) */}
                    <div className="hidden md:grid mt-4 pt-4 border-t border-[#EAE2D8] dark:border-[#2E2822] grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                University
                            </label>
                            <select
                                value={universityFilter}
                                onChange={(e) => {
                                    setUniversityFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none focus:border-[#8C6239] transition"
                            >
                                <option value="All" className="dark:bg-[#161412]">All Universities</option>
                                {universities.map((u) => (
                                    <option key={u._id} value={u.name} className="dark:bg-[#161412]">
                                        {u.name} ({u.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                Course / Program
                            </label>
                            <select
                                value={courseFilter}
                                onChange={(e) => {
                                    setCourseFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none focus:border-[#8C6239] transition"
                            >
                                <option value="All" className="dark:bg-[#161412]">All Courses</option>
                                {availableCourses.filter((c) => c !== "All").map((c) => (
                                    <option key={c} value={c} className="dark:bg-[#161412]">
                                        {formatCourseBadge(c)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                Semester {semesters.length > 0 ? `(${semesters.length} sems)` : ""}
                            </label>
                            <select
                                value={semesterFilter}
                                onChange={(e) => {
                                    setSemesterFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none focus:border-[#8C6239] transition"
                            >
                                <option value="" className="dark:bg-[#161412]">All Semesters</option>
                                {semesters.length > 0 ? (
                                    semesters.map((s) => (
                                        <option key={s._id} value={String(s.number)} className="dark:bg-[#161412]">
                                            {s.name}
                                        </option>
                                    ))
                                ) : (
                                    [1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                        <option key={s} value={String(s)} className="dark:bg-[#161412]">
                                            Semester {s}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                Exam Type
                            </label>
                            <select
                                value={examFilter}
                                onChange={(e) => {
                                    setExamFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none focus:border-[#8C6239] transition"
                            >
                                {EXAM_TYPES.map((t) => (
                                    <option key={t.value} value={t.value} className="dark:bg-[#161412]">
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                Exam Year
                            </label>
                            <select
                                value={yearFilter}
                                onChange={(e) => {
                                    setYearFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none focus:border-[#8C6239] transition"
                            >
                                <option value="" className="dark:bg-[#161412]">All Years</option>
                                {availableYears.map((yr) => (
                                    <option key={yr} value={yr} className="dark:bg-[#161412]">
                                        {yr}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Mobile Slide-Over Filter Drawer Modal */}
                {isMobileFilterOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex justify-end">
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
                            onClick={() => setIsMobileFilterOpen(false)}
                        />
                        <div className="relative w-4/5 max-w-xs bg-white dark:bg-[#161412] h-full shadow-2xl border-l border-[#EAE2D8] dark:border-[#2E2822] flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200 z-10">
                            <div className="flex items-center justify-between pb-4 border-b border-[#EAE2D8] dark:border-[#2E2822] mb-6">
                                <h3 className="font-serif text-base font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                                    Filter Papers
                                </h3>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="p-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C7862] hover:text-[#0D1B2A] cursor-pointer"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1.5">
                                        University
                                    </label>
                                    <select
                                        value={universityFilter}
                                        onChange={(e) => {
                                            setUniversityFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2.5 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none"
                                    >
                                        <option value="All">All Universities</option>
                                        {universities.map((u) => (
                                            <option key={u._id} value={u.name}>
                                                {u.name} ({u.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1.5">
                                        Course / Program
                                    </label>
                                    <select
                                        value={courseFilter}
                                        onChange={(e) => {
                                            setCourseFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2.5 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none"
                                    >
                                        <option value="All">All Courses</option>
                                        {availableCourses.filter((c) => c !== "All").map((c) => (
                                            <option key={c} value={c}>
                                                {formatCourseBadge(c)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1.5">
                                        Semester
                                    </label>
                                    <select
                                        value={semesterFilter}
                                        onChange={(e) => {
                                            setSemesterFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2.5 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none"
                                    >
                                        <option value="">All Semesters</option>
                                        {semesters.length > 0 ? (
                                            semesters.map((s) => (
                                                <option key={s._id} value={String(s.number)}>
                                                    {s.name}
                                                </option>
                                            ))
                                        ) : (
                                            [1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                                <option key={s} value={String(s)}>
                                                    Semester {s}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1.5">
                                        Exam Type
                                    </label>
                                    <select
                                        value={examFilter}
                                        onChange={(e) => {
                                            setExamFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2.5 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none"
                                    >
                                        {EXAM_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1.5">
                                        Exam Year
                                    </label>
                                    <select
                                        value={yearFilter}
                                        onChange={(e) => {
                                            setYearFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2.5 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none"
                                    >
                                        <option value="">All Years</option>
                                        {availableYears.map((yr) => (
                                            <option key={yr} value={yr}>
                                                {yr}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[#EAE2D8] dark:border-[#2E2822] space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-full py-3 rounded-2xl bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] text-xs font-bold transition min-h-[44px]"
                                >
                                    Apply Filters ({filteredPapers.length} Results)
                                </button>
                                {activeFiltersCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            clearAllFilters();
                                            setIsMobileFilterOpen(false);
                                        }}
                                        className="w-full py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold transition"
                                    >
                                        Reset All Filters
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* GUEST ACCESS NOTIFICATION BANNER */}
                {!isSignedIn && (
                    <div className="mb-8 p-5 rounded-3xl bg-gradient-to-r from-[#2B1B10] via-[#4A2E1B] to-[#2B1B10] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-[#8C6239]/40">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 text-[#E5C378] flex items-center justify-center text-base shrink-0 border border-white/10">
                                <FaLock />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">
                                    Sign in required to view & download question papers
                                </h4>
                                <p className="text-xs text-stone-300 mt-0.5">
                                    Create a free student account or sign in to unlock instant PDF previews and direct downloads.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openSignIn?.()}
                            className="shrink-0 px-5 py-2.5 bg-[#C5A059] hover:bg-[#E5C378] text-[#0F0E0D] font-bold rounded-full text-xs transition cursor-pointer shadow-md"
                        >
                            Sign In / Register Now ↗
                        </button>
                    </div>
                )}

                {/* RESULTS HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                            {filteredPapers.length} Question Paper{filteredPapers.length === 1 ? "" : "s"} Found
                        </span>
                        {debouncedSearch && (
                            <span className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                for &ldquo;<span className="font-semibold text-[#8C6239] dark:text-[#E5C378]">{debouncedSearch}</span>&rdquo;
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#8C7862] dark:text-[#A8957E] font-medium">
                        <span>Show:</span>
                        {[12, 24, 48].map((size) => (
                            <button
                                key={size}
                                onClick={() => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                                    pageSize === size
                                        ? "bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0F0E0D] font-bold"
                                        : "bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#4A3E31] dark:text-[#FAF8F5] hover:bg-[#FAF8F5]"
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* EMPTY RESULTS */}
                {!loading && !error && filteredPapers.length === 0 && (
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-12 text-center shadow-xs max-w-md mx-auto my-8">
                        <div className="w-12 h-12 bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] rounded-2xl flex items-center justify-center mx-auto text-xl mb-3">
                            <FaBookOpen />
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">No Papers Found</h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-5">
                            No question papers match your selected filters. Try clearing your search or upload a paper.
                        </p>
                        <div className="flex items-center justify-center gap-2.5">
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2 bg-[#F4EFEA] hover:bg-[#EAE2D8] dark:bg-[#24201C] dark:hover:bg-[#2E2822] text-[#4A3E31] dark:text-[#FAF8F5] rounded-full text-xs font-semibold transition cursor-pointer"
                            >
                                Clear Filters
                            </button>
                            <Link
                                to="/upload"
                                className="px-5 py-2 bg-[#4A2E1B] dark:bg-[#C5A059] dark:text-[#0F0E0D] text-white rounded-full text-xs font-bold shadow-xs transition"
                            >
                                Upload Paper ↗
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
                                className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] dark:hover:border-[#C5A059] p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                            <span 
                                                title={paper.course}
                                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border truncate max-w-[130px] inline-block shrink-0 ${getCourseBadgeStyle(paper.course)}`}
                                            >
                                                {formatCourseBadge(paper.course || "General")}
                                            </span>

                                            {paper.examType && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize whitespace-nowrap shrink-0 ${getExamBadgeStyle(paper.examType)}`}>
                                                    {paper.examType}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {(paper.academicYear || paper.year) && (
                                                <span className="text-[10px] font-bold font-mono text-[#8C7862] dark:text-[#A8957E] bg-[#FAF8F5] dark:bg-[#1C1916] px-2 py-0.5 rounded-md border border-[#EAE2D8] dark:border-[#2E2822] whitespace-nowrap">
                                                    {paper.academicYear || paper.year}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const saved = toggleBookmark(paper);
                                                    if (saved) toast.success("Saved to My Library ⭐");
                                                    else toast("Removed from bookmarks");
                                                }}
                                                className="w-7 h-7 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] hover:scale-110 transition cursor-pointer border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center shrink-0"
                                                title={isBookmarked(paper._id) ? "Remove Bookmark" : "Save Paper"}
                                            >
                                                {isBookmarked(paper._id) ? (
                                                    <FaBookmark className="text-amber-500 text-[10px]" />
                                                ) : (
                                                    <FaRegBookmark className="text-[10px]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3
                                        title={paper.title}
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="text-sm font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] group-hover:text-[#8C6239] dark:group-hover:text-[#E5C378] transition cursor-pointer line-clamp-2 leading-snug mb-1 min-h-[2.5rem]"
                                    >
                                        {paper.title || "Untitled Question Paper"}
                                    </h3>

                                    {/* Metadata */}
                                    <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-3.5 font-medium truncate">
                                        {paper.university || "University Vault"} • {paper.semester ? `Sem ${paper.semester}` : "All Sems"}
                                        {paper.branch ? ` • ${paper.branch}` : ""}
                                    </p>

                                    {/* Thumbnail Preview Box */}
                                    <div
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="rounded-2xl border border-[#EAE2D8] dark:border-[#2E2822] bg-[#FAF8F5] dark:bg-[#1C1916] p-3 mb-4 cursor-pointer hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] transition flex items-center justify-center gap-2 group/prev shadow-2xs"
                                    >
                                        <FaFilePdf className="text-red-500 text-base group-hover/prev:scale-110 transition-transform" />
                                        <span className="text-xs font-semibold text-[#6B5B49] dark:text-[#C2B3A0]">
                                            {!isSignedIn ? "Sign in to preview" : "Click to preview"}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                    <button
                                        id={`view-btn-${paper._id}`}
                                        onClick={(e) => handlePreview(paper, e)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
                                    >
                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" />}
                                        <span>{isSignedIn ? "Preview" : "Sign In"}</span>
                                    </button>

                                    <button
                                        id={`download-btn-${paper._id}`}
                                        onClick={(e) => handleDownload(paper, e)}
                                        disabled={downloadingId === paper._id}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] rounded-full text-xs font-bold transition disabled:opacity-60 cursor-pointer shadow-xs"
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
                                        className="p-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#8C7862] dark:text-[#A8957E] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs transition cursor-pointer"
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
                    <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="py-4 px-5">Paper Title</th>
                                        <th className="py-4 px-5">Course</th>
                                        <th className="py-4 px-5">Semester</th>
                                        <th className="py-4 px-5">Exam Type</th>
                                        <th className="py-4 px-5">Year</th>
                                        <th className="py-4 px-5">Branch</th>
                                        <th className="py-4 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822] font-medium text-[#4A3E31] dark:text-[#EAE2D8]">
                                    {paginatedPapers.map((paper) => (
                                        <tr key={paper._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition-colors">
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-3">
                                                    <FaFilePdf className="text-red-500 shrink-0 text-sm" />
                                                    <span
                                                        className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] hover:text-[#8C6239] dark:hover:text-[#E5C378] cursor-pointer line-clamp-1 max-w-xs"
                                                        onClick={(e) => handlePreview(paper, e)}
                                                    >
                                                        {paper.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${getCourseBadgeStyle(paper.course)}`}>
                                                    {paper.course || "-"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-[#8C7862] dark:text-[#A8957E]">
                                                {paper.semester ? `Sem ${paper.semester}` : "-"}
                                            </td>
                                            <td className="py-4 px-5 capitalize">
                                                {paper.examType ? (
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getExamBadgeStyle(paper.examType)}`}>
                                                        {paper.examType}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="py-4 px-5 font-semibold text-[#1A1614] dark:text-[#FAF8F5]">
                                                {paper.year || "-"}
                                            </td>
                                            <td className="py-4 px-5 text-[#8C7862] dark:text-[#A8957E]">
                                                {paper.branch || "-"}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => handlePreview(paper, e)}
                                                        className="p-2 bg-[#F4EFEA] dark:bg-[#24201C] hover:bg-[#EAE2D8] text-[#8C6239] dark:text-[#E5C378] rounded-full transition cursor-pointer"
                                                        title="Preview Paper"
                                                    >
                                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDownload(paper, e)}
                                                        disabled={downloadingId === paper._id}
                                                        className="p-2 bg-[#4A2E1B] dark:bg-[#C5A059] hover:bg-[#331F12] text-white dark:text-[#0F0E0D] rounded-full transition cursor-pointer"
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
                                                        className="p-2 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] text-[#8C7862] rounded-full transition cursor-pointer border border-[#EAE2D8] dark:border-[#2E2822]"
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

                {/* Standard Clean Pagination */}
                {!loading && !error && filteredPapers.length > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#EAE2D8] dark:border-[#2E2822] text-xs">
                        <span className="text-[#8C7862] dark:text-[#A8957E] font-medium">
                            Showing {(currentPage - 1) * pageSize + 1} to{" "}
                            {Math.min(currentPage * pageSize, filteredPapers.length)} of {filteredPapers.length} papers
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setCurrentPage((p) => Math.max(1, p - 1));
                                    window.scrollTo({ top: 380, behavior: "smooth" });
                                }}
                                disabled={currentPage === 1}
                                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#2B231B] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                                <FaChevronLeft className="text-[10px]" /> Prev
                            </button>
                            <span className="px-3 py-1 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] font-bold text-xs">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => {
                                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                                    window.scrollTo({ top: 380, behavior: "smooth" });
                                }}
                                disabled={currentPage === totalPages}
                                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#2B231B] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                                Next <FaChevronRight className="text-[10px]" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <Footer />

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
