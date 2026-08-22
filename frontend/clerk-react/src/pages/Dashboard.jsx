import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { FaFilePdf, FaUpload, FaSearch, FaEye, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Navbar2 from "../components/Navbar2";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StatCard({ icon, label, value, color }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex items-center gap-4 transition-colors"
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
        </motion.div>
    );
}

function Dashboard() {
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    const [myPapers, setMyPapers] = useState([]);
    const [allCount, setAllCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSignedIn) return;

        const fetchData = async () => {
            try {
                const token = await getToken();

                // Sync user to backend (upsert)
                await fetch(`${API_URL}/api/users`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Fetch this user's papers
                const myRes = await axios.get(`${API_URL}/api/my-pyqs`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyPapers(myRes.data);

                // Fetch total paper count
                const allRes = await axios.get(`${API_URL}/api/pyqs`);
                setAllCount(allRes.data.length);

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
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 text-slate-800 dark:text-slate-100">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full">
                        <div className="text-5xl mb-4">🔒</div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sign in Required</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Please sign in to view your student dashboard.</p>
                        <Link to="/" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline text-sm">← Back to Home</Link>
                    </div>
                </div>
            </>
        );
    }

    const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Student";
    const avatarUrl = user?.imageUrl;

    const approvedPapersCount = myPapers.filter(p => p.status === "approved" || !p.status).length;
    const pendingPapersCount = myPapers.filter(p => p.status === "pending").length;

    return (
        <>
            <Navbar2 />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 sm:p-6 lg:p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300">
                <div className="max-w-6xl mx-auto">

                    {/* Welcome header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6"
                    >
                        {avatarUrl && (
                            <img
                                src={avatarUrl}
                                alt="avatar"
                                className="w-16 h-16 rounded-full ring-4 ring-indigo-100 dark:ring-indigo-900/60 object-cover shadow-md"
                            />
                        )}
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Welcome back, {firstName} 👋
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                                Track your uploaded question papers, moderation approval status, and explore archives.
                            </p>
                        </div>
                        <Link
                            to="/upload"
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md hover:shadow-indigo-500/20"
                        >
                            <FaUpload /> Upload Paper
                        </Link>
                    </motion.div>

                    {/* Stats row */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
                        <StatCard
                            icon="📄"
                            label="Total Submissions"
                            value={loading ? "…" : myPapers.length}
                            color="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
                        />
                        <StatCard
                            icon="⏳"
                            label="Pending Admin Review"
                            value={loading ? "…" : pendingPapersCount}
                            color="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"
                        />
                        <StatCard
                            icon="✅"
                            label="Approved & Live"
                            value={loading ? "…" : approvedPapersCount}
                            color="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                        />
                        <StatCard
                            icon="📚"
                            label="Global Archive"
                            value={loading ? "…" : allCount}
                            color="bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60"
                        />
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                        {[
                            { label: "Browse Repository", icon: <FaSearch />, to: "/browse", color: "from-indigo-500 to-purple-600" },
                            { label: "Upload New PYQ",  icon: <FaUpload />,  to: "/upload", color: "from-purple-500 to-pink-500" },
                            { label: "View All Question Papers", icon: <FaEye />,   to: "/browse", color: "from-teal-500 to-indigo-500" },
                        ].map((item, i) => (
                            <Link
                                key={i}
                                to={item.to}
                                className={`flex items-center gap-3 bg-gradient-to-r ${item.color} text-white rounded-2xl p-5 hover:opacity-90 transition shadow-md font-semibold text-sm hover:-translate-y-0.5`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* My Uploaded Papers */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">📂 My Uploaded Papers & Review Status</h2>
                            {myPapers.length > 0 && (
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{myPapers.length} paper{myPapers.length !== 1 ? "s" : ""}</span>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 animate-pulse border border-slate-100 dark:border-slate-800">
                                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-3" />
                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-2" />
                                        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mt-4" />
                                    </div>
                                ))}
                            </div>
                        ) : myPapers.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center"
                            >
                                <div className="text-5xl mb-4">📭</div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No papers submitted yet</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                    You haven&rsquo;t uploaded any question papers yet. Share past exam papers to help your university batchmates!
                                </p>
                                <Link
                                    to="/upload"
                                    id="dashboard-upload-cta"
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow"
                                >
                                    <FaUpload /> Upload Your First Paper
                                </Link>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myPapers.map((paper) => {
                                    const status = paper.status || "approved";
                                    return (
                                        <motion.div
                                            key={paper._id}
                                            whileHover={{ scale: 1.02 }}
                                            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                                        >
                                            <div>
                                                {/* Status Pill Badge */}
                                                <div className="mb-3 flex items-center justify-between">
                                                    {status === "pending" && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                            <FaClock className="text-[10px]" /> Under Admin Review
                                                        </span>
                                                    )}
                                                    {status === "approved" && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            <FaCheckCircle className="text-[10px]" /> Approved & Live
                                                        </span>
                                                    )}
                                                    {status === "rejected" && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                            <FaTimesCircle className="text-[10px]" /> Rejected by Admin
                                                        </span>
                                                    )}

                                                    {paper.year && (
                                                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                                            {paper.year}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center flex-shrink-0">
                                                        <FaFilePdf />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{paper.title}</h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                                            {paper.course}{paper.semester ? ` • Sem ${paper.semester}` : ""}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Rejection notice if any */}
                                                {status === "rejected" && paper.rejectionReason && (
                                                    <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs mb-3 font-medium">
                                                        <strong>Reason:</strong> {paper.rejectionReason}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    {paper.examType && (
                                                        <span className="text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-md capitalize">{paper.examType}</span>
                                                    )}
                                                    {paper.branch && (
                                                        <span className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md">{paper.branch}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <a
                                                href={paper.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                id={`my-paper-view-${paper._id}`}
                                                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-xl text-xs font-bold transition shadow-sm"
                                            >
                                                <FaEye /> View Paper
                                            </a>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
}

export default Dashboard;