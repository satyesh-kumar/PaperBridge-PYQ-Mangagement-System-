import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaShieldAlt,
    FaFilePdf,
    FaEye,
    FaDownload,
    FaTrash,
    FaEdit,
    FaSearch,
    FaTimes,
    FaFilter,
    FaCheck,
    FaRedo,
    FaLayerGroup,
    FaUsers,
    FaDatabase,
    FaServer,
    FaCloudDownloadAlt,
    FaFileCsv,
    FaGraduationCap,
    FaCalendarAlt,
    FaExclamationTriangle,
    FaSpinner,
    FaChevronLeft,
    FaChevronRight,
    FaPlus,
    FaSyncAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Navbar2 from "../components/Navbar2";
import PDFViewer from "../components/PDFViewer";
import { useIsAdmin } from "../hooks/useIsAdmin";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COURSES = ["B.Tech", "MCA", "MBA", "BCA", "BBA", "Diploma", "Other"];
const EXAM_TYPES = [
    { label: "Mid Term 1", value: "mid1" },
    { label: "Mid Term 2", value: "mid2" },
    { label: "End Semester", value: "semester" },
    { label: "Makeup / Backlog", value: "makeup" },
];

function AdminPanel() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { userEmail, adminEmails } = useIsAdmin();

    const [papers, setPapers] = useState([]);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [error, setError] = useState("");

    // Active tab: 'papers' | 'users' | 'system'
    const [activeTab, setActiveTab] = useState("papers");

    // Search & Filter
    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("All");
    const [examFilter, setExamFilter] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("");

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modals
    const [previewPdf, setPreviewPdf] = useState(null);
    const [editingPaper, setEditingPaper] = useState(null);
    const [editForm, setEditForm] = useState({
        title: "",
        course: "",
        semester: "",
        examType: "",
        year: "",
        branch: "",
    });
    const [savingEdit, setSavingEdit] = useState(false);

    const [deletingPaper, setDeletingPaper] = useState(null);
    const [deletingBulk, setDeletingBulk] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // System ping test
    const [pingLatency, setPingLatency] = useState(null);
    const [pinging, setPinging] = useState(false);

    // Fetch repository papers
    const fetchPapers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_URL}/api/pyqs`, { timeout: 15000 });
            if (Array.isArray(res.data)) {
                setPapers(res.data);
            } else {
                setPapers([]);
            }
        } catch (err) {
            console.error("Admin fetch papers error:", err);
            setError("Failed to load question papers repository.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch admin statistics
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const token = await getToken();
            const res = await axios.get(`${API_URL}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(res.data);
        } catch (err) {
            console.error("Admin stats fetch error:", err);
        } finally {
            setStatsLoading(false);
        }
    }, [getToken]);

    // Fetch user directory
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const token = await getToken();
            const res = await axios.get(`${API_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(res.data || []);
        } catch (err) {
            console.error("Admin users fetch error:", err);
        } finally {
            setUsersLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchPapers();
        fetchStats();
    }, [fetchPapers, fetchStats]);

    useEffect(() => {
        if (activeTab === "users" && users.length === 0) {
            fetchUsers();
        }
    }, [activeTab, fetchUsers, users.length]);

    // Ping API test
    const handlePing = async () => {
        setPinging(true);
        const start = performance.now();
        try {
            await axios.get(`${API_URL}/`, { timeout: 10000 });
            const duration = Math.round(performance.now() - start);
            setPingLatency(duration);
            toast.success(`Server active! Ping: ${duration}ms`);
        } catch {
            setPingLatency(-1);
            toast.error("Server ping failed");
        } finally {
            setPinging(false);
        }
    };

    // Filtered Papers
    const filteredPapers = useMemo(() => {
        return papers.filter((paper) => {
            const target = `${paper.title || ""} ${paper.course || ""} ${paper.examType || ""} ${paper.year || ""} ${paper.branch || ""} ${paper.uploadedBy || ""}`.toLowerCase();
            const matchesSearch = !search || target.includes(search.toLowerCase().trim());
            const matchesCourse = courseFilter === "All" || (paper.course && paper.course.toLowerCase() === courseFilter.toLowerCase());
            const matchesExam = !examFilter || (paper.examType && paper.examType.toLowerCase() === examFilter.toLowerCase());
            const matchesSemester = !semesterFilter || String(paper.semester) === semesterFilter;

            return matchesSearch && matchesCourse && matchesExam && matchesSemester;
        });
    }, [papers, search, courseFilter, examFilter, semesterFilter]);

    // Paginated Papers
    const totalPages = Math.max(1, Math.ceil(filteredPapers.length / pageSize));
    const paginatedPapers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPapers.slice(start, start + pageSize);
    }, [filteredPapers, currentPage, pageSize]);

    // Selection handlers
    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedPapers.length && paginatedPapers.length > 0) {
            setSelectedIds(new Set());
        } else {
            const allCurrentIds = new Set(paginatedPapers.map((p) => p._id));
            setSelectedIds(allCurrentIds);
        }
    };

    // Download handler
    const handleDownload = async (paper) => {
        if (!paper.fileUrl) {
            toast.error("Paper file link is unavailable.");
            return;
        }
        const toastId = toast.loading("Downloading PDF...");
        try {
            const response = await fetch(paper.fileUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${(paper.title || "paper").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download complete!", { id: toastId });
        } catch {
            window.open(paper.fileUrl, "_blank");
            toast.success("Opening in new tab...", { id: toastId });
        }
    };

    // Edit modal open
    const openEditModal = (paper) => {
        setEditingPaper(paper);
        setEditForm({
            title: paper.title || "",
            course: paper.course || "",
            semester: paper.semester || "",
            examType: paper.examType || "",
            year: paper.year || "",
            branch: paper.branch || "",
        });
    };

    // Save Edit
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingPaper) return;
        if (!editForm.title.trim()) {
            toast.error("Paper title is required");
            return;
        }

        setSavingEdit(true);
        const toastId = toast.loading("Saving changes...");
        try {
            const token = await getToken();
            const res = await axios.put(`${API_URL}/api/pyqs/${editingPaper._id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Update in local state
            setPapers((prev) =>
                prev.map((p) => (p._id === editingPaper._id ? { ...p, ...res.data } : p))
            );

            toast.success("Paper updated successfully!", { id: toastId });
            setEditingPaper(null);
            fetchStats();
        } catch (err) {
            console.error("Save edit error:", err);
            toast.error("Failed to update paper", { id: toastId });
        } finally {
            setSavingEdit(false);
        }
    };

    // Single Delete
    const handleDeleteSingle = async () => {
        if (!deletingPaper) return;
        setIsDeleting(true);
        const toastId = toast.loading("Deleting paper...");
        try {
            const token = await getToken();
            await axios.delete(`${API_URL}/api/pyqs/${deletingPaper._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPapers((prev) => prev.filter((p) => p._id !== deletingPaper._id));
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(deletingPaper._id);
                return next;
            });

            toast.success("Paper deleted successfully!", { id: toastId });
            setDeletingPaper(null);
            fetchStats();
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete paper", { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    // Bulk Delete
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        const toastId = toast.loading(`Deleting ${selectedIds.size} papers...`);
        try {
            const token = await getToken();
            const ids = Array.from(selectedIds);
            await axios.post(
                `${API_URL}/api/admin/pyqs/bulk-delete`,
                { ids },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPapers((prev) => prev.filter((p) => !selectedIds.has(p._id)));
            setSelectedIds(new Set());
            toast.success(`Successfully deleted ${ids.length} papers!`, { id: toastId });
            setDeletingBulk(false);
            fetchStats();
        } catch (err) {
            console.error("Bulk delete error:", err);
            toast.error("Failed to perform bulk delete", { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        const targetPapers = selectedIds.size > 0
            ? papers.filter((p) => selectedIds.has(p._id))
            : filteredPapers;

        if (targetPapers.length === 0) {
            toast.error("No papers available to export");
            return;
        }

        const headers = ["ID", "Title", "Course", "Semester", "Exam Type", "Year", "Branch", "File URL", "Uploaded By", "Created At"];
        const rows = targetPapers.map((p) => [
            `"${p._id}"`,
            `"${(p.title || "").replace(/"/g, '""')}"`,
            `"${p.course || ""}"`,
            `"${p.semester || ""}"`,
            `"${p.examType || ""}"`,
            `"${p.year || ""}"`,
            `"${p.branch || ""}"`,
            `"${p.fileUrl || ""}"`,
            `"${p.uploadedBy || ""}"`,
            `"${p.createdAt || ""}"`,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `PaperBridge_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${targetPapers.length} records to CSV!`);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
            <Navbar2 />

            {/* TOP ADMIN EXECUTIVE BAR */}
            <div className="bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-5 sticky top-16 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Title & Badge */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-500/20">
                            <FaShieldAlt />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white tracking-tight">
                                    PaperBridge Admin Console
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                    Active Root
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Logged in as: <span className="text-indigo-400 font-semibold">{userEmail}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                        >
                            <FaFileCsv className="text-emerald-400" /> Export CSV
                        </button>

                        <button
                            onClick={() => {
                                fetchPapers();
                                fetchStats();
                                toast.success("Repository refreshed!");
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                        >
                            <FaSyncAlt className="text-indigo-400" /> Refresh
                        </button>

                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                        >
                            <FaPlus className="text-xs" /> Upload Paper
                        </Link>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* EXECUTIVE METRICS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {/* Metric 1: Total Papers */}
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/50 transition shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Total PYQ Vault
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm">
                                <FaFilePdf />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">
                            {papers.length}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Total exam papers stored in database</p>
                    </div>

                    {/* Metric 2: Contributors */}
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Registered Users
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-sm">
                                <FaUsers />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">
                            {stats?.totalUsers ?? (statsLoading ? "..." : 1)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Clerk synced student accounts</p>
                    </div>

                    {/* Metric 3: Active Courses */}
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Active Courses
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm">
                                <FaGraduationCap />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">
                            {new Set(papers.map((p) => p.course).filter(Boolean)).size}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Programs across Engineering & Mgmt</p>
                    </div>

                    {/* Metric 4: Cloud Status */}
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/50 transition shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Storage & Cloud
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm">
                                <FaDatabase />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-lg font-bold text-emerald-400">Cloudinary Live</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Raw PDF Delivery Network</p>
                    </div>
                </div>

                {/* TAB SELECTOR NAVIGATION */}
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4 mb-6">
                    <button
                        onClick={() => setActiveTab("papers")}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === "papers"
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                    >
                        <FaFilePdf /> Question Papers Management ({papers.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("users")}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === "users"
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                    >
                        <FaUsers /> User Directory
                    </button>

                    <button
                        onClick={() => setActiveTab("system")}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === "system"
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                    >
                        <FaServer /> System Diagnostics & Roles
                    </button>
                </div>

                {/* TAB 1: PAPERS MANAGEMENT */}
                {activeTab === "papers" && (
                    <div className="space-y-6">
                        {/* Search & Filter Bar */}
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus-within:border-indigo-500 transition">
                                    <FaSearch className="text-slate-500 mr-3 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search by title, course, year, uploader ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-transparent outline-none text-xs text-white placeholder:text-slate-500 font-medium"
                                    />
                                    {search && (
                                        <button onClick={() => setSearch("")} className="text-slate-500 hover:text-white">
                                            <FaTimes className="text-xs" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Dropdowns */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Course Filter */}
                                <select
                                    value={courseFilter}
                                    onChange={(e) => setCourseFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="All">All Courses</option>
                                    {COURSES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>

                                {/* Exam Filter */}
                                <select
                                    value={examFilter}
                                    onChange={(e) => setExamFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Exams</option>
                                    {EXAM_TYPES.map((e) => (
                                        <option key={e.value} value={e.value}>
                                            {e.label}
                                        </option>
                                    ))}
                                </select>

                                {/* Semester Filter */}
                                <select
                                    value={semesterFilter}
                                    onChange={(e) => setSemesterFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                                >
                                    <option value="">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                        <option key={s} value={String(s)}>
                                            Semester {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* BATCH SELECTION ACTION BAR */}
                        {selectedIds.size > 0 && (
                            <div className="bg-indigo-950/80 border border-indigo-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-4 text-xs animate-fadeIn">
                                <div className="flex items-center gap-2 text-indigo-200 font-semibold">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black">
                                        {selectedIds.size}
                                    </span>
                                    <span>papers selected</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExportCSV}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
                                    >
                                        Export Selected
                                    </button>
                                    <button
                                        onClick={() => setDeletingBulk(true)}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <FaTrash className="text-xs" /> Delete Selected ({selectedIds.size})
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PAPERS DATA TABLE */}
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="py-3.5 px-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        paginatedPapers.length > 0 &&
                                                        selectedIds.size === paginatedPapers.length
                                                    }
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                                                />
                                            </th>
                                            <th className="py-3.5 px-4">Subject / Title</th>
                                            <th className="py-3.5 px-4">Course</th>
                                            <th className="py-3.5 px-4">Sem</th>
                                            <th className="py-3.5 px-4">Exam Type</th>
                                            <th className="py-3.5 px-4">Year</th>
                                            <th className="py-3.5 px-4">Branch</th>
                                            <th className="py-3.5 px-4">Uploaded By</th>
                                            <th className="py-3.5 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                                        {loading ? (
                                            [...Array(6)].map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={9} className="py-4 px-4">
                                                        <div className="h-4 bg-slate-800 rounded w-full" />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : paginatedPapers.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="py-12 text-center text-slate-500">
                                                    <div className="text-3xl mb-2">📂</div>
                                                    <p className="font-semibold">No question papers found matching query</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedPapers.map((paper) => {
                                                const isSelected = selectedIds.has(paper._id);
                                                return (
                                                    <tr
                                                        key={paper._id}
                                                        className={`hover:bg-slate-800/40 transition-colors ${
                                                            isSelected ? "bg-indigo-950/30" : ""
                                                        }`}
                                                    >
                                                        <td className="py-3 px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelect(paper._id)}
                                                                className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2.5 max-w-xs">
                                                                <FaFilePdf className="text-red-400 text-sm shrink-0" />
                                                                <span
                                                                    className="font-bold text-white hover:text-indigo-400 cursor-pointer truncate"
                                                                    onClick={() =>
                                                                        setPreviewPdf({
                                                                            fileUrl: paper.fileUrl,
                                                                            title: paper.title,
                                                                        })
                                                                    }
                                                                    title={paper.title}
                                                                >
                                                                    {paper.title}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold">
                                                                {paper.course || "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-400">
                                                            {paper.semester ? `Sem ${paper.semester}` : "-"}
                                                        </td>
                                                        <td className="py-3 px-4 capitalize">
                                                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px]">
                                                                {paper.examType || "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-bold text-slate-200">
                                                            {paper.year || "-"}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-400">
                                                            {paper.branch || "-"}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-500 font-mono text-[10px] max-w-[100px] truncate" title={paper.uploadedBy}>
                                                            {paper.uploadedBy || "System"}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() =>
                                                                        setPreviewPdf({
                                                                            fileUrl: paper.fileUrl,
                                                                            title: paper.title,
                                                                        })
                                                                    }
                                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 transition"
                                                                    title="Preview PDF"
                                                                >
                                                                    <FaEye />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownload(paper)}
                                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 transition"
                                                                    title="Download File"
                                                                >
                                                                    <FaDownload />
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditModal(paper)}
                                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                                                                    title="Edit Paper"
                                                                >
                                                                    <FaEdit />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingPaper(paper)}
                                                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400 transition"
                                                                    title="Delete Paper"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {filteredPapers.length > pageSize && (
                            <div className="flex items-center justify-between gap-4 pt-2 text-xs text-slate-400 font-medium">
                                <span>
                                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                                    {Math.min(currentPage * pageSize, filteredPapers.length)} of {filteredPapers.length} records
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 font-semibold"
                                    >
                                        Prev
                                    </button>
                                    <span className="font-bold text-white">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 font-semibold"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: USER DIRECTORY */}
                {activeTab === "users" && (
                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-white">Registered Student Contributors</h3>
                                <p className="text-xs text-slate-400">Authenticated Clerk accounts synced with MongoDB</p>
                            </div>
                            <button
                                onClick={fetchUsers}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                            >
                                Refresh Users
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="py-3 px-4">User ID / Record</th>
                                        <th className="py-3 px-4">Clerk Account ID</th>
                                        <th className="py-3 px-4">Papers Uploaded</th>
                                        <th className="py-3 px-4">Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                                    {usersLoading ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-500">
                                                Loading user directory...
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-500">
                                                No users recorded yet
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((u) => (
                                            <tr key={u._id} className="hover:bg-slate-800/40">
                                                <td className="py-3 px-4 font-mono text-slate-400">{u._id}</td>
                                                <td className="py-3 px-4 font-mono font-bold text-indigo-400">{u.clerkId}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-black">
                                                        {u.uploadsCount} papers
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-400">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: SYSTEM DIAGNOSTICS & PERMISSIONS */}
                {activeTab === "system" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Admin Permissions Matrix */}
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center gap-2.5 mb-4">
                                <FaShieldAlt className="text-indigo-400 text-lg" />
                                <h3 className="text-base font-bold text-white">Authorized Admin Access List</h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-4">
                                Only users with the following verified email addresses or Clerk <code className="text-indigo-300">publicMetadata.role = 'admin'</code> can access this console.
                            </p>

                            <div className="space-y-2 mb-6">
                                {adminEmails.map((email, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                                    >
                                        <span className="font-mono text-indigo-300">{email}</span>
                                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase">
                                            Admin Clearance
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[11px] text-slate-500">
                                To grant admin access to additional emails, update <code className="text-slate-400">VITE_ADMIN_EMAILS</code> and <code className="text-slate-400">ADMIN_EMAILS</code> in your project <code className="text-slate-400">.env</code> files.
                            </p>
                        </div>

                        {/* System Health & Connection Status */}
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2.5 mb-4">
                                    <FaServer className="text-purple-400 text-lg" />
                                    <h3 className="text-base font-bold text-white">System Diagnostics</h3>
                                </div>

                                <div className="space-y-3 text-xs mb-6">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                                        <span className="text-slate-400">Backend API URL:</span>
                                        <span className="font-mono text-slate-200">{API_URL}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                                        <span className="text-slate-400">MongoDB Status:</span>
                                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                            <FaCheck /> Connected (Atlas)
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                                        <span className="text-slate-400">Cloud Storage:</span>
                                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                            <FaCheck /> Cloudinary RAW Stream
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                                        <span className="text-slate-400">API Ping Latency:</span>
                                        <span className="font-mono font-bold text-indigo-300">
                                            {pingLatency !== null ? `${pingLatency} ms` : "Not Tested"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handlePing}
                                disabled={pinging}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {pinging ? <FaSpinner className="animate-spin" /> : <FaRedo />} Ping Backend Server
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* EDIT MODAL */}
            {editingPaper && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaEdit className="text-indigo-400" /> Edit Question Paper
                            </h3>
                            <button
                                onClick={() => setEditingPaper(null)}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Subject / Paper Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 font-medium"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-semibold mb-1">Course</label>
                                    <select
                                        value={editForm.course}
                                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    >
                                        {COURSES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-semibold mb-1">Semester</label>
                                    <select
                                        value={editForm.semester}
                                        onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                            <option key={s} value={String(s)}>
                                                Semester {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-semibold mb-1">Exam Type</label>
                                    <select
                                        value={editForm.examType}
                                        onChange={(e) => setEditForm({ ...editForm, examType: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    >
                                        {EXAM_TYPES.map((et) => (
                                            <option key={et.value} value={et.value}>
                                                {et.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-semibold mb-1">Exam Year</label>
                                    <input
                                        type="number"
                                        value={editForm.year}
                                        onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Branch / Stream</label>
                                <input
                                    type="text"
                                    value={editForm.branch}
                                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    placeholder="e.g. Computer Science (CSE)"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditingPaper(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {savingEdit ? <FaSpinner className="animate-spin" /> : null} Save Changes
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* DELETE SINGLE CONFIRMATION MODAL */}
            {deletingPaper && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                            <FaExclamationTriangle />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Question Paper?</h3>
                        <p className="text-xs text-slate-400 mb-6">
                            Are you sure you want to permanently remove{" "}
                            <span className="font-semibold text-white">&ldquo;{deletingPaper.title}&rdquo;</span> from the university repository? This action cannot be undone.
                        </p>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setDeletingPaper(null)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSingle}
                                disabled={isDeleting}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />} Confirm Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* DELETE BULK CONFIRMATION MODAL */}
            {deletingBulk && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                            <FaExclamationTriangle />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Bulk Delete {selectedIds.size} Papers?</h3>
                        <p className="text-xs text-slate-400 mb-6">
                            You are about to permanently delete <span className="font-bold text-red-400">{selectedIds.size}</span> selected question papers. This action cannot be reversed.
                        </p>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setDeletingBulk(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />} Delete All Selected
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* MODAL PDF VIEWER */}
            {previewPdf && (
                <PDFViewer
                    fileUrl={previewPdf.fileUrl}
                    title={previewPdf.title}
                    onClose={() => setPreviewPdf(null)}
                />
            )}
        </div>
    );
}

export default AdminPanel;
