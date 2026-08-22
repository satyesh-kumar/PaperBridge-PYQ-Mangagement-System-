import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaFilePdf, FaUpload, FaSearch, FaEye, FaClock, FaCheckCircle, FaTimesCircle, FaStickyNote, FaUniversity, FaUserGraduate } from "react-icons/fa";
import Navbar2 from "../components/Navbar2";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StatCard({ icon, label, value }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg text-slate-700 dark:text-slate-300">
                {icon}
            </div>
            <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
        </div>
    );
}

function Dashboard() {
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    const [myPapers, setMyPapers] = useState([]);
    const [myNotes, setMyNotes] = useState([]);
    const [allPapersCount, setAllPapersCount] = useState(0);
    const [allNotesCount, setAllNotesCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState("pyqs");

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
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center shadow-xs border border-slate-200 dark:border-slate-800 max-w-sm w-full">
                        <h2 className="text-lg font-bold mb-1">Sign in Required</h2>
                        <p className="text-slate-500 text-xs mb-4">Please sign in to view your student dashboard.</p>
                        <Link to="/" className="text-indigo-600 font-semibold hover:underline text-xs">← Back to Home</Link>
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
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* Welcome header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt="avatar"
                            className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-2xs"
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Welcome, {firstName}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">
                            Track your uploaded question papers & study notes, review statuses, and platform stats.
                        </p>
                    </div>
                    <Link
                        to="/upload"
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                        + Upload Material
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
                            className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl p-3.5 shadow-xs font-semibold text-xs transition"
                        >
                            <span className="text-slate-500">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Submissions Section with Tabs */}
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                My Uploads & Review Status
                            </h2>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setActiveTab("pyqs")}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === "pyqs"
                                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
                                        : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                <FaFilePdf className="text-xs" /> Question Papers ({myPapers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("notes")}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === "notes"
                                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
                                        : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                <FaStickyNote className="text-xs" /> Study Notes ({myNotes.length})
                            </button>
                        </div>
                    </div>

                    {/* Loading Skeleton */}
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 animate-pulse border border-slate-200 dark:border-slate-800">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4" />
                                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 1: MY QUESTION PAPERS */}
                    {!loading && activeTab === "pyqs" && (
                        <>
                            {myPapers.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">No question papers uploaded yet</h3>
                                    <p className="text-slate-500 text-xs mb-4">
                                        Share past university exam question papers to help your classmates.
                                    </p>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs"
                                    >
                                        <FaUpload className="text-[10px]" /> Upload Paper
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {myPapers.map((paper) => {
                                        const status = paper.status || "approved";
                                        return (
                                            <div
                                                key={paper._id}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="mb-2.5 flex items-center justify-between">
                                                        {status === "pending" && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                <FaClock className="text-[10px]" /> Pending Review
                                                            </span>
                                                        )}
                                                        {status === "approved" && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                <FaCheckCircle className="text-[10px]" /> Approved
                                                            </span>
                                                        )}
                                                        {status === "rejected" && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                <FaTimesCircle className="text-[10px]" /> Rejected
                                                            </span>
                                                        )}

                                                        {paper.year && (
                                                            <span className="text-[11px] font-semibold text-slate-400">
                                                                {paper.year}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 mb-1">
                                                        {paper.title}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-500 mb-3">
                                                        {paper.course}{paper.semester ? ` • Sem ${paper.semester}` : ""}
                                                    </p>

                                                    {status === "rejected" && paper.rejectionReason && (
                                                        <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-[11px] mb-3">
                                                            <strong>Reason:</strong> {paper.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>

                                                <a
                                                    href={paper.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center justify-center gap-1.5 w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition"
                                                >
                                                    <FaEye className="text-xs" /> View Paper
                                                </a>
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
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">No study notes uploaded yet</h3>
                                    <p className="text-slate-500 text-xs mb-4">
                                        Upload handwritten notes, unit summaries, and formula sheets.
                                    </p>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs"
                                    >
                                        <FaUpload className="text-[10px]" /> Upload Study Notes
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {myNotes.map((note) => {
                                        const status = note.status || "approved";
                                        return (
                                            <div
                                                key={note._id}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="mb-2.5 flex items-center justify-between">
                                                        {status === "pending" && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                <FaClock className="text-[10px]" /> Pending Review
                                                            </span>
                                                        )}
                                                        {status === "approved" && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                <FaCheckCircle className="text-[10px]" /> Approved
                                                            </span>
                                                        )}
                                                        {status === "rejected" && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                <FaTimesCircle className="text-[10px]" /> Rejected
                                                            </span>
                                                        )}

                                                        <span className="text-[11px] font-semibold text-slate-500">
                                                            {note.unit}
                                                        </span>
                                                    </div>

                                                    <h3 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 mb-1">
                                                        {note.title}
                                                    </h3>
                                                    <p className="text-[11px] text-indigo-600 font-semibold mb-3">
                                                        {note.subject}
                                                    </p>

                                                    {status === "rejected" && note.rejectionReason && (
                                                        <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-[11px] mb-3">
                                                            <strong>Reason:</strong> {note.rejectionReason}
                                                        </div>
                                                    )}
                                                </div>

                                                <a
                                                    href={note.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center justify-center gap-1.5 w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition"
                                                >
                                                    <FaEye className="text-xs" /> View Study Notes
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;