import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { FaFilePdf, FaUpload, FaSearch, FaEye } from "react-icons/fa";
import { MdOutlineDashboard } from "react-icons/md";
import Navbar2 from "../components/Navbar2";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StatCard({ icon, label, value, color }) {
    return (
        <motion.div
            whileHover={{ scale: 1.03 }}
            className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
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
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 p-6">
                    <div className="bg-white rounded-2xl p-10 text-center shadow-md">
                        <div className="text-5xl mb-4">🔒</div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Sign in Required</h2>
                        <p className="text-gray-500 text-sm mb-6">Please sign in to view your dashboard.</p>
                        <Link to="/" className="text-indigo-600 hover:underline text-sm">← Back to Home</Link>
                    </div>
                </div>
            </>
        );
    }

    const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Student";
    const avatarUrl = user?.imageUrl;

    return (
        <>
            <Navbar2 />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 p-6">
                <div className="max-w-6xl mx-auto">

                    {/* Welcome header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6"
                    >
                        {avatarUrl && (
                            <img
                                src={avatarUrl}
                                alt="avatar"
                                className="w-16 h-16 rounded-full ring-4 ring-indigo-100 object-cover"
                            />
                        )}
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                Welcome back, {firstName} 👋
                            </h1>
                            <p className="text-gray-500 mt-1 text-sm">
                                Manage your uploaded papers and explore the platform.
                            </p>
                        </div>
                        <Link
                            to="/upload"
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-md"
                        >
                            <FaUpload /> Upload Paper
                        </Link>
                    </motion.div>

                    {/* Stats row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        <StatCard
                            icon="📄"
                            label="Papers You Uploaded"
                            value={loading ? "…" : myPapers.length}
                            color="bg-indigo-100 text-indigo-600"
                        />
                        <StatCard
                            icon="📚"
                            label="Total Papers on Platform"
                            value={loading ? "…" : allCount}
                            color="bg-purple-100 text-purple-600"
                        />
                        <StatCard
                            icon="🎓"
                            label="Role"
                            value="Student"
                            color="bg-green-100 text-green-600"
                        />
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                        {[
                            { label: "Browse Papers", icon: <FaSearch />, to: "/browse", color: "from-indigo-500 to-purple-600" },
                            { label: "Upload Paper",  icon: <FaUpload />,  to: "/upload", color: "from-purple-500 to-pink-500" },
                            { label: "View All Papers", icon: <FaEye />,   to: "/browse", color: "from-teal-500 to-indigo-500" },
                        ].map((item, i) => (
                            <Link
                                key={i}
                                to={item.to}
                                className={`flex items-center gap-3 bg-gradient-to-r ${item.color} text-white rounded-2xl p-5 hover:opacity-90 transition shadow-md font-medium`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* My Uploaded Papers */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">📂 My Uploaded Papers</h2>
                            {myPapers.length > 0 && (
                                <span className="text-sm text-gray-400">{myPapers.length} paper{myPapers.length !== 1 ? "s" : ""}</span>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100">
                                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                                        <div className="h-8 bg-gray-200 rounded-lg mt-4" />
                                    </div>
                                ))}
                            </div>
                        ) : myPapers.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center"
                            >
                                <div className="text-5xl mb-4">📭</div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No papers yet</h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    You haven't uploaded any papers yet. Be the first to contribute!
                                </p>
                                <Link
                                    to="/upload"
                                    id="dashboard-upload-cta"
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition shadow"
                                >
                                    <FaUpload /> Upload Your First Paper
                                </Link>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myPapers.map((paper) => (
                                    <motion.div
                                        key={paper._id}
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0">
                                                <FaFilePdf />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">{paper.title}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {paper.course}{paper.semester ? ` • Sem ${paper.semester}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {paper.examType && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">{paper.examType}</span>
                                            )}
                                            {paper.year && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{paper.year}</span>
                                            )}
                                            {paper.branch && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{paper.branch}</span>
                                            )}
                                        </div>
                                        <a
                                            href={paper.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            id={`my-paper-view-${paper._id}`}
                                            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-medium transition"
                                        >
                                            <FaEye /> View Paper
                                        </a>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
}

export default Dashboard;