import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import {
    FaFilePdf,
    FaEye,
    FaDownload,
    FaRedo,
    FaArrowRight,
    FaCalendarAlt,
    FaGraduationCap,
    FaClock,
    FaSpinner,
    FaLock,
    FaBook,
    FaStickyNote,
    FaSearch,
    FaStar,
    FaLaptopCode,
    FaBrain,
    FaMicrochip,
    FaCogs,
    FaChartLine,
    FaBalanceScale,
    FaCapsules,
    FaSquareRootAlt,
    FaRegCheckCircle,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
import {
    HiOutlineDocumentCheck,
    HiOutlineBolt,
    HiOutlineCloudArrowUp,
    HiOutlineShieldCheck,
    HiOutlineAcademicCap,
    HiOutlineBookOpen,
    HiOutlineUsers,
} from "react-icons/hi2";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import PaperBridgeLogo from "../components/PaperBridgeLogo";
import PDFViewer from "../components/PDFViewer";
import { downloadPDF } from "../utils/downloadHelper";
import { useTheme } from "../context/ThemeContext";
import { toggleBookmark, isBookmarked } from "../utils/bookmarkHelper";
import { FaBookmark, FaRegBookmark } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COURSE_TABS = ["All", "B.Tech", "MCA", "MBA", "BCA", "BBA"];
const POPULAR_SEARCHES = ["DBMS", "OS", "CN", "DSA", "Maths"];

const DEFAULT_CATEGORIES = [
    { name: "Computer Science", icon: FaLaptopCode, color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40", query: "Computer Science" },
    { name: "Information Tech", icon: FaBrain, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40", query: "BCA" },
    { name: "Electronics (ECE)", icon: FaMicrochip, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40", query: "Electronics" },
    { name: "Mechanical Engg.", icon: FaCogs, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40", query: "Mechanical" },
    { name: "Management (MBA)", icon: FaChartLine, color: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40", query: "MBA" },
    { name: "Computer Apps (MCA)", icon: FaLaptopCode, color: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40", query: "MCA" },
    { name: "Business Admin (BBA)", icon: FaBalanceScale, color: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40", query: "BBA" },
    { name: "Mathematics & Core", icon: FaSquareRootAlt, color: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200/60 dark:border-stone-700/40", query: "Maths" },
];

const TESTIMONIALS = [
    {
        quote: "PaperBridge has streamlined our end-term exam preparation. Finding authentic previous papers and unit summaries saves hours.",
        author: "Aarav Sharma",
        role: "B.Tech CSE, 3rd Year",
        rating: 5,
    },
    {
        quote: "The unit-wise notes and verified semester question papers saved our entire study group before finals.",
        author: "Priya Patel",
        role: "MCA, 2nd Year",
        rating: 5,
    },
    {
        quote: "Direct in-app PDF previewing is fast and completely ad-free. It's the most reliable academic paper vault for college students.",
        author: "Rohan Verma",
        role: "MBA, 1st Year",
        rating: 5,
    },
];

const getExamBadgeStyle = (examType = "") => {
    const lower = (examType || "").toLowerCase();
    if (lower.includes("mid")) {
        return "bg-[#FFF9EB] dark:bg-[#2A2111] text-[#975A16] dark:text-[#F6AD55] border-[#FBD38D] dark:border-[#7B341E]/50";
    }
    if (lower.includes("sem") || lower.includes("final") || lower.includes("end")) {
        return "bg-[#FAF5FF] dark:bg-[#241734] text-[#6B46C1] dark:text-[#D6BCFA] border-[#D6BCFA] dark:border-[#553C9A]/50";
    }
    if (lower.includes("make") || lower.includes("sup") || lower.includes("back")) {
        return "bg-[#F0FFF4] dark:bg-[#12281E] text-[#276749] dark:text-[#9AE6B4] border-[#9AE6B4] dark:border-[#22543D]/50";
    }
    return "bg-[#F7FAFC] dark:bg-[#1A202C] text-[#4A5568] dark:text-[#CBD5E0] border-[#E2E8F0] dark:border-[#4A5568]/50";
};

const getCourseBadgeStyle = (course = "") => {
    const lower = (course || "").toLowerCase();
    if (lower.includes("b.tech") || lower.includes("btech") || lower.includes("cse")) {
        return "bg-[#EBF8FF] dark:bg-[#13283E] text-[#2B6CB0] dark:text-[#90CDF4] border-[#BEE3F8] dark:border-[#2C5282]/50";
    }
    if (lower.includes("mca")) {
        return "bg-[#FAF5FF] dark:bg-[#241734] text-[#6B46C1] dark:text-[#D6BCFA] border-[#E9D8FD] dark:border-[#553C9A]/50";
    }
    if (lower.includes("mba")) {
        return "bg-[#FFF5F5] dark:bg-[#34181B] text-[#C53030] dark:text-[#FEB2B2] border-[#FED7D7] dark:border-[#9B2C2C]/50";
    }
    if (lower.includes("bca")) {
        return "bg-[#E6FFFA] dark:bg-[#112E2B] text-[#2C7A7B] dark:text-[#81E6D9] border-[#B2F5EA] dark:border-[#234E52]/50";
    }
    return "bg-[#FAF8F5] dark:bg-[#1C1916] text-[#6B5B49] dark:text-[#C2B3A0] border-[#EAE2D8] dark:border-[#332E28]";
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

function Home() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();
    const { resolvedTheme } = useTheme();
    const navigate = useNavigate();

    const [papers, setPapers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [universities, setUniversities] = useState([]);
    const [notesCount, setNotesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState("All");
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [savedPaperIds, setSavedPaperIds] = useState([]);
    const [homePage, setHomePage] = useState(1);
    const homePageSize = 8;

    // Reactive bookmark sync
    useEffect(() => {
        const syncBookmarks = () => {
            try {
                const b = JSON.parse(localStorage.getItem("paperbridge_bookmarks") || "[]");
                setSavedPaperIds(b.map((x) => x._id));
            } catch {
                setSavedPaperIds([]);
            }
        };
        syncBookmarks();
        window.addEventListener("paperbridge_bookmarks_updated", syncBookmarks);
        return () => window.removeEventListener("paperbridge_bookmarks_updated", syncBookmarks);
    }, []);

    const handleBookmark = (paper, e) => {
        e.stopPropagation();
        const saved = toggleBookmark(paper);
        if (saved) {
            toast.success("Saved to My Library ⭐");
        } else {
            toast("Removed from Bookmarks");
        }
    };

    const fetchHomeData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch real database records concurrently with error fallbacks
            const [papersRes, coursesRes, unisRes, notesRes] = await Promise.allSettled([
                axios.get(`${API_URL}/api/pyqs`, { timeout: 15000 }),
                axios.get(`${API_URL}/api/courses`, { timeout: 15000 }),
                axios.get(`${API_URL}/api/universities`, { timeout: 15000 }),
                axios.get(`${API_URL}/api/notes`, { timeout: 15000 }),
            ]);

            if (papersRes.status === "fulfilled" && Array.isArray(papersRes.value.data)) {
                setPapers(papersRes.value.data);
            } else if (papersRes.status === "rejected") {
                console.error("Failed to load papers:", papersRes.reason);
                setError("Unable to load latest papers right now. Please check connection.");
            }

            if (coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value.data)) {
                setCourses(coursesRes.value.data);
            }
            if (unisRes.status === "fulfilled" && Array.isArray(unisRes.value.data)) {
                setUniversities(unisRes.value.data);
            }
            if (notesRes.status === "fulfilled" && Array.isArray(notesRes.value.data)) {
                setNotesCount(notesRes.value.data.length);
            }
        } catch (err) {
            console.error("Failed to load home data:", err);
            setError("Unable to load latest papers right now. Please check connection.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPapers = fetchHomeData;

    useEffect(() => {
        fetchHomeData();
    }, [fetchHomeData]);

    // Real dynamic course tabs
    const dynamicCourseTabs = useMemo(() => {
        const list = ["All"];
        courses.forEach((c) => {
            if (!list.includes(c.name)) list.push(c.name);
        });
        papers.forEach((p) => {
            const courseName = p.courseId?.name || p.course;
            if (courseName && !list.includes(courseName)) list.push(courseName);
        });
        return list;
    }, [courses, papers]);

    // Real dynamic popular searches derived from real papers
    const dynamicPopularSearches = useMemo(() => {
        const tags = new Set();
        papers.forEach((p) => {
            if (p.subjectId?.name) tags.add(p.subjectId.name);
            else if (p.subject) tags.add(p.subject);
            if (p.subjectId?.code) tags.add(p.subjectId.code);
            else if (p.subjectCode) tags.add(p.subjectCode);
        });
        const list = Array.from(tags).filter(Boolean);
        if (list.length >= 4) return list.slice(0, 6);
        return ["Operating Systems", "DBMS", "Computer Networks", "DSA", "B.Tech", "MCA"];
    }, [papers]);

    // Real dynamic categories with calculated paper counts from real data
    const dynamicCategories = useMemo(() => {
        return DEFAULT_CATEGORIES.map((cat) => {
            const q = cat.query.toLowerCase();
            const matchingCount = papers.filter((p) => {
                const title = (p.title || "").toLowerCase();
                const course = (p.courseId?.name || p.course || "").toLowerCase();
                const sub = (p.subjectId?.name || p.subject || "").toLowerCase();
                return title.includes(q) || course.includes(q) || sub.includes(q);
            }).length;
            return {
                ...cat,
                count: matchingCount > 0 ? `${matchingCount} Papers` : "Archive Collection",
            };
        });
    }, [papers]);

    // Filter papers by selected course tab
    const filteredPapers = useMemo(() => {
        if (selectedCourse === "All") return papers;
        return papers.filter((p) => {
            const cName = (p.courseId?.name || p.course || "").toLowerCase();
            return cName === selectedCourse.toLowerCase();
        });
    }, [papers, selectedCourse]);

    const homeTotalPages = Math.ceil(filteredPapers.length / homePageSize);
    const paginatedHomePapers = useMemo(() => {
        const start = (homePage - 1) * homePageSize;
        return filteredPapers.slice(start, start + homePageSize);
    }, [filteredPapers, homePage, homePageSize]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate("/browse");
        }
    };

    const handleTagClick = (tag) => {
        navigate(`/browse?q=${encodeURIComponent(tag)}`);
    };

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
        await downloadPDF(paper.fileUrl, `${paper.title || "question_paper"}_${paper.course || ""}`);
        setDownloadingId(null);
    };

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            {/* HERO SECTION */}
            <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    
                    {/* Left Column: Headline, Description & Search */}
                    <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
                        
                        {/* Live Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4EFEA] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] text-[#8C6239] dark:text-[#E5C378] text-xs font-semibold mb-6 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-[#8C6239] dark:bg-[#E5C378] animate-pulse" />
                            <span>University PYQ & Study Notes Vault</span>
                            <span className="text-[#DDD2C4] dark:text-[#3D3730]">·</span>
                            <span className="font-medium text-[#6B5B49] dark:text-[#C2B3A0]">Free PDF Downloads</span>
                        </div>

                        {/* Grand Editorial Headline */}
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-[#1A1614] dark:text-[#FAF8F5] leading-[1.15] mb-4 sm:mb-5">
                            Find & Download Your <br className="hidden xs:inline" />
                            <span className="text-[#8C6239] dark:text-[#E5C378] italic">
                                University Exam Papers.
                            </span>
                        </h1>

                        {/* Subtitle explaining what it does & how it helps */}
                        <p className="text-[#6B5B49] dark:text-[#C2B3A0] text-xs sm:text-sm md:text-base max-w-xl leading-relaxed mb-6 sm:mb-7 font-normal">
                            Instant access to verified previous year question papers (PYQs), unit-wise handwritten study notes, and syllabus formula sheets across B.Tech, MCA, BCA, MBA & all university courses.
                        </p>

                        {/* Luxury Pill Search Bar */}
                        <form
                            onSubmit={handleSearchSubmit}
                            className="w-full max-w-xl bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] p-1.5 rounded-2xl sm:rounded-full shadow-lg shadow-[#4A2E1B]/5 dark:shadow-black/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 transition-all focus-within:border-[#8C6239] dark:focus-within:border-[#C5A059] focus-within:ring-2 focus-within:ring-[#8C6239]/20"
                        >
                            <div className="flex items-center flex-1 min-w-0">
                                <div className="pl-3 sm:pl-4 text-[#A8957E] flex items-center justify-center shrink-0">
                                    <FaSearch className="text-xs sm:text-sm" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by course, paper title, or keyword..."
                                    className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[#1A1614] dark:text-[#FAF8F5] placeholder-[#A8957E] font-medium px-2 py-2"
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] px-5 py-2.5 rounded-xl sm:rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-sm min-h-[42px]"
                            >
                                <span>Search Papers</span>
                                <span className="text-xs">↗</span>
                            </button>
                        </form>

                        {/* Popular Searches Pills */}
                        <div className="flex flex-wrap items-center gap-2 mt-5 text-xs text-[#8C7862] dark:text-[#A8957E]">
                            <span className="font-medium mr-1">Popular Searches:</span>
                            {dynamicPopularSearches.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleTagClick(tag)}
                                    className="px-3 py-1 rounded-full bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-[#4A3E31] dark:text-[#C2B3A0] hover:border-[#8C6239] dark:hover:border-[#C5A059] hover:text-[#8C6239] dark:hover:text-[#FAF8F5] transition cursor-pointer font-medium shadow-2xs"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: University Library Exam Preparation & Study Visual */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end z-10">
                        <div className="relative w-full max-w-md aspect-[4/3] sm:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/60 dark:border-[#24201C] group">
                            <img
                                src={resolvedTheme === "dark" ? "/hero_book_arch_dark.jpg" : "/hero_book_arch.jpg"}
                                alt="PaperBridge University Students Exam Papers & Study Notes Repository"
                                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                            />
                            {/* Subtle Ambient Vignette Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                            
                            {/* Floating Academic Tag */}
                            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-white/80 dark:bg-[#161412]/85 backdrop-blur-md border border-white/40 dark:border-[#2E2822] flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-[#4A2E1B] dark:bg-[#C5A059] text-white dark:text-[#0F0E0D] flex items-center justify-center font-serif font-bold text-xs">
                                        PB
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1A1614] dark:text-[#FAF8F5] leading-tight">Academic Repository</p>
                                        <p className="text-[10px] text-[#8C7862] dark:text-[#A8957E]">Multi-University Archive</p>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-[#EAE2D8] dark:bg-[#24201C] text-[10px] font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                                    {new Date().getFullYear()} Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4-COLUMN FLOATING HIGHLIGHTS CONTAINER */}
                <div className="mt-14 sm:mt-16 bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-xl p-6 sm:p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-[#EAE2D8] dark:divide-[#2E2822]">
                        
                        {/* 1. Curated & Verified */}
                        <div className="flex items-start gap-4 pt-4 sm:pt-0 sm:pl-4 first:pl-0 first:pt-0">
                            <div className="w-11 h-11 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0 border border-[#EAE2D8] dark:border-[#332E28]">
                                <HiOutlineDocumentCheck className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                    Curated & Verified
                                </h3>
                                <p className="text-xs text-[#6B5B49] dark:text-[#A8957E] leading-relaxed">
                                    All papers are collected, verified and organized for your success.
                                </p>
                            </div>
                        </div>

                        {/* 2. Easy & Fast Access */}
                        <div className="flex items-start gap-4 pt-4 sm:pt-0 sm:pl-6">
                            <div className="w-11 h-11 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0 border border-[#EAE2D8] dark:border-[#332E28]">
                                <HiOutlineBolt className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                    Easy & Fast Access
                                </h3>
                                <p className="text-xs text-[#6B5B49] dark:text-[#A8957E] leading-relaxed">
                                    Find the papers you need in seconds, anytime anywhere.
                                </p>
                            </div>
                        </div>

                        {/* 3. Share & Contribute */}
                        <div className="flex items-start gap-4 pt-4 sm:pt-0 sm:pl-6">
                            <div className="w-11 h-11 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0 border border-[#EAE2D8] dark:border-[#332E28]">
                                <HiOutlineCloudArrowUp className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                    Share & Contribute
                                </h3>
                                <p className="text-xs text-[#6B5B49] dark:text-[#A8957E] leading-relaxed">
                                    Upload papers and help your peers to succeed together.
                                </p>
                            </div>
                        </div>

                        {/* 4. Secure & Reliable */}
                        <div className="flex items-start gap-4 pt-4 sm:pt-0 sm:pl-6">
                            <div className="w-11 h-11 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0 border border-[#EAE2D8] dark:border-[#332E28]">
                                <HiOutlineShieldCheck className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                    Secure & Reliable
                                </h3>
                                <p className="text-xs text-[#6B5B49] dark:text-[#A8957E] leading-relaxed">
                                    Your data and downloads are always safe and authentic.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* REAL DATABASE STATS COUNTER BAR */}
                <div className="mt-6 bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-md p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0">
                                <HiOutlineBookOpen className="text-xl" />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] leading-tight">
                                    {papers.length > 0 ? `${papers.length}` : "Live"}
                                </p>
                                <p className="text-xs text-[#8C7862] dark:text-[#A8957E] font-medium">Verified Question Papers</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0">
                                <HiOutlineUsers className="text-xl" />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] leading-tight">
                                    {universities.length > 0 ? `${universities.length}` : "Multi"}
                                </p>
                                <p className="text-xs text-[#8C7862] dark:text-[#A8957E] font-medium">Universities Connected</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0">
                                <HiOutlineAcademicCap className="text-xl" />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] leading-tight">
                                    {courses.length > 0 ? `${courses.length}` : "8+"}
                                </p>
                                <p className="text-xs text-[#8C7862] dark:text-[#A8957E] font-medium">Academic Programs</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center shrink-0">
                                <FaRegCheckCircle className="text-xl text-[#8C6239] dark:text-[#E5C378]" />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] leading-tight">
                                    {notesCount > 0 ? `${notesCount}` : "100%"}
                                </p>
                                <p className="text-xs text-[#8C7862] dark:text-[#A8957E] font-medium">Study Kits & Notes</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LOWER SECTION: EXPLORE BY CATEGORY & LOVED BY STUDENTS */}
                <div className="mt-12 grid lg:grid-cols-12 gap-8">
                    
                    {/* Left: Explore by Category */}
                    <div className="lg:col-span-7 bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <div>
                                    <span className="text-[11px] font-bold text-[#8C6239] dark:text-[#E5C378] tracking-[0.2em] uppercase">
                                        — EXPLORE COLLECTION
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#1A1614] dark:text-[#FAF8F5] mt-1">
                                        Explore by <span className="italic">Category</span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to="/browse"
                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#8C6239] dark:text-[#E5C378] hover:text-[#4A2E1B] dark:hover:text-white transition px-3.5 py-1.5 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822]"
                                    >
                                        <span>View All</span>
                                        <span>↗</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Category Shelf */}
                            <div
                                className="flex items-center gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-2"
                            >
                                {dynamicCategories.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.name}
                                            onClick={() => navigate(`/browse?q=${encodeURIComponent(cat.query)}`)}
                                            className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] dark:hover:border-[#C5A059] transition text-left cursor-pointer flex flex-col justify-between h-28 w-36 shrink-0 group shadow-2xs"
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border ${cat.color} group-hover:scale-105 transition-transform`}>
                                                <Icon />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-[#1A1614] dark:text-[#FAF8F5] line-clamp-1 group-hover:text-[#8C6239] dark:group-hover:text-[#E5C378] transition-colors">
                                                    {cat.name}
                                                </h4>
                                                <p className="text-[10px] text-[#8C7862] dark:text-[#A8957E]">
                                                    {cat.count}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Loved by Students Testimonial */}
                    <div className="lg:col-span-5 bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <h3 className="text-xl sm:text-2xl font-serif font-medium text-[#1A1614] dark:text-[#FAF8F5]">
                                    Loved by Students
                                </h3>
                                <Link
                                    to="/browse"
                                    className="text-xs font-bold text-[#8C6239] dark:text-[#E5C378] hover:underline flex items-center gap-1"
                                >
                                    <span>View all reviews</span>
                                    <span>↗</span>
                                </Link>
                            </div>

                            {/* Active Testimonial Card */}
                            <div className="p-6 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] relative overflow-hidden">
                                <div className="text-4xl font-serif text-[#C5A059] dark:text-[#E5C378] opacity-80 leading-none mb-3">
                                    “
                                </div>
                                <p className="text-sm font-serif italic text-[#2B231B] dark:text-[#F5F2EC] leading-relaxed mb-6">
                                    {TESTIMONIALS[activeTestimonial].quote}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                    <div>
                                        <p className="text-xs font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                                            {TESTIMONIALS[activeTestimonial].author}
                                        </p>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                                            {TESTIMONIALS[activeTestimonial].role}
                                        </p>
                                    </div>
                                    <div className="flex text-amber-500 text-xs">
                                        {[...Array(TESTIMONIALS[activeTestimonial].rating)].map((_, i) => (
                                            <FaStar key={i} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial Selectors */}
                        <div className="flex items-center justify-center gap-2 pt-4">
                            {TESTIMONIALS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveTestimonial(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                        activeTestimonial === idx
                                            ? "w-6 bg-[#4A2E1B] dark:bg-[#C5A059]"
                                            : "w-2 bg-[#DDD2C4] dark:bg-[#332E28]"
                                    }`}
                                    aria-label={`Testimonial slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                </div>
            </section>

            {/* RECENTLY ADDED PAPERS & REPOSITORY SECTION */}
            <section id="recently-added" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
                {/* Section Header Card */}
                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-6 sm:p-8 shadow-xs mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#8C6239] dark:text-[#E5C378] uppercase tracking-wider mb-1">
                                <FaClock />
                                <span>Recent Additions</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#1A1614] dark:text-[#FAF8F5] tracking-tight">
                                Latest Question Papers
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <Link
                                to="/browse"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                                <span>View all ({papers.length})</span>
                                <span>↗</span>
                            </Link>
                        </div>
                    </div>

                    {/* Course Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pt-5 no-scrollbar">
                        <span className="text-xs font-semibold text-[#8C7862] dark:text-[#A8957E] mr-2 flex items-center gap-1 shrink-0">
                            Course:
                        </span>
                        {dynamicCourseTabs.map((tab) => {
                            const active = selectedCourse === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setSelectedCourse(tab)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition shrink-0 cursor-pointer ${
                                        active
                                            ? "bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0F0E0D] shadow-xs"
                                            : "bg-[#F4EFEA] dark:bg-[#1C1916] text-[#6B5B49] dark:text-[#C2B3A0] hover:bg-[#EAE2D8] dark:hover:bg-[#24201C]"
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
                                    Create a free student account or sign in to access full PDF downloads and in-app reading.
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

                {/* LOADING SKELETON */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-[#161412] rounded-3xl p-5 border border-[#EAE2D8] dark:border-[#2E2822] shadow-xs animate-pulse flex flex-col justify-between h-72"
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="h-4 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-1/3" />
                                        <div className="h-4 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-1/4" />
                                    </div>
                                    <div className="h-4 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-[#EAE2D8] dark:bg-[#24201C] rounded w-1/2 mb-4" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-8 bg-[#EAE2D8] dark:bg-[#24201C] rounded-full flex-1" />
                                    <div className="h-8 bg-[#EAE2D8] dark:bg-[#24201C] rounded-full flex-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ERROR STATE */}
                {!loading && error && (
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-10 text-center shadow-xs max-w-md mx-auto">
                        <h3 className="text-base font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">Unable to Load Papers</h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-5">{error}</p>
                        <button
                            onClick={fetchPapers}
                            className="inline-flex items-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                            <FaRedo className="text-xs" /> Try Again
                        </button>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading && !error && filteredPapers.length === 0 && (
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-12 text-center shadow-xs max-w-md mx-auto">
                        <div className="w-12 h-12 bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] rounded-2xl flex items-center justify-center mx-auto text-xl mb-3">
                            <FaBook />
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                            {selectedCourse === "All" ? "No Papers Found" : `No ${selectedCourse} Papers Found`}
                        </h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-5">
                            Be the first to upload previous year question papers for this subject.
                        </p>
                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#4A2E1B] text-white rounded-full text-xs font-semibold shadow-xs transition"
                        >
                            + Upload Paper
                        </Link>
                    </div>
                )}

                {/* PAPERS GRID / SHELF */}
                {!loading && !error && filteredPapers.length > 0 && (
                    <>
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
                        >
                            {paginatedHomePapers.map((paper) => (
                                <div
                                    key={paper._id}
                                    className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] dark:hover:border-[#C5A059] p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                                >
                                    <div>
                                        {/* Top Badges */}
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                                <span 
                                                    title={paper.courseId?.name || paper.course}
                                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border truncate max-w-[130px] inline-block shrink-0 ${getCourseBadgeStyle(paper.courseId?.name || paper.course)}`}
                                                >
                                                    {formatCourseBadge(paper.courseId?.code || paper.courseId?.name || paper.course || "General")}
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
                                                    onClick={(e) => handleBookmark(paper, e)}
                                                    className="w-7 h-7 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] hover:scale-110 transition cursor-pointer border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center shrink-0"
                                                    title={savedPaperIds.includes(paper._id) ? "Remove Bookmark" : "Save Paper"}
                                                >
                                                    {savedPaperIds.includes(paper._id) ? (
                                                        <FaBookmark className="text-amber-500 text-[10px]" />
                                                    ) : (
                                                        <FaRegBookmark className="text-[10px]" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Paper Title */}
                                        <h3
                                            title={paper.title}
                                            onClick={(e) => handlePreview(paper, e)}
                                            className="text-sm font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] group-hover:text-[#8C6239] dark:group-hover:text-[#E5C378] transition cursor-pointer line-clamp-2 leading-snug mb-1 min-h-[2.5rem]"
                                        >
                                            {paper.title || "Untitled Question Paper"}
                                        </h3>

                                        {/* Metadata */}
                                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-3.5 font-medium truncate">
                                            {paper.universityId?.name || paper.university || "University Vault"} • {paper.semester ? `Sem ${paper.semester}` : "All Sems"}
                                            {paper.branch ? ` • ${paper.branch}` : ""}
                                        </p>

                                        {/* Quick Preview Thumbnail Box */}
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
                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                        <button
                                            onClick={(e) => handlePreview(paper, e)}
                                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-bold transition cursor-pointer shadow-2xs"
                                        >
                                            {!isSignedIn ? <FaLock className="text-[10px]" /> : <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" />}
                                            <span>{isSignedIn ? "Preview" : "Sign In"}</span>
                                        </button>

                                        <button
                                            onClick={(e) => handleDownload(paper, e)}
                                            disabled={downloadingId === paper._id}
                                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] rounded-full text-xs font-bold transition disabled:opacity-60 cursor-pointer shadow-xs"
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

                        {/* Clean Standard Pagination */}
                        {filteredPapers.length > homePageSize && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#EAE2D8] dark:border-[#2E2822] text-xs">
                                <span className="text-[#8C7862] dark:text-[#A8957E] font-medium">
                                    Showing {(homePage - 1) * homePageSize + 1} to{" "}
                                    {Math.min(homePage * homePageSize, filteredPapers.length)} of {filteredPapers.length} papers
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setHomePage((p) => Math.max(1, p - 1))}
                                        disabled={homePage === 1}
                                        className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#2B231B] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                        <FaChevronLeft className="text-[10px]" /> Prev
                                    </button>
                                    <span className="px-3 py-1 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] font-bold text-xs">
                                        Page {homePage} of {homeTotalPages}
                                    </span>
                                    <button
                                        onClick={() => setHomePage((p) => Math.min(homeTotalPages, p + 1))}
                                        disabled={homePage === homeTotalPages}
                                        className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#2B231B] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                        Next <FaChevronRight className="text-[10px]" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* THREE COLUMN VALUE PROPOSITION */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-7 shadow-xs">
                        <div className="w-10 h-10 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center font-serif font-bold mb-4">
                            01
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-2">
                            Centralized Academic Archive
                        </h3>
                        <p className="text-xs text-[#6B5B49] dark:text-[#A8957E] leading-relaxed">
                            Organized past papers and study notes categorized by course, semester, subject, and United University curriculum.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-7 shadow-xs">
                        <div className="w-10 h-10 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center font-serif font-bold mb-4">
                            02
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-2">
                            Unit-Wise Study Notes
                        </h3>
                        <p className="text-xs text-[#6B5B49] dark:text-[#A8957E] leading-relaxed">
                            Find complete syllabus notes, formula sheets, and lab manuals contributed by students and professors.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-7 shadow-xs">
                        <div className="w-10 h-10 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center font-serif font-bold mb-4">
                            03
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-2">
                            Direct Preview & Download
                        </h3>
                        <p className="text-xs text-[#6B5B49] dark:text-[#A8957E] leading-relaxed">
                            Read documents immediately in the browser or download high-quality PDFs directly to your device securely.
                        </p>
                    </div>
                </div>
            </section>

            {/* PROFESSIONAL COMPLETE FOOTER */}
            <Footer />

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