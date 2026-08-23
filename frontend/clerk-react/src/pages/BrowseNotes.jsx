import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import {
    FaSearch,
    FaUniversity,
    FaEye,
    FaDownload,
    FaShareAlt,
    FaTimes,
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
import Footer from "../components/Footer";
import PDFViewer from "../components/PDFViewer";
import { downloadPDF } from "../utils/downloadHelper";

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

function BrowseNotes() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();
    const [searchParams, setSearchParams] = useSearchParams();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [courseFilter, setCourseFilter] = useState(searchParams.get("course") || "All");
    const [unitFilter, setUnitFilter] = useState(searchParams.get("unit") || "All");
    const [semesterFilter, setSemesterFilter] = useState(searchParams.get("semester") || "");
    const [universityFilter, setUniversityFilter] = useState(searchParams.get("university") || "All");
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
        const unitParam = searchParams.get("unit") || "All";
        if (unitParam !== unitFilter) setUnitFilter(unitParam);
        const semParam = searchParams.get("semester") || "";
        if (semParam !== semesterFilter) setSemesterFilter(semParam);
    }, [searchParams]);

    // Synchronize URL parameters when filters change
    useEffect(() => {
        const params = {};
        if (debouncedSearch) params.q = debouncedSearch;
        if (universityFilter !== "All") params.university = universityFilter;
        if (courseFilter !== "All") params.course = courseFilter;
        if (unitFilter !== "All") params.unit = unitFilter;
        if (semesterFilter) params.semester = semesterFilter;

        const currentQ = searchParams.get("q") || "";
        const currentUni = searchParams.get("university") || "All";
        const currentCourse = searchParams.get("course") || "All";
        const currentUnit = searchParams.get("unit") || "All";
        const currentSem = searchParams.get("semester") || "";

        if (
            (debouncedSearch || "") !== currentQ ||
            universityFilter !== currentUni ||
            courseFilter !== currentCourse ||
            unitFilter !== currentUnit ||
            (semesterFilter || "") !== currentSem
        ) {
            setSearchParams(params, { replace: true });
        }
    }, [debouncedSearch, universityFilter, courseFilter, unitFilter, semesterFilter, searchParams, setSearchParams]);

    // Academic entities for dynamic filters
    const [universities, setUniversities] = useState(FALLBACK_UNIVERSITIES);
    const [courses, setCourses] = useState(FALLBACK_COURSES);
    const [semesters, setSemesters] = useState([]);

    // Load universities & courses
    useEffect(() => {
        const loadEntities = async () => {
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
        loadEntities();
    }, []);

    // When course changes, load its configured semesters
    useEffect(() => {
        if (courseFilter === "All") {
            setSemesters([]);
            return;
        }
        const matched = courses.find((c) => c.name?.toLowerCase() === courseFilter.toLowerCase());
        if (matched) {
            axios
                .get(`${API_URL}/api/semesters?courseId=${matched._id}`, { timeout: 30000 })
                .then((res) => setSemesters(res.data || []))
                .catch(() => setSemesters([]));
        } else {
            setSemesters([]);
        }
    }, [courseFilter, courses]);

    // Fetch notes from backend
    const fetchNotes = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/notes`, { timeout: 30000 });
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

    // Dynamic Filter Lists
    const availableCourses = useMemo(() => {
        const list = ["All"];
        courses.forEach((c) => {
            if (!list.includes(c.name)) list.push(c.name);
        });
        notes.forEach((n) => {
            if (n.course && !list.includes(n.course)) list.push(n.course);
        });
        return list;
    }, [courses, notes]);

    const availableUniversities = useMemo(() => {
        const list = ["All"];
        universities.forEach((u) => {
            if (!list.includes(u.name)) list.push(u.name);
        });
        notes.forEach((n) => {
            if (n.university && !list.includes(n.university)) list.push(n.university);
        });
        return list;
    }, [universities, notes]);

    // Filter and Sort Notes
    const filteredNotes = useMemo(() => {
        let result = [...notes];

        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase().trim();
            result = result.filter((n) => {
                const title = (n.title || "").toLowerCase();
                const subject = (n.subjectId?.name || n.subject || "").toLowerCase();
                const author = (n.author || "").toLowerCase();
                const course = (n.courseId?.name || n.course || "").toLowerCase();
                const uni = (n.universityId?.name || n.university || "").toLowerCase();
                return (
                    title.includes(query) ||
                    subject.includes(query) ||
                    author.includes(query) ||
                    course.includes(query) ||
                    uni.includes(query)
                );
            });
        }

        if (universityFilter !== "All") {
            result = result.filter((n) => {
                const uni = (n.universityId?.name || n.university || "").toLowerCase();
                return uni.includes(universityFilter.toLowerCase());
            });
        }
        if (courseFilter !== "All") {
            result = result.filter((n) => {
                const c = (n.courseId?.name || n.course || "").toLowerCase();
                return c.includes(courseFilter.toLowerCase());
            });
        }
        if (unitFilter !== "All") {
            result = result.filter((n) => (n.unit || "").toLowerCase() === unitFilter.toLowerCase());
        }
        if (semesterFilter) {
            result = result.filter((n) => String(n.semester) === String(semesterFilter));
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
            toast.error("Please sign in to preview notes.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        setSelectedPdf({ fileUrl: note.fileUrl, title: note.title });
    };

    // Auth-Protected Download
    const handleDownload = async (note, e) => {
        e?.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to download full PDF notes.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        if (!note.fileUrl) {
            toast.error("Note file link is missing.");
            return;
        }

        setDownloadingId(note._id);
        await downloadPDF(note.fileUrl, `${note.title || "notes"}_${note.subject || ""}`);
        setDownloadingId(null);
    };

    // Share link
    const handleShare = async (note, e) => {
        e?.stopPropagation();
        navigator.clipboard.writeText(window.location.href);
        setCopiedId(note._id);
        toast.success("Notes link copied to clipboard!");
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
                            <FaStickyNote className="text-[#8C6239] dark:text-[#E5C378]" />
                            Academic Notes & Study Vault
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#1A1614] dark:text-[#FAF8F5] tracking-tight">
                            Browse Study Notes & Materials
                        </h1>
                        <p className="text-[#8C7862] dark:text-[#A8957E] text-xs sm:text-sm mt-1 max-w-2xl">
                            Find unit-wise handwritten summaries, professor lecture slides, and formula cheat sheets across United University courses.
                        </p>
                    </div>

                    {/* Stats Banner */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-[#FAF8F5] dark:bg-[#1C1916] rounded-2xl border border-[#EAE2D8] dark:border-[#2E2822] px-4 py-2.5 text-center">
                            <span className="block text-xl font-serif font-bold text-[#8C6239] dark:text-[#E5C378] leading-none">
                                {notes.length}
                            </span>
                            <span className="text-[10px] font-semibold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                Total Notes
                            </span>
                        </div>
                        <div className="bg-[#FAF8F5] dark:bg-[#1C1916] rounded-2xl border border-[#EAE2D8] dark:border-[#2E2822] px-4 py-2.5 text-center">
                            <span className="block text-xl font-serif font-bold text-[#4A2E1B] dark:text-[#C5A059] leading-none">
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
                            + Upload Notes
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
                                    placeholder="Search notes by title, unit, course, author (press '/' to focus)..."
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
                                    <option value="title-az" className="dark:bg-[#161412]">Title (A to Z)</option>
                                </select>
                            </div>

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

                    {/* Secondary Filters (Hidden on Mobile) */}
                    <div className="hidden md:grid mt-4 pt-4 border-t border-[#EAE2D8] dark:border-[#2E2822] grid-cols-2 sm:grid-cols-4 gap-3">
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
                                Unit / Module
                            </label>
                            <select
                                value={unitFilter}
                                onChange={(e) => {
                                    setUnitFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none focus:border-[#8C6239] transition"
                            >
                                {UNITS.map((u) => (
                                    <option key={u.value} value={u.value} className="dark:bg-[#161412]">
                                        {u.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                Semester
                            </label>
                            <select
                                value={semesterFilter}
                                onChange={(e) => {
                                    setSemesterFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none focus:border-[#8C6239] transition"
                            >
                                {SEMESTERS.map((s) => (
                                    <option key={s.value} value={s.value} className="dark:bg-[#161412]">
                                        {s.label}
                                    </option>
                                ))}
                            </select>
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
                                        Filter Study Notes
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
                                            Unit / Module
                                        </label>
                                        <select
                                            value={unitFilter}
                                            onChange={(e) => {
                                                setUnitFilter(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2.5 text-xs text-[#4A3E31] dark:text-[#FAF8F5] font-medium outline-none"
                                        >
                                            {UNITS.map((u) => (
                                                <option key={u.value} value={u.value}>
                                                    {u.label}
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
                                            {SEMESTERS.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
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
                                        Apply Filters ({filteredNotes.length} Results)
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
                </div>

                {/* GUEST ACCESS BANNER */}
                {!isSignedIn && (
                    <div className="mb-8 p-5 rounded-3xl bg-gradient-to-r from-[#2B1B10] via-[#4A2E1B] to-[#2B1B10] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-[#8C6239]/40">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 text-[#E5C378] flex items-center justify-center text-base shrink-0 border border-white/10">
                                <FaLock />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">
                                    Sign in required to view & download study notes
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
                            {filteredNotes.length} Study Note{filteredNotes.length === 1 ? "" : "s"} Found
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
                {!loading && !error && filteredNotes.length === 0 && (
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-12 text-center shadow-xs max-w-md mx-auto my-8">
                        <div className="w-12 h-12 bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] rounded-2xl flex items-center justify-center mx-auto text-xl mb-3">
                            <FaStickyNote />
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">No Study Notes Found</h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-5">
                            No study notes match your criteria. Try adjusting your filters or upload the first note.
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
                                Upload Notes ↗
                            </Link>
                        </div>
                    </div>
                )}

                {/* GRID VIEW */}
                {!loading && !error && filteredNotes.length > 0 && viewMode === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {paginatedNotes.map((note) => (
                            <div
                                key={note._id}
                                className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] dark:hover:border-[#C5A059] p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] border border-[#DDD2C4] dark:border-[#332E28] shrink-0">
                                            {note.unit || "Notes"}
                                        </span>

                                        <span 
                                            title={note.course}
                                            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF8F5] dark:bg-[#1C1916] text-[#6B5B49] dark:text-[#C2B3A0] border border-[#EAE2D8] dark:border-[#2E2822] truncate max-w-[130px]"
                                        >
                                            {formatCourseBadge(note.course || "General")}
                                        </span>
                                    </div>

                                    {/* Title & Subject */}
                                    <h3
                                        onClick={(e) => handlePreview(note, e)}
                                        className="text-sm font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] group-hover:text-[#8C6239] dark:group-hover:text-[#E5C378] transition line-clamp-2 leading-snug mb-1 cursor-pointer min-h-[2.5rem]"
                                        title={note.title}
                                    >
                                        {note.title}
                                    </h3>

                                    <p className="text-xs font-semibold text-[#8C6239] dark:text-[#E5C378] mb-3 truncate">
                                        {note.subject}
                                    </p>

                                    {/* University & Professor */}
                                    <div className="space-y-1 mb-4 text-xs text-[#8C7862] dark:text-[#A8957E] font-medium">
                                        {note.university && (
                                            <p className="flex items-center gap-1.5 truncate">
                                                <FaUniversity className="text-[#8C6239] shrink-0 text-[10px]" />
                                                <span className="truncate">{note.university}</span>
                                            </p>
                                        )}
                                        {note.author && (
                                            <p className="flex items-center gap-1.5 truncate text-[#4A3E31] dark:text-[#FAF8F5]">
                                                <FaUserGraduate className="text-[#8C6239] shrink-0 text-[10px]" />
                                                <span className="truncate">By {note.author}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Thumbnail Preview Box */}
                                    <div
                                        onClick={(e) => handlePreview(note, e)}
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
                                        onClick={(e) => handlePreview(note, e)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
                                    >
                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" />}
                                        <span>{isSignedIn ? "Preview" : "Sign In"}</span>
                                    </button>

                                    <button
                                        onClick={(e) => handleDownload(note, e)}
                                        disabled={downloadingId === note._id}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] rounded-full text-xs font-bold transition disabled:opacity-60 cursor-pointer shadow-xs"
                                    >
                                        {downloadingId === note._id ? (
                                            <FaSpinner className="animate-spin text-xs" />
                                        ) : !isSignedIn ? (
                                            <FaLock className="text-[10px]" />
                                        ) : (
                                            <FaDownload className="text-xs" />
                                        )}
                                        <span>Download</span>
                                    </button>

                                    <button
                                        onClick={(e) => handleShare(note, e)}
                                        title="Share Study Notes"
                                        className="p-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] text-[#8C7862] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs transition cursor-pointer"
                                    >
                                        {copiedId === note._id ? (
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
                {!loading && !error && filteredNotes.length > 0 && viewMode === "list" && (
                    <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="py-4 px-5">Notes Title</th>
                                        <th className="py-4 px-5">Unit / Module</th>
                                        <th className="py-4 px-5">Course & Sem</th>
                                        <th className="py-4 px-5">University</th>
                                        <th className="py-4 px-5">Author</th>
                                        <th className="py-4 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822] font-medium text-[#4A3E31] dark:text-[#EAE2D8]">
                                    {paginatedNotes.map((note) => (
                                        <tr key={note._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition-colors">
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-3">
                                                    <FaStickyNote className="text-[#8C6239] dark:text-[#E5C378] shrink-0" />
                                                    <div>
                                                        <span
                                                            className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] hover:text-[#8C6239] dark:hover:text-[#E5C378] cursor-pointer line-clamp-1 max-w-xs block"
                                                            onClick={(e) => handlePreview(note, e)}
                                                        >
                                                            {note.title}
                                                        </span>
                                                        <span className="text-[11px] text-[#8C6239] dark:text-[#E5C378] font-semibold">
                                                            {note.subject}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 font-semibold text-[#1A1614] dark:text-[#FAF8F5]">
                                                {note.unit || "-"}
                                            </td>
                                            <td className="py-4 px-5">
                                                <span>{note.course || "-"}</span>
                                                <span className="text-[#8C7862] dark:text-[#A8957E] block text-[11px]">
                                                    {note.semester ? `Sem ${note.semester}` : "-"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-[#8C7862] dark:text-[#A8957E]">
                                                {note.university || "-"}
                                            </td>
                                            <td className="py-4 px-5 text-[#8C7862] dark:text-[#A8957E]">
                                                {note.author || "Student"}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => handlePreview(note, e)}
                                                        className="p-2 bg-[#F4EFEA] dark:bg-[#24201C] hover:bg-[#EAE2D8] text-[#8C6239] dark:text-[#E5C378] rounded-full transition cursor-pointer"
                                                        title="Preview Notes"
                                                    >
                                                        {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDownload(note, e)}
                                                        disabled={downloadingId === note._id}
                                                        className="p-2 bg-[#4A2E1B] dark:bg-[#C5A059] hover:bg-[#331F12] text-white dark:text-[#0F0E0D] rounded-full transition cursor-pointer"
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
                                                        className="p-2 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] text-[#8C7862] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full transition cursor-pointer"
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

                {/* Standard Clean Pagination */}
                {!loading && !error && filteredNotes.length > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#EAE2D8] dark:border-[#2E2822] text-xs">
                        <span className="text-[#8C7862] dark:text-[#A8957E] font-medium">
                            Showing {(currentPage - 1) * pageSize + 1} to{" "}
                            {Math.min(currentPage * pageSize, filteredNotes.length)} of {filteredNotes.length} notes
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

export default BrowseNotes;
