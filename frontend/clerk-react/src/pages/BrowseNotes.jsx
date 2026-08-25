import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import {
    FaSearch,
    FaUniversity,
    FaEye,
    FaDownload,
    FaTimes,
    FaFilePdf,
    FaThLarge,
    FaList,
    FaChevronLeft,
    FaChevronRight,
    FaSpinner,
    FaSortAmountDown,
    FaStickyNote,
    FaFilter,
    FaRedo,
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
    const [universities, setUniversities] = useState(FALLBACK_UNIVERSITIES);
    const [courses, setCourses] = useState(FALLBACK_COURSES);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [universityFilter, setUniversityFilter] = useState(searchParams.get("university") || "All");
    const [courseFilter, setCourseFilter] = useState(searchParams.get("course") || "All");
    const [unitFilter, setUnitFilter] = useState(searchParams.get("unit") || "All");
    const [semesterFilter, setSemesterFilter] = useState(searchParams.get("semester") || "");
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState("grid");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // PDF Preview Modal & Feedback
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [savedIds, setSavedIds] = useState([]);

    const searchInputRef = useRef(null);

    // Sync bookmarks
    useEffect(() => {
        const sync = () => {
            try {
                const b = JSON.parse(localStorage.getItem("paperbridge_bookmarks") || "[]");
                setSavedIds(b.map((x) => x._id));
            } catch {
                setSavedIds([]);
            }
        };
        sync();
        window.addEventListener("paperbridge_bookmarks_updated", sync);
        return () => window.removeEventListener("paperbridge_bookmarks_updated", sync);
    }, []);

    // Load universities & courses
    useEffect(() => {
        const loadEntities = async () => {
            try {
                const [uniRes, courseRes] = await Promise.allSettled([
                    axios.get(`${API_URL}/api/universities`, { timeout: 15000 }),
                    axios.get(`${API_URL}/api/courses`, { timeout: 15000 }),
                ]);
                if (uniRes.status === "fulfilled" && Array.isArray(uniRes.value.data) && uniRes.value.data.length > 0) {
                    setUniversities(uniRes.value.data);
                }
                if (courseRes.status === "fulfilled" && Array.isArray(courseRes.value.data) && courseRes.value.data.length > 0) {
                    setCourses(courseRes.value.data);
                }
            } catch {
                // keep fallbacks
            }
        };
        loadEntities();
    }, []);

    // Fetch notes from backend
    const fetchNotes = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/notes`, { timeout: 20000 });
            if (Array.isArray(res.data)) {
                setNotes(res.data);
            } else {
                setNotes([]);
            }
        } catch (err) {
            console.error("Notes fetch error:", err);
            setError("Something went wrong while loading study notes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

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
        }, 200);
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

    // Cascading Filter Lists
    const availableUniversities = useMemo(() => {
        const list = [{ label: "All Universities", value: "All" }];
        universities.forEach((u) => {
            if (!list.some((item) => item.value === u.name)) {
                list.push({ label: u.name, value: u.name, id: u._id });
            }
        });
        return list;
    }, [universities]);

    const availableCourses = useMemo(() => {
        const list = [{ label: "All Courses", value: "All" }];
        let filteredCoursesList = courses;

        if (universityFilter !== "All") {
            const selectedUni = universities.find((u) => u.name === universityFilter);
            if (selectedUni) {
                filteredCoursesList = courses.filter((c) => String(c.universityId?._id || c.universityId) === String(selectedUni._id));
            }
        }

        filteredCoursesList.forEach((c) => {
            if (!list.some((item) => item.value === c.name)) {
                list.push({ label: c.name, value: c.name, id: c._id, numberOfSemesters: c.numberOfSemesters || 8 });
            }
        });

        notes.forEach((n) => {
            const name = n.courseId?.name || n.course;
            if (name && !list.some((item) => item.value === name)) {
                list.push({ label: name, value: name, numberOfSemesters: 8 });
            }
        });

        return list;
    }, [courses, universityFilter, universities, notes]);

    const availableSemesters = useMemo(() => {
        const list = [{ label: "All Semesters", value: "" }];
        let maxSem = 8;
        if (courseFilter !== "All") {
            const matched = availableCourses.find((c) => c.value === courseFilter);
            if (matched && matched.numberOfSemesters) {
                maxSem = matched.numberOfSemesters;
            }
        }
        for (let i = 1; i <= maxSem; i++) {
            list.push({ label: `Semester ${i}`, value: String(i) });
        }
        return list;
    }, [courseFilter, availableCourses]);

    const handleUniversityChange = (val) => {
        setUniversityFilter(val);
        setCourseFilter("All");
        setSemesterFilter("");
        setCurrentPage(1);
    };

    const handleCourseChange = (val) => {
        setCourseFilter(val);
        setSemesterFilter("");
        setCurrentPage(1);
    };

    // Filter and Sort Notes across all fields
    const filteredNotes = useMemo(() => {
        let result = [...notes];

        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase().trim();
            result = result.filter((n) => {
                const title = (n.title || "").toLowerCase();
                const subject = (n.subjectId?.name || n.subject || "").toLowerCase();
                const subjectCode = (n.subjectCode || "").toLowerCase();
                const author = (n.author || "").toLowerCase();
                const course = (n.courseId?.name || n.course || "").toLowerCase();
                const uni = (n.universityId?.name || n.university || "").toLowerCase();
                const unit = (n.unit || "").toLowerCase();
                const branch = (n.branch || "").toLowerCase();
                const sem = `sem ${n.semester || 1}`;

                return (
                    title.includes(query) ||
                    subject.includes(query) ||
                    subjectCode.includes(query) ||
                    author.includes(query) ||
                    course.includes(query) ||
                    uni.includes(query) ||
                    unit.includes(query) ||
                    branch.includes(query) ||
                    sem.includes(query)
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

    // Active filters count
    const activeFiltersCount =
        (debouncedSearch ? 1 : 0) +
        (universityFilter !== "All" ? 1 : 0) +
        (courseFilter !== "All" ? 1 : 0) +
        (unitFilter !== "All" ? 1 : 0) +
        (semesterFilter ? 1 : 0);

    // Clear filters
    const clearAllFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setCourseFilter("All");
        setUnitFilter("All");
        setSemesterFilter("");
        setUniversityFilter("All");
        setCurrentPage(1);
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredNotes.length / pageSize) || 1;
    const paginatedNotes = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredNotes.slice(start, start + pageSize);
    }, [filteredNotes, currentPage, pageSize]);

    // Actions
    const handleBookmark = (note, e) => {
        e?.stopPropagation();
        const saved = toggleBookmark({ ...note, itemType: "note" });
        if (saved) {
            toast.success("Saved to your Bookmarks ⭐");
        } else {
            toast("Removed from Bookmarks");
        }
    };

    const handlePreview = (note, e) => {
        e?.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to preview study notes.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        setSelectedPdf({
            fileUrl: note.fileUrl,
            title: `${note.title} (${note.subject || "Study Notes"})`,
        });
    };

    const handleDownload = async (note, e) => {
        e?.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to download study notes.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        if (!note.fileUrl) {
            toast.error("Note file link is unavailable.");
            return;
        }
        setDownloadingId(note._id);
        await downloadPDF(note.fileUrl, `${note.title || "study_note"}.pdf`);
        setDownloadingId(null);
    };

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 w-full flex-1">
                {/* Top Title & Search Hero Bar */}
                <div className="bg-white dark:bg-[#161412] rounded-2xl sm:rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-4 sm:p-6 lg:p-8 shadow-xs mb-5 sm:mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                        <div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-[#8C6239] dark:text-[#E5C378] tracking-widest uppercase">
                                Academic Notes & Study Kits
                            </span>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] tracking-tight mt-0.5">
                                Study Notes & Handouts
                            </h1>
                            <p className="text-xs sm:text-sm text-[#8C7862] dark:text-[#A8957E] mt-1">
                                Download lecture summaries, unit-wise notes, and formula sheets shared by top students.
                            </p>
                        </div>

                        {/* Search & Actions Bar */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-72 sm:w-80">
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8C6239] dark:text-[#E5C378] pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search notes, subjects, units..."
                                    className="w-full pl-9 pr-8 py-2 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] placeholder-[#8C7862] font-medium focus:outline-hidden focus:border-[#8C6239] dark:focus:border-[#C5A059] shadow-2xs min-h-[40px]"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white p-1 text-xs cursor-pointer"
                                        title="Clear search"
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsMobileFilterOpen(true)}
                                className="lg:hidden px-3.5 py-2 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs min-h-[40px] cursor-pointer"
                            >
                                <FaFilter className="text-[10px] text-[#8C6239] dark:text-[#E5C378]" />
                                <span>Filters</span>
                                {activeFiltersCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0D1B2A] text-[9px] font-bold flex items-center justify-center">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Desktop Cascading Filter Row */}
                    <div className="hidden lg:grid grid-cols-4 gap-3 pt-5">
                        {/* 1. University Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                1. University
                            </label>
                            <select
                                value={universityFilter}
                                onChange={(e) => handleUniversityChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                {availableUniversities.map((u) => (
                                    <option key={u.value} value={u.value}>
                                        {u.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Course Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                2. Course
                            </label>
                            <select
                                value={courseFilter}
                                onChange={(e) => handleCourseChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                {availableCourses.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Semester Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                3. Semester
                            </label>
                            <select
                                value={semesterFilter}
                                onChange={(e) => {
                                    setSemesterFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                {availableSemesters.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 4. Unit / Material */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                4. Unit / Content
                            </label>
                            <select
                                value={unitFilter}
                                onChange={(e) => {
                                    setUnitFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                {UNITS.map((u) => (
                                    <option key={u.value} value={u.value}>
                                        {u.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Active Filter Tags */}
                    {activeFiltersCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-[#EAE2D8] dark:border-[#2E2822] text-xs">
                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase">
                                Active Filters:
                            </span>
                            {universityFilter !== "All" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#EAE2D8] border border-[#DDD2C4] dark:border-[#2E2822] text-[11px]">
                                    Uni: {universityFilter}
                                    <button type="button" onClick={() => handleUniversityChange("All")} className="hover:text-rose-500 cursor-pointer">×</button>
                                </span>
                            )}
                            {courseFilter !== "All" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#EAE2D8] border border-[#DDD2C4] dark:border-[#2E2822] text-[11px]">
                                    Course: {courseFilter}
                                    <button type="button" onClick={() => handleCourseChange("All")} className="hover:text-rose-500 cursor-pointer">×</button>
                                </span>
                            )}
                            {semesterFilter && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#EAE2D8] border border-[#DDD2C4] dark:border-[#2E2822] text-[11px]">
                                    Sem: {semesterFilter}
                                    <button type="button" onClick={() => setSemesterFilter("")} className="hover:text-rose-500 cursor-pointer">×</button>
                                </span>
                            )}
                            {unitFilter !== "All" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#EAE2D8] border border-[#DDD2C4] dark:border-[#2E2822] text-[11px]">
                                    Unit: {unitFilter}
                                    <button type="button" onClick={() => setUnitFilter("All")} className="hover:text-rose-500 cursor-pointer">×</button>
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="text-[11px] font-bold text-[#8C6239] dark:text-[#E5C378] hover:underline ml-1 cursor-pointer"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>

                {/* Sub-header: Count, Sort & View Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 px-1">
                    <p className="text-xs sm:text-sm font-medium text-[#8C7862] dark:text-[#A8957E]">
                        Showing <strong className="text-[#1A1614] dark:text-[#FAF8F5]">{filteredNotes.length}</strong> study notes
                    </p>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#161412] px-3 py-1.5 rounded-xl border border-[#EAE2D8] dark:border-[#2E2822] text-xs">
                            <FaSortAmountDown className="text-[#8C6239] dark:text-[#E5C378] text-[11px]" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent border-none outline-hidden text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="title-az">Title: A to Z</option>
                                <option value="subject-az">Subject: A to Z</option>
                            </select>
                        </div>

                        <div className="flex items-center bg-white dark:bg-[#161412] rounded-xl border border-[#EAE2D8] dark:border-[#2E2822] p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg text-xs transition cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                                    viewMode === "grid"
                                        ? "bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0D1B2A]"
                                        : "text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white"
                                }`}
                                title="Grid View"
                            >
                                <FaThLarge />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg text-xs transition cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                                    viewMode === "list"
                                        ? "bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0D1B2A]"
                                        : "text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white"
                                }`}
                                title="List View"
                            >
                                <FaList />
                            </button>
                        </div>
                    </div>
                </div>

                {/* LOADING STATE */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-[#161412] rounded-3xl p-5 border border-[#EAE2D8] dark:border-[#2E2822] shadow-xs animate-pulse flex flex-col justify-between h-64"
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="h-4 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-1/3" />
                                        <div className="h-4 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-1/4" />
                                    </div>
                                    <div className="h-4 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-1/2 mb-4" />
                                </div>
                                <div className="h-8 bg-[#EAE2D8] dark:bg-[#24201C] rounded-full" />
                            </div>
                        ))}
                    </div>
                )}

                {/* ERROR STATE */}
                {!loading && error && (
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-10 text-center shadow-xs max-w-md mx-auto my-8">
                        <h3 className="text-base font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                            Unable to Load Study Notes
                        </h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-5">{error}</p>
                        <button
                            type="button"
                            onClick={fetchNotes}
                            className="inline-flex items-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                            <FaRedo className="text-xs" /> Try Again
                        </button>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading && !error && filteredNotes.length === 0 && (
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-10 sm:p-14 text-center shadow-xs max-w-lg mx-auto my-8">
                        <div className="w-14 h-14 bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4 border border-[#EAE2D8] dark:border-[#2E2822]">
                            <FaStickyNote />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                            No study notes found
                        </h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-6 max-w-sm mx-auto leading-relaxed">
                            Try searching for different keywords or clear your active filters.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="px-5 py-2.5 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] text-xs font-bold rounded-full transition shadow-xs cursor-pointer min-h-[40px]"
                            >
                                Clear All Filters
                            </button>
                            <Link
                                to="/upload"
                                className="px-5 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] text-[#4A3E31] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] text-xs font-bold rounded-full transition shadow-2xs min-h-[40px] flex items-center"
                            >
                                + Upload Notes
                            </Link>
                        </div>
                    </div>
                )}

                {/* NOTES GRID / LIST */}
                {!loading && !error && filteredNotes.length > 0 && (
                    <>
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                                {paginatedNotes.map((note) => {
                                    const isSaved = savedIds.includes(note._id);
                                    return (
                                        <div
                                            key={note._id}
                                            className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] dark:hover:border-[#C5A059] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                                        >
                                            <div>
                                                {/* Header Badges */}
                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] border border-[#EAE2D8] dark:border-[#2E2822] truncate max-w-[130px] inline-block shrink-0">
                                                            {formatCourseBadge(note.courseId?.name || note.course || "General")}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/50 whitespace-nowrap shrink-0">
                                                            {note.unit || "Study Note"}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleBookmark(note, e)}
                                                        className="w-7 h-7 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] hover:scale-110 transition cursor-pointer border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center shrink-0"
                                                        title={isSaved ? "Remove Bookmark" : "Save Note"}
                                                        aria-label="Bookmark"
                                                    >
                                                        {isSaved ? <FaBookmark className="text-amber-500" /> : <FaRegBookmark />}
                                                    </button>
                                                </div>

                                                <h3 className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] text-sm sm:text-base line-clamp-2 mb-1.5 group-hover:text-[#8C6239] dark:group-hover:text-[#E5C378] transition-colors">
                                                    {note.title}
                                                </h3>

                                                <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mb-4 line-clamp-1">
                                                    {note.universityId?.name || note.university} • Sem {note.semester || 1}{note.author ? ` • by ${note.author}` : ""}
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handlePreview(note, e)}
                                                    className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px]"
                                                >
                                                    <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" />
                                                    <span>Preview</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={downloadingId === note._id}
                                                    onClick={(e) => handleDownload(note, e)}
                                                    className="flex items-center justify-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px] disabled:opacity-50"
                                                >
                                                    {downloadingId === note._id ? (
                                                        <FaSpinner className="animate-spin text-xs" />
                                                    ) : (
                                                        <FaDownload className="text-xs" />
                                                    )}
                                                    <span>Download</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] divide-y divide-[#EAE2D8] dark:divide-[#2E2822] overflow-hidden shadow-xs">
                                {paginatedNotes.map((note) => {
                                    const isSaved = savedIds.includes(note._id);
                                    return (
                                        <div
                                            key={note._id}
                                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition"
                                        >
                                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 text-base">
                                                    <FaStickyNote />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] border border-[#DDD2C4] dark:border-[#2E2822]">
                                                            {formatCourseBadge(note.courseId?.name || note.course)}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-[#8C7862] dark:text-[#A8957E]">
                                                            Sem {note.semester || 1} • {note.unit || "Unit Notes"}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-serif font-bold text-sm text-[#1A1614] dark:text-[#FAF8F5] truncate">
                                                        {note.title}
                                                    </h3>
                                                    <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] truncate">
                                                        {note.universityId?.name || note.university}{note.author ? ` • by ${note.author}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleBookmark(note, e)}
                                                    className="w-9 h-9 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] hover:scale-110 transition cursor-pointer border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center shrink-0 min-h-[38px] min-w-[38px]"
                                                    title={isSaved ? "Remove Bookmark" : "Save Note"}
                                                >
                                                    {isSaved ? <FaBookmark className="text-amber-500" /> : <FaRegBookmark />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handlePreview(note, e)}
                                                    className="px-3.5 py-2 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] text-xs font-semibold transition cursor-pointer min-h-[38px] flex items-center gap-1.5"
                                                >
                                                    <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" />
                                                    <span>Preview</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={downloadingId === note._id}
                                                    onClick={(e) => handleDownload(note, e)}
                                                    className="px-4 py-2 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] text-xs font-semibold transition cursor-pointer min-h-[38px] flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {downloadingId === note._id ? <FaSpinner className="animate-spin text-xs" /> : <FaDownload className="text-xs" />}
                                                    <span>Download</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="px-4 py-2 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF8F5] transition flex items-center gap-1.5 min-h-[38px] cursor-pointer shadow-2xs"
                                >
                                    <FaChevronLeft className="text-[10px]" /> Previous
                                </button>

                                <div className="text-xs font-semibold text-[#8C7862] dark:text-[#A8957E]">
                                    Page <strong className="text-[#1A1614] dark:text-[#FAF8F5]">{currentPage}</strong> of {totalPages}
                                </div>

                                <button
                                    type="button"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="px-4 py-2 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF8F5] transition flex items-center gap-1.5 min-h-[38px] cursor-pointer shadow-2xs"
                                >
                                    Next <FaChevronRight className="text-[10px]" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ── MOBILE FILTER DRAWER OVERLAY ────────────────────────────────────── */}
            {isMobileFilterOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
                        onClick={() => setIsMobileFilterOpen(false)}
                    />
                    <div className="relative w-full max-w-xs sm:max-w-sm bg-white dark:bg-[#161412] h-full shadow-2xl border-l border-[#EAE2D8] dark:border-[#2E2822] flex flex-col p-6 overflow-y-auto z-10 animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-[#EAE2D8] dark:border-[#2E2822] mb-5">
                            <div className="flex items-center gap-2">
                                <FaFilter className="text-sm text-[#8C6239] dark:text-[#E5C378]" />
                                <h3 className="font-serif font-bold text-base text-[#1A1614] dark:text-[#FAF8F5]">
                                    Filters
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMobileFilterOpen(false)}
                                className="p-2 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center border border-[#EAE2D8] dark:border-[#2E2822]"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    University
                                </label>
                                <select
                                    value={universityFilter}
                                    onChange={(e) => handleUniversityChange(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    {availableUniversities.map((u) => (
                                        <option key={u.value} value={u.value}>
                                            {u.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    Course
                                </label>
                                <select
                                    value={courseFilter}
                                    onChange={(e) => handleCourseChange(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    {availableCourses.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    Semester
                                </label>
                                <select
                                    value={semesterFilter}
                                    onChange={(e) => {
                                        setSemesterFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    {availableSemesters.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    Unit / Content
                                </label>
                                <select
                                    value={unitFilter}
                                    onChange={(e) => {
                                        setUnitFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    {UNITS.map((u) => (
                                        <option key={u.value} value={u.value}>
                                            {u.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-[#EAE2D8] dark:border-[#2E2822] space-y-2">
                            <button
                                type="button"
                                onClick={() => setIsMobileFilterOpen(false)}
                                className="w-full py-3 rounded-2xl bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] text-xs font-bold shadow-xs transition min-h-[44px] cursor-pointer"
                            >
                                Apply Filters ({filteredNotes.length} notes)
                            </button>
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="w-full py-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862] dark:text-[#A8957E] text-xs font-semibold transition min-h-[40px] cursor-pointer"
                            >
                                Reset All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-App PDF Previewer Modal */}
            {selectedPdf && (
                <PDFViewer
                    fileUrl={selectedPdf.fileUrl}
                    title={selectedPdf.title}
                    onClose={() => setSelectedPdf(null)}
                />
            )}

            {/* FOOTER */}
            <Footer />
        </div>
    );
}

export default BrowseNotes;
