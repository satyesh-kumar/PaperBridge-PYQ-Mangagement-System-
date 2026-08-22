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
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaBan,
} from "react-icons/fa";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
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

    // Active tab: 'moderation' | 'papers' | 'users' | 'system'
    const [activeTab, setActiveTab] = useState("moderation");

    // Search & Filter
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [courseFilter, setCourseFilter] = useState("All");
    const [examFilter, setExamFilter] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("");

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modals & Forms
    const [previewPdf, setPreviewPdf] = useState(null);
    const [editingPaper, setEditingPaper] = useState(null);
    const [editForm, setEditForm] = useState({
        title: "",
        course: "",
        semester: "",
        examType: "",
        year: "",
        branch: "",
        status: "approved",
    });
    const [savingEdit, setSavingEdit] = useState(false);

    const [rejectingPaper, setRejectingPaper] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    const [deletingPaper, setDeletingPaper] = useState(null);
    const [deletingBulk, setDeletingBulk] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // System ping test
    const [pingLatency, setPingLatency] = useState(null);
    const [pinging, setPinging] = useState(false);

    // Fetch all papers for admin (including pending & rejected)
    const fetchPapers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const token = await getToken();
            const res = await axios.get(`${API_URL}/api/admin/pyqs`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000,
            });
            if (Array.isArray(res.data)) {
                setPapers(res.data);
            } else {
                setPapers([]);
            }
        } catch (err) {
            console.error("Admin fetch papers error:", err);
            // Fallback to public endpoint if token fails
            try {
                const fallbackRes = await axios.get(`${API_URL}/api/pyqs`);
                setPapers(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
            } catch {
                setError("Failed to load question papers repository.");
            }
        } finally {
            setLoading(false);
        }
    }, [getToken]);

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
            console.error("Admin users error:", err);
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

    // Computed Pending & Approved counts
    const pendingPapers = useMemo(() => {
        return papers.filter((p) => p.status === "pending");
    }, [papers]);

    const approvedPapers = useMemo(() => {
        return papers.filter((p) => p.status === "approved" || !p.status);
    }, [papers]);

    // Filtered papers list for "All Papers" tab
    const filteredPapers = useMemo(() => {
        return papers.filter((paper) => {
            const matchesSearch =
                !search ||
                (paper.title && paper.title.toLowerCase().includes(search.toLowerCase())) ||
                (paper.course && paper.course.toLowerCase().includes(search.toLowerCase())) ||
                (paper.branch && paper.branch.toLowerCase().includes(search.toLowerCase())) ||
                (paper.year && String(paper.year).includes(search));

            const matchesStatus =
                statusFilter === "All"
                    ? true
                    : statusFilter === "pending"
                    ? paper.status === "pending"
                    : statusFilter === "approved"
                    ? paper.status === "approved" || !paper.status
                    : paper.status === "rejected";

            const matchesCourse = courseFilter === "All" || paper.course === courseFilter;
            const matchesExam = !examFilter || paper.examType === examFilter;
            const matchesSemester = !semesterFilter || String(paper.semester) === String(semesterFilter);

            return matchesSearch && matchesStatus && matchesCourse && matchesExam && matchesSemester;
        });
    }, [papers, search, statusFilter, courseFilter, examFilter, semesterFilter]);

    // Filtered papers list for "Moderation Queue" tab
    const filteredPendingPapers = useMemo(() => {
        return pendingPapers.filter((paper) => {
            return (
                !search ||
                (paper.title && paper.title.toLowerCase().includes(search.toLowerCase())) ||
                (paper.course && paper.course.toLowerCase().includes(search.toLowerCase())) ||
                (paper.branch && paper.branch.toLowerCase().includes(search.toLowerCase()))
            );
        });
    }, [pendingPapers, search]);

    // Pagination calculations
    const activeList = activeTab === "moderation" ? filteredPendingPapers : filteredPapers;
    const totalPages = Math.ceil(activeList.length / pageSize) || 1;
    const paginatedPapers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return activeList.slice(start, start + pageSize);
    }, [activeList, currentPage, pageSize]);

    // Selection Handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedPapers.length && paginatedPapers.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedPapers.map((p) => p._id)));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ── 1-CLICK APPROVE ───────────────────────────────────────────────────────────
    const handleApprove = async (paper) => {
        const toastId = toast.loading(`Approving "${paper.title}"...`);
        try {
            const token = await getToken();
            await axios.patch(
                `${API_URL}/api/admin/pyqs/${paper._id}/status`,
                { status: "approved" },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Optimistically update local state
            setPapers((prev) =>
                prev.map((p) => (p._id === paper._id ? { ...p, status: "approved" } : p))
            );

            confetti({
                particleCount: 40,
                spread: 60,
                origin: { y: 0.7 },
            });

            toast.success(`"${paper.title}" is now APPROVED & live! 🎉`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Approve error:", err);
            toast.error("Failed to approve paper", { id: toastId });
        }
    };

    // ── REJECT MODAL CONFIRM ──────────────────────────────────────────────────────
    const confirmReject = async () => {
        if (!rejectingPaper) return;
        setIsRejecting(true);
        const toastId = toast.loading(`Declining paper...`);
        try {
            const token = await getToken();
            await axios.patch(
                `${API_URL}/api/admin/pyqs/${rejectingPaper._id}/status`,
                {
                    status: "rejected",
                    rejectionReason: rejectionReason.trim(),
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPapers((prev) =>
                prev.map((p) =>
                    p._id === rejectingPaper._id
                        ? { ...p, status: "rejected", rejectionReason: rejectionReason.trim() }
                        : p
                )
            );

            toast.success(`Paper rejected.`, { id: toastId });
            setRejectingPaper(null);
            setRejectionReason("");
            fetchStats();
        } catch (err) {
            console.error("Reject error:", err);
            toast.error("Failed to reject paper", { id: toastId });
        } finally {
            setIsRejecting(false);
        }
    };

    // ── BULK APPROVE ──────────────────────────────────────────────────────────────
    const handleBulkApprove = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const toastId = toast.loading(`Approving ${ids.length} selected papers...`);
        try {
            const token = await getToken();
            await axios.post(
                `${API_URL}/api/admin/pyqs/bulk-status`,
                { ids, status: "approved" },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPapers((prev) =>
                prev.map((p) => (selectedIds.has(p._id) ? { ...p, status: "approved" } : p))
            );
            setSelectedIds(new Set());

            confetti({
                particleCount: 60,
                spread: 70,
                origin: { y: 0.6 },
            });

            toast.success(`Successfully approved ${ids.length} papers! 🎉`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Bulk approve error:", err);
            toast.error("Failed to bulk approve papers", { id: toastId });
        }
    };

    // ── BULK REJECT ───────────────────────────────────────────────────────────────
    const handleBulkReject = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const toastId = toast.loading(`Rejecting ${ids.length} selected papers...`);
        try {
            const token = await getToken();
            await axios.post(
                `${API_URL}/api/admin/pyqs/bulk-status`,
                { ids, status: "rejected" },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPapers((prev) =>
                prev.map((p) => (selectedIds.has(p._id) ? { ...p, status: "rejected" } : p))
            );
            setSelectedIds(new Set());

            toast.success(`Marked ${ids.length} papers as rejected`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Bulk reject error:", err);
            toast.error("Failed to bulk reject papers", { id: toastId });
        }
    };

    // ── SINGLE & BULK DELETE ──────────────────────────────────────────────────────
    const handleOpenDelete = (paper) => {
        setDeletingPaper(paper);
        setDeletingBulk(false);
    };

    const handleOpenBulkDelete = () => {
        if (selectedIds.size === 0) return;
        setDeletingPaper(null);
        setDeletingBulk(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        const toastId = toast.loading(deletingBulk ? "Purging selected papers..." : "Deleting paper...");
        try {
            const token = await getToken();

            if (deletingBulk) {
                const ids = Array.from(selectedIds);
                await axios.post(
                    `${API_URL}/api/admin/pyqs/bulk-delete`,
                    { ids },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setPapers((prev) => prev.filter((p) => !selectedIds.has(p._id)));
                setSelectedIds(new Set());
                toast.success(`Successfully purged ${ids.length} papers!`, { id: toastId });
                setDeletingBulk(false);
            } else if (deletingPaper) {
                await axios.delete(`${API_URL}/api/pyqs/${deletingPaper._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setPapers((prev) => prev.filter((p) => p._id !== deletingPaper._id));
                toast.success(`Deleted "${deletingPaper.title}"`, { id: toastId });
                setDeletingPaper(null);
            }
            fetchStats();
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete paper", { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    // ── EDIT METADATA ─────────────────────────────────────────────────────────────
    const handleOpenEdit = (paper) => {
        setEditingPaper(paper);
        setEditForm({
            title: paper.title || "",
            course: paper.course || "B.Tech",
            semester: paper.semester || "1",
            examType: paper.examType || "semester",
            year: paper.year || new Date().getFullYear(),
            branch: paper.branch || "",
            status: paper.status || "approved",
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSavingEdit(true);
        const toastId = toast.loading("Saving changes...");
        try {
            const token = await getToken();
            const res = await axios.put(
                `${API_URL}/api/pyqs/${editingPaper._id}`,
                editForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPapers((prev) =>
                prev.map((p) => (p._id === editingPaper._id ? { ...p, ...res.data } : p))
            );
            toast.success("Paper updated successfully!", { id: toastId });
            setEditingPaper(null);
            fetchStats();
        } catch (err) {
            console.error("Edit save error:", err);
            toast.error("Failed to update paper", { id: toastId });
        } finally {
            setSavingEdit(false);
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        const targetPapers = selectedIds.size > 0
            ? papers.filter((p) => selectedIds.has(p._id))
            : activeList;

        if (targetPapers.length === 0) {
            toast.error("No records available to export");
            return;
        }

        const headers = ["ID", "Title", "Course", "Semester", "Exam Type", "Year", "Branch", "Status", "File URL", "Uploaded By", "Created At"];
        const rows = targetPapers.map((p) => [
            `"${p._id}"`,
            `"${(p.title || "").replace(/"/g, '""')}"`,
            `"${p.course || ""}"`,
            `"${p.semester || ""}"`,
            `"${p.examType || ""}"`,
            `"${p.year || ""}"`,
            `"${p.branch || ""}"`,
            `"${p.status || "approved"}"`,
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

    // System Ping
    const handleTestPing = async () => {
        setPinging(true);
        const t0 = performance.now();
        try {
            await axios.get(`${API_URL}/`, { timeout: 8000 });
            const t1 = performance.now();
            setPingLatency(Math.round(t1 - t0));
            toast.success(`Backend live (${Math.round(t1 - t0)}ms)`);
        } catch {
            setPingLatency(-1);
            toast.error("Backend unresponsive");
        } finally {
            setPinging(false);
        }
    };

    // Status Badge Component
    const renderStatusBadge = (status) => {
        if (status === "pending") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Pending Review
                </span>
            );
        }
        if (status === "rejected") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <FaTimesCircle className="text-[10px]" /> Rejected
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <FaCheckCircle className="text-[10px]" /> Approved
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
            <Navbar2 />

            {/* TOP ADMIN EXECUTIVE BAR */}
            <div className="bg-white/80 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-5 sticky top-16 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Title & Badge */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-500/20">
                            <FaShieldAlt />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    PaperBridge Admin Console
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                    Active Root
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Logged in as: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{userEmail}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        >
                            <FaFileCsv className="text-emerald-600 dark:text-emerald-400" /> Export CSV
                        </button>

                        <button
                            onClick={() => {
                                fetchPapers();
                                fetchStats();
                                toast.success("Repository refreshed!");
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        >
                            <FaSyncAlt className="text-indigo-600 dark:text-indigo-400" /> Refresh
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
                    {/* Metric 1: Moderation Queue */}
                    <div
                        onClick={() => setActiveTab("moderation")}
                        className={`cursor-pointer rounded-2xl p-5 relative overflow-hidden transition shadow-sm border ${
                            pendingPapers.length > 0
                                ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500"
                                : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                {pendingPapers.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                                Pending Moderation
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">
                                <FaClock />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {pendingPapers.length}
                            {pendingPapers.length > 0 && (
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Needs Review</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Student submissions awaiting verification</p>
                    </div>

                    {/* Metric 2: Live Approved Papers */}
                    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Live Approved PYQs
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
                                <FaCheckCircle />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {approvedPapers.length}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Published papers available to all students</p>
                    </div>

                    {/* Metric 3: Contributors */}
                    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Registered Users
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm">
                                <FaUsers />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats?.totalUsers ?? (statsLoading ? "..." : 1)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Clerk synced student accounts</p>
                    </div>

                    {/* Metric 4: Cloud Status */}
                    <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/50 transition shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Cloudinary & CDN
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm">
                                <FaDatabase />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">Cloud Storage Live</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Total {papers.length} PDFs registered</p>
                    </div>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 overflow-x-auto">
                    {/* Tab 1: Moderation Queue */}
                    <button
                        onClick={() => {
                            setActiveTab("moderation");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "moderation"
                                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaClock /> Moderation Queue
                        {pendingPapers.length > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === "moderation" ? "bg-black/30 text-white" : "bg-amber-500 text-white"
                            }`}>
                                {pendingPapers.length}
                            </span>
                        )}
                    </button>

                    {/* Tab 2: All Papers */}
                    <button
                        onClick={() => {
                            setActiveTab("papers");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "papers"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaLayerGroup /> All Papers Repository ({papers.length})
                    </button>

                    {/* Tab 3: Users */}
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "users"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaUsers /> User Directory
                    </button>

                    {/* Tab 4: System */}
                    <button
                        onClick={() => setActiveTab("system")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "system"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaServer /> System Diagnostics
                    </button>
                </div>

                {/* ── TAB 1 & 2 CONTENT: MODERATION & PAPERS TABLE ─────────────────────── */}
                {(activeTab === "moderation" || activeTab === "papers") && (
                    <div>
                        {/* SEARCH & FILTERS BAR */}
                        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                            {/* Search */}
                            <div className="relative flex-1">
                                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-inner">
                                    <FaSearch className="text-slate-400 mr-2.5 text-xs" />
                                    <input
                                        type="text"
                                        placeholder={
                                            activeTab === "moderation"
                                                ? "Filter pending submissions by title, course, branch..."
                                                : "Search repository by title, course, year, branch..."
                                        }
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch("")}
                                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Dropdowns */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {activeTab === "papers" && (
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                    >
                                        <option value="All" className="dark:bg-slate-900">All Statuses</option>
                                        <option value="pending" className="dark:bg-slate-900">⏳ Pending Review</option>
                                        <option value="approved" className="dark:bg-slate-900">✅ Approved Only</option>
                                        <option value="rejected" className="dark:bg-slate-900">❌ Rejected Only</option>
                                    </select>
                                )}

                                <select
                                    value={courseFilter}
                                    onChange={(e) => {
                                        setCourseFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                >
                                    <option value="All" className="dark:bg-slate-900">All Courses</option>
                                    {COURSES.map((c) => (
                                        <option key={c} value={c} className="dark:bg-slate-900">
                                            {c}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={examFilter}
                                    onChange={(e) => {
                                        setExamFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                >
                                    <option value="" className="dark:bg-slate-900">All Exam Types</option>
                                    {EXAM_TYPES.map((t) => (
                                        <option key={t.value} value={t.value} className="dark:bg-slate-900">
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* BATCH OPERATIONS BAR (Active when items selected) */}
                        {selectedIds.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-indigo-600/10 dark:bg-indigo-950/70 border border-indigo-500/40 rounded-2xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-md"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                        {selectedIds.size}
                                    </span>
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-200">
                                        Papers Selected
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={handleBulkApprove}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <FaCheckCircle className="text-xs" /> Bulk Approve ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={handleBulkReject}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <FaTimesCircle className="text-xs" /> Bulk Reject
                                    </button>
                                    <button
                                        onClick={handleOpenBulkDelete}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <FaTrash className="text-xs" /> Bulk Delete
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* EMPTY MODERATION QUEUE STATE */}
                        {activeTab === "moderation" && !loading && activeList.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm my-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4">
                                    ✓
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                    Moderation Queue is Clear!
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                                    All submitted question papers have been reviewed and approved. New student uploads will appear here in real-time.
                                </p>
                                <button
                                    onClick={() => setActiveTab("papers")}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                                >
                                    Browse All Papers ({papers.length}) →
                                </button>
                            </div>
                        )}

                        {/* DATA TABLE */}
                        {activeList.length > 0 && (
                            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                                            <tr>
                                                <th className="py-3.5 px-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            paginatedPapers.length > 0 &&
                                                            selectedIds.size === paginatedPapers.length
                                                        }
                                                        onChange={toggleSelectAll}
                                                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </th>
                                                <th className="py-3.5 px-4">Subject / Paper</th>
                                                <th className="py-3.5 px-4">Course & Sem</th>
                                                <th className="py-3.5 px-4">Exam & Year</th>
                                                <th className="py-3.5 px-4">Branch</th>
                                                <th className="py-3.5 px-4">Status</th>
                                                <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                            {paginatedPapers.map((paper) => {
                                                const isSelected = selectedIds.has(paper._id);
                                                const status = paper.status || "approved";

                                                return (
                                                    <tr
                                                        key={paper._id}
                                                        className={`transition-colors ${
                                                            isSelected
                                                                ? "bg-indigo-50/50 dark:bg-indigo-950/30"
                                                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                        }`}
                                                    >
                                                        <td className="py-3.5 px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectOne(paper._id)}
                                                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center shrink-0">
                                                                    <FaFilePdf />
                                                                </div>
                                                                <div>
                                                                    <span
                                                                        onClick={() => setPreviewPdf(paper)}
                                                                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-1 max-w-xs block"
                                                                    >
                                                                        {paper.title}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        ID: {paper._id.slice(-6)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {paper.course || "-"}
                                                            </span>
                                                            <span className="text-slate-400 block text-[11px]">
                                                                {paper.semester ? `Sem ${paper.semester}` : "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                                                                {paper.examType || "-"}
                                                            </span>
                                                            <span className="text-slate-400 block text-[11px]">
                                                                {paper.year || "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                                                            {paper.branch || "-"}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            {renderStatusBadge(status)}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {/* 1-Click Approve Button */}
                                                                {status !== "approved" && (
                                                                    <button
                                                                        onClick={() => handleApprove(paper)}
                                                                        className="p-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg transition cursor-pointer font-semibold flex items-center gap-1 text-xs"
                                                                        title="Approve Paper"
                                                                    >
                                                                        <FaCheck className="text-xs" />
                                                                        <span className="hidden xl:inline">Approve</span>
                                                                    </button>
                                                                )}

                                                                {/* Reject Button */}
                                                                {status !== "rejected" && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setRejectingPaper(paper);
                                                                            setRejectionReason("");
                                                                        }}
                                                                        className="p-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                                                                        title="Decline / Reject Paper"
                                                                    >
                                                                        <FaBan className="text-xs" />
                                                                    </button>
                                                                )}

                                                                {/* Preview Modal Button */}
                                                                <button
                                                                    onClick={() => setPreviewPdf(paper)}
                                                                    className="p-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer"
                                                                    title="Preview PDF"
                                                                >
                                                                    <FaEye className="text-xs" />
                                                                </button>

                                                                {/* Edit Metadata */}
                                                                <button
                                                                    onClick={() => handleOpenEdit(paper)}
                                                                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                                                                    title="Edit Details"
                                                                >
                                                                    <FaEdit className="text-xs" />
                                                                </button>

                                                                {/* Delete Paper */}
                                                                <button
                                                                    onClick={() => handleOpenDelete(paper)}
                                                                    className="p-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer"
                                                                    title="Delete Paper"
                                                                >
                                                                    <FaTrash className="text-xs" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* PAGINATION */}
                        {activeList.length > pageSize && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                                <span className="text-slate-500 font-medium">
                                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                                    {Math.min(currentPage * pageSize, activeList.length)} of {activeList.length} records
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold disabled:opacity-40"
                                    >
                                        Prev
                                    </button>
                                    <span className="px-2 font-bold text-slate-800 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 3: USER DIRECTORY ────────────────────────────────────────────── */}
                {activeTab === "users" && (
                    <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Student & Contributor Directory</h3>
                                <p className="text-xs text-slate-500">Synced via Clerk Authentication and User DB</p>
                            </div>
                            <button
                                onClick={fetchUsers}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                            >
                                <FaSyncAlt className="text-xs" /> Refresh Users
                            </button>
                        </div>

                        {usersLoading ? (
                            <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
                                <FaSpinner className="animate-spin" /> Loading user registry...
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs">
                                No registered user records found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="py-3 px-4">Clerk User ID</th>
                                            <th className="py-3 px-4">Total Submissions</th>
                                            <th className="py-3 px-4">First Active</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {users.map((u) => (
                                            <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                    {u.clerkId}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                                                        {u.uploadsCount} papers
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-500">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 4: SYSTEM DIAGNOSTICS ────────────────────────────────────────── */}
                {activeTab === "system" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Backend Connectivity</h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">API Endpoint</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{API_URL}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">Live Latency</span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                        {pingLatency === null ? "Not tested" : pingLatency === -1 ? "Failed" : `${pingLatency} ms`}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleTestPing}
                                disabled={pinging}
                                className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {pinging ? <FaSpinner className="animate-spin" /> : <FaServer />} Test API Health
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Admin Security Privileges</h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">Your Session</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{userEmail}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">Configured Admins</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{adminEmails.join(", ")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── REJECT MODAL ────────────────────────────────────────────────────── */}
            {rejectingPaper && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-800 dark:text-slate-100"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-xl mb-4">
                            <FaBan />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            Reject Question Paper
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Rejecting &ldquo;<span className="font-semibold text-slate-800 dark:text-slate-200">{rejectingPaper.title}</span>&rdquo;. The uploader will see this status and reason on their dashboard.
                        </p>

                        <div className="mb-5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Rejection Reason (Optional)
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g. Blurry scan, duplicate paper, incomplete questions, wrong subject metadata..."
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-white outline-none focus:border-amber-500"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={confirmReject}
                                disabled={isRejecting}
                                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                            >
                                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                            <button
                                onClick={() => setRejectingPaper(null)}
                                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── DELETE MODAL ────────────────────────────────────────────────────── */}
            {(deletingPaper || deletingBulk) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-800 dark:text-slate-100"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center text-xl mb-4">
                            <FaTrash />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            {deletingBulk ? `Purge ${selectedIds.size} Papers?` : "Delete Question Paper?"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            {deletingBulk
                                ? `Are you sure you want to permanently delete these ${selectedIds.size} selected question papers? This action cannot be undone.`
                                : `Are you sure you want to delete "${deletingPaper?.title}"? It will be permanently removed from the repository.`}
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                            >
                                {isDeleting ? "Deleting..." : "Yes, Permanently Delete"}
                            </button>
                            <button
                                onClick={() => {
                                    setDeletingPaper(null);
                                    setDeletingBulk(false);
                                }}
                                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── EDIT METADATA MODAL ──────────────────────────────────────────────── */}
            {editingPaper && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-slate-800 dark:text-slate-100"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Question Paper</h3>
                            <button
                                onClick={() => setEditingPaper(null)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject / Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                                    <select
                                        value={editForm.course}
                                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        {COURSES.map((c) => (
                                            <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={editForm.semester}
                                        onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                                    <select
                                        value={editForm.examType}
                                        onChange={(e) => setEditForm({ ...editForm, examType: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        {EXAM_TYPES.map((t) => (
                                            <option key={t.value} value={t.value} className="dark:bg-slate-900">{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        <option value="pending" className="dark:bg-slate-900">⏳ Pending Review</option>
                                        <option value="approved" className="dark:bg-slate-900">✅ Approved</option>
                                        <option value="rejected" className="dark:bg-slate-900">❌ Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Branch</label>
                                <input
                                    type="text"
                                    value={editForm.branch}
                                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition cursor-pointer"
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingPaper(null)}
                                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* ── MODAL PDF VIEWER ─────────────────────────────────────────────────── */}
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
