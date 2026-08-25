import React, { useEffect, useState, useCallback } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
    FaFilePdf,
    FaUpload,
    FaSearch,
    FaEye,
    FaDownload,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaStickyNote,
    FaBookmark,
    FaTrash,
    FaSyncAlt,
    FaSpinner,
} from "react-icons/fa";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import PDFViewer from "../components/PDFViewer";
import { getBookmarks, toggleBookmark } from "../utils/bookmarkHelper";
import { downloadPDF } from "../utils/downloadHelper";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatCourseBadge = (courseStr = "") => {
    if (!courseStr) return "General";
    const map = {
        "B.Tech Computer Science": "B.Tech CSE",
        "B.Tech Computer Science and Engineering": "B.Tech CSE",
        "Bachelor of Computer Applications": "BCA",
        "Bachelor of Computer Applications-IBM": "BCA-IBM",
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

function StatCard({ icon, label, value }) {
    return (
        <div className="bg-white dark:bg-[#161412] rounded-2xl sm:rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-xs p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#FAF8F5] dark:bg-[#24201C] flex items-center justify-center text-lg sm:text-xl text-[#8C6239] dark:text-[#E5C378] shrink-0 border border-[#EAE2D8] dark:border-[#2E2822]">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] leading-tight truncate">
                    {value}
                </p>
                <p className="text-[9px] sm:text-[10px] font-semibold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mt-0.5 truncate">
                    {label}
                </p>
            </div>
        </div>
    );
}

function Dashboard() {
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    const [myPapers, setMyPapers] = useState([]);
    const [myNotes, setMyNotes] = useState([]);
    const [bookmarks, setBookmarks] = useState(getBookmarks());
    const [allPapersCount, setAllPapersCount] = useState(0);
    const [allNotesCount, setAllNotesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedPdf, setSelectedPdf] = useState(null);

    const [activeTab, setActiveTab] = useState("pyqs");

    // Sync bookmarks reactively
    useEffect(() => {
        const sync = () => setBookmarks(getBookmarks());
        sync();
        window.addEventListener("paperbridge_bookmarks_updated", sync);
        return () => window.removeEventListener("paperbridge_bookmarks_updated", sync);
    }, []);

    const fetchUserData = useCallback(async () => {
        if (!isSignedIn) return;

        try {
            setLoading(true);
            const token = await getToken();
            const userEmail = (
                user?.primaryEmailAddress?.emailAddress ||
                user?.emailAddresses?.[0]?.emailAddress ||
                ""
            ).toLowerCase().trim();
            const userId = user?.id || "";

            // Sync user record to backend
            if (token) {
                fetch(`${API_URL}/api/users`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email: userEmail, clerkId: userId, name: user?.fullName || "" }),
                }).catch(() => {});
            }

            const authHeaders = {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            const [myRes, notesRes, allRes, allNotesRes] = await Promise.all([
                axios.get(`${API_URL}/api/my-pyqs?email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(userId)}`, { headers: authHeaders, timeout: 20000 }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/api/my-notes?email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(userId)}`, { headers: authHeaders, timeout: 20000 }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/api/pyqs`, { timeout: 20000 }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/api/notes`, { timeout: 20000 }).catch(() => ({ data: [] })),
            ]);

            setMyPapers(Array.isArray(myRes.data) ? myRes.data : []);
            setMyNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
            setAllPapersCount(Array.isArray(allRes.data) ? allRes.data.length : 0);
            setAllNotesCount(Array.isArray(allNotesRes.data) ? allNotesRes.data.length : 0);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            toast.error("Something went wrong while loading your dashboard.");
        } finally {
            setLoading(false);
        }
    }, [isSignedIn, getToken, user]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    if (!isSignedIn) {
        return (
            <>
                <Navbar2 />
                <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0F0E0D] p-4 text-[#1A1614] dark:text-[#F5F2EC]">
                    <div className="bg-white dark:bg-[#161412] rounded-3xl p-6 sm:p-8 text-center shadow-sm border border-[#EAE2D8] dark:border-[#2E2822] max-w-sm w-full">
                        <div className="w-12 h-12 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center text-xl mx-auto mb-3">
                            <FaFilePdf />
                        </div>
                        <h2 className="text-xl font-serif font-bold mb-1">Sign in Required</h2>
                        <p className="text-[#8C7862] text-xs mb-5">Please sign in to access your student dashboard and uploads.</p>
                        <Link to="/" className="inline-flex items-center gap-1 text-[#8C6239] dark:text-[#E5C378] font-semibold hover:underline text-xs">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    const firstName = user?.firstName || user?.fullName?.split(" ")[0] || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Student";
    const avatarUrl = user?.imageUrl;

    const totalSubmissions = myPapers.length + myNotes.length;
    const pendingTotal =
        myPapers.filter((p) => p.status === "pending").length +
        myNotes.filter((n) => n.status === "pending").length;
    const approvedTotal =
        myPapers.filter((p) => p.status === "approved" || !p.status).length +
        myNotes.filter((n) => n.status === "approved" || !n.status).length;

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            <main className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 w-full flex-1">
                {/* Welcome header — Responsive & Clean Layout */}
                <div className="bg-white dark:bg-[#161412] rounded-2xl sm:rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-xs p-4 sm:p-6 md:p-8 mb-5 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 w-full sm:w-auto">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="avatar"
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-[#8C6239] dark:border-[#C5A059] object-cover shadow-xs shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#4A2E1B] dark:bg-[#C5A059] text-white dark:text-[#0F0E0D] flex items-center justify-center font-bold text-lg sm:text-xl shrink-0">
                                {firstName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] tracking-tight truncate max-w-[200px] xs:max-w-[260px] sm:max-w-none">
                                    Welcome, {firstName}
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] text-[10px] font-bold uppercase border border-[#DDD2C4] dark:border-[#2E2822] shrink-0">
                                    Student
                                </span>
                            </div>
                            <p className="text-[#8C7862] dark:text-[#A8957E] mt-0.5 sm:mt-1 text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">
                                Track your uploaded papers & study notes, review statuses, and platform stats.
                            </p>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                            type="button"
                            onClick={fetchUserData}
                            className="p-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center transition cursor-pointer shadow-2xs min-h-[42px] min-w-[42px]"
                            title="Refresh Dashboard"
                            aria-label="Refresh Dashboard"
                        >
                            <FaSyncAlt className={`text-xs text-[#8C6239] dark:text-[#E5C378] ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <Link
                            to="/upload"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] text-xs font-bold shadow-xs transition min-h-[42px]"
                        >
                            <FaUpload className="text-[10px]" />
                            <span className="whitespace-nowrap">+ Upload Material ↗</span>
                        </Link>
                    </div>
                </div>

                {/* 4 Stat Cards — Responsive 2-column grid on mobile */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
                    <StatCard
                        icon="📄"
                        label="My Uploads"
                        value={loading ? "…" : totalSubmissions}
                    />
                    <StatCard
                        icon="⏳"
                        label="In Review"
                        value={loading ? "…" : pendingTotal}
                    />
                    <StatCard
                        icon="✅"
                        label="Approved & Live"
                        value={loading ? "…" : approvedTotal}
                    />
                    <StatCard
                        icon="📚"
                        label="Platform Vault"
                        value={loading ? "…" : allPapersCount + allNotesCount}
                    />
                </div>

                {/* Quick Actions — Strictly ONE LINE without wrapping */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
                    {[
                        { label: "Browse Question Papers", icon: <FaSearch />, to: "/browse" },
                        { label: "Browse Study Notes", icon: <FaStickyNote />, to: "/notes" },
                        { label: "Upload New Material", icon: <FaUpload />, to: "/upload" },
                    ].map((item, i) => (
                        <Link
                            key={i}
                            to={item.to}
                            className="flex items-center gap-2.5 sm:gap-3 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#1A1614] dark:text-[#FAF8F5] hover:border-[#8C6239] dark:hover:border-[#C5A059] rounded-2xl px-4 py-3 sm:py-3.5 shadow-2xs font-semibold text-xs transition min-h-[44px] overflow-hidden"
                        >
                            <span className="text-[#8C6239] dark:text-[#E5C378] text-sm shrink-0">{item.icon}</span>
                            <span className="whitespace-nowrap truncate tracking-tight">{item.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Submissions Section with Tabs */}
                <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822] pb-4">
                        <div>
                            <h2 className="text-lg font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                                My Uploads & Review Status
                            </h2>
                            <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                Direct access to your uploaded papers, review feedback, and saved bookmarks.
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-[#F4EFEA] dark:bg-[#1C1916] p-1 rounded-full border border-[#EAE2D8] dark:border-[#2E2822] overflow-x-auto no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setActiveTab("pyqs")}
                                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[34px] ${
                                    activeTab === "pyqs"
                                        ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                                        : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                }`}
                            >
                                <FaFilePdf className="text-xs" /> Question Papers ({myPapers.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("notes")}
                                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[34px] ${
                                    activeTab === "notes"
                                        ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                                        : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                }`}
                            >
                                <FaStickyNote className="text-xs" /> Study Notes ({myNotes.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("bookmarks")}
                                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[34px] ${
                                    activeTab === "bookmarks"
                                        ? "bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0D1B2A] shadow-2xs font-bold"
                                        : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                }`}
                            >
                                <FaBookmark className="text-amber-500 text-xs" /> Saved Bookmarks ({bookmarks.length})
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="py-12 text-center">
                            <div className="w-10 h-10 border-2 border-[#8C6239] dark:border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-xs font-medium text-[#8C7862] dark:text-[#A8957E]">
                                Loading your dashboard…
                            </p>
                        </div>
                    )}

                    {/* TAB 1: MY QUESTION PAPERS */}
                    {!loading && activeTab === "pyqs" && (
                        <>
                            {myPapers.length === 0 ? (
                                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-8 sm:p-12 text-center shadow-xs">
                                    <div className="w-12 h-12 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center text-xl mx-auto mb-3">
                                        <FaFilePdf />
                                    </div>
                                    <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                        No question papers uploaded yet
                                    </h3>
                                    <p className="text-[#8C7862] text-xs mb-5 max-w-sm mx-auto">
                                        Share past exam question papers to help your classmates and earn academic contributor status.
                                    </p>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] dark:text-[#0D1B2A] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xs transition min-h-[42px]"
                                    >
                                        <FaUpload className="text-[10px]" /> Upload Paper ↗
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {myPapers.map((paper) => {
                                        const status = paper.status || "approved";
                                        return (
                                            <div
                                                key={paper._id}
                                                className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-5 shadow-xs flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="mb-3 flex items-center justify-between">
                                                        {status === "pending" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                                <FaClock className="text-[10px]" /> Pending Review
                                                            </span>
                                                        )}
                                                        {status === "approved" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                                <FaCheckCircle className="text-[10px]" /> Approved
                                                            </span>
                                                        )}
                                                        {status === "rejected" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 border border-rose-500/30">
                                                                <FaTimesCircle className="text-[10px]" /> Rejected
                                                            </span>
                                                        )}

                                                        <span className="text-[11px] font-semibold text-[#8C7862] dark:text-[#A8957E]">
                                                            {paper.academicYear || paper.year || "2024-25"}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] text-sm line-clamp-2 mb-1">
                                                        {paper.title}
                                                    </h3>
                                                    <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mb-4">
                                                        {paper.universityId?.name || paper.university} • {formatCourseBadge(paper.courseId?.name || paper.course)}{paper.semester ? ` • Sem ${paper.semester}` : ""}
                                                    </p>

                                                    {status === "rejected" && paper.rejectionReason && (
                                                        <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] mb-3">
                                                            <strong>Reason:</strong> {paper.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPdf({
                                                            fileUrl: paper.fileUrl,
                                                            title: `${paper.title} (${formatCourseBadge(paper.courseId?.name || paper.course)})`,
                                                        })}
                                                        className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px]"
                                                    >
                                                        <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> Preview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadPDF(paper.fileUrl, `${paper.title}.pdf`)}
                                                        className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px]"
                                                    >
                                                        <FaDownload className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> Download
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* TAB 2: MY STUDY NOTES */}
                    {!loading && activeTab === "notes" && (
                        <>
                            {myNotes.length === 0 ? (
                                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-8 sm:p-12 text-center shadow-xs">
                                    <div className="w-12 h-12 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center text-xl mx-auto mb-3">
                                        <FaStickyNote />
                                    </div>
                                    <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                        No study notes uploaded yet
                                    </h3>
                                    <p className="text-[#8C7862] text-xs mb-5 max-w-sm mx-auto">
                                        Upload handwritten notes, unit summaries, and formula sheets to share with peers.
                                    </p>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] dark:text-[#0D1B2A] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xs transition min-h-[42px]"
                                    >
                                        <FaUpload className="text-[10px]" /> Upload Study Notes ↗
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {myNotes.map((note) => {
                                        const status = note.status || "approved";
                                        return (
                                            <div
                                                key={note._id}
                                                className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-5 shadow-xs flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="mb-3 flex items-center justify-between">
                                                        {status === "pending" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                                <FaClock className="text-[10px]" /> Pending Review
                                                            </span>
                                                        )}
                                                        {status === "approved" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                                <FaCheckCircle className="text-[10px]" /> Approved
                                                            </span>
                                                        )}
                                                        {status === "rejected" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 border border-rose-500/30">
                                                                <FaTimesCircle className="text-[10px]" /> Rejected
                                                            </span>
                                                        )}

                                                        <span className="text-[11px] font-semibold text-[#8C7862] dark:text-[#A8957E]">
                                                            {note.unit || "Unit 1"}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] text-sm line-clamp-2 mb-1">
                                                        {note.title}
                                                    </h3>
                                                    <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mb-4">
                                                        {note.universityId?.name || note.university} • {formatCourseBadge(note.courseId?.name || note.course)}{note.semester ? ` • Sem ${note.semester}` : ""}
                                                    </p>

                                                    {status === "rejected" && note.rejectionReason && (
                                                        <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] mb-3">
                                                            <strong>Reason:</strong> {note.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPdf({
                                                            fileUrl: note.fileUrl,
                                                            title: `${note.title} (${note.subject || "Study Notes"})`,
                                                        })}
                                                        className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px]"
                                                    >
                                                        <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> Preview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadPDF(note.fileUrl, `${note.title}.pdf`)}
                                                        className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px]"
                                                    >
                                                        <FaDownload className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> Download
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* TAB 3: SAVED BOOKMARKS */}
                    {!loading && activeTab === "bookmarks" && (
                        <>
                            {bookmarks.length === 0 ? (
                                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-8 sm:p-12 text-center shadow-xs">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl mx-auto mb-3">
                                        <FaBookmark />
                                    </div>
                                    <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                        No bookmarked papers yet
                                    </h3>
                                    <p className="text-[#8C7862] text-xs mb-5 max-w-sm mx-auto">
                                        Click the bookmark icon on any question paper or study note to save it here for quick access.
                                    </p>
                                    <Link
                                        to="/browse"
                                        className="inline-flex items-center gap-1.5 bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0D1B2A] px-5 py-2.5 rounded-full text-xs font-bold shadow-xs transition min-h-[42px]"
                                    >
                                        <FaSearch className="text-[10px]" /> Browse Papers ↗
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bookmarks.map((item) => (
                                        <div
                                            key={item._id}
                                            className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-5 shadow-xs flex flex-col justify-between group"
                                        >
                                            <div>
                                                <div className="mb-3 flex items-center justify-between">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] border border-[#EAE2D8] dark:border-[#2E2822]">
                                                        {item.itemType === "note" ? "Study Note" : "Question Paper"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleBookmark(item)}
                                                        className="text-[#8C7862] hover:text-rose-600 dark:hover:text-rose-400 text-xs p-1 cursor-pointer transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                                                        title="Remove from saved"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>

                                                <h3 className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] text-sm line-clamp-2 mb-1">
                                                    {item.title}
                                                </h3>
                                                <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mb-4">
                                                    {item.university} • {formatCourseBadge(item.course)} {item.semester ? `• Sem ${item.semester}` : ""}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedPdf({
                                                        fileUrl: item.fileUrl,
                                                        title: item.title || "Saved Document",
                                                    })}
                                                    className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px]"
                                                >
                                                    <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadPDF(item.fileUrl, `${item.title || "Document"}.pdf`)}
                                                    className="flex items-center justify-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[38px]"
                                                >
                                                    <FaDownload className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> Download
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

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

export default Dashboard;