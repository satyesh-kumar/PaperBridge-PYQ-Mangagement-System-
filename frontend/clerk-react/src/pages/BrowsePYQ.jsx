import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import {
    FaFilePdf,
    FaEye,
    FaDownload,
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
    FaLock,
    FaBookmark,
    FaRegBookmark,
    FaFilter,
    FaUniversity,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import PDFViewer from "../components/PDFViewer";
import { downloadPDF } from "../utils/downloadHelper";
import { toggleBookmark, isBookmarked } from "../utils/bookmarkHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EXAM_TYPES = [
    { label: "All Exam Types", value: "" },
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
    const [subjects, setSubjects] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [savedIds, setSavedIds] = useState([]);

    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // Hierarchical Filters state
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
    const [universityFilter, setUniversityFilter] = useState(searchParams.get("university") || "All");
    const [courseFilter, setCourseFilter] = useState(searchParams.get("course") || "All");
    const [semesterFilter, setSemesterFilter] = useState(searchParams.get("semester") || "");
    const [subjectFilter, setSubjectFilter] = useState(searchParams.get("subject") || "All");
    const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");
    const [examFilter, setExamFilter] = useState(searchParams.get("exam") || "");
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState("grid");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // Sync saved bookmarks
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

    // Load universities, courses, subjects from backend
    useEffect(() => {
        const loadAcademicEntities = async () => {
            try {
                const [uniRes, courseRes, subRes] = await Promise.allSettled([
                    axios.get(`${API_URL}/api/universities`, { timeout: 15000 }),
                    axios.get(`${API_URL}/api/courses`, { timeout: 15000 }),
                    axios.get(`${API_URL}/api/subjects`, { timeout: 15000 }),
                ]);
                if (uniRes.status === "fulfilled" && Array.isArray(uniRes.value.data) && uniRes.value.data.length > 0) {
                    setUniversities(uniRes.value.data);
                }
                if (courseRes.status === "fulfilled" && Array.isArray(courseRes.value.data) && courseRes.value.data.length > 0) {
                    setCourses(courseRes.value.data);
                }
                if (subRes.status === "fulfilled" && Array.isArray(subRes.value.data)) {
                    setSubjects(subRes.value.data);
                }
            } catch {
                // keep fallbacks
            }
        };
        loadAcademicEntities();
    }, []);

    // Fetch papers from API
    const fetchPapers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/pyqs`, { timeout: 20000 });
            if (Array.isArray(res.data)) {
                setPapers(res.data);
            } else {
                setPapers([]);
            }
        } catch (err) {
            console.error("BrowsePYQ fetch error:", err);
            setError("Something went wrong while loading question papers.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPapers();
    }, [fetchPapers]);

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
        const examParam = searchParams.get("exam") || "";
        if (examParam !== examFilter) setExamFilter(examParam);
        const semParam = searchParams.get("semester") || "";
        if (semParam !== semesterFilter) setSemesterFilter(semParam);
        const subParam = searchParams.get("subject") || "All";
        if (subParam !== subjectFilter) setSubjectFilter(subParam);
        const yrParam = searchParams.get("year") || "";
        if (yrParam !== yearFilter) setYearFilter(yrParam);
    }, [searchParams]);

    // Synchronize URL parameters when filters change
    useEffect(() => {
        const params = {};
        if (debouncedSearch) params.q = debouncedSearch;
        if (universityFilter !== "All") params.university = universityFilter;
        if (courseFilter !== "All") params.course = courseFilter;
        if (semesterFilter) params.semester = semesterFilter;
        if (subjectFilter !== "All") params.subject = subjectFilter;
        if (yearFilter) params.year = yearFilter;
        if (examFilter) params.exam = examFilter;

        const currentQ = searchParams.get("q") || "";
        const currentUni = searchParams.get("university") || "All";
        const currentCourse = searchParams.get("course") || "All";
        const currentSem = searchParams.get("semester") || "";
        const currentSub = searchParams.get("subject") || "All";
        const currentYr = searchParams.get("year") || "";
        const currentExam = searchParams.get("exam") || "";

        if (
            (debouncedSearch || "") !== currentQ ||
            universityFilter !== currentUni ||
            courseFilter !== currentCourse ||
            (semesterFilter || "") !== currentSem ||
            subjectFilter !== currentSub ||
            (yearFilter || "") !== currentYr ||
            (examFilter || "") !== currentExam
        ) {
            setSearchParams(params, { replace: true });
        }
    }, [debouncedSearch, universityFilter, courseFilter, semesterFilter, subjectFilter, yearFilter, examFilter, searchParams, setSearchParams]);

    // ── HIERARCHICAL FILTER CASCADES ─────────────────────────────────────────

    // 1. Available Universities
    const availableUniversities = useMemo(() => {
        const list = [{ label: "All Universities", value: "All" }];
        universities.forEach((u) => {
            if (!list.some((item) => item.value === u.name || item.value === u.code)) {
                list.push({ label: u.name, value: u.name, id: u._id, code: u.code });
            }
        });
        return list;
    }, [universities]);

    // 2. Available Courses (Filtered by University if selected)
    const availableCourses = useMemo(() => {
        const list = [{ label: "All Courses", value: "All" }];
        let filteredCoursesList = courses;

        if (universityFilter !== "All") {
            const selectedUni = universities.find(
                (u) => u.name?.toLowerCase() === universityFilter.toLowerCase() || u.code?.toLowerCase() === universityFilter.toLowerCase()
            );
            if (selectedUni) {
                filteredCoursesList = courses.filter(
                    (c) => String(c.universityId?._id || c.universityId) === String(selectedUni._id)
                );
            }
        }

        filteredCoursesList.forEach((c) => {
            if (!list.some((item) => item.value === c.name || item.value === c.code)) {
                list.push({ label: c.name, value: c.name, id: c._id, code: c.code, numberOfSemesters: c.numberOfSemesters || 8 });
            }
        });

        // Also include courses from papers for backward compatibility
        papers.forEach((p) => {
            const name = p.courseId?.name || p.course;
            if (name && !list.some((item) => item.value === name)) {
                list.push({ label: name, value: name, numberOfSemesters: 8 });
            }
        });

        return list;
    }, [courses, universityFilter, universities, papers]);

    // 3. Available Semesters (Filtered by selected Course)
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

    // 4. Available Subjects (Filtered by Course & Semester)
    const availableSubjects = useMemo(() => {
        const list = [{ label: "All Subjects", value: "All" }];
        const subSet = new Set();

        subjects.forEach((s) => {
            const cMatch = courseFilter === "All" || s.courseId?.name === courseFilter || s.courseId === courseFilter;
            const sMatch = !semesterFilter || String(s.semesterNumber) === String(semesterFilter);
            if (cMatch && sMatch && s.name && !subSet.has(s.name)) {
                subSet.add(s.name);
                list.push({ label: `${s.name}${s.code ? ` (${s.code})` : ""}`, value: s.name });
            }
        });

        // Also add unique subjects from papers
        papers.forEach((p) => {
            const cMatch = courseFilter === "All" || (p.courseId?.name || p.course) === courseFilter;
            const sMatch = !semesterFilter || String(p.semester) === String(semesterFilter);
            const subName = p.subjectId?.name || p.subject;
            if (cMatch && sMatch && subName && !subSet.has(subName)) {
                subSet.add(subName);
                list.push({ label: subName, value: subName });
            }
        });

        return list;
    }, [subjects, papers, courseFilter, semesterFilter]);

    // 5. Available Academic Years
    const availableYears = useMemo(() => {
        const years = new Set(papers.map((p) => p.academicYear || (p.year ? String(p.year) : null)).filter(Boolean));
        if (years.size === 0) {
            ["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"].forEach((y) => years.add(y));
        }
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [papers]);

    // ── CASCADE RESETS ON UPSTREAM CHANGES ───────────────────────────────────
    const handleUniversityChange = (val) => {
        setUniversityFilter(val);
        setCourseFilter("All");
        setSemesterFilter("");
        setSubjectFilter("All");
        setCurrentPage(1);
    };

    const handleCourseChange = (val) => {
        setCourseFilter(val);
        setSemesterFilter("");
        setSubjectFilter("All");
        setCurrentPage(1);
    };

    const handleSemesterChange = (val) => {
        setSemesterFilter(val);
        setSubjectFilter("All");
        setCurrentPage(1);
    };

    // ── MULTI-FIELD FILTER & SEARCH LOGIC ────────────────────────────────────
    const filteredPapers = useMemo(() => {
        let result = [...papers];

        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase().trim();
            result = result.filter((p) => {
                const title = (p.title || "").toLowerCase();
                const course = (p.courseId?.name || p.course || "").toLowerCase();
                const courseCode = (p.courseId?.code || "").toLowerCase();
                const subject = (p.subjectId?.name || p.subject || "").toLowerCase();
                const subjectCode = (p.subjectId?.code || p.subjectCode || "").toLowerCase();
                const uni = (p.universityId?.name || p.university || "").toLowerCase();
                const branch = (p.branch || "").toLowerCase();
                const year = String(p.academicYear || p.year || "").toLowerCase();
                const exam = (p.examType || "").toLowerCase();
                const sem = `sem ${p.semester || 1}`;

                return (
                    title.includes(query) ||
                    course.includes(query) ||
                    courseCode.includes(query) ||
                    subject.includes(query) ||
                    subjectCode.includes(query) ||
                    uni.includes(query) ||
                    branch.includes(query) ||
                    year.includes(query) ||
                    exam.includes(query) ||
                    sem.includes(query)
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

        if (semesterFilter) {
            result = result.filter((p) => String(p.semester) === String(semesterFilter));
        }

        if (subjectFilter !== "All") {
            result = result.filter((p) => {
                const sName = (p.subjectId?.name || p.subject || "").toLowerCase();
                const sCode = (p.subjectId?.code || p.subjectCode || "").toLowerCase();
                return sName.includes(subjectFilter.toLowerCase()) || sCode.includes(subjectFilter.toLowerCase());
            });
        }

        if (yearFilter) {
            result = result.filter((p) => String(p.academicYear || p.year).includes(yearFilter));
        }

        if (examFilter) {
            result = result.filter((p) => (p.examType || "").toLowerCase().includes(examFilter.toLowerCase()));
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
    }, [papers, debouncedSearch, universityFilter, courseFilter, semesterFilter, subjectFilter, yearFilter, examFilter, sortBy]);

    // Active filters count
    const activeFiltersCount =
        (debouncedSearch ? 1 : 0) +
        (universityFilter !== "All" ? 1 : 0) +
        (courseFilter !== "All" ? 1 : 0) +
        (semesterFilter ? 1 : 0) +
        (subjectFilter !== "All" ? 1 : 0) +
        (yearFilter ? 1 : 0) +
        (examFilter ? 1 : 0);

    // Clear all filters
    const clearAllFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setUniversityFilter("All");
        setCourseFilter("All");
        setSemesterFilter("");
        setSubjectFilter("All");
        setYearFilter("");
        setExamFilter("");
        setCurrentPage(1);
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredPapers.length / pageSize) || 1;
    const paginatedPapers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPapers.slice(start, start + pageSize);
    }, [filteredPapers, currentPage, pageSize]);

    // Actions
    const handleBookmark = (paper, e) => {
        e?.stopPropagation();
        const saved = toggleBookmark(paper);
        if (saved) {
            toast.success("Saved to your Bookmarks ⭐");
        } else {
            toast("Removed from Bookmarks");
        }
    };

    const handlePreview = (paper, e) => {
        e?.stopPropagation();
        if (!isSignedIn) {
            toast.error("Please sign in to view and preview question papers.", { icon: "🔒" });
            openSignIn?.();
            return;
        }
        setSelectedPdf({
            fileUrl: paper.fileUrl,
            title: `${paper.title} (${formatCourseBadge(paper.courseId?.name || paper.course)})`,
        });
    };

    const handleDownload = async (paper, e) => {
        e?.stopPropagation();
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
        await downloadPDF(paper.fileUrl, `${paper.title || "question_paper"}.pdf`);
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
                                University Exam Vault
                            </span>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] tracking-tight mt-0.5">
                                Browse Question Papers
                            </h1>
                            <p className="text-xs sm:text-sm text-[#8C7862] dark:text-[#A8957E] mt-1">
                                Search past semester examination papers by university, course, semester, and year.
                            </p>
                        </div>

                        {/* Search & Actions Bar */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {/* Live Search Input */}
                            <div className="relative flex-1 md:w-72 sm:w-80">
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8C6239] dark:text-[#E5C378] pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search title, subject, code, year..."
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

                            {/* Mobile Filter Toggle Button */}
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

                    {/* Desktop Hierarchical Cascading Filter Row (University → Course → Semester → Subject → Year → Exam Type) */}
                    <div className="hidden lg:grid grid-cols-6 gap-3 pt-5">
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
                            <label className="block text-[10px] font-bold text-[#8C6239] dark:text-[#A8957E] uppercase tracking-wider mb-1">
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
                            <label className="block text-[10px] font-bold text-[#8C6239] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                3. Semester
                            </label>
                            <select
                                value={semesterFilter}
                                onChange={(e) => handleSemesterChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                {availableSemesters.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 4. Subject Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C6239] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                4. Subject
                            </label>
                            <select
                                value={subjectFilter}
                                onChange={(e) => {
                                    setSubjectFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                {availableSubjects.map((sub) => (
                                    <option key={sub.value} value={sub.value}>
                                        {sub.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 5. Year Filter */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C6239] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                5. Academic Year
                            </label>
                            <select
                                value={yearFilter}
                                onChange={(e) => {
                                    setYearFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                <option value="">All Years</option>
                                {availableYears.map((yr) => (
                                    <option key={yr} value={yr}>
                                        {yr}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 6. Exam Type */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8C6239] dark:text-[#A8957E] uppercase tracking-wider mb-1">
                                6. Exam Type
                            </label>
                            <select
                                value={examFilter}
                                onChange={(e) => {
                                    setExamFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] cursor-pointer min-h-[38px]"
                            >
                                {EXAM_TYPES.map((ex) => (
                                    <option key={ex.value} value={ex.value}>
                                        {ex.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Active Filter Tags & Quick Reset */}
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
                                    <button type="button" onClick={() => handleSemesterChange("")} className="hover:text-rose-500 cursor-pointer">×</button>
                                </span>
                            )}
                            {subjectFilter !== "All" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#EAE2D8] border border-[#DDD2C4] dark:border-[#2E2822] text-[11px]">
                                    Subject: {subjectFilter}
                                    <button type="button" onClick={() => setSubjectFilter("All")} className="hover:text-rose-500 cursor-pointer">×</button>
                                </span>
                            )}
                            {yearFilter && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#EAE2D8] border border-[#DDD2C4] dark:border-[#2E2822] text-[11px]">
                                    Year: {yearFilter}
                                    <button type="button" onClick={() => setYearFilter("")} className="hover:text-rose-500 cursor-pointer">×</button>
                                </span>
                            )}
                            {examFilter && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#EAE2D8] border border-[#DDD2C4] dark:border-[#2E2822] text-[11px]">
                                    Exam: {examFilter}
                                    <button type="button" onClick={() => setExamFilter("")} className="hover:text-rose-500 cursor-pointer">×</button>
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

                {/* Sub-header: Results Count, Sort & View Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 px-1">
                    <p className="text-xs sm:text-sm font-medium text-[#8C7862] dark:text-[#A8957E]">
                        Showing <strong className="text-[#1A1614] dark:text-[#FAF8F5]">{filteredPapers.length}</strong> question papers
                    </p>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        {/* Sort selector */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#161412] px-3 py-1.5 rounded-xl border border-[#EAE2D8] dark:border-[#2E2822] text-xs">
                            <FaSortAmountDown className="text-[#8C6239] dark:text-[#E5C378] text-[11px]" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent border-none outline-hidden text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="year-desc">Year: High to Low</option>
                                <option value="year-asc">Year: Low to High</option>
                                <option value="title-az">Title: A to Z</option>
                            </select>
                        </div>

                        {/* View Switcher */}
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
                                aria-label="Grid View"
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
                                aria-label="List View"
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
                            Unable to Load Question Papers
                        </h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-5">{error}</p>
                        <button
                            type="button"
                            onClick={fetchPapers}
                            className="inline-flex items-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                            <FaRedo className="text-xs" /> Try Again
                        </button>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading && !error && filteredPapers.length === 0 && (
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-10 sm:p-14 text-center shadow-xs max-w-lg mx-auto my-8">
                        <div className="w-14 h-14 bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4 border border-[#EAE2D8] dark:border-[#2E2822]">
                            <FaFilePdf />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                            No question papers found
                        </h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-6 max-w-sm mx-auto leading-relaxed">
                            Try changing your search query or relaxing your filters to see more previous year examination papers.
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
                                + Upload Paper
                            </Link>
                        </div>
                    </div>
                )}

                {/* PAPERS LIST / GRID */}
                {!loading && !error && filteredPapers.length > 0 && (
                    <>
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                                {paginatedPapers.map((paper) => {
                                    const isSaved = savedIds.includes(paper._id);
                                    return (
                                        <div
                                            key={paper._id}
                                            className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] dark:hover:border-[#C5A059] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                                        >
                                            <div>
                                                {/* Card Header Badges */}
                                                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
                                                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                                        <span
                                                            title={paper.courseId?.name || paper.course}
                                                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border truncate max-w-[120px] inline-block shrink-0 ${getCourseBadgeStyle(paper.courseId?.name || paper.course)}`}
                                                        >
                                                            {formatCourseBadge(paper.courseId?.code || paper.courseId?.name || paper.course || "General")}
                                                        </span>
                                                        {paper.examType && (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize whitespace-nowrap shrink-0 ${getExamBadgeStyle(paper.examType)}`}>
                                                                {paper.examType}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                        {(paper.academicYear || paper.year) && (
                                                            <span className="text-[10px] font-bold font-mono text-[#8C7862] dark:text-[#A8957E] bg-[#FAF8F5] dark:bg-[#1C1916] px-2 py-0.5 rounded-md border border-[#EAE2D8] dark:border-[#2E2822] whitespace-nowrap">
                                                                {paper.academicYear || paper.year}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleBookmark(paper, e)}
                                                            className="w-7 h-7 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] hover:scale-110 transition cursor-pointer border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center shrink-0 min-h-[28px] min-w-[28px]"
                                                            title={isSaved ? "Remove Bookmark" : "Save Paper"}
                                                            aria-label="Bookmark"
                                                        >
                                                            {isSaved ? <FaBookmark className="text-amber-500 text-[10px]" /> : <FaRegBookmark className="text-[10px]" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Title & Subject Info */}
                                                <h3 className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] text-sm sm:text-base line-clamp-2 mb-1.5 group-hover:text-[#8C6239] dark:group-hover:text-[#E5C378] transition-colors break-words">
                                                    {paper.title}
                                                </h3>

                                                <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mb-4 line-clamp-1">
                                                    {paper.universityId?.name || paper.university} • Sem {paper.semester || 1}{paper.subjectCode ? ` • ${paper.subjectCode}` : ""}
                                                </p>
                                            </div>

                                            {/* Card Action Buttons */}
                                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handlePreview(paper, e)}
                                                    className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2.5 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[40px]"
                                                >
                                                    <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" />
                                                    <span>Preview</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={downloadingId === paper._id}
                                                    onClick={(e) => handleDownload(paper, e)}
                                                    className="flex items-center justify-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] py-2.5 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[40px] disabled:opacity-50"
                                                >
                                                    {downloadingId === paper._id ? (
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
                            /* List View */
                            <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] divide-y divide-[#EAE2D8] dark:divide-[#2E2822] overflow-hidden shadow-xs">
                                {paginatedPapers.map((paper) => {
                                    const isSaved = savedIds.includes(paper._id);
                                    return (
                                        <div
                                            key={paper._id}
                                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition"
                                        >
                                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 text-base">
                                                    <FaFilePdf />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCourseBadgeStyle(paper.courseId?.name || paper.course)}`}>
                                                            {formatCourseBadge(paper.courseId?.code || paper.courseId?.name || paper.course)}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-[#8C7862] dark:text-[#A8957E]">
                                                            Sem {paper.semester || 1} • {paper.academicYear || paper.year}
                                                        </span>
                                                        {paper.examType && (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${getExamBadgeStyle(paper.examType)}`}>
                                                                {paper.examType}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-serif font-bold text-sm text-[#1A1614] dark:text-[#FAF8F5] truncate">
                                                        {paper.title}
                                                    </h3>
                                                    <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] truncate">
                                                        {paper.universityId?.name || paper.university}{paper.subjectCode ? ` • ${paper.subjectCode}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleBookmark(paper, e)}
                                                    className="w-9 h-9 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] hover:scale-110 transition cursor-pointer border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center shrink-0 min-h-[38px] min-w-[38px]"
                                                    title={isSaved ? "Remove Bookmark" : "Save Paper"}
                                                    aria-label="Bookmark"
                                                >
                                                    {isSaved ? <FaBookmark className="text-amber-500" /> : <FaRegBookmark />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handlePreview(paper, e)}
                                                    className="px-3.5 py-2 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] text-xs font-semibold transition cursor-pointer min-h-[38px] flex items-center gap-1.5"
                                                >
                                                    <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" />
                                                    <span>Preview</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={downloadingId === paper._id}
                                                    onClick={(e) => handleDownload(paper, e)}
                                                    className="px-4 py-2 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] text-xs font-semibold transition cursor-pointer min-h-[38px] flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {downloadingId === paper._id ? <FaSpinner className="animate-spin text-xs" /> : <FaDownload className="text-xs" />}
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
                            {/* University */}
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

                            {/* Course */}
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

                            {/* Semester */}
                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    Semester
                                </label>
                                <select
                                    value={semesterFilter}
                                    onChange={(e) => handleSemesterChange(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    {availableSemesters.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    Subject
                                </label>
                                <select
                                    value={subjectFilter}
                                    onChange={(e) => {
                                        setSubjectFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    {availableSubjects.map((sub) => (
                                        <option key={sub.value} value={sub.value}>
                                            {sub.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Academic Year */}
                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    Academic Year
                                </label>
                                <select
                                    value={yearFilter}
                                    onChange={(e) => {
                                        setYearFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    <option value="">All Years</option>
                                    {availableYears.map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Exam Type */}
                            <div>
                                <label className="block text-[11px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase mb-1.5">
                                    Exam Type
                                </label>
                                <select
                                    value={examFilter}
                                    onChange={(e) => {
                                        setExamFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold"
                                >
                                    {EXAM_TYPES.map((ex) => (
                                        <option key={ex.value} value={ex.value}>
                                            {ex.label}
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
                                Apply Filters ({filteredPapers.length} papers)
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

export default BrowsePYQ;
