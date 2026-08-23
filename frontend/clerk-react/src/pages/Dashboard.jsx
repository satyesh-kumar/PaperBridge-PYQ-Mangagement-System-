import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaFilePdf, FaUpload, FaSearch, FaEye, FaClock, FaCheckCircle, FaTimesCircle, FaStickyNote, FaUniversity, FaUserGraduate, FaBookmark, FaTrash } from "react-icons/fa";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import PDFViewer from "../components/PDFViewer";
import { getBookmarks, toggleBookmark } from "../utils/bookmarkHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

function StatCard({ icon, label, value }) {
    return (
        <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#F4EFEA] dark:bg-[#24201C] flex items-center justify-center text-xl text-[#8C6239] dark:text-[#E5C378]">
                {icon}
            </div>
            <div>
                <p className="text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] leading-tight">{value}</p>
                <p className="text-[10px] font-semibold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider mt-0.5">{label}</p>
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

    useEffect(() => {
        if (!isSignedIn) return;

        const fetchData = async () => {
            try {
                const token = await getToken();

                // Sync user to backend
                await fetch(`${API_URL}/api/users`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });

                // Fetch user's papers & notes concurrently
                const [myRes, notesRes, allRes, allNotesRes] = await Promise.all([
                    axios.get(`${API_URL}/api/my-pyqs`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(`${API_URL}/api/my-notes`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(`${API_URL}/api/pyqs`),
                    axios.get(`${API_URL}/api/notes`),
                ]);

                setMyPapers(myRes.data || []);
                setMyNotes(notesRes.data || []);
                setAllPapersCount(allRes.data?.length || 0);
                setAllNotesCount(allNotesRes.data?.length || 0);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isSignedIn, getToken]);

    if (!isSignedIn) {
        return (
            <>
                <Navbar2 />
                <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0F0E0D] p-6 text-[#1A1614] dark:text-[#F5F2EC]">
                    <div className="bg-white dark:bg-[#161412] rounded-3xl p-8 text-center shadow-sm border border-[#EAE2D8] dark:border-[#2E2822] max-w-sm w-full">
                        <h2 className="text-xl font-serif font-bold mb-1">Sign in Required</h2>
                        <p className="text-[#8C7862] text-xs mb-5">Please sign in to view your United University student library.</p>
                        <Link to="/" className="text-[#8C6239] dark:text-[#E5C378] font-semibold hover:underline text-xs">← Back to Home</Link>
                    </div>
                </div>
            </>
        );
    }

    const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Student";
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

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* Welcome header */}
                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] shadow-sm p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt="avatar"
                            className="w-14 h-14 rounded-2xl border-2 border-[#8C6239] dark:border-[#C5A059] object-cover shadow-sm"
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] tracking-tight">
                            Welcome, {firstName}
                        </h1>
                        <p className="text-[#8C7862] dark:text-[#A8957E] mt-1 text-xs sm:text-sm">
                            Track your uploaded question papers & study notes, review statuses, and platform stats.
                        </p>
                    </div>
                    <Link
                        to="/upload"
                        className="bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] px-6 py-2.5 rounded-full text-xs font-bold shadow-xs transition"
                    >
                        + Upload Material ↗
                    </Link>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        icon="📄"
                        label="Contributions"
                        value={loading ? "…" : totalSubmissions}
                    />
                    <StatCard
                        icon="⏳"
                        label="Pending Review"
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

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                    {[
                        { label: "Browse Question Papers", icon: <FaSearch />, to: "/browse" },
                        { label: "Browse Study Notes", icon: <FaStickyNote />, to: "/notes" },
                        { label: "Upload New Material", icon: <FaUpload />, to: "/upload" },
                    ].map((item, i) => (
                        <Link
                            key={i}
                            to={item.to}
                            className="flex items-center gap-3 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#1A1614] dark:text-[#FAF8F5] hover:border-[#8C6239] dark:hover:border-[#C5A059] rounded-2xl p-4 shadow-2xs font-semibold text-xs transition"
                        >
                            <span className="text-[#8C6239] dark:text-[#E5C378]">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Submissions Section with Tabs */}
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822] pb-4">
                        <div>
                            <h2 className="text-lg font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                                My Uploads & Review Status
                            </h2>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-[#F4EFEA] dark:bg-[#1C1916] p-1 rounded-full border border-[#EAE2D8] dark:border-[#2E2822] overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("pyqs")}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    activeTab === "pyqs"
                                        ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                                        : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                }`}
                            >
                                <FaFilePdf className="text-xs" /> Question Papers ({myPapers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("notes")}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    activeTab === "notes"
                                        ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                                        : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                }`}
                            >
                                <FaStickyNote className="text-xs" /> Study Notes ({myNotes.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("bookmarks")}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    activeTab === "bookmarks"
                                        ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A] shadow-2xs font-bold"
                                        : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
                                }`}
                            >
                                <FaBookmark className="text-amber-500 text-xs" /> Saved Bookmarks ({bookmarks.length})
                            </button>
                        </div>
                    </div>

                    {/* Loading Skeleton */}
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-[#161412] rounded-3xl p-5 animate-pulse border border-[#EAE2D8] dark:border-[#2E2822]">
                                    <div className="h-4 bg-[#EAE2D8] dark:bg-[#2E2822] rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-[#EAE2D8] dark:bg-[#2E2822] rounded w-1/2 mb-4" />
                                    <div className="h-8 bg-[#EAE2D8] dark:bg-[#2E2822] rounded-full" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 1: MY QUESTION PAPERS */}
                    {!loading && activeTab === "pyqs" && (
                        <>
                            {myPapers.length === 0 ? (
                                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-10 text-center shadow-xs">
                                    <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">No question papers uploaded yet</h3>
                                    <p className="text-[#8C7862] text-xs mb-5">
                                        Share past United University exam question papers to help your classmates.
                                    </p>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-1.5 bg-[#4A2E1B] dark:bg-[#C5A059] dark:text-[#0F0E0D] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xs"
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
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                <FaClock className="text-[10px]" /> Pending Review
                                                            </span>
                                                        )}
                                                        {status === "approved" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                <FaCheckCircle className="text-[10px]" /> Approved
                                                            </span>
                                                        )}
                                                        {status === "rejected" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                <FaTimesCircle className="text-[10px]" /> Rejected
                                                            </span>
                                                        )}

                                                        {paper.year && (
                                                            <span className="text-[11px] font-semibold text-[#8C7862] dark:text-[#A8957E]">
                                                                {paper.year}
                                                            </span>
                                                        )}
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

                                                <button
                                                    onClick={() => setSelectedPdf({
                                                        fileUrl: paper.fileUrl,
                                                        title: `${paper.title} (${formatCourseBadge(paper.courseId?.name || paper.course)})`,
                                                    })}
                                                    className="flex items-center justify-center gap-1.5 w-full bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs"
                                                >
                                                    <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> View Paper
                                                </button>
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
                                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-10 text-center shadow-xs">
                                    <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">No study notes uploaded yet</h3>
                                    <p className="text-[#8C7862] text-xs mb-5">
                                        Upload handwritten notes, unit summaries, and formula sheets.
                                    </p>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-1.5 bg-[#4A2E1B] dark:bg-[#C5A059] dark:text-[#0F0E0D] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xs"
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
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                <FaClock className="text-[10px]" /> Pending Review
                                                            </span>
                                                        )}
                                                        {status === "approved" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                <FaCheckCircle className="text-[10px]" /> Approved
                                                            </span>
                                                        )}
                                                        {status === "rejected" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                <FaTimesCircle className="text-[10px]" /> Rejected
                                                            </span>
                                                        )}

                                                        <span className="text-[11px] font-semibold text-[#8C7862] dark:text-[#A8957E]">
                                                            {note.unit}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] text-sm line-clamp-2 mb-1">
                                                        {note.title}
                                                    </h3>
                                                    <p className="text-[11px] text-[#8C6239] dark:text-[#E5C378] font-semibold mb-4">
                                                        {note.subject}
                                                    </p>

                                                    {status === "rejected" && note.rejectionReason && (
                                                        <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] mb-3">
                                                            <strong>Reason:</strong> {note.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => setSelectedPdf({
                                                        fileUrl: note.fileUrl,
                                                        title: `${note.title} (${note.subject || "Study Notes"})`,
                                                    })}
                                                    className="flex items-center justify-center gap-1.5 w-full bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs"
                                                >
                                                    <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> View Study Notes
                                                </button>
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
                                <div className="bg-white dark:bg-[#161412] rounded-3xl border border-[#EAE2D8] dark:border-[#2E2822] p-10 text-center shadow-xs">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center text-xl mx-auto mb-3">
                                        <FaBookmark />
                                    </div>
                                    <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">No bookmarked papers yet</h3>
                                    <p className="text-[#8C7862] text-xs mb-5">
                                        Click the bookmark star on any question paper or study note to save it here for fast revision.
                                    </p>
                                    <Link
                                        to="/browse"
                                        className="inline-flex items-center gap-1.5 bg-[#0D1B2A] dark:bg-[#C89D5C] text-white dark:text-[#0D1B2A] px-5 py-2.5 rounded-full text-xs font-bold shadow-xs"
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
                                                        onClick={() => toggleBookmark(item)}
                                                        className="text-[#8C7862] hover:text-rose-600 dark:hover:text-rose-400 text-xs p-1 cursor-pointer transition"
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

                                            <button
                                                onClick={() => setSelectedPdf({
                                                    fileUrl: item.fileUrl,
                                                    title: item.title || "Saved Document",
                                                })}
                                                className="flex items-center justify-center gap-1.5 w-full bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A2E1B] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs"
                                            >
                                                <FaEye className="text-xs text-[#8C6239] dark:text-[#E5C378]" /> View Document
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

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